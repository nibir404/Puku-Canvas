import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Minimal scroll-area — wraps a div with overflow:auto.
 * Replace with `@radix-ui/react-scroll-area` later if virtualized scroll is needed.
 */
export const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-y-auto', className)}
      {...props}
    />
  )
);
ScrollArea.displayName = 'ScrollArea';