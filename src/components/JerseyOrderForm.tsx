/**
 * S6 — the order form (01-UI-SPEC §S6). The project's CRUD form, and the one that fixes
 * the pattern: controlled fields, a single unified validation pass on submit, and a swap
 * to a read-only recap after a successful save.
 *
 * The price lives in exactly one place (`domain/prices.ts`): the type `Select` carries
 * each option's reference price at the point of decision (D-17) and the `PriceTable`
 * reads the same source — no price is transcribed in this file.
 *
 * D-15: the dorsal is a TEXT field with a numeric keypad and a digits pattern, never a
 * number field, which would strip the leading zero and change the data the seller sees.
 *
 * D-16: the Player/XXXL notice is non-blocking — the submit button stays enabled, the
 * chosen size is never mutated, and nothing is auto-corrected.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Card } from './Card'
import { Field } from './Field'
import { Input } from './Input'
import { Select } from './Select'
import { Button } from './Button'
import { Notice } from './Notice'
import { Badge } from './Badge'
import { PriceTable } from './PriceTable'
import { getMyOrder, submitOrder } from '../lib/orders'
import { PRICES, formatPrice } from '../domain/prices'
import { isSizeUnavailableForKit } from '../domain/sizeGuide'
import type { KitType, OrderInput, Size } from '../domain/types'

const REQUIRED_COPY = 'Este campo es obligatorio.'
const EMPTY_VALUE = '—'
const D16_COPY = 'Player no llega a XXXL. Para esa talla, elige Fan o Retro.'
const SAVE_FAILED_COPY = 'No hemos podido guardar tu pedido.'
// IN-06: the deck's offline variant for the order path (01-UI-SPEC.md:555). An offline
// failure is not the generic save error: nothing was written, and the retry can work.
const OFFLINE_COPY = 'Sin conexión. El pedido no se ha guardado.'

/** Options come from the single price source, never a literal list. */
const KIT_OPTIONS = Object.keys(PRICES) as KitType[]
const KIT_LABELS: Partial<Record<string, string>> = Object.fromEntries(
  KIT_OPTIONS.map((kit) => [kit, `${kit} · ${formatPrice(kit)}`]),
)

type JerseyOrderFormProps = {
  /** The recipient's size, for the pre-fill (D-15). */
  recipientSize: Size
  /** The recipient's name, for the size helper. */
  recipientName: string
  /** The signed-in giver's uid; it keys the idempotent order document. */
  uid: string
}

type Errors = { type?: string; team?: string }

export function JerseyOrderForm({ recipientSize, recipientName, uid }: JerseyOrderFormProps) {
  const [saved, setSaved] = useState<OrderInput | null>(null)
  const [type, setType] = useState<KitType | ''>('')
  const [team, setTeam] = useState('')
  const [season, setSeason] = useState('')
  const [printedName, setPrintedName] = useState('')
  const [number, setNumber] = useState('')
  const [size, setSize] = useState<Size>(recipientSize)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Repaint the read-only recap after a reload, without re-submitting anything (ORDER-05).
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const order = await getMyOrder(uid).catch(() => null)
      if (cancelled || !order) return
      setSaved({
        type: order.type,
        team: order.team,
        season: order.season,
        printedName: order.printedName,
        number: order.number,
        size: order.size,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [uid])

  const showD16 = type !== '' && isSizeUnavailableForKit(type, size)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const nextErrors: Errors = {}
    if (!type) nextErrors.type = REQUIRED_COPY
    if (team.trim() === '') nextErrors.team = REQUIRED_COPY
    setErrors(nextErrors)
    if (nextErrors.type || nextErrors.team) return

    const input: OrderInput = {
      type: type as KitType,
      team,
      season,
      printedName,
      number,
      size,
    }

    setSubmitError('')
    setSubmitting(true)
    try {
      await submitOrder(uid, input)
      setSaved(input)
    } catch (thrown) {
      // IN-06: branch on the Firestore code as the other screens do, so a lost connection
      // is reported as such instead of as a generic failure.
      const code =
        thrown instanceof Error && 'code' in thrown
          ? String((thrown as { code: unknown }).code)
          : 'unknown'
      setSubmitError(code === 'unavailable' ? OFFLINE_COPY : SAVE_FAILED_COPY)
    } finally {
      setSubmitting(false)
    }
  }

  if (saved) {
    return <OrderRecap input={saved} />
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Field label="Tipo de camiseta" required error={errors.type}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              options={KIT_OPTIONS}
              optionLabels={KIT_LABELS}
              placeholder="Elige el tipo"
              value={type}
              onChange={(event) => setType(event.target.value as KitType | '')}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>

        <Field label="Equipo" required error={errors.team}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              maxLength={60}
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>

        <Field label="Temporada o año">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              placeholder="2024/25"
              maxLength={20}
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>

        <Field label="Nombre a serigrafiar" helper="Tal y como quieres que aparezca en la espalda.">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              maxLength={30}
              value={printedName}
              onChange={(event) => setPrintedName(event.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>

        <Field label="Dorsal" helper="Puedes escribir 09: se guardará con el cero.">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>

        <Field
          label="Talla"
          required
          helper={`Pre-cargada con la talla de ${recipientName}. Puedes cambiarla.`}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              placeholder="Elige una talla"
              value={size}
              onChange={(event) => setSize(event.target.value as Size)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>

        <Card>
          <PriceTable />
        </Card>

        {showD16 ? (
          <Notice tone="warning" role="status">
            {D16_COPY}
          </Notice>
        ) : null}

        {submitError ? (
          <Notice
            tone="error"
            action={
              <Button type="submit" variant="secondary" loading={submitting}>
                Reintentar
              </Button>
            }
          >
            {submitError}
          </Notice>
        ) : null}

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          {submitting ? 'Guardando…' : 'Guardar pedido'}
        </Button>
      </form>
    </Card>
  )
}

/**
 * The read-only recap the form becomes after a successful save. It exposes NO edit or
 * re-submit affordance (editing after save is SCOPE-02, deferred), and an empty optional
 * field renders `—` instead of collapsing its row.
 */
function OrderRecap({ input }: { input: OrderInput }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Tipo de camiseta', value: input.type },
    { label: 'Equipo', value: input.team },
    { label: 'Temporada o año', value: input.season },
    { label: 'Nombre a serigrafiar', value: input.printedName },
    { label: 'Dorsal', value: input.number },
    { label: 'Talla', value: input.size },
  ]

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-heading font-semibold text-slate-900">Tu pedido</h3>
        <Badge>Guardado</Badge>
      </div>

      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-label text-slate-600">{row.label}</dt>
            <dd className="text-body break-words text-slate-900">
              {row.value.trim() === '' ? EMPTY_VALUE : row.value}
            </dd>
          </div>
        ))}
      </dl>

      {isSizeUnavailableForKit(input.type, input.size) ? (
        <Notice tone="warning">{D16_COPY}</Notice>
      ) : null}

      <p className="text-body text-slate-600">
        Ya has guardado tu pedido. El Admin lo incluirá en la lista que se envía al vendedor.
      </p>
      <p className="text-label text-slate-600">Para cambiarlo, avisa al Admin.</p>
    </Card>
  )
}
