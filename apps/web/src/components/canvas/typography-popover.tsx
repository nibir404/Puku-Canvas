import { useEffect, useRef, useState } from 'react';
import { Type } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TypographyPopoverProps {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  onChangeFamily: (family: string) => void;
  onChangeSize: (size: number) => void;
  onChangeWeight: (weight: 'normal' | 'bold') => void;
}

const FONT_FAMILIES: { label: string; value: string }[] = [
  {
    label: 'System Sans',
    value:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  { label: 'Serif', value: 'ui-serif, Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  { label: 'Cursive', value: '"Brush Script MT", cursive' },
  { label: 'Display', value: '"Avenir Next Condensed", "Trebuchet MS", sans-serif' },
];

const FONT_SIZES = [12, 14, 18, 24, 32, 48];

/**
 * Typography controls — opens a popover with font family, size, and weight.
 */
export function TypographyPopover({
  fontFamily,
  fontSize,
  fontWeight,
  onChangeFamily,
  onChangeSize,
  onChangeWeight,
}: TypographyPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
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

  return (
    <div className="typography-popover" ref={wrapperRef}>
      <button
        type="button"
        aria-label="Typography"
        aria-pressed={open}
        className="typo-button"
        onClick={() => setOpen((v) => !v)}
        title="Typography"
      >
        <Type className="h-4 w-4" />
      </button>

      {open && (
        <div className="typo-panel" role="dialog">
          <label className="typo-row">
            <span className="typo-label">Family</span>
            <select
              className="typo-select"
              value={fontFamily}
              onChange={(e) => onChangeFamily(e.target.value)}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="typo-row">
            <span className="typo-label">Size</span>
            <div className="typo-size-row">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    'typo-size-chip',
                    s === fontSize && 'typo-size-chip-active'
                  )}
                  onClick={() => onChangeSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </label>

          <label className="typo-row">
            <span className="typo-label">Weight</span>
            <div className="typo-weight-row">
              <button
                type="button"
                className={cn(
                  'typo-weight-chip',
                  fontWeight === 'normal' && 'typo-weight-chip-active'
                )}
                onClick={() => onChangeWeight('normal')}
              >
                Regular
              </button>
              <button
                type="button"
                className={cn(
                  'typo-weight-chip',
                  fontWeight === 'bold' && 'typo-weight-chip-active'
                )}
                onClick={() => onChangeWeight('bold')}
              >
                Bold
              </button>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}