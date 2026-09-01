import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Lightweight tooltip — pure CSS hover.
 * Wrap any element to give it a title-styled tooltip via the `tip` prop.
 */
interface TooltipProps {
  tip: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

export function Tooltip({ tip, side = 'bottom', children }: TooltipProps) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100',
          side === 'top' && 'bottom-full mb-1 left-1/2 -translate-x-1/2',
          side === 'bottom' && 'top-full mt-1 left-1/2 -translate-x-1/2',
          side === 'left' && 'right-full mr-1 top-1/2 -translate-y-1/2',
          side === 'right' && 'left-full ml-1 top-1/2 -translate-y-1/2'
        )}
      >
        {tip}
      </span>
    </span>
  );
}