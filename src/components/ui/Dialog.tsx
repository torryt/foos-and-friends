import type { ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>
  )
}

export const DialogContent = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`relative z-50 bg-white rounded-lg shadow-lg p-6 max-w-md mx-4 ${className}`}>
    {children}
  </div>
)

export const DialogHeader = ({ children }: { children: ReactNode }) => (
  <div className="mb-4">{children}</div>
)

export const DialogTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-lg font-semibold">{children}</h2>
)

export const DialogDescription = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-gray-600 mt-2">{children}</p>
)

export const DialogFooter = ({ children }: { children: ReactNode }) => (
  <div className="flex justify-end gap-2 mt-6">{children}</div>
)