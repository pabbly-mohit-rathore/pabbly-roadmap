import { useEffect, useState } from 'react';
import { PauseCircle, Rocket } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import CommentEditor from '../CommentEditor';
import LoadingButton from './LoadingButton';
import Tooltip from './Tooltip';

interface StatusReasonDialogProps {
  open: boolean;
  status: 'hold' | 'live' | null;
  // `reason` is rich-text HTML produced by CommentEditor
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Strip tags + entities so we can validate the actual typed text length.
const plainTextLength = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length;

export default function StatusReasonDialog({ open, status, onConfirm, onCancel, loading }: StatusReasonDialogProps) {
  const d = useThemeStore((s) => s.theme) === 'dark';
  const [reasonHtml, setReasonHtml] = useState('');

  useEffect(() => {
    if (open) setReasonHtml('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open || !status) return null;

  const isHold = status === 'hold';
  const title = isHold ? 'Put on Hold' : 'Mark as Live';
  const subtitle = isHold
    ? 'Why is this being put on hold?'
    : 'Share what shipped with this release.';
  const description = isHold
    ? 'Please provide a reason for putting this post on hold. Your note will be posted as a comment on the post for future reference.'
    : 'Please share the release notes or a short update. Your note will be posted as a comment on the post for everyone to see.';
  const placeholder = isHold
    ? 'Write a reason for hold…'
    : 'Write release notes or a short update…';
  const confirmLabel = isHold ? 'Put on Hold' : 'Mark as Live';
  const Icon = isHold ? PauseCircle : Rocket;
  const iconWrapBg = isHold
    ? (d ? 'bg-amber-900/30' : 'bg-amber-50')
    : (d ? 'bg-emerald-900/30' : 'bg-emerald-50');
  const iconColor = isHold ? 'text-amber-500' : 'text-emerald-500';
  const confirmBtn = isHold
    ? 'bg-amber-500 hover:bg-amber-600'
    : 'bg-emerald-600 hover:bg-emerald-700';

  const canSubmit = plainTextLength(reasonHtml) >= 3 && !loading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-3 sm:p-4" onClick={onCancel}>
      <div className={`rounded-xl w-full shadow-xl max-h-[95vh] overflow-y-auto ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconWrapBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-base font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
              <p className={`text-sm mt-0.5 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
            </div>
          </div>

          <p className={`text-sm leading-relaxed mb-4 ${d ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>

          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${d ? 'text-gray-400' : 'text-gray-600'}`}>
            Reason <span className="text-red-500">*</span>
          </label>

          <CommentEditor
            key={status}
            placeholder={placeholder}
            buttonLabel={confirmLabel}
            submitting={loading}
            hideButton
            maxEditorHeight="160px"
            onSubmit={(html) => { if (plainTextLength(html) >= 3) onConfirm(html); }}
            onContentChange={(html) => setReasonHtml(html)}
          />

          <div className="flex gap-3 justify-end mt-6">
            <Tooltip title="Click here to cancel and close."><button onClick={onCancel} disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>Cancel</button></Tooltip>
            <LoadingButton onClick={() => canSubmit && onConfirm(reasonHtml)} disabled={!canSubmit} loading={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmBtn}`}>
              {confirmLabel}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
