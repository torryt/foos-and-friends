import { CheckCircle, Info, X, XCircle } from 'lucide-react'
import type { Toast } from '@/hooks/useToast'
import { useToast } from '@/hooks/useToast'

interface ToastProps {
  toast: Toast
}

const ToastItem = ({ toast }: ToastProps) => {
  const { dismissToast } = useToast()

  const icons = {
    success: <CheckCircle size={20} className="text-toast-success" />,
    error: <XCircle size={20} className="text-toast-error" />,
    info: <Info size={20} className="text-toast-info" />,
  }

  const accentBorders = {
    success: 'border-l-toast-success',
    error: 'border-l-toast-error',
    info: 'border-l-toast-info',
  }

  return (
    <div
      className={`bg-toast border border-toast-border border-l-4 ${accentBorders[toast.type]} rounded-lg p-4 shadow-xl flex items-start gap-3 min-w-80 max-w-md animate-in slide-in-from-right-full duration-300`}
    >
      {icons[toast.type]}
      <div className="flex-1">
        <p className="text-sm font-medium text-toast-text">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="text-toast-muted hover:text-toast-text transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export const ToastContainer = () => {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
