import { memo, useEffect, useState, useCallback } from 'react';
import { Toaster, resolveValue, toast as hotToast } from 'react-hot-toast';
import type { Toast } from 'react-hot-toast';

// Inline SVG icons — no network fetch, no @iconify/react overhead
const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
    <path d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM20 34L10 24L12.82 21.18L20 28.34L35.18 13.16L38 16L20 34Z" fill="white"/>
  </svg>
);

const ErrorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
    <path d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM32.18 34L24 25.82L15.82 34L14 32.18L22.18 24L14 15.82L15.82 14L24 22.18L32.18 14L34 15.82L25.82 24L34 32.18L32.18 34Z" fill="white"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

function getConfig(type: string) {
  if (type === 'success') return { icon: <CheckIcon />, bg: '#118d57' };
  if (type === 'error') return { icon: <ErrorIcon />, bg: '#b71d18' };
  return { icon: <CheckIcon />, bg: '#616161' };
}

const SnackbarToast = memo(function SnackbarToast({ t }: { t: Toast }) {
  const [visible, setVisible] = useState(false);
  const config = getConfig(t.type);

  useEffect(() => {
    if (t.visible) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
    }
  }, [t.visible]);

  // Use toast.remove for instant cleanup — no animation loop, no lag
  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    hotToast.remove(t.id);
  }, [t.id]);

  return (
    <div
      className={`flex items-center gap-3.5 pl-3 pr-2 py-2.5 rounded-lg min-w-[280px] max-w-[400px] ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
      style={{
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
      }}
    >
      {/* Icon box */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: config.bg }}
      >
        {config.icon}
      </div>

      {/* Message */}
      <p className="flex-1 text-[13.5px] font-semibold text-gray-800 leading-snug">
        {resolveValue(t.message, t)}
      </p>

      {/* Close button */}
      <button
        type="button"
        onMouseDown={handleDismiss}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
        style={{ transition: 'color 0.15s, background-color 0.15s' }}
      >
        <CloseIcon />
      </button>
    </div>
  );
});

export default function CustomToaster() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ top: 16, right: 16 }}
      toastOptions={{
        duration: 4000,
        style: { background: 'transparent', boxShadow: 'none', padding: 0, margin: 0 },
      }}
    >
      {(t) => <SnackbarToast t={t} />}
    </Toaster>
  );
}
