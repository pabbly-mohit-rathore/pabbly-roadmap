import { X, MessageSquareText, Plus, ExternalLink, Search, ArrowUp, MessageSquare } from 'lucide-react';

export interface WidgetConfig {
  name: string;
  type: 'modal' | 'popover' | string;
  openFrom: 'left' | 'right' | 'top' | 'bottom' | string;
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

// Sample posts rendered in the preview so the admin can see what the
// actual embed will look like. The real widget.js pulls real posts from
// the backend at runtime — this is cosmetic only.
const SAMPLE_POSTS = [
  {
    id: '1', date: 'Apr 22, 2026',
    title: 'Route condition "else" if no other route conditions match.',
    desc: 'Hello, it would be useful to have an "ELSE" route when the other "IF" / "ELSE IF" routes are not met, similar to how it works in…',
    status: 'under_review', statusLabel: 'Under Review',
    board: 'Connect: Core Request', votes: 1, comments: 1,
  },
  {
    id: '2', date: 'Apr 22, 2026',
    title: 'CRONBERRY CRM',
    desc: 'CRONBERRY IS A CRM WHERE USERS CAN CONNECT LEAD SOURCE AND MANAGE THEIR LEADS BUT STILL FOR MOR...',
    status: 'planned', statusLabel: 'Planned',
    board: 'Connect: New Integration', votes: 1, comments: 2,
  },
  {
    id: '3', date: 'Apr 22, 2026',
    title: 'Custom "API Endpoint URL" for WooCommerce App',
    desc: 'Please add an option to set a "Custom API Endpoint URL" to the WooCommerce App within Pabbly connect. Where you ar...',
    status: 'in_progress', statusLabel: 'In Progress',
    board: 'Connect: New Integration', votes: 1, comments: 1,
  },
  {
    id: '4', date: 'Apr 21, 2026',
    title: 'For multiple chat flow accounts, switch the account without logging out',
    desc: 'If I purchase multiple chat flow account, how to manage them in one mobile ? Any way out ? Like Facebook multiple...',
    status: 'live', statusLabel: 'Live',
    board: 'Chatflow: New Feature', votes: 1, comments: 1,
  },
];

function statusBadgeBg(s: string, dark: boolean) {
  const light: Record<string, string> = {
    under_review: '#fefce8', planned: '#faf5ff', in_progress: '#fff7ed',
    live: '#f0fdf4', hold: '#fef2f2',
  };
  const darkBg: Record<string, string> = {
    under_review: '#422006', planned: '#2e1065', in_progress: '#431407',
    live: '#052e16', hold: '#450a0a',
  };
  return (dark ? darkBg : light)[s] || (dark ? '#1e293b' : '#f3f4f6');
}
function statusBadgeColor(s: string, dark: boolean) {
  const light: Record<string, string> = {
    under_review: '#a16207', planned: '#6b21a8', in_progress: '#9a3412',
    live: '#15803d', hold: '#b91c1c',
  };
  const darkCol: Record<string, string> = {
    under_review: '#fde047', planned: '#d8b4fe', in_progress: '#fdba74',
    live: '#86efac', hold: '#fca5a5',
  };
  return (dark ? darkCol : light)[s] || (dark ? '#cbd5e1' : '#374151');
}

/**
 * Visual preview that mirrors widget.js runtime design 1:1.
 * Shown when admin clicks "Test Widget" in the editor.
 */
export default function WidgetPreview({ config, onClose }: { config: WidgetConfig; onClose: () => void }) {
  const dark = config.theme === 'dark';
  const accent = config.accentColor || '#059669';
  const width = config.widgetWidth || 380;

  const bg = dark ? '#111827' : '#ffffff';
  const border = dark ? '#374151' : '#e5e7eb';
  const text = dark ? '#ffffff' : '#111827';
  const muted = dark ? '#9ca3af' : '#6b7280';

  // Panel positioning
  //   modal   → right/left drawer OR centered modal dialog
  //   popover → anchored dialog (auto/top/right/bottom/left)
  let panelStyle: React.CSSProperties = {};
  const from = config.openFrom || (config.type === 'modal' ? 'right' : 'auto');
  if (config.type === 'popover') {
    const popWidth = Math.min(560, width);
    const common = { width: popWidth, maxHeight: '88vh', borderRadius: 14 };
    if (from === 'top') panelStyle = { ...common, top: 32, left: '50%', transform: 'translateX(-50%)' };
    else if (from === 'bottom') panelStyle = { ...common, bottom: 32, left: '50%', transform: 'translateX(-50%)' };
    else if (from === 'left') panelStyle = { ...common, top: '50%', left: 32, transform: 'translateY(-50%)' };
    else if (from === 'right') panelStyle = { ...common, top: '50%', right: 32, transform: 'translateY(-50%)' };
    else panelStyle = { ...common, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  } else {
    // modal: right | left | center
    if (from === 'center') {
      panelStyle = {
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: Math.min(560, width), maxHeight: '88vh', borderRadius: 14,
      };
    } else if (from === 'left') {
      panelStyle = { width, height: '100vh', top: 0, left: 0, borderRight: `1px solid ${border}` };
    } else {
      panelStyle = { width, height: '100vh', top: 0, right: 0, borderLeft: `1px solid ${border}` };
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 9999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', ...panelStyle,
          background: bg, color: text,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
          fontSize: 14,
        }}
      >
        {/* Header — title left, New Post / Open / Search / Close on right */}
        <div style={{
          padding: '14px 16px', background: accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <MessageSquareText style={{ width: 20, height: 20, flexShrink: 0 }} />
            <span style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.name || 'Pabbly Boards'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button style={{
              background: '#fff', color: accent, border: 'none',
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Plus style={{ width: 14, height: 14 }} />
              <span>New Post</span>
            </button>
            <IconBtn><ExternalLink style={{ width: 16, height: 16 }} /></IconBtn>
            <IconBtn><Search style={{ width: 16, height: 16 }} /></IconBtn>
            <IconBtn onClick={onClose}><X style={{ width: 18, height: 18 }} /></IconBtn>
          </div>
        </div>

        {/* Body — post cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: bg }}>
          {SAMPLE_POSTS.map((p) => (
            <div key={p.id} style={{
              background: dark ? '#1f2937' : '#ffffff',
              border: `1px solid ${border}`, borderRadius: 12,
              padding: 14, marginBottom: 10,
              display: 'flex', gap: 12, alignItems: 'flex-start',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}>
              {/* Vote button */}
              <button style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2,
                minWidth: 48, padding: '8px 4px',
                border: `1px solid ${border}`, background: dark ? '#0f172a' : '#fff',
                color: text, borderRadius: 8,
                fontSize: 13, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
              }}>
                <ArrowUp style={{ width: 14, height: 14 }} />
                <span>{p.votes}</span>
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: text, lineHeight: 1.35, marginBottom: 4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{p.title}</div>
                <div style={{
                  fontSize: 13, color: muted, lineHeight: 1.5, marginBottom: 10,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                }}>{p.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                    fontSize: 12, fontWeight: 600,
                    background: statusBadgeBg(p.status, dark),
                    color: statusBadgeColor(p.status, dark),
                  }}>{p.statusLabel}</span>
                  <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>{p.board}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 12, color: muted, marginLeft: 'auto',
                  }}>
                    <MessageSquare style={{ width: 12, height: 12 }} />
                    <span>{p.comments}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff',
      padding: 7, borderRadius: 8, cursor: 'pointer', display: 'flex',
    }}>
      {children}
    </button>
  );
}
