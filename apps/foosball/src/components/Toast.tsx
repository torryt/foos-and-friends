import { CheckCircle, Info, X, XCircle } from 'lucide-react'
import type { Toast } from '@/hooks/useToast'
import { useToast } from '@/hooks/useToast'

interface ToastProps {
  toast: Toast
}

const ToastItem = ({ toast }: ToastProps) => {
  const { dismissToast } = useToast()

  const icons = {
    success: <CheckCircle size={20} className="text-[var(--th-win)]" />,
    error: <XCircle size={20} className="text-[var(--th-loss)]" />,
    info: <Info size={20} className="text-[var(--th-accent)]" />,
  }

  const bgColors = {
    success: 'bg-card border-[var(--th-border)]',
    error: 'bg-card border-[var(--th-border)]',
    info: 'bg-card border-[var(--th-border)]',
  }

  const textColors = {
    success: 'text-primary',
    error: 'text-primary',
    info: 'text-primary',
  }

  return (
    <div
      className={`${bgColors[toast.type]} border rounded-lg p-4 shadow-lg flex items-start gap-3 min-w-80 max-w-md animate-in slide-in-from-right-full duration-300`}
    >
      {icons[toast.type]}
      <div className="flex-1">
        <p className={`text-sm font-medium ${textColors[toast.type]}`}>{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="text-muted hover:text-secondary transition-colors"
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
