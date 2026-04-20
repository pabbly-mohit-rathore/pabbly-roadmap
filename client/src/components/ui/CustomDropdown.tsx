import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  buttonBgClass?: string;
  dropUp?: boolean;
  portalMode?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ label, value, options, onChange, minWidth = '150px', className = '', bgClass, buttonBgClass, dropUp = false, portalMode = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const d = useThemeStore((s) => s.theme === 'dark');

  // Default dark bg matches standard filter panel bg (bg-gray-800) so label blends seamlessly.
  // Dialog usages pass buttonBgClass/bgClass to override (e.g. bg-gray-900).
  const resolvedButtonBg = buttonBgClass || (d ? 'bg-gray-800' : 'bg-white');
  const resolvedButtonBgOpen = buttonBgClass || (d ? 'bg-gray-800' : 'bg-white');
  const resolvedBg = bgClass || buttonBgClass || (d ? 'bg-gray-800' : 'bg-white');

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (
      ref.current && !ref.current.contains(target) &&
      menuRef.current && !menuRef.current.contains(target)
    ) {
      setOpen(false);
    }
    if (!portalMode && ref.current && !ref.current.contains(target)) {
      setOpen(false);
    }
  }, [portalMode]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Update position when open in portal mode - auto detect up/down
  useEffect(() => {
    if (!open || !portalMode || !btnRef.current) return;
    const updatePos = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      // Estimate actual menu height: each option ~36px + 12px padding
      const estimatedHeight = Math.min(options.length * 36 + 12, 240);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      // If not enough space below, open upward
      if (spaceBelow < estimatedHeight) {
        setMenuPos({ top: rect.top - estimatedHeight - 4, left: rect.left, width: rect.width });
      } else {
        setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, portalMode]);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  const menuContent = (
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
  );

  // After portal menu renders, recalculate position based on actual height
  useEffect(() => {
    if (!open || !portalMode || !menuRef.current || !btnRef.current) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const btnRect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - btnRect.bottom - 8;
    if (spaceBelow < menuRect.height) {
      setMenuPos(prev => ({ ...prev, top: btnRect.top - menuRect.height - 4 }));
    }
  });

  const portalMenu = open && portalMode ? createPortal(
    <div ref={menuRef} className={`fixed rounded-lg border shadow-2xl max-h-[240px] overflow-y-auto ${
      d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
    }`} style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 99999 }}>
      {menuContent}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button ref={btnRef} onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-6 rounded-lg border text-sm transition-colors ${
          open
            ? (d ? `border-gray-400 ${resolvedButtonBgOpen}` : 'border-gray-400 bg-white')
            : (d ? `border-gray-600 ${resolvedButtonBg} hover:border-gray-500` : 'border-gray-300 bg-white hover:border-gray-400')
        }`} style={{ minWidth, padding: '0 14px', height: '48px' }}>
        <span className={`absolute -top-2 left-2.5 px-1 text-[11px] font-medium ${
          d ? 'text-white' : 'text-gray-500'
        } ${resolvedBg}`}>{label}</span>
        <span className={d ? 'text-white' : 'text-gray-800'}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${d ? 'text-gray-400' : 'text-gray-500'}`} />
      </button>
      {portalMenu}
      {open && !portalMode && (
        <div className={`absolute ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 w-full rounded-lg border shadow-lg z-50 max-h-[240px] overflow-y-auto ${
          d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          {menuContent}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
