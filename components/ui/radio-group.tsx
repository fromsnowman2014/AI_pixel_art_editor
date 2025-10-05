'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function RadioGroup({ value, onValueChange, children, className }: RadioGroupProps) {
  return (
    <div className={cn('space-y-2', className)} role="radiogroup">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            checked: child.props.value === value,
            onClick: () => onValueChange?.(child.props.value),
          })
        }
        return child
      })}
    </div>
  )
}

interface RadioGroupItemProps {
  value: string
  id: string
  checked?: boolean
  onClick?: () => void
  className?: string
}

export function RadioGroupItem({ value, id, checked, onClick, className }: RadioGroupItemProps) {
  return (
    <input
      type="radio"
      id={id}
      value={value}
      checked={checked}
      onChange={onClick}
      className={cn(
        'h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500',
        className
      )}
    />
  )
}
