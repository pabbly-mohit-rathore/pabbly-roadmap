import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  minWidth?: string;
  className?: string;
  bgClass?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ label, value, options, onChange, minWidth = '150px', className = '', bgClass }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const d = useThemeStore((s) => s.theme === 'dark');

  const resolvedBg = bgClass || (d ? 'bg-gray-700' : 'bg-white');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-6 rounded-lg border text-sm transition-colors ${
          open
            ? (d ? 'border-gray-400 bg-gray-700' : 'border-gray-400 bg-white')
            : (d ? 'border-gray-600 bg-gray-700 hover:border-gray-500' : 'border-gray-300 bg-white hover:border-gray-400')
        }`} style={{ minWidth, padding: '0 14px', height: '48px' }}>
        <span className={`absolute -top-2 left-2.5 px-1 text-[11px] font-medium ${
          d ? 'text-gray-400' : 'text-gray-500'
        } ${resolvedBg}`}>{label}</span>
        <span className={d ? 'text-white' : 'text-gray-800'}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${d ? 'text-gray-400' : 'text-gray-500'}`} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 w-full rounded-lg border shadow-lg z-50 max-h-[240px] overflow-y-auto ${
          d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className="p-1.5 space-y-0.5">
            {options.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors ${
                  value === opt.value
                    ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                    : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
