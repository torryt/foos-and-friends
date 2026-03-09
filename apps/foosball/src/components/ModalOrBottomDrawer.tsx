import type { ReactNode } from 'react'

interface ModalOrBottomDrawerProps {
  isOpen?: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export const ModalOrBottomDrawer = ({
  isOpen = true,
  onClose,
  children,
  className = '',
}: ModalOrBottomDrawerProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
        tabIndex={-1}
      />
      {/* Content */}
      <div
        className={`relative w-full rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
