/**
 * S6 — the order form (quick task 261030).
 *
 * The single free-text box was replaced by the four things the vendor actually
 * needs — size, version, printed name/number and patches — plus the shirt photo.
 * Every field maps to a column, so the PDF never has to parse prose.
 *
 * The photo accepts a local file or an external link. Both are normalised and
 * uploaded to Supabase Storage by `resolveOrderPhoto`; a link that cannot be
 * copied (CORS) is kept as-is with a warning instead of blocking the order.
 *
 * Legacy orders keep their free text visible and can be migrated by editing.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Card } from './Card'
import { Field } from './Field'
import { Input } from './Input'
import { Select } from './Select'
import { Button } from './Button'
import { Notice } from './Notice'
import { Badge } from './Badge'
import { getMyOrder, submitOrder } from '../lib/orders'
import {
  PHOTO_ACCEPT,
  PHOTO_MAX_BYTES,
  PhotoError,
  resolveOrderPhoto,
} from '../lib/photo'
import { formatPrice } from '../domain/prices'
import { SIZES } from '../domain/sizeGuide'
import type { KitType, Order, OrderInput, Size } from '../domain/types'

const REQUIRED_COPY = 'Este campo es obligatorio.'
const SAVE_FAILED_COPY = 'No hemos podido guardar tu pedido.'
const OFFLINE_COPY = 'Sin conexión. El pedido no se ha guardado.'
const SCHEMA_COPY =
  'El pedido no se ha podido guardar: falta aplicar la actualización de la base de datos.'

const KIT_TYPES: readonly KitType[] = ['Fan', 'Player', 'Retro']

const KIT_LABELS: Record<KitType, string> = {
  Fan: `Fan · ${formatPrice('Fan')}`,
  Player: `Player · ${formatPrice('Player')}`,
  Retro: `Retro · ${formatPrice('Retro')}`,
}

const PATCH_SUGGESTIONS = [
  'FIFA WORLD CHAMPIONS 2026',
  'UEFA CHAMPIONS LEAGUE',
  'LALIGA',
  'PREMIER LEAGUE',
  'SERIE A',
  'BUNDESLIGA',
  'LIGUE 1',
]

type FormValues = {
  size: Size | ''
  version: KitType | ''
  printedName: string
  number: string
  patches: string
  team: string
  season: string
  notes: string
}

const EMPTY_VALUES: FormValues = {
  size: '',
  version: '',
  printedName: '',
  number: '',
  patches: '',
  team: '',
  season: '',
  notes: '',
}

type JerseyOrderFormProps = {
  /** The signed-in giver's nameNormalized; it keys the idempotent order row. */
  giverNameNormalized: string
  /** The recipient's size, used as the initial value of a new order. */
  defaultSize?: Size
}

function valuesFromOrder(order: Order, defaultSize?: Size): FormValues {
  return {
    size: order.size ?? defaultSize ?? '',
    version: order.version ?? '',
    printedName: order.printedName,
    number: order.number,
    patches: order.patches,
    team: order.team,
    season: order.season,
    notes: order.notes,
  }
}

function errorCode(thrown: unknown): string {
  return thrown instanceof Error && 'code' in thrown
    ? String((thrown as { code: unknown }).code)
    : 'unknown'
}

export function JerseyOrderForm({ giverNameNormalized, defaultSize }: JerseyOrderFormProps) {
  const [saved, setSaved] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<FormValues>({ ...EMPTY_VALUES, size: defaultSize ?? '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'size' | 'version', string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoWarning, setPhotoWarning] = useState('')

  const formRef = useRef<HTMLFormElement>(null)
  const patchesListId = useId()

  // Load the existing order on mount.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const order = await getMyOrder(giverNameNormalized).catch(() => null)
      if (cancelled) return
      if (order) {
        setSaved(order)
        setValues(valuesFromOrder(order, defaultSize))
        setPhotoUrl(order.photoUrl)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [giverNameNormalized, defaultSize])

  // Release the previous object URL whenever the preview changes or unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function startEditing() {
    if (saved) {
      setValues(valuesFromOrder(saved, defaultSize))
      setPhotoUrl(saved.photoUrl)
    }
    setPhotoFile(null)
    setPhotoPreview(null)
    setFieldErrors({})
    setSubmitError('')
    setPhotoWarning('')
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoUrlInput('')
    setPhotoWarning('')
    setSubmitError('')
    setFieldErrors({})
    if (saved) {
      setValues(valuesFromOrder(saved, defaultSize))
      setPhotoUrl(saved.photoUrl)
    }
  }

  function handlePhotoFile(file: File | null) {
    setSubmitError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSubmitError('El archivo debe ser una imagen (JPG, PNG o WebP).')
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setSubmitError('La foto pesa demasiado (máximo 8 MB).')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoWarning('')
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoUrl(null)
    setPhotoWarning('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors: Partial<Record<'size' | 'version', string>> = {}
    if (!values.size) errors.size = REQUIRED_COPY
    if (!values.version) errors.version = REQUIRED_COPY
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setSubmitError('')
      // Wait for the invalid attributes to commit before moving focus.
      setTimeout(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      }, 0)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setPhotoWarning('')
    setSubmitting(true)

    try {
      const resolution = await resolveOrderPhoto(photoFile, null, photoUrl)
      if (resolution.warning) setPhotoWarning(resolution.warning)

      const input: OrderInput = {
        size: values.size as Size,
        version: values.version as KitType,
        printedName: values.printedName.trim(),
        number: values.number.trim(),
        patches: values.patches.trim(),
        team: values.team.trim(),
        season: values.season.trim(),
        notes: values.notes.trim(),
        photoUrl: resolution.photoUrl,
      }

      const order = await submitOrder(giverNameNormalized, input)
      setSaved(order)
      setValues(valuesFromOrder(order, defaultSize))
      setPhotoUrl(order.photoUrl)
      setPhotoFile(null)
      setPhotoPreview(null)
      setEditing(false)
    } catch (thrown) {
      if (thrown instanceof PhotoError) {
        setSubmitError(thrown.message)
        return
      }
      const code = errorCode(thrown)
      if (code === 'unavailable') setSubmitError(OFFLINE_COPY)
      else if (code === 'PGRST204' || code === '42703') setSubmitError(SCHEMA_COPY)
      else setSubmitError(SAVE_FAILED_COPY)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="mt-4">
        <div className="h-24 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
      </Card>
    )
  }

  // Saved and not editing: the recap.
  if (saved && !editing) {
    const legacy = !saved.size && !saved.version

    return (
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-heading font-semibold text-slate-900">Tu pedido</h3>
          <Badge>Guardado</Badge>
        </div>

        {saved.photoUrl ? (
          <img
            src={saved.photoUrl}
            alt="Foto de la camiseta pedida"
            className="h-56 w-full rounded-xl border border-border bg-white object-contain"
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-label text-slate-600">
            Sin foto: el vendedor no sabrá qué camiseta es. Edita el pedido para añadirla.
          </p>
        )}

        {legacy ? (
          <div className="flex flex-col gap-3">
            <Notice tone="warning">
              Este pedido se guardó con el formulario antiguo. Edítalo para pasarlo al
              formato que recibe el vendedor.
            </Notice>
            <div className="rounded-xl bg-surface/50 p-4 font-mono text-sm whitespace-pre-wrap break-words text-slate-900">
              {saved.orderText || '(sin pedido)'}
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RecapRow label="Talla" value={saved.size ?? '—'} />
            <RecapRow label="Versión" value={saved.version ?? '—'} />
            <RecapRow label="Nombre" value={[saved.printedName, saved.number].filter(Boolean).join(' ') || '—'} />
            <RecapRow label="Parches" value={saved.patches || 'Sin parches'} />
            <RecapRow label="Equipo" value={saved.team || '—'} />
            <RecapRow label="Temporada" value={saved.season || '—'} />
            <RecapRow label="Precio" value={saved.version ? formatPrice(saved.version) : '—'} />
            {saved.notes ? <RecapRow label="Notas" value={saved.notes} wide /> : null}
          </dl>
        )}

        <p className="text-body text-slate-600">
          Ya has guardado tu pedido. El Admin lo incluirá en el PDF que se envía al vendedor.
        </p>

        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={startEditing}>
            Editar pedido
          </Button>
          <p className="text-center text-label text-slate-600">
            Si ves un error, pulsa «Editar pedido» para corregirlo.
          </p>
        </div>
      </Card>
    )
  }

  const preview = photoPreview || photoUrl

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Talla" required error={fieldErrors.size} helper="La talla que necesita quien la recibe.">
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                placeholder="Elige talla"
                options={SIZES}
                value={values.size}
                onChange={(event) => setField('size', event.target.value as Size | '')}
              />
            )}
          </Field>

          <Field label="Versión" required error={fieldErrors.version}>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                placeholder="Elige versión"
                options={KIT_TYPES}
                optionLabels={KIT_LABELS}
                value={values.version}
                onChange={(event) => setField('version', event.target.value as KitType | '')}
              />
            )}
          </Field>

          <Field label="Nombre en la camiseta" helper="Si no lleva nombre, déjalo vacío.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                placeholder="MOLTEN"
                maxLength={20}
                autoComplete="off"
                value={values.printedName}
                onChange={(event) => setField('printedName', event.target.value)}
              />
            )}
          </Field>

          <Field label="Dorsal" helper="Número impreso. Máximo 3 cifras.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                placeholder="5"
                inputMode="numeric"
                maxLength={3}
                autoComplete="off"
                value={values.number}
                onChange={(event) => setField('number', event.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            )}
          </Field>

          <Field label="Equipo" helper="El equipo de la camiseta.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                placeholder="Real Madrid"
                maxLength={60}
                autoComplete="off"
                value={values.team}
                onChange={(event) => setField('team', event.target.value)}
              />
            )}
          </Field>

          <Field label="Temporada" helper="Por ejemplo, 25/26.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                placeholder="25/26"
                maxLength={20}
                autoComplete="off"
                value={values.season}
                onChange={(event) => setField('season', event.target.value)}
              />
            )}
          </Field>
        </div>

        <Field
          label="Parches"
          helper="Déjalo vacío si no lleva parches. Puedes escribir el que sea."
        >
          {({ id, describedBy }) => (
            <div className="flex flex-col gap-2">
              <Input
                id={id}
                aria-describedby={describedBy}
                placeholder="FIFA WORLD CHAMPIONS 2026"
                maxLength={80}
                autoComplete="off"
                list={patchesListId}
                value={values.patches}
                onChange={(event) => setField('patches', event.target.value)}
              />
              <datalist id={patchesListId}>
                {PATCH_SUGGESTIONS.map((patch) => (
                  <option key={patch} value={patch} />
                ))}
              </datalist>
            </div>
          )}
        </Field>

        <Field
          label="Foto de la camiseta"
          helper="Súbela tomando una foto o eligiendo un archivo. Se recorta a 1400 px antes de guardarla."
        >
          {({ id, describedBy, invalid }) => (
            <div className="flex flex-col gap-3">
              {preview ? (
                <img
                  src={preview}
                  alt="Vista previa de la camiseta"
                  className="h-48 w-full rounded-xl border border-border bg-white object-contain"
                />
              ) : null}

              <input
                id={id}
                type="file"
                accept={PHOTO_ACCEPT}
                aria-describedby={describedBy}
                aria-invalid={invalid ? true : undefined}
                onChange={(event) => handlePhotoFile(event.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />

              {photoFile ? (
                <Button type="button" variant="ghost" onClick={clearPhoto} className="w-full">
                  Quitar foto
                </Button>
              ) : null}

              {photoWarning ? <Notice tone="warning">{photoWarning}</Notice> : null}
            </div>
          )}
        </Field>

        <Field label="Notas para el vendedor" helper="Cualquier detalle extra: parche, manga, detalles del escudo…">
          {({ id, describedBy }) => (
            <textarea
              id={id}
              aria-describedby={describedBy}
              className="min-h-[96px] w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              placeholder="Opcional"
              maxLength={300}
              rows={3}
              value={values.notes}
              onChange={(event) => setField('notes', event.target.value)}
            />
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

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {editing ? 'Guardar cambios' : 'Guardar pedido'}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={cancelEditing} className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}

function RecapRow({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-1${wide ? ' sm:col-span-2' : ''}`}>
      <dt className="text-label text-slate-600">{label}</dt>
      <dd className="text-body break-words text-slate-900">{value}</dd>
    </div>
  )
}
