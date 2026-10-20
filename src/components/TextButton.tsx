/**
 * Acción secundaria que se lee como texto, no como botón: sin caja, sin altura de
 * control y con subrayado. Se usa para «Cambiar nombre», donde un botón con
 * contorno competía visualmente con el formulario.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type TextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export function TextButton({ className, children, type = 'button', ...rest }: TextButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={`inline-flex items-center rounded-sm font-semibold text-accent underline decoration-accent/35 underline-offset-4 transition-colors hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dominant${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  )
}
