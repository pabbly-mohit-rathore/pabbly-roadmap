import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import LoadingButton from './LoadingButton';
import Tooltip from './Tooltip';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel, loading }: ConfirmDialogProps) {
  const d = useThemeStore((s) => s.theme) === 'dark';

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-3 sm:p-4" onClick={onCancel}>
      <div className={`rounded-xl w-full shadow-xl ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${d ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className={`text-base font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          </div>
          <p className={`text-sm leading-relaxed ${d ? 'text-gray-400' : 'text-gray-500'}`}>{message}</p>
          <div className="flex gap-3 justify-end mt-8">
            <Tooltip title="Click here to cancel and close."><button onClick={onCancel} disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>{cancelLabel}</button></Tooltip>
            <LoadingButton onClick={onConfirm} loading={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60">
              {confirmLabel}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
