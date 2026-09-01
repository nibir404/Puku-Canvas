import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface ColorPopoverProps {
  /** Display label (e.g., "Stroke" / "Fill"). */
  label: string;
  /** Current color value (#rrggbb or 'transparent'). */
  value: string;
  /** Called whenever the user picks a new color. */
  onChange: (color: string) => void;
  /** When true, the swatch is rendered but the popover cannot be opened. */
  disabled?: boolean;
  /** Slight visual variant — 'filled' is solid, 'outlined' shows a ring. */
  variant?: 'filled' | 'outlined';
}

/**
 * Compact color picker — a swatch button that opens a popover containing
 * the native <input type="color"> + a hex text input.
 *
 * Click outside or Escape closes the popover.
 */
export function ColorPopover({
  label,
  value,
  onChange,
  disabled = false,
  variant = 'filled',
}: ColorPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isTransparent = value === 'transparent' || value === 'none';

  return (
    <div className="color-popover" ref={wrapperRef}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={open}
        disabled={disabled}
        className={cn('color-swatch', variant === 'outlined' && 'color-swatch-outlined')}
        onClick={() => !disabled && setOpen((v) => !v)}
        title={label}
      >
        <span
          className="color-swatch-fill"
          style={{
            background: isTransparent
              ? 'repeating-linear-gradient(45deg, #ddd 0 4px, #fff 4px 8px)'
              : value,
          }}
        />
        <span className="color-swatch-label">{label}</span>
      </button>

      {open && !disabled && (
        <div className="color-popover-panel" role="dialog">
          <input
            type="color"
            value={isTransparent ? '#ffffff' : (value || '#ffffff')}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} color picker`}
            className="color-popover-input"
          />
          <input
            type="text"
            value={isTransparent ? '' : value}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#?[0-9a-fA-F]{0,8}$/.test(v)) {
                onChange(v.startsWith('#') ? v : `#${v}`);
              }
            }}
            placeholder="#rrggbb"
            className="color-popover-hex"
            spellCheck={false}
          />
          <button
            type="button"
            className="color-popover-transparent"
            onClick={() => onChange('transparent')}
            title="Transparent (no fill)"
          >
            None
          </button>
        </div>
      )}
    </div>
  );
}