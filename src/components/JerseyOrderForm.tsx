/**
 * S6 — the order form (simplified). Single text field with template guide.
 *
 * The user fills in one text area following the template:
 * "Tipo camiseta - Equipo - Temporada - Talla - Numero / Dorsal - URL si la tienes + info extra (como parches)"
 *
 * Example: "Retro Real Madrid 25/26 XXL 7 / Raul - www.yuupo.com/camisetawapa + parche champions"
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Card } from './Card'
import { Field } from './Field'
import { Button } from './Button'
import { Notice } from './Notice'
import { Badge } from './Badge'
import { getMyOrder, submitOrder } from '../lib/orders'

const REQUIRED_COPY = 'Este campo es obligatorio.'
const SAVE_FAILED_COPY = 'No hemos podido guardar tu pedido.'
const OFFLINE_COPY = 'Sin conexión. El pedido no se ha guardado.'

/** Plantilla recomendada para el pedido */
const ORDER_TEMPLATE = 'Tipo camiseta - Equipo - Temporada - Talla - Numero / Dorsal - URL si la tienes + info extra (como parches)'
const ORDER_EXAMPLE = 'Ejemplo: Retro Real Madrid 25/26 XXL 7 / Raul - www.yuupo.com/camisetawapa + parche champions'

type JerseyOrderFormProps = {
  /** The signed-in giver's nameNormalized; it keys the idempotent order document. */
  giverNameNormalized: string
}

export function JerseyOrderForm({ giverNameNormalized }: JerseyOrderFormProps) {
  const [saved, setSaved] = useState<string | null>(null)
  const [orderText, setOrderText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Repaint the read-only recap after a reload
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const order = await getMyOrder(giverNameNormalized).catch(() => null)
      if (cancelled || !order) return
      // order.orderText is the new field
      const text = (order as { orderText?: string }).orderText
      if (text) setSaved(text)
    })()

    return () => {
      cancelled = true
    }
  }, [giverNameNormalized])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const trimmed = orderText.trim()
    if (!trimmed) {
      setSubmitError(REQUIRED_COPY)
      textareaRef.current?.focus()
      return
    }

    setSubmitError('')
    setSubmitting(true)
    try {
      await submitOrder(giverNameNormalized, { orderText: trimmed })
      setSaved(trimmed)
    } catch (thrown) {
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
    return <OrderRecap orderText={saved} />
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field
          label="Tu pedido"
          helper="Copia y rellena la plantilla (intenta que esté bien, la va a leer el xino, no yo)."
          error={submitError || undefined}
        >
          {({ id, describedBy, invalid }) => (
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className="min-h-[140px] w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 resize-y"
                placeholder={ORDER_TEMPLATE}
                value={orderText}
                onChange={(e) => setOrderText(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground text-right">
                {ORDER_EXAMPLE}
              </p>
            </div>
          )}
        </Field>

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
 * The read-only recap the form becomes after a successful save.
 */
function OrderRecap({ orderText }: { orderText: string }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-heading font-semibold text-slate-900">Tu pedido</h3>
        <Badge>Guardado</Badge>
      </div>

      <div className="bg-surface/50 rounded-xl p-4 font-mono text-sm text-slate-900 whitespace-pre-wrap break-words">
        {orderText}
      </div>

      <p className="text-body text-slate-600">
        Ya has guardado tu pedido. El Admin lo incluirá en la lista que se envía al vendedor.
      </p>
      <p className="text-label text-slate-600">Para cambiarlo, avisa al Admin.</p>
    </Card>
  )
}