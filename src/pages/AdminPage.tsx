/**
 * S7 — Panel del Admin (/admin). How many orders have come in, who is still missing, and
 * the download of the unified file that is sent to the vendedor.
 *
 * Two hard rules shape this screen:
 *
 *  - the progress is DERIVED from the participant documents (`hasOrder`), which the panel
 *    hook already subscribes to. There is no parallel count and no second subscription:
 *    the advance is never obtained by reading the orders (D-19).
 *  - the screen never touches the pairing collection. The route guard is UX; the authority
 *    is the server rule, which grants the order enumeration to the Admin alone and denies
 *    the pairing enumeration to everyone.
 *
 * The file is composed exclusively by the pure serialiser (`buildOrdersExport`) and handed
 * to the download utility (`downloadCsv`): this page serialises no cell, formats no header,
 * adds no column and builds no file by hand. The exported type has no identity column at
 * all, which is what makes the trust note under the button true rather than decorative.
 *
 * Each press of the button runs its own read and composes its own string, so a download
 * started while a new order is being written serialises the snapshot it read and not a
 * mixed state; the loading state blocks a second click while the first is in flight.
 */
import { useState } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Notice } from '../components/Notice'
import { Button } from '../components/Button'
import { ParticipantRow } from '../components/ParticipantRow'
import { useOrdersAdmin } from '../hooks/useOrdersAdmin'
import { listOrdersAdmin } from '../lib/orders'
import { downloadCsv, ordersCsvFilename } from '../lib/download'
import { buildOrdersExport } from '../domain/exportOrders'

const TRUST_NOTE = 'La lista no incluye quién regala a quién.'
const DOWNLOAD_ERROR = 'No hemos podido generar el archivo.'
const PERMISSION_COPY = 'No tienes permiso para ver esto.'

/** S8 taxonomy: the Firestore code maps to one copy, and to whether a retry can help. */
function errorCopy(code: string): { message: string; canRetry: boolean } {
  if (code === 'permission-denied') {
    return { message: PERMISSION_COPY, canRetry: false }
  }
  if (code === 'unavailable') {
    return { message: 'Sin conexión. Vuelve a intentarlo cuando recuperes la red.', canRetry: true }
  }
  if (code === 'resource-exhausted') {
    return { message: 'Hemos alcanzado el límite de consultas por hoy. Inténtalo más tarde.', canRetry: false }
  }
  return { message: 'Algo ha ido mal.', canRetry: true }
}

/**
 * A download failure is not the S8 read taxonomy: the one code worth its own copy is the
 * one that tells a user who is not the Admin why the list never arrived. Everything else
 * is the S7 download error, which a retry can fix.
 */
function downloadErrorCopy(code: string): { message: string; canRetry: boolean } {
  if (code === 'permission-denied') {
    return { message: PERMISSION_COPY, canRetry: false }
  }
  return { message: DOWNLOAD_ERROR, canRetry: true }
}

export default function AdminPage() {
  const [reloadKey, setReloadKey] = useState(0)

  return <AdminBody key={reloadKey} onRetry={() => setReloadKey((key) => key + 1)} />
}

function AdminBody({ onRetry }: { onRetry: () => void }) {
  const { loading, error, filled, total, pending } = useOrdersAdmin()
  const [downloading, setDownloading] = useState(false)
  const [downloadedName, setDownloadedName] = useState('')
  const [downloadError, setDownloadError] = useState('')

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
      // One calculation of the name, shared by the anchor and the success line below.
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

  return (
    <Screen title="Panel del Admin">
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
            <ParticipantRow key={person.uid} name={person.name} isPending />
          ))}
        </Card>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          loading={downloading}
          disabled={filled === 0}
          onClick={handleDownload}
        >
          Descargar Pedidos
        </Button>

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

        <p className="text-label text-slate-600">{TRUST_NOTE}</p>
      </div>
    </Screen>
  )
}
