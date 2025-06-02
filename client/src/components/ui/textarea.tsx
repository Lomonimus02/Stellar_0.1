import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-2xl border border-[hsl(var(--input-border-color))] bg-[hsl(var(--input-background))] px-3 py-2 text-sm text-[hsl(var(--input-text-color))] ring-offset-[hsl(var(--background))] shadow-[var(--input-shadow)] placeholder:text-[hsl(var(--input-placeholder-color))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--input-ring-color))] focus-visible:ring-offset-2 focus-visible:border-[hsl(var(--input-focus-border-color))] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
