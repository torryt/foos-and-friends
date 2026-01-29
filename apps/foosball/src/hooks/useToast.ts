import { useCallback, useEffect, useState } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

let toastCounter = 0
let listeners: ((toasts: Toast[]) => void)[] = []
const toastState: ToastState = { toasts: [] }

const notifyListeners = () => {
  listeners.forEach((listener) => {
    listener(toastState.toasts)
  })
}

const addToast = (toast: Omit<Toast, 'id'>): string => {
  const id = `toast-${++toastCounter}`
  const newToast: Toast = {
    ...toast,
    id,
    duration: toast.duration ?? 3000,
  }

  toastState.toasts.push(newToast)
  notifyListeners()

  // Auto-remove toast after duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }

  return id
}

const removeToast = (id: string) => {
  toastState.toasts = toastState.toasts.filter((toast) => toast.id !== id)
  notifyListeners()
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>(toastState.toasts)

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts([...newToasts])
    }

    listeners.push(listener)

    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  const toast = useCallback(
    () => ({
      success: (message: string, duration?: number) =>
        addToast({ message, type: 'success', duration }),
      error: (message: string, duration?: number) => addToast({ message, type: 'error', duration }),
      info: (message: string, duration?: number) => addToast({ message, type: 'info', duration }),
    }),
    [],
  )

  const dismissToast = useCallback((id: string) => {
    removeToast(id)
  }, [])

  return {
    toasts,
    toast,
    dismissToast,
  }
}
