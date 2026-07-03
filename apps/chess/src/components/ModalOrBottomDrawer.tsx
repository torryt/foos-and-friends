import type { ReactNode } from 'react'

interface ModalOrBottomDrawerProps {
  isOpen?: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  fullHeight?: boolean
}

export const ModalOrBottomDrawer = ({
  isOpen = true,
  onClose,
  children,
  className = '',
  fullHeight = false,
}: ModalOrBottomDrawerProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-[var(--th-bg-overlay)] backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
        tabIndex={-1}
      />
      {/* Content */}
      <div
        className={`relative w-full overflow-hidden sm:max-h-[90vh] sm:rounded-2xl ${fullHeight ? 'h-dvh rounded-none' : 'max-h-dvh rounded-t-2xl'} ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
