import { cn } from '@foos/shared'
import { forwardRef, type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('rounded-xl shadow-lg border border-white/50', className)}
      {...props}
    />
  )
})
Card.displayName = 'Card'

export { Card }
