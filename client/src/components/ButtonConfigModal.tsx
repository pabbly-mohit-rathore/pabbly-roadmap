import { useState, useEffect } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, ExternalLink } from 'lucide-react';
import type { ButtonAttributes } from './ButtonExtension';

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
  customCSS: '',
};

export default function ButtonConfigModal({ isOpen, onClose, onInsert, initialAttrs }: ButtonConfigModalProps) {
  const [attrs, setAttrs] = useState<ButtonAttributes>({ ...defaults, ...initialAttrs });

  useEffect(() => {
    if (isOpen) setAttrs({ ...defaults, ...initialAttrs });
  }, [isOpen, initialAttrs]);

  if (!isOpen) return null;

  const set = <K extends keyof ButtonAttributes>(key: K, val: ButtonAttributes[K]) =>
    setAttrs((prev) => ({ ...prev, [key]: val }));

  const previewStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '10px 24px',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    cursor: 'pointer',
    ...(attrs.style === 'primary'
      ? { backgroundColor: '#4f46e5', color: '#fff', border: 'none' }
      : { backgroundColor: 'transparent', color: '#4f46e5', border: '2px solid #4f46e5' }),
    ...(attrs.fullWidth ? { width: '100%', textAlign: 'center' as const, boxSizing: 'border-box' as const } : {}),
  };

  const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Insert Button</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Preview */}
          <div
            className="flex p-4 rounded-lg bg-gray-50 border"
            style={{ justifyContent: alignMap[attrs.alignment] }}
          >
            <span style={previewStyle}>{attrs.text || 'Button title'}</span>
          </div>

          {/* Button text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button text</label>
            <input
              type="text"
              value={attrs.text}
              onChange={(e) => set('text', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Button title"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={attrs.url}
                onChange={(e) => set('url', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Style + Alignment row */}
          <div className="flex gap-6">
            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
              <div className="flex gap-2">
                {(['primary', 'outline'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => set('style', s)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition ${
                      attrs.style === s
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alignment</label>
              <div className="flex gap-1 border rounded-lg overflow-hidden">
                {([
                  { val: 'left' as const, icon: AlignLeft },
                  { val: 'center' as const, icon: AlignCenter },
                  { val: 'right' as const, icon: AlignRight },
                ]).map(({ val, icon: Icon }) => (
                  <button
                    key={val}
                    onClick={() => set('alignment', val)}
                    className={`p-2 transition ${
                      attrs.alignment === val
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex gap-8">
            {/* Full width */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative w-9 h-5 rounded-full transition ${attrs.fullWidth ? 'bg-indigo-600' : 'bg-gray-300'}`}
                onClick={() => set('fullWidth', !attrs.fullWidth)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    attrs.fullWidth ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">Full width</span>
            </label>

            {/* Open in new tab */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative w-9 h-5 rounded-full transition ${attrs.openInNewTab ? 'bg-indigo-600' : 'bg-gray-300'}`}
                onClick={() => set('openInNewTab', !attrs.openInNewTab)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    attrs.openInNewTab ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">Open in new tab</span>
            </label>
          </div>

          {/* Custom CSS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom CSS</label>
            <input
              type="text"
              value={attrs.customCSS}
              onChange={(e) => set('customCSS', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
              placeholder="e.g. background-color: #ff5500; color: white;"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInsert(attrs);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Insert Button
          </button>
        </div>
      </div>
    </div>
  );
}
