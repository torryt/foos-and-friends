import { type RefObject, useEffect } from 'react'

/**
 * Calls `onClickOutside` when a pointer press lands outside the referenced element.
 * `enabled` should mirror the open state so the listener is only attached while needed.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (target instanceof Node && ref.current && !ref.current.contains(target)) {
        onClickOutside()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [ref, onClickOutside, enabled])
}
