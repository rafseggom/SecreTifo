/**
 * S7 — Panel del Admin (/admin). How many orders have come in, who is still missing, and
 * the download of the unified file that is sent to the vendedor.
 *
 * Two hard rules shape this screen:
 *
 *  - the progress is DERIVED from the participant rows (`has_order`), which the panel
 *    hook already subscribes to. There is no parallel count and no second subscription:
 *    the advance is never obtained by reading the orders (D-19).
 *  - the screen never touches the pairing table. The route guard is UX; the authority
 *    is the server RLS policy, which grants the order enumeration to
 *    any authenticated member and denies the pairing enumeration to everyone.
 *
 * The file is composed exclusively by the pure serialiser (`buildOrdersExport`) and handed
 * to the download utility (`downloadCsv`): this page serialises no cell, formats no header,
 * adds no column and builds no file by hand. The exported type has no identity column at
 * all, which is what makes the trust note under the button true rather than decorative.
 *
 * Each press of the button runs its own read and composes its own string, so a download
 * started while a new order is being written serialises the snapshot it read and not a
 * mixed state; the loading state blocks a second click while the first is in flight.
 *
 * CHANGED: Now uses nameNormalized instead of uid for participant identification.
 */
import { useState } from 'react'
import { useSession } from '../session/SessionProvider'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Notice } from '../components/Notice'
import { Button } from '../components/Button'
import { ParticipantRow } from '../components/ParticipantRow'
import { ParticipantTableRow } from '../components/ParticipantTableRow'
import { useOrdersAdmin } from '../hooks/useOrdersAdmin'
import { listOrdersAdmin, liberarParticipant, LIBERAR_ERRORS, type LiberarErrorCode } from '../lib/orders'
import { downloadCsv, downloadText, ordersCsvFilename, giftsTxtFilename } from '../lib/download'
import { buildOrdersExport, buildGiftsTxtExport } from '../domain/exportOrders'
import { errorCopy, downloadErrorCopy } from '../lib/errorCopy'
import { clearAllSession } from '../lib/session'

const TRUST_NOTE = 'La lista no incluye quién regala a quién.'

export default function AdminPage() {
  const [reloadKey, setReloadKey] = useState(0)

  return <AdminBody key={reloadKey} onRetry={() => setReloadKey((key) => key + 1)} />
}

function AdminBody({ onRetry }: { onRetry: () => void }) {
  const { loading, error, filled, total, pending, allParticipants } = useOrdersAdmin()
  const { eventStatus } = useSession()
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)
  const [downloadedName, setDownloadedName] = useState('')
  const [downloadError, setDownloadError] = useState('')

  // Liberar state
  const [liberarError, setLiberarError] = useState<string | null>(null)
  const [liberarSuccess, setLiberarSuccess] = useState<string | null>(null)

  const failure = error ? errorCopy(error) : null
  const downloadFailure = downloadError ? downloadErrorCopy(downloadError) : null
  const percent = total === 0 ? 0 : (filled / total) * 100

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    setDownloadedName('')
    setDownloadError('')
    try {
      const orders = await listOrdersAdmin()
      const filename = ordersCsvFilename()
      downloadCsv(filename, buildOrdersExport(orders))
      setDownloadedName(filename)
    } catch (thrown) {
      const code =
        thrown instanceof Error && 'code' in thrown
          ? String((thrown as { code: unknown }).code)
          : 'unknown'
      setDownloadError(code)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadGifts() {
    if (downloading) return
    setDownloading(true)
    setDownloadedName('')
    setDownloadError('')
    try {
      const orders = await listOrdersAdmin()
      const filename = giftsTxtFilename()
      downloadText(filename, buildGiftsTxtExport(orders))
      setDownloadedName(filename)
    } catch (thrown) {
      const code =
        thrown instanceof Error && 'code' in thrown
          ? String((thrown as { code: unknown }).code)
          : 'unknown'
      setDownloadError(code)
    } finally {
      setDownloading(false)
    }
  }

  async function handleLiberar(nameNormalized: string, name: string) {
    setLiberarError(null)
    setLiberarSuccess(null)
    try {
      await liberarParticipant(nameNormalized)
      setLiberarSuccess(name)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Algo ha ido mal.'
      if (Object.values(LIBERAR_ERRORS).includes(errorMessage as LiberarErrorCode)) {
        setLiberarError(errorMessage)
      } else {
        const code =
          err instanceof Error && 'code' in err
            ? String((err as { code: unknown }).code)
            : 'unknown'
        const { message } = errorCopy(code)
        setLiberarError(message)
      }
    }
  }

  const showLiberarFor = (hasOrder: boolean) => eventStatus === 'lobby' && !hasOrder

  return (
    <Screen title="Panel del Admin" wide>
      <Card className="mt-6 flex flex-col gap-4">
        <p className="text-label text-slate-600">Pedidos guardados</p>
        {loading ? (
          <div className="h-6 w-24 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        ) : (
          <p aria-live="polite" className="text-heading font-semibold tabular-nums text-slate-900">
            {filled} de {total}
          </p>
        )}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={filled}
          aria-valuetext={`${filled} de ${total} pedidos`}
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${percent}%` }} />
        </div>
      </Card>

      {loading ? (
        <Card className="mt-6 flex flex-col gap-2">
          <div className="h-11 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
          <div className="h-11 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        </Card>
      ) : failure ? (
        <div className="mt-6">
          <Notice
            tone="error"
            action={
              failure.canRetry ? (
                <Button type="button" variant="secondary" onClick={onRetry}>
                  Reintentar
                </Button>
              ) : undefined
            }
          >
            {failure.message}
          </Notice>
        </div>
      ) : filled === 0 ? (
        // IN-06: the S7 empty state from the approved deck (01-UI-SPEC.md:551), which
        // previously never rendered — with nobody having ordered yet the panel jumped
        // straight to the «Faltan N por rellenar» list.
        <Card className="mt-6">
          <h2 className="text-heading font-semibold text-slate-900">Todavía no hay ningún pedido.</h2>
          <p className="mt-2 text-body text-slate-600">
            Aparecerán aquí según los vayan guardando.
          </p>
        </Card>
      ) : pending.length === 0 ? (
        <div className="mt-6">
          <Notice tone="success">Todos los pedidos están guardados.</Notice>
        </div>
      ) : (
        <Card className="mt-6 flex flex-col gap-2">
          <h2 className="text-heading font-semibold text-slate-900">
            {pending.length === 1
              ? 'Falta 1 participante por rellenar'
              : `Faltan ${pending.length} participantes por rellenar`}
          </h2>
          {pending.map((person) => (
            <ParticipantRow key={person.nameNormalized} name={person.name} isPending />
          ))}
        </Card>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {/* CSV for vendor - always available when there are orders */}
        <Button
          type="button"
          variant="primary"
          loading={downloading}
          disabled={filled === 0}
          onClick={handleDownload}
        >
          Descargar Pedidos (CSV para vendedor)
        </Button>

        {/* TXT gift list - only when ALL orders are in */}
        {filled === total && total > 0 && (
          <Button
            type="button"
            variant="secondary"
            loading={downloading}
            onClick={handleDownloadGifts}
          >
            Descargar Lista de Regalos (TXT anónimo)
          </Button>
        )}

        {filled === 0 && !loading ? (
          <p className="text-label text-slate-600">Todavía no hay pedidos que descargar.</p>
        ) : null}

        {downloading ? (
          <p role="status" className="text-label text-slate-600">
            Preparando el archivo…
          </p>
        ) : null}

        {downloadedName ? (
          <Notice tone="success">{`Archivo descargado: ${downloadedName}`}</Notice>
        ) : null}

        {downloadFailure ? (
          <Notice
            tone="error"
            action={
              downloadFailure.canRetry ? (
                <Button type="button" variant="secondary" onClick={handleDownload}>
                  Reintentar
                </Button>
              ) : undefined
            }
          >
            {downloadFailure.message}
          </Notice>
        ) : null}

        {liberarSuccess ? (
          <Notice tone="success">{`${liberarSuccess} ha sido liberado del evento.`}</Notice>
        ) : null}

        {liberarError ? (
          <Notice tone="error">{liberarError}</Notice>
        ) : null}

        <p className="text-label text-slate-600">{TRUST_NOTE}</p>

        <Button type="button" variant="ghost" onClick={() => { clearAllSession(); navigate('/', { replace: true }); }}>
          Cerrar sesión de Admin
        </Button>
      </div>

      {/* Participantes table */}
      {!loading && !failure && total > 0 && (
        <Card className="mt-6 overflow-hidden">
          <h2 className="text-heading font-semibold text-slate-900 mb-4">Todos los participantes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="px-3 py-2 text-left text-label text-slate-600 font-medium">Nombre</th>
                  <th scope="col" className="px-3 py-2 text-left text-label text-slate-600 font-medium">Talla</th>
                  <th scope="col" className="px-3 py-2 text-left text-label text-slate-600 font-medium">Pref.</th>
                  <th scope="col" className="px-3 py-2 text-left text-label text-slate-600 font-medium">Proh.</th>
                  <th scope="col" className="px-3 py-2 text-left text-label text-slate-600 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2 text-left text-label text-slate-600 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allParticipants.map((person) => (
                  <ParticipantTableRow
                    key={person.nameNormalized}
                    participant={person}
                    onLiberar={handleLiberar}
                    showLiberar={showLiberarFor(person.hasOrder)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Screen>
  )
}