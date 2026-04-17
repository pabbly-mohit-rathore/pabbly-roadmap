import { useState, useEffect } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, ExternalLink } from 'lucide-react';
import useThemeStore from '../store/themeStore';
import type { ButtonAttributes } from './ButtonExtension';
import Tooltip from './ui/Tooltip';

interface ButtonConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (attrs: ButtonAttributes) => void;
  initialAttrs?: Partial<ButtonAttributes>;
}

const defaults: ButtonAttributes = {
  text: 'Button title',
  url: '',
  style: 'primary',
  alignment: 'left',
  fullWidth: false,
  openInNewTab: true,
  color: '#059669',
  textColor: '#ffffff',
};

export default function ButtonConfigModal({ isOpen, onClose, onInsert, initialAttrs }: ButtonConfigModalProps) {
  const d = useThemeStore((s) => s.theme) === 'dark';
  const [attrs, setAttrs] = useState<ButtonAttributes>({ ...defaults, ...initialAttrs });

  useEffect(() => {
    if (isOpen) setAttrs({ ...defaults, ...initialAttrs });
  }, [isOpen, initialAttrs]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = <K extends keyof ButtonAttributes>(key: K, val: ButtonAttributes[K]) =>
    setAttrs((prev) => ({ ...prev, [key]: val }));

  const btnColor = attrs.color || '#059669';

  const previewStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '10px 24px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    cursor: 'pointer',
    ...(attrs.style === 'primary'
      ? { backgroundColor: btnColor, color: attrs.textColor || '#ffffff', border: 'none' }
      : { backgroundColor: 'transparent', color: btnColor, border: `2px solid ${btnColor}` }),
    ...(attrs.fullWidth ? { width: '100%', textAlign: 'center' as const, boxSizing: 'border-box' as const } : {}),
  };

  const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className={`rounded-xl w-full shadow-xl ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
          <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Insert Button</h2>
          <Tooltip title="Click here to close."><button onClick={onClose} className={`p-2 rounded-lg transition-colors ${d ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button></Tooltip>
        </div>

        {/* Body */}
        <div className="space-y-5" style={{ padding: '24px' }}>

          {/* Preview */}
          <div className={`flex rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
            style={{ justifyContent: alignMap[attrs.alignment], padding: '16px' }}>
            <span style={previewStyle}>{attrs.text || 'Button title'}</span>
          </div>

          {/* Button text */}
          <div>
            <div className="relative">
              <input type="text" value={attrs.text} placeholder=" "
                onChange={(e) => set('text', e.target.value)}
                style={{ padding: '16.5px 14px' }}
                className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
              <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Button Text *</span>
            </div>
            <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>The text displayed on the button.</p>
          </div>

          {/* URL */}
          <div>
            <div className="relative">
              <ExternalLink className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
              <input type="url" value={attrs.url} placeholder=" "
                onChange={(e) => set('url', e.target.value)}
                style={{ padding: '16.5px 14px 16.5px 38px' }}
                className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
              <span className={`absolute left-9 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                peer-focus:top-0 peer-focus:left-2.5 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-2.5 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>URL</span>
            </div>
            <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>The URL the button links to.</p>
          </div>

          {/* Row 1: Style + Alignment */}
          <div className="flex items-start gap-6">
            <div>
              <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '2px' }}>Style</p>
              <div className="flex gap-2">
                {(['primary', 'outline'] as const).map((s) => (
                  <button key={s} onClick={() => set('style', s)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      attrs.style === s
                        ? 'text-white border-transparent'
                        : d ? 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    style={attrs.style === s ? { backgroundColor: '#059669', borderColor: '#059669' } : undefined}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '2px' }}>Alignment</p>
              <div className={`flex rounded-lg border overflow-hidden ${d ? 'border-gray-600' : 'border-gray-300'}`}>
                {([
                  { val: 'left' as const, icon: AlignLeft },
                  { val: 'center' as const, icon: AlignCenter },
                  { val: 'right' as const, icon: AlignRight },
                ]).map(({ val, icon: Icon }) => (
                  <button key={val} onClick={() => set('alignment', val)}
                    className={`p-2 transition-colors ${
                      attrs.alignment === val
                        ? 'bg-[#059669] text-white'
                        : d ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Button Text Color + Button Color */}
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '2px' }}>Button Text Color</p>
              <div className={`flex items-center rounded-lg border overflow-hidden ${d ? 'border-gray-600' : 'border-gray-300'}`}>
                <input
                  type="text"
                  value={attrs.textColor || '#ffffff'}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set('textColor', e.target.value); }}
                  maxLength={7}
                  className={`flex-1 min-w-0 px-3 text-[13px] font-mono border-none outline-none ${d ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
                  style={{ height: '34px' }}
                  placeholder="#ffffff"
                />
                <div className={`relative shrink-0 ${d ? 'border-l border-gray-600' : 'border-l border-gray-300'}`} style={{ width: '34px', height: '34px' }}>
                  <div className="absolute inset-0" style={{ backgroundColor: attrs.textColor || '#ffffff' }} />
                  <input
                    type="color"
                    value={attrs.textColor || '#ffffff'}
                    onChange={(e) => set('textColor', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '2px' }}>Button Color</p>
              <div className={`flex items-center rounded-lg border overflow-hidden ${d ? 'border-gray-600' : 'border-gray-300'}`}>
                <input
                  type="text"
                  value={btnColor}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set('color', e.target.value); }}
                  maxLength={7}
                  className={`flex-1 min-w-0 px-3 text-[13px] font-mono border-none outline-none ${d ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
                  style={{ height: '34px' }}
                  placeholder="#059669"
                />
                <div className={`relative shrink-0 ${d ? 'border-l border-gray-600' : 'border-l border-gray-300'}`} style={{ width: '34px', height: '34px' }}>
                  <div className="absolute inset-0" style={{ backgroundColor: btnColor }} />
                  <input
                    type="color"
                    value={btnColor}
                    onChange={(e) => set('color', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Toggles */}
          <div className="flex gap-8">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className={`relative w-9 h-5 rounded-full transition-colors ${attrs.fullWidth ? 'bg-[#059669]' : d ? 'bg-gray-600' : 'bg-gray-300'}`}
                onClick={() => set('fullWidth', !attrs.fullWidth)}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${attrs.fullWidth ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>Full width</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className={`relative w-9 h-5 rounded-full transition-colors ${attrs.openInNewTab ? 'bg-[#059669]' : d ? 'bg-gray-600' : 'bg-gray-300'}`}
                onClick={() => set('openInNewTab', !attrs.openInNewTab)}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${attrs.openInNewTab ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>Open in new tab</span>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <Tooltip title="Click here to cancel and close."><button onClick={onClose}
              className={`px-4 py-2 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              style={{ borderRadius: '8px' }}>Cancel</button></Tooltip>
            <Tooltip title="Click here to insert."><button onClick={() => { onInsert(attrs); onClose(); }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] transition-colors"
              style={{ borderRadius: '8px' }}>Insert Button</button></Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
