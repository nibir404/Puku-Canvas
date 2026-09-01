import { useEffect, useRef, useState } from 'react';
import { FilePlus, FileText, Trash2, Copy, X } from 'lucide-react';
import { useCanvasStore } from '../../store/canvas-store';
import { cn } from '../../lib/utils';

/**
 * Slide-in left panel listing all pages. Mirrors the AI right-panel
 * pattern: open/close animated, click-outside to close, X button.
 */
export function PagesPanel() {
  const open = useCanvasStore((s) => s.pagesPanelOpen);
  const closePanel = useCanvasStore((s) => s.closePagesPanel);

  if (!open) return null;

  return (
    <aside className="pages-side-panel" aria-label="Pages">
      <header className="pages-panel-header">
        <div className="pages-panel-title">
          <FileText className="h-4 w-4" />
          <span>Pages</span>
        </div>
        <button
          type="button"
          aria-label="Close pages panel"
          className="pages-close-btn"
          onClick={closePanel}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="pages-panel-body">
        <NewPageButton />
        <PageList />
      </div>
    </aside>
  );
}

export function PagesBackdrop() {
  const open = useCanvasStore((s) => s.pagesPanelOpen);
  const closePanel = useCanvasStore((s) => s.closePagesPanel);

  if (!open) return null;
  return <div className="pages-backdrop" aria-hidden="true" onClick={closePanel} />;
}

function NewPageButton() {
  const createPage = useCanvasStore((s) => s.createPage);
  return (
    <button
      type="button"
      className="pages-new-btn"
      onClick={() => createPage()}
    >
      <FilePlus className="h-4 w-4" />
      <span>New page</span>
    </button>
  );
}

function PageList() {
  const pages = useCanvasStore((s) => s.pages);
  const activeId = useCanvasStore((s) => s.activePageId);
  const selectPage = useCanvasStore((s) => s.selectPage);
  const deletePage = useCanvasStore((s) => s.deletePage);
  const duplicatePage = useCanvasStore((s) => s.duplicatePage);
  const renamePage = useCanvasStore((s) => s.renamePage);

  return (
    <ul className="pages-list">
      {pages.map((p) => (
        <PageItem
          key={p.id}
          id={p.id}
          name={p.name}
          active={p.id === activeId}
          isOnly={pages.length === 1}
          onSelect={() => selectPage(p.id)}
          onDelete={() => deletePage(p.id)}
          onDuplicate={() => duplicatePage(p.id)}
          onRename={(name) => renamePage(p.id, name)}
        />
      ))}
    </ul>
  );
}

interface PageItemProps {
  id: string;
  name: string;
  active: boolean;
  isOnly: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
}

function PageItem({ name, active, isOnly, onSelect, onDelete, onDuplicate, onRename }: PageItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <li
      className={cn('pages-item', active && 'pages-item-active')}
      onClick={!editing ? onSelect : undefined}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <FileText className="h-4 w-4 pages-item-icon" />
      {editing ? (
        <input
          ref={inputRef}
          className="pages-item-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="pages-item-name" title={name}>
          {name}
        </span>
      )}
      {!editing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="pages-item-delete"
            aria-label={`Duplicate page ${name}`}
            title="Duplicate page"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {!isOnly && (
            <button
              type="button"
              className="pages-item-delete"
              aria-label={`Delete page ${name}`}
              title="Delete page"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}