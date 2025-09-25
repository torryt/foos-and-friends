import type { ReactNode } from 'react'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
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

export const AlertDialogContent = ({ children }: { children: ReactNode }) => (
  <div className="relative z-50 bg-white rounded-lg shadow-lg p-6 max-w-md mx-4">
    {children}
  </div>
)

export const AlertDialogHeader = ({ children }: { children: ReactNode }) => (
  <div className="mb-4">{children}</div>
)

export const AlertDialogTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-lg font-semibold">{children}</h2>
)

export const AlertDialogDescription = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-gray-600 mt-2">{children}</p>
)

export const AlertDialogFooter = ({ children }: { children: ReactNode }) => (
  <div className="flex justify-end gap-2 mt-6">{children}</div>
)

export const AlertDialogAction = ({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  className?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${className}`}
  >
    {children}
  </button>
)

export const AlertDialogCancel = ({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
  >
    {children}
  </button>
)