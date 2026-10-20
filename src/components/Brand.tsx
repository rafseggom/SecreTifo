/**
 * Marca de la app. Es el único elemento de "cabecera" compartido: no añade
 * navegación ni compite con el `<h1>` de cada pantalla, solo da contexto de
 * producto y un punto de color verde campo.
 */
import { JerseyIcon } from './icons'

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-foreground shadow-sm">
        <JerseyIcon className="h-5 w-5" />
      </span>
      <span className="text-label font-semibold tracking-[0.08em] text-foreground">
        SecretKit
      </span>
    </div>
  )
}
