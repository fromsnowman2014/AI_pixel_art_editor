import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
        destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
        ghost: 'hover:bg-gray-100 active:bg-gray-200',
        link: 'text-blue-500 underline-offset-4 hover:underline',
        kid: 'bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:from-purple-500 hover:to-pink-500 active:from-purple-600 active:to-pink-600 text-lg font-bold shadow-lg',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
        touch: 'h-11 px-6 min-w-11', // 44px minimum for touch targets
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }