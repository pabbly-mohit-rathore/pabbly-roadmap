import { useEffect, useState } from 'react';
import { Toaster, resolveValue, toast as hotToast } from 'react-hot-toast';
import type { Toast } from 'react-hot-toast';
import { Icon } from '@iconify/react';
import { X as XIcon } from 'lucide-react';

function getConfig(type: string) {
  if (type === 'success') return { icon: 'icon-park-solid:check-one', bg: '#118d57', border: '#118d57', iconColor: '#ffffff' };
  if (type === 'error') return { icon: 'icon-park-solid:close-one', bg: '#b71d18', border: '#b71d18', iconColor: '#ffffff' };
  return { icon: 'icon-park-solid:check-one', bg: '#616161', border: '#616161', iconColor: '#ffffff' };
}

function SnackbarToast({ t }: { t: Toast }) {
  const [visible, setVisible] = useState(false);
  const config = getConfig(t.type);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(t.visible));
  }, [t.visible]);

  return (
    <div
      className={`flex items-center gap-3.5 pl-3 pr-2 py-2.5 rounded-lg min-w-[280px] max-w-[400px] transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
      style={{
        pointerEvents: 'auto',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Icon box */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: config.bg, border: `1.5px solid ${config.border}` }}
      >
        <Icon icon={config.icon} width={22} height={22} style={{ color: config.iconColor }} />
      </div>

      {/* Message */}
      <p className="flex-1 text-[13.5px] font-semibold text-gray-800 leading-snug">
        {resolveValue(t.message, t)}
      </p>

      {/* Close button */}
      <button
        onClick={() => hotToast.dismiss(t.id)}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <XIcon className="w-[18px] h-[18px]" strokeWidth={2} />
      </button>
    </div>
  );
}

export default function CustomToaster() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ top: 16, right: 16, pointerEvents: 'none' }}
      toastOptions={{
        duration: 4000,
        style: { background: 'transparent', boxShadow: 'none', padding: 0, margin: 0 },
      }}
    >
      {(t) => <SnackbarToast t={t} />}
    </Toaster>
  );
}
