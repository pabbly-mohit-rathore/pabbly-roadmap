import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

interface Option { value: string; label: string; }

interface Props {
  label: string;
  placeholder?: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  showSelectAll?: boolean;
}

/**
 * Multi-select field with chips rendered INSIDE the field and a portal
 * dropdown that floats above modals/containers. Matches the floating-label
 * input style used throughout the admin forms.
 */
export default function MultiSelectField({ label, placeholder = 'Select…', options, value, onChange, showSelectAll = true }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number; width: number; placement: 'top' | 'bottom';
    top?: number; bottom?: number;
  }>({ left: 0, width: 0, placement: 'bottom', top: 0 });

  useEffect(() => {
    if (!open) return;
    const DROPDOWN_MAX_HEIGHT = 320;
    const GAP = 6;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      // Flip above trigger if not enough space below AND more space above
      const placement = (spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow) ? 'top' : 'bottom';
      if (placement === 'top') {
        // Anchor with `bottom` so dropdown grows upward from just above the trigger
        setPos({ left: r.left, width: r.width, placement, bottom: window.innerHeight - r.top + GAP });
      } else {
        setPos({ left: r.left, width: r.width, placement, top: r.bottom + GAP });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const allSelected = options.length > 0 && value.length === options.length;
  const toggleAll = () => onChange(allSelected ? [] : options.map((o) => o.value));
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label || v;

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        role="button" tabIndex={0}
        className={`w-full rounded-lg border text-sm outline-none transition-colors cursor-pointer flex items-center flex-wrap gap-1.5 ${
          d ? 'border-gray-700 bg-gray-900 text-white hover:border-gray-500' : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
        } ${open ? '!border-gray-400' : ''}`}
        style={{ padding: '11px 40px 11px 11px', minHeight: '53px' }}>
        {value.length === 0 ? null : value.map((v) => (
          <span key={v}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${d ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
            {labelOf(v)}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(v); }}
              className={`rounded-full p-0.5 cursor-pointer ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none ${
        (open || value.length > 0)
          ? 'top-0 -translate-y-1/2 text-[11px] font-medium'
          : 'top-1/2 -translate-y-1/2'
      } ${d ? 'text-white bg-gray-900' : 'text-gray-500 bg-white'}`}>{label}</span>
      <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform pointer-events-none ${open ? 'rotate-180' : ''}`} />

      {open && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.width,
              ...(pos.placement === 'top' ? { bottom: pos.bottom } : { top: pos.top }),
              zIndex: 9999,
              maxHeight: '320px',
              boxShadow: pos.placement === 'top' ? '0 -8px 24px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.12)',
            }}
            className={`rounded-lg border shadow-xl p-1 overflow-y-auto ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {options.length === 0 ? (
              <div className={`px-3 py-6 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                {placeholder || 'No options available'}
              </div>
            ) : (
              <>
                {showSelectAll && (
                  <>
                    <button type="button" onClick={toggleAll}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? 'bg-[#059669] border-[#059669]' : d ? 'border-gray-500' : 'border-gray-400'}`}>
                        {allSelected && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className={`font-semibold ${d ? 'text-gray-100' : 'text-gray-900'}`}>{allSelected ? 'Deselect All' : 'Select All'}</span>
                      <span className={`ml-auto text-[11px] ${d ? 'text-gray-500' : 'text-gray-400'}`}>{value.length}/{options.length}</span>
                    </button>
                    <div className={`mx-2 my-1 border-t border-dashed ${d ? 'border-gray-600' : 'border-gray-200'}`} />
                  </>
                )}
                {options.map((o) => {
                  const checked = value.includes(o.value);
                  return (
                    <button key={o.value} type="button" onClick={() => toggle(o.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-[#059669] border-[#059669]' : d ? 'border-gray-500' : 'border-gray-400'}`}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className={`${d ? 'text-gray-100' : 'text-gray-900'}`}>{o.label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
