import { useState, useRef, useEffect } from 'react';

/**
 * Multi-select classes: looks like a single dropdown; opens a panel with checkboxes inside.
 */
export function ClassMultiSelectDropdown({
  classes = [],
  selectedIds = [],
  onChange,
  placeholder = 'Select classes…',
  emptyMessage = 'No classes available.',
  buttonClassName = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selectedSet = new Set((selectedIds || []).map(String));
  const names = (classes || [])
    .filter((c) => selectedSet.has(String(c._id)))
    .map((c) => c.name)
    .filter(Boolean);
  const summary = names.length ? names.join(', ') : placeholder;

  const toggle = (id) => {
    const idStr = String(id);
    const next = new Set(selectedSet);
    if (next.has(idStr)) next.delete(idStr);
    else next.add(idStr);
    onChange([...next]);
  };

  return (
    <div className={`relative min-w-[200px] max-w-md ${buttonClassName}`} ref={rootRef}>
      <button
        type="button"
        disabled={disabled || classes.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark text-sm text-left hover:border-examia-soft disabled:opacity-60 disabled:cursor-not-allowed"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate min-w-0">{classes.length === 0 ? emptyMessage : summary}</span>
        <svg className={`w-4 h-4 shrink-0 text-examia-mid transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && classes.length > 0 && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-examia-soft/50 bg-white shadow-lg py-1"
          role="listbox"
          aria-multiselectable="true"
        >
          {classes.map((c) => {
            const id = String(c._id);
            const checked = selectedSet.has(id);
            return (
              <label
                key={id}
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-sm text-examia-dark hover:bg-examia-soft/15"
              >
                <input
                  type="checkbox"
                  className="rounded border-examia-soft text-examia-dark shrink-0"
                  checked={checked}
                  onChange={() => toggle(id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="min-w-0">{c.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
