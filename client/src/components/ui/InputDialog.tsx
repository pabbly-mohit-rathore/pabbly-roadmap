import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import Tooltip from './Tooltip';

interface InputDialogProps {
  open: boolean;
  title: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputDialog({ open, title, placeholder = '', confirmLabel = 'Add', cancelLabel = 'Cancel', onConfirm, onCancel }: InputDialogProps) {
  const d = useThemeStore((s) => s.theme) === 'dark';
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onConfirm(value.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-3 sm:p-4" onClick={onCancel}>
      <div className={`rounded-xl w-full shadow-xl ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-5 sm:p-7">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${d ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <Link2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className={`text-base font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          </div>
          <input
            autoFocus
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-4 h-[44px] rounded-lg border text-sm transition-colors ${
              d ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500'
            } focus:outline-none`}
          />
          <div className="flex gap-3 justify-end mt-6">
            <Tooltip title="Click here to cancel and close."><button type="button" onClick={onCancel}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>{cancelLabel}</button></Tooltip>
            <button type="submit" disabled={!value.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
