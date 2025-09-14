import { forwardRef, type LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, children, ...props }, ref) => {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: This is a reusable component that receives htmlFor from props
    <label ref={ref} className={cn('text-sm font-medium text-gray-700', className)} {...props}>
      {children}
    </label>
  )
})
Label.displayName = 'Label'

export { Label }
