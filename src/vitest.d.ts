/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

declare module 'vitest' {
  interface Assertion<T> {
    toBeInTheDocument(): T
    toHaveAttribute(name: string, value?: string): T
    toHaveClass(...classNames: string[]): T
    toBeVisible(): T
    toBeDisabled(): T
    toBeEnabled(): T
    toHaveValue(value: string | number): T
    toHaveTextContent(text: string | RegExp): T
  }
}