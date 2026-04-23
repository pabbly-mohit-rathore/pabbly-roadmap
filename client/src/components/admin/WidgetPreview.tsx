import { useState } from 'react';
import { X, MessageSquareText, Sparkles, Send, Search, ThumbsUp } from 'lucide-react';

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

/**
 * Renders a live, visual representation of what the embed widget will look
 * like on a customer's site, based on the current config. Used inside the
 * EmbedWidgetEditor when the admin clicks "Test Widget".
 */
export default function WidgetPreview({ config, onClose }: { config: WidgetConfig; onClose: () => void }) {
  const dark = config.theme === 'dark';
  const accent = config.accentColor || '#059669';
  const width = config.widgetWidth || 400;

  const [activeTab, setActiveTab] = useState<'posts' | 'submit'>(
    config.showSubmissionFormOnly ? 'submit' : 'posts'
  );

  // Positioning based on openFrom (for popover only)
  let positionStyle: React.CSSProperties = {};
  if (config.type === 'modal') {
    positionStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  } else {
    const from = config.openFrom;
    if (from === 'right') positionStyle = { right: 20, top: 20, bottom: 20 };
    else if (from === 'left') positionStyle = { left: 20, top: 20, bottom: 20 };
    else if (from === 'top') positionStyle = { top: 20, left: '50%', transform: 'translateX(-50%)' };
    else positionStyle = { bottom: 20, left: '50%', transform: 'translateX(-50%)' };
  }

  const bg = dark ? '#0f172a' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const text = dark ? '#e2e8f0' : '#111827';
  const muted = dark ? '#94a3b8' : '#6b7280';
  const softBg = dark ? '#1e293b' : '#f9fafb';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          ...positionStyle,
          width: config.type === 'modal' ? Math.min(520, width) : width,
          maxHeight: config.type === 'modal' ? '85vh' : undefined,
          background: bg,
          color: text,
          border: `1px solid ${border}`,
          borderRadius: 14,
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
          fontSize: 14,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: accent,
          color: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquareText style={{ width: 16, height: 16 }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{config.name || 'Feedback'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: 6, borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Tabs — only if not submission-only mode */}
        {!config.showSubmissionFormOnly && (
          <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, background: softBg }}>
            <TabBtn active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} accent={accent} muted={muted}>
              <Sparkles style={{ width: 14, height: 14 }} /> Feature Requests
            </TabBtn>
            <TabBtn active={activeTab === 'submit'} onClick={() => setActiveTab('submit')} accent={accent} muted={muted}>
              <Send style={{ width: 14, height: 14 }} /> Submit
            </TabBtn>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, minHeight: 240, maxHeight: 520 }}>
          {activeTab === 'posts' && <PostsPreview accent={accent} text={text} muted={muted} border={border} softBg={softBg} />}
          {activeTab === 'submit' && <SubmitPreview accent={accent} text={text} muted={muted} border={border} softBg={softBg} hideBoardSelection={config.hideBoardSelection} suggestSimilar={config.suggestSimilarPosts} />}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${border}`, fontSize: 11, color: muted, textAlign: 'center' }}>
          Powered by <span style={{ color: accent, fontWeight: 600 }}>Pabbly Roadmap</span>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ children, active, onClick, accent, muted }: { children: React.ReactNode; active: boolean; onClick: () => void; accent: string; muted: string }) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        background: 'transparent',
        color: active ? accent : muted,
        borderBottom: `2px solid ${active ? accent : 'transparent'}`,
        border: 'none',
        borderBottomStyle: 'solid',
        borderBottomWidth: 2,
        borderBottomColor: active ? accent : 'transparent',
        cursor: 'pointer',
      }}>
      {children}
    </button>
  );
}

function PostsPreview({ accent, text, muted, border, softBg }: any) {
  const samples = [
    { title: 'Add dark mode to dashboard', votes: 24, status: 'Under Review' },
    { title: 'Export data as CSV', votes: 18, status: 'Planned' },
    { title: 'Slack integration for notifications', votes: 12, status: 'Open' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${border}`, borderRadius: 8, marginBottom: 14, background: softBg }}>
        <Search style={{ width: 14, height: 14, color: muted }} />
        <span style={{ fontSize: 13, color: muted }}>Search feature requests…</span>
      </div>
      {samples.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'start', gap: 12, padding: 12, border: `1px solid ${border}`, borderRadius: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36, padding: '4px 6px', border: `1px solid ${border}`, borderRadius: 6, background: softBg }}>
            <ThumbsUp style={{ width: 12, height: 12, color: accent }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: text, marginTop: 2 }}>{s.votes}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 4 }}>{s.title}</div>
            <span style={{ fontSize: 11, color: muted }}>{s.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubmitPreview({ accent, text, muted, border, softBg, hideBoardSelection, suggestSimilar }: any) {
  return (
    <div>
      {!hideBoardSelection && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Board</label>
          <div style={{ padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: softBg, color: text }}>
            Feature Requests ▾
          </div>
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Title</label>
        <div style={{ padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: softBg, color: muted }}>
          What would you like to request?
        </div>
      </div>
      {suggestSimilar && (
        <div style={{ padding: 10, border: `1px dashed ${border}`, borderRadius: 8, marginBottom: 12, fontSize: 12, color: muted }}>
          💡 We’ll show similar existing posts as you type
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
        <div style={{ padding: '12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: softBg, color: muted, minHeight: 70 }}>
          Tell us more about what you need…
        </div>
      </div>
      <button style={{
        width: '100%',
        padding: '10px 14px',
        background: accent,
        color: '#ffffff',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}>
        Submit Feedback
      </button>
    </div>
  );
}
