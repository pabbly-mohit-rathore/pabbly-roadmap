import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Sparkles, Settings as SettingsIcon, ChevronDown, Info, Filter } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import Tooltip from '../../components/ui/Tooltip';
import CustomDropdown from '../../components/ui/CustomDropdown';
import MultiSelectField from '../../components/ui/MultiSelectField';
import CodeBlock from '../../components/ui/CodeBlock';

// Minimal shape the editor reads from the widget record. (Previously
// re-used from WidgetPreview; kept inline now that the preview is
// replaced with the live widget.js runtime.)
interface WidgetConfig {
  name: string;
  type: 'modal' | 'popover' | string;
  openFrom: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'auto' | string;
  theme: 'light' | 'dark' | string;
  accentColor: string;
  widgetWidth: number | null;
  hideDefaultTrigger: boolean;
  disableExpansion: boolean;
  modules: string[];
  showSubmissionFormOnly: boolean;
  suggestSimilarPosts: boolean;
  hideBoardSelection: boolean;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'live', label: 'Live' },
  { value: 'hold', label: 'On Hold' },
];

// Open From — Modal (drawer/centered-modal) vs Popover (anchored dialog).
const MODAL_OPEN_FROM = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
];
const POPOVER_OPEN_FROM = [
  { value: 'auto', label: 'Auto' },
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_voted', label: 'Most Voted' },
  { value: 'most_commented', label: 'Most Commented' },
];

interface Widget extends WidgetConfig {
  id: string;
  token: string;
  customTrigger: boolean;
  customTriggerSelector: string | null;
  boardIds: string[];
  submissionBoardId: string | null;
  postStatuses: string[];
  defaultSort: string;
  isActive: boolean;
}

interface Board { id: string; name: string; }

const COLOR_PRESETS = ['#059669', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4'];

export default function EmbedWidgetEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';

  const [widget, setWidget] = useState<Widget | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, b] = await Promise.all([
        api.get(`/embed-widgets/${id}`),
        api.get('/boards'),
      ]);
      if (w.data.success) setWidget(w.data.data.widget);
      if (b.data.success) setBoards(b.data.data.boards);
    } catch {
      toast.error('Failed to load widget');
      navigate('/admin/settings?tab=embed-widgets');
    } finally { setLoading(false); }
  };

  const update = (patch: Partial<Widget>) => {
    setWidget((w) => (w ? { ...w, ...patch } : w));
  };

  const savePayload = async (silent = false) => {
    if (!widget) return false;
    if (!widget.name.trim()) { toast.error('Widget name is required'); return false; }
    const { id: _id, token: _t, createdAt: _c, ...payload } = widget as any;
    const r = await api.put(`/embed-widgets/${id}`, payload);
    if (!r.data.success) throw new Error(r.data.message || 'Save failed');
    if (!silent) toast.success('Widget saved');
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try { await savePayload(); }
    catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // Test Widget: save latest config, load widget.js runtime, open the real
  // widget so upvote/submit/search all work against live backend.
  const handleTest = async () => {
    if (!widget || testing) return;
    setTesting(true);
    const loadingToast = toast.loading('Opening test widget…');
    try {
      await savePayload(true);

      const origin = (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api', '') || window.location.origin;
      const scriptUrl = `${origin}/widget.js`;

      // Load widget.js once — widget registers itself on window.
      if (!(window as any).PabblyRoadmapWidget) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[data-prw="1"]`) as HTMLScriptElement | null;
          if (existing) { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', () => reject(new Error('Script load failed'))); return; }
          const s = document.createElement('script');
          s.src = scriptUrl + '?v=' + Date.now(); // cache-bust during dev
          s.async = true;
          s.setAttribute('data-prw', '1');
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Script load failed'));
          document.head.appendChild(s);
        });
      }

      const Ctor = (window as any).PabblyRoadmapWidget;
      if (!Ctor) throw new Error('Widget script not available');

      // Dispose any previous test instance
      if ((window as any).__prwTestInstance) {
        try { (window as any).__prwTestInstance.close(); } catch { /* ignore */ }
      }

      const instance = new Ctor({
        token: widget.token,
        autoOpen: true,
        hideDefaultTrigger: true, // no floating button while testing
      });
      (window as any).__prwTestInstance = instance;
      instance.init();
      toast.dismiss(loadingToast);
    } catch (e: any) {
      toast.dismiss(loadingToast);
      toast.error(e?.response?.data?.message || e?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const embedCode = useMemo(() => {
    if (!widget) return '';
    const origin = (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api', '') || window.location.origin;
    const cfg: any = {
      type: widget.type,
      openFrom: widget.openFrom,
      theme: widget.theme,
      accent: widget.accentColor,
      token: widget.token,
      modules: widget.modules,
      sort: widget.defaultSort,
    };
    if (widget.postStatuses.length > 0) cfg.statuses = widget.postStatuses;
    if (widget.boardIds.length > 0) cfg.boards = widget.boardIds;
    if (widget.customTrigger && widget.customTriggerSelector) cfg.selector = widget.customTriggerSelector;
    const lines = [
      widget.customTrigger && widget.customTriggerSelector
        ? `<button id="${widget.customTriggerSelector.replace('#', '')}">Open Widget ✨</button>`
        : '',
      `<script src="${origin}/widget.js"></script>`,
      `<script>`,
      `  const widget = new window.PabblyRoadmapWidget(${JSON.stringify(cfg, null, 2).replace(/\n/g, '\n  ')});`,
      `  widget.init();`,
      `</script>`,
    ].filter(Boolean);
    return lines.join('\n');
  }, [widget]);

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied');
  };

  if (loading || !widget) return <LoadingBar />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <input type="text" value={widget.name} onChange={(e) => update({ name: e.target.value })}
            className={`text-2xl font-bold mb-2 bg-transparent border-none outline-none p-0 ${d ? 'text-white' : 'text-gray-900'}`}
            style={{ width: `${Math.max(240, widget.name.length * 14)}px` }} />
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>Customize this widget and grab the embed code.</p>
        </div>
        <div className="flex items-center gap-3">
          <LoadingButton onClick={handleTest} loading={testing}
            style={{ padding: '10px 18px', fontSize: '14px' }}
            className={`flex items-center gap-2 rounded-lg border font-medium transition ${d ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            <Sparkles className="w-4 h-4" />
            Test Widget
          </LoadingButton>
          <LoadingButton onClick={handleSave} loading={saving}
            className="flex items-center gap-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition font-medium"
            style={{ padding: '10px 18px', fontSize: '14px' }}>
            Save Changes
          </LoadingButton>
        </div>
      </div>

      {/* Two-column layout: Left = settings, Right = embed + preview trigger */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
        {/* LEFT — settings */}
        <div className="space-y-4">
          {/* Appearance section */}
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setAppearanceOpen(!appearanceOpen)}
              className={`w-full flex items-center justify-between px-5 py-4 ${d ? 'text-white' : 'text-gray-900'}`}>
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-[#059669]" />
                Appearance
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${appearanceOpen ? 'rotate-180' : ''} text-gray-400`} />
            </button>
            {appearanceOpen && (
              <div className="px-5 pt-5 pb-5 space-y-5 border-t border-dashed"
                style={{ borderColor: d ? '#374151' : '#e5e7eb' }}>
                {/* Type */}
                <FieldGroup label="Type" help="Choose how the widget opens." d={d}>
                  <div className={`flex rounded-lg p-1 ${d ? 'bg-gray-900' : 'bg-gray-100'}`} style={{ width: 'fit-content' }}>
                    {['modal', 'popover'].map((t) => (
                      <button key={t} onClick={() => {
                        // Reset openFrom when switching types if the current
                        // value isn't available in the new type's option set.
                        const nextOptions = t === 'modal' ? MODAL_OPEN_FROM : POPOVER_OPEN_FROM;
                        const isValid = nextOptions.some((o) => o.value === widget.openFrom);
                        const nextOpenFrom = isValid ? widget.openFrom : (t === 'modal' ? 'right' : 'auto');
                        update({ type: t, openFrom: nextOpenFrom });
                      }}
                        className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                          widget.type === t
                            ? (d ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow-sm')
                            : (d ? 'text-gray-400' : 'text-gray-600')
                        }`}>{t}</button>
                    ))}
                  </div>
                </FieldGroup>

                {/* Open From — different options per type */}
                <FieldGroup
                  label="Open From"
                  help={widget.type === 'modal' ? 'Right/Left drawer or Center modal dialog.' : 'Where the popover is anchored.'}
                  d={d}
                >
                  <div className="flex gap-2 flex-wrap">
                    {(widget.type === 'modal' ? MODAL_OPEN_FROM : POPOVER_OPEN_FROM).map((opt) => (
                      <button key={opt.value} onClick={() => update({ openFrom: opt.value })}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                          widget.openFrom === opt.value
                            ? 'border-[#059669] text-[#059669]'
                            : (d ? 'border-gray-700 text-gray-400 hover:border-gray-500' : 'border-gray-300 text-gray-600 hover:border-gray-400')
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                </FieldGroup>

                {/* Theme */}
                <FieldGroup label="Theme" d={d}>
                  <div className={`flex rounded-lg p-1 ${d ? 'bg-gray-900' : 'bg-gray-100'}`} style={{ width: 'fit-content' }}>
                    {['light', 'dark'].map((t) => (
                      <button key={t} onClick={() => update({ theme: t })}
                        className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                          widget.theme === t
                            ? (d ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow-sm')
                            : (d ? 'text-gray-400' : 'text-gray-600')
                        }`}>{t}</button>
                    ))}
                  </div>
                </FieldGroup>

                {/* Accent color — same style as the Board dialog color picker */}
                <FieldGroup label="Accent Color" d={d}>
                  <div className="flex items-center gap-4 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} onClick={() => update({ accentColor: c })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          widget.accentColor === c
                            ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400'
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }} title={c} />
                    ))}
                    <input type="text" value={widget.accentColor}
                      onChange={(e) => update({ accentColor: e.target.value })}
                      className={`ml-2 text-sm font-mono px-3 py-1.5 rounded-lg border w-[110px] ${d ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`} />
                  </div>
                </FieldGroup>

                {/* Widget width */}
                <FieldGroup label="Widget Width" help="Width in pixels (200–1200). Leave blank for default (380 px)." d={d}>
                  <input type="number" min={200} max={1200}
                    value={widget.widgetWidth || ''} placeholder="380"
                    onChange={(e) => update({ widgetWidth: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className={`text-sm px-3 py-2 rounded-lg border w-[160px] ${d ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`} />
                </FieldGroup>

                <ToggleRow
                  label="Hide default trigger"
                  help="Remove the floating button — use only your own custom trigger."
                  checked={widget.hideDefaultTrigger}
                  onChange={(v) => update({ hideDefaultTrigger: v })}
                  d={d}
                />
                <ToggleRow
                  label="Disable widget expansion"
                  help="Prevent the widget from opening to fullscreen on large displays."
                  checked={widget.disableExpansion}
                  onChange={(v) => update({ disableExpansion: v })}
                  d={d}
                />
                <ToggleRow
                  label="Use custom trigger"
                  help="Embed your own button. When enabled, set the CSS selector below."
                  checked={widget.customTrigger}
                  onChange={(v) => update({ customTrigger: v })}
                  d={d}
                />
                {widget.customTrigger && (
                  <FieldGroup label="Custom Trigger Selector" help='CSS selector for your trigger element, e.g. "#feedback-btn"' d={d}>
                    <input type="text" value={widget.customTriggerSelector || ''}
                      onChange={(e) => update({ customTriggerSelector: e.target.value })}
                      placeholder="#my-button"
                      className={`text-sm font-mono px-3 py-2 rounded-lg border w-full ${d ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`} />
                  </FieldGroup>
                )}
              </div>
            )}
          </div>

          {/* Configuration section */}
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setConfigOpen(!configOpen)}
              className={`w-full flex items-center justify-between px-5 py-4 ${d ? 'text-white' : 'text-gray-900'}`}>
              <div className="flex items-center gap-2 font-semibold">
                <SettingsIcon className="w-4 h-4 text-[#059669]" />
                Configuration
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${configOpen ? 'rotate-180' : ''} text-gray-400`} />
            </button>
            {configOpen && (
              <div className="px-5 pt-5 pb-5 space-y-5 border-t border-dashed"
                style={{ borderColor: d ? '#374151' : '#e5e7eb' }}>
                {/* Token */}
                <FieldGroup label="Widget Token" help="Read-only unique token used in the embed script." d={d}>
                  <div className="flex gap-2">
                    <input type="text" value={widget.token} readOnly
                      className={`flex-1 text-sm font-mono px-3 py-2 rounded-lg border ${d ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`} />
                    <Tooltip title="Copy token">
                      <button onClick={() => { navigator.clipboard.writeText(widget.token); toast.success('Copied'); }}
                        className={`px-3 py-2 rounded-lg border transition ${d ? 'border-gray-700 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}>
                        <Copy className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                </FieldGroup>

                {/* Submission board — CustomDropdown has its own floating label */}
                <div>
                  <CustomDropdown label="Submission Board" value={widget.submissionBoardId || ''}
                    options={[
                      { value: '', label: 'Select a board' },
                      ...boards.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                    onChange={(v) => update({ submissionBoardId: v || null })}
                    className="w-full" minWidth="100%" portalMode />
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Default board that new submissions go into.</p>
                </div>

                <ToggleRow label="Show submission form only" help="Hide browse/list views — only the submit form is shown."
                  checked={widget.showSubmissionFormOnly} onChange={(v) => update({ showSubmissionFormOnly: v })} d={d} />
                <ToggleRow label="Suggest similar posts during submission" help="As the user types, suggest existing posts to prevent duplicates."
                  checked={widget.suggestSimilarPosts} onChange={(v) => update({ suggestSimilarPosts: v })} d={d} />
                <ToggleRow label="Hide board selection in submission form" help="Lock all submissions to the default board above."
                  checked={widget.hideBoardSelection} onChange={(v) => update({ hideBoardSelection: v })} d={d} />

                <ToggleRow label="Active" help="Inactive widgets stop rendering on customer sites."
                  checked={widget.isActive} onChange={(v) => update({ isActive: v })} d={d} />
              </div>
            )}
          </div>

          {/* Post Filters section */}
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className={`w-full flex items-center justify-between px-5 py-4 ${d ? 'text-white' : 'text-gray-900'}`}>
              <div className="flex items-center gap-2 font-semibold">
                <Filter className="w-4 h-4 text-[#059669]" />
                Post Filters
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''} text-gray-400`} />
            </button>
            {filtersOpen && (
              <div className="px-5 pt-5 pb-5 space-y-5 border-t border-dashed"
                style={{ borderColor: d ? '#374151' : '#e5e7eb' }}>
                <div>
                  <MultiSelectField
                    label="Show posts in statuses"
                    placeholder="Select status"
                    options={STATUS_OPTIONS}
                    value={widget.postStatuses}
                    onChange={(v) => update({ postStatuses: v })}
                  />
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>
                    Only posts in selected statuses will appear. Leave empty to show all.
                  </p>
                </div>

                <div>
                  <MultiSelectField
                    label="Show posts from the boards"
                    placeholder="Select boards"
                    options={boards.map((b) => ({ value: b.id, label: b.name }))}
                    value={widget.boardIds}
                    onChange={(v) => update({ boardIds: v })}
                  />
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>
                    Limit the widget to specific boards. Leave empty to show posts from all boards.
                  </p>
                </div>

                <div>
                  <CustomDropdown label="Default sort" value={widget.defaultSort}
                    options={SORT_OPTIONS}
                    onChange={(v) => update({ defaultSort: v })}
                    className="w-full" minWidth="100%" portalMode />
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Order posts use when the widget first loads.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Embed code + helper */}
        <div className="space-y-4">
          {/* Embed code — VS Code-like editor */}
          <div className={`rounded-xl border overflow-hidden ${d ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Editor title bar */}
            <div style={{ background: '#2d2d2d' }} className="flex items-center justify-between px-4 py-2.5 border-b border-black/30">
              <div className="flex items-center gap-2">
                {/* Traffic-light dots like a code editor */}
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
                <span className="ml-3 text-[12px] font-medium" style={{ color: '#cccccc', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>embed.html</span>
              </div>
              <Tooltip title="Copy to clipboard">
                <button onClick={copyEmbed}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition"
                  style={{ color: '#cccccc' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </Tooltip>
            </div>
            <CodeBlock code={embedCode} />
          </div>

          {/* Helper tip */}
          <div className={`rounded-lg border border-dashed p-4 flex gap-3 ${d ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
            <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${d ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className={`text-xs leading-relaxed ${d ? 'text-gray-300' : 'text-gray-600'}`}>
              Paste the snippet above just before the closing <code className={`px-1 py-0.5 rounded text-[11px] ${d ? 'bg-gray-900 text-emerald-400' : 'bg-gray-200 text-emerald-700'}`}>&lt;/body&gt;</code> tag on any page of your website. The widget will appear using the settings you've configured here.
            </div>
          </div>
        </div>
      </div>

      {/* Test Widget loads the real widget.js runtime directly on top of the
          editor — all features (upvote, submit, search) run against the live
          backend via the same public endpoints the embedded widget uses. */}
    </div>
  );
}

function FieldGroup({ label, help, children, d }: { label: string; help?: string; children: React.ReactNode; d: boolean }) {
  return (
    <div>
      <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{label}</label>
      {children}
      {help && <p className={`text-xs mt-2 ${d ? 'text-gray-500' : 'text-gray-400'}`}>{help}</p>}
    </div>
  );
}

function ToggleRow({ label, help, checked, onChange, d }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void; d: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? 'bg-[#059669]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
      <div className="flex-1">
        <div className={`text-sm font-medium ${d ? 'text-gray-100' : 'text-gray-900'}`}>{label}</div>
        {help && <div className={`text-xs ${d ? 'text-gray-500' : 'text-gray-500'}`}>{help}</div>}
      </div>
    </div>
  );
}
