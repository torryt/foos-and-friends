import { CheckCircle, Info, X, XCircle } from 'lucide-react'
import type { Toast } from '@/hooks/useToast'
import { useToast } from '@/hooks/useToast'

interface ToastProps {
  toast: Toast
}

const ToastItem = ({ toast }: ToastProps) => {
  const { dismissToast } = useToast()

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <XCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
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
        className="text-gray-400 hover:text-gray-600 transition-colors"
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
