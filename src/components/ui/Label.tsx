import { type LabelHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return (
    <label ref={ref} className={cn('text-sm font-medium text-gray-700', className)} {...props} />
  )
})
Label.displayName = 'Label'

export { Label }
