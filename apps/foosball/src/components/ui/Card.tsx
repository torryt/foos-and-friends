import { cn } from '@foos/shared'
import { forwardRef, type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--th-radius-lg)] shadow-theme-card border border-[var(--th-border-subtle)]',
        className,
      )}
      {...props}
    />
  )
})
Card.displayName = 'Card'

export { Card }
