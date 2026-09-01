import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  Save,
  Download,
  Image as ImageIcon,
  Share2,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Menu as MenuIcon,
} from 'lucide-react';
import { useUIStore, type ThemeMode } from '../../store/ui-store';
import { useCanvasStore } from '../../store/canvas-store';
import { createEmptyScene } from '@puku/core';
import { cn } from '../../lib/utils';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  primary?: boolean;
  onSelect?: () => void;
}

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: Event) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocDown, true);
    document.addEventListener('mousedown', onDocDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocDown, true);
      document.removeEventListener('mousedown', onDocDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const loadScene = useCanvasStore((s) => s.loadScene);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const close = useCallback(() => setOpen(false), []);

  const handleReset = () => {
    if (confirm('Reset the canvas? This cannot be undone.')) {
      loadScene(createEmptyScene('My Puku Canvas'));
    }
    close();
  };

  const fileItems: MenuItem[] = [
    {
      icon: <FolderOpen className="h-4 w-4" />,
      label: 'Open scene…',
      shortcut: '⌘O',
      onSelect: () => window.dispatchEvent(new CustomEvent('puku:menu-open')),
    },
    {
      icon: <Save className="h-4 w-4" />,
      label: 'Save scene',
      shortcut: '⌘S',
      onSelect: () => window.dispatchEvent(new CustomEvent('puku:menu-save')),
    },
    {
      icon: <ImageIcon className="h-4 w-4" />,
      label: 'Export image (PNG)',
      shortcut: '⌘⇧E',
      onSelect: () => window.dispatchEvent(new CustomEvent('puku:menu-export-png')),
    },
    {
      icon: <Download className="h-4 w-4" />,
      label: 'Export vector (SVG)',
      onSelect: () => window.dispatchEvent(new CustomEvent('puku:menu-export-svg')),
    },
    {
      icon: <Share2 className="h-4 w-4" />,
      label: 'Share link…',
      onSelect: () => window.dispatchEvent(new CustomEvent('puku:menu-share')),
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Reset the canvas',
      onSelect: handleReset,
    },
  ];

  return (
    <div className="app-menu" ref={wrapperRef}>
      <button
        type="button"
        className="app-menu-button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon className="h-4 w-4" />
      </button>

      <div
        className="app-menu-panel"
        role="menu"
        data-state={open ? 'open' : 'closed'}
        aria-hidden={!open}
      >
        <Section items={fileItems} onAfterSelect={close} />
        <Divider />
        <CanvasBackgroundPicker />
        <Divider />

        {/* Theme picker */}
        <div className="menu-row">
          <span className="menu-row-label">Theme</span>
          <div className="theme-picker">
            <ThemeButton mode="light" current={theme} onSelect={setTheme} icon={<Sun className="h-4 w-4" />} />
            <ThemeButton mode="dark" current={theme} onSelect={setTheme} icon={<Moon className="h-4 w-4" />} />
            <ThemeButton mode="system" current={theme} onSelect={setTheme} icon={<Monitor className="h-4 w-4" />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasBackgroundPicker() {
  const canvasBackground = useUIStore((s) => s.canvasBackground);
  const hasUserBg = useUIStore((s) => s.hasUserCanvasBackground);
  const setCanvasBg = useUIStore((s) => s.setCanvasBackground);
  const resetCanvasBg = useUIStore((s) => s.resetCanvasBackground);

  const colors = [
    { label: 'White', hex: '#ffffff' },
    { label: 'Off-white', hex: '#f8fafc' },
    { label: 'Warm Cream', hex: '#fef9c3' },
    { label: 'Soft Mint', hex: '#ecfdf5' },
    { label: 'Slate', hex: '#1e293b' },
    { label: 'Dark Navy', hex: '#0f172a' },
  ];

  return (
    <div className="menu-row menu-row-stack">
      <div className="flex items-center justify-between w-full">
        <span className="menu-row-label">Canvas background</span>
        {hasUserBg && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
            onClick={resetCanvasBg}
          >
            Auto
          </button>
        )}
      </div>
      <div className="bg-swatches">
        {colors.map((c) => {
          const active = hasUserBg && canvasBackground.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              className={cn('bg-swatch', active && 'bg-swatch-active')}
              style={{ backgroundColor: c.hex }}
              title={c.label}
              onClick={() => setCanvasBg(c.hex)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Section({ items, onAfterSelect }: { items: MenuItem[]; onAfterSelect: () => void }) {
  return (
    <div className="menu-section">
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          className={cn(
            'menu-item',
            item.disabled && 'disabled',
            item.primary && 'primary'
          )}
          disabled={item.disabled}
          onClick={() => {
            item.onSelect?.();
            if (!item.disabled) onAfterSelect();
          }}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return <div className="menu-divider" />;
}

function ThemeButton({
  mode,
  current,
  onSelect,
  icon,
}: {
  mode: ThemeMode;
  current: ThemeMode;
  onSelect: (m: ThemeMode) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn('theme-picker-btn', current === mode && 'theme-picker-btn-active')}
      aria-label={`Theme ${mode}`}
      onClick={() => onSelect(mode)}
    >
      {icon}
    </button>
  );
}
