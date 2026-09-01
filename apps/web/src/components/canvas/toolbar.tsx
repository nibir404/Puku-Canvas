import {
  MousePointer2,
  Square,
  Circle,
  Diamond,
  Type,
  StickyNote,
  MoveRight,
  Trash2,
  Pen,
  Minus,
  Hand,
  Undo2,
  Redo2,
  Maximize2,
  Files,
  type LucideIcon,
} from 'lucide-react';
import type { Tool } from '../../store/canvas-store';
import { useCanvasStore } from '../../store/canvas-store';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Tooltip } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { ColorPopover } from './color-popover';
import { TypographyPopover } from './typography-popover';

interface ToolDef {
  id: Tool;
  label: string;
  hint: string;
  icon: LucideIcon;
}

const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', hint: 'Select & move (V)', icon: MousePointer2 },
  { id: 'pan', label: 'Hand', hint: 'Pan canvas (H)', icon: Hand },
  { id: 'rectangle', label: 'Rectangle', hint: 'Drag to draw rectangle (R)', icon: Square },
  { id: 'ellipse', label: 'Ellipse', hint: 'Drag to draw ellipse (O)', icon: Circle },
  { id: 'diamond', label: 'Diamond', hint: 'Drag to draw decision (D)', icon: Diamond },
  { id: 'text', label: 'Text', hint: 'Drag to draw text box (T)', icon: Type },
  { id: 'sticky', label: 'Sticky', hint: 'Drag to draw sticky note (N)', icon: StickyNote },
  { id: 'connector', label: 'Connector', hint: 'Drag to draw a free connector (A)', icon: MoveRight },
  { id: 'line', label: 'Line', hint: 'Drag to draw line (L)', icon: Minus },
  { id: 'freedraw', label: 'Pen', hint: 'Freedraw / pen (F)', icon: Pen },
];

/**
 * Tools that produce a node with stroke + fill (not arrows/lines/freedraw).
 * Color controls are shown only for these — the user spec says text is fill-only,
 * so the stroke picker is hidden when the active tool is 'text'.
 */
const COLOR_TOOLS: Tool[] = ['rectangle', 'ellipse', 'diamond', 'sticky', 'text'];

export function Toolbar() {
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const selectedCount = useCanvasStore((s) => s.selectedIds.size);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const past = useCanvasStore((s) => s.past.length);
  const future = useCanvasStore((s) => s.future.length);
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const pagesPanelOpen = useCanvasStore((s) => s.pagesPanelOpen);
  const openPagesPanel = useCanvasStore((s) => s.openPagesPanel);
  const closePagesPanel = useCanvasStore((s) => s.closePagesPanel);

  // Style controls
  const scene = useCanvasStore((s) => s.scene);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const defaultStroke = useCanvasStore((s) => s.defaultStroke);
  const defaultFill = useCanvasStore((s) => s.defaultFill);
  const defaultFontFamily = useCanvasStore((s) => s.defaultFontFamily);
  const defaultFontSize = useCanvasStore((s) => s.defaultFontSize);
  const defaultFontWeight = useCanvasStore((s) => s.defaultFontWeight);
  const applyDefaultStyle = useCanvasStore((s) => s.applyDefaultStyle);

  // When exactly one shape is selected, the picker reflects that shape's
  // values and edits it in-place; otherwise it edits the defaults.
  const singleSelected =
    selectedCount === 1
      ? scene.shapes.find((s) => s.id === [...selectedIds][0])
      : undefined;

  const showColorControls = COLOR_TOOLS.includes(tool) || singleSelected;

  const strokeValue = singleSelected
    ? singleSelected.stroke ?? defaultStroke
    : defaultStroke;
  const fillValue = singleSelected ? singleSelected.fill ?? defaultFill : defaultFill;
  const fontFamilyValue =
    singleSelected && (singleSelected as any).fontFamily
      ? (singleSelected as any).fontFamily
      : defaultFontFamily;
  const fontSizeValue =
    singleSelected && (singleSelected as any).fontSize
      ? (singleSelected as any).fontSize
      : defaultFontSize;
  const fontWeightValue =
    singleSelected && (singleSelected as any).fontWeight
      ? (singleSelected as any).fontWeight
      : defaultFontWeight;

  // Stroke is hidden for 'text' kind (text shapes use fill only).
  const isTextOnly = tool === 'text' || singleSelected?.kind === 'text';

  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      <Tooltip tip="Pages" side="bottom">
        <Button
          variant={pagesPanelOpen ? 'default' : 'ghost'}
          size="icon"
          aria-label="Pages"
          aria-pressed={pagesPanelOpen}
          className={cn(pagesPanelOpen && 'bg-primary text-primary-foreground')}
          onClick={() =>
            pagesPanelOpen ? closePagesPanel() : openPagesPanel()
          }
        >
          <Files className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Separator orientation="vertical" />

      {TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <Tooltip key={t.id} tip={t.hint} side="bottom">
            <Button
              variant={tool === t.id ? 'default' : 'ghost'}
              size="icon"
              aria-label={t.label}
              aria-pressed={tool === t.id}
              className={cn(tool === t.id && 'bg-primary text-primary-foreground')}
              onClick={() => setTool(t.id)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </Tooltip>
        );
      })}

      {showColorControls && (
        <>
          <Separator orientation="vertical" />

          {/* Stroke swatch — hidden for text-only shapes. */}
          {!isTextOnly && (
            <ColorPopover
              label="Stroke"
              value={strokeValue}
              onChange={(c) => applyDefaultStyle('stroke', c)}
              variant="outlined"
            />
          )}

          {/* Fill swatch */}
          <ColorPopover
            label="Fill"
            value={fillValue}
            onChange={(c) => applyDefaultStyle('fill', c)}
          />

          {/* Typography controls */}
          <TypographyPopover
            fontFamily={fontFamilyValue}
            fontSize={fontSizeValue}
            fontWeight={fontWeightValue}
            onChangeFamily={(f) => applyDefaultStyle('fontFamily', f)}
            onChangeSize={(s) => applyDefaultStyle('fontSize', String(s))}
            onChangeWeight={(w) => applyDefaultStyle('fontWeight', w)}
          />
        </>
      )}

      <Separator orientation="vertical" />

      <Tooltip tip="Undo (⌘Z)">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Undo"
          disabled={past === 0}
          onClick={undo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip tip="Redo (⌘⇧Z)">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Redo"
          disabled={future === 0}
          onClick={redo}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Separator orientation="vertical" />

      <Tooltip tip="Delete selected (⌫)" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete selected"
          disabled={selectedCount === 0}
          onClick={deleteSelected}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Tooltip tip="Reset view (⌘0)">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Reset view"
          onClick={resetViewport}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  );
}