import { cn } from '@foos/shared'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--th-radius-md)] font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            default: 'bg-sport-gradient text-white hover:bg-sport-gradient-hover',
            outline: 'border border-[var(--th-border)] bg-card hover:bg-card-hover',
            ghost: 'hover:bg-card-hover',
          }[variant],
          {
            sm: 'min-h-8 py-1.5 px-3 text-sm',
            md: 'min-h-10 py-2 px-4',
            lg: 'min-h-12 py-3 px-6 text-lg',
          }[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
