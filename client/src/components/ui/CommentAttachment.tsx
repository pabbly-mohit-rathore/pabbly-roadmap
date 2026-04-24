import { Download } from 'lucide-react';

interface CommentAttachmentProps {
  url?: string | null;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
  dark?: boolean;
}

function fmtBytes(n?: number | null): string {
  if (!n || !isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Map file type → color palette (matches the export-button aesthetic: light bg, colored border + icon + text)
type Palette = { text: string; border: string; bg: string; bgDark: string; borderDark: string };
function paletteFor(mime?: string | null, name?: string | null): Palette {
  const m = (mime || '').toLowerCase();
  const ext = (name || '').toLowerCase().split('.').pop() || '';
  if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return { text: '#059669', border: '#a7f3d0', bg: '#ecfdf5', bgDark: 'rgba(5,150,105,0.12)', borderDark: 'rgba(5,150,105,0.4)' }; // emerald
  }
  if (m.includes('pdf') || ext === 'pdf') {
    return { text: '#dc2626', border: '#fecaca', bg: '#fef2f2', bgDark: 'rgba(220,38,38,0.12)', borderDark: 'rgba(220,38,38,0.4)' }; // red
  }
  if (m.includes('word') || ['doc', 'docx'].includes(ext)) {
    return { text: '#2563eb', border: '#bfdbfe', bg: '#eff6ff', bgDark: 'rgba(37,99,235,0.12)', borderDark: 'rgba(37,99,235,0.4)' }; // blue
  }
  if (m.includes('sheet') || m.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return { text: '#16a34a', border: '#bbf7d0', bg: '#f0fdf4', bgDark: 'rgba(22,163,74,0.12)', borderDark: 'rgba(22,163,74,0.4)' }; // green
  }
  if (m.includes('presentation') || ['ppt', 'pptx'].includes(ext)) {
    return { text: '#ea580c', border: '#fed7aa', bg: '#fff7ed', bgDark: 'rgba(234,88,12,0.12)', borderDark: 'rgba(234,88,12,0.4)' }; // orange
  }
  if (m.includes('zip') || m.includes('rar') || m.includes('7z') || ['zip', 'rar', '7z'].includes(ext)) {
    return { text: '#9333ea', border: '#e9d5ff', bg: '#faf5ff', bgDark: 'rgba(147,51,234,0.12)', borderDark: 'rgba(147,51,234,0.4)' }; // purple
  }
  return { text: '#4b5563', border: '#e5e7eb', bg: '#f9fafb', bgDark: 'rgba(156,163,175,0.12)', borderDark: 'rgba(156,163,175,0.4)' }; // gray
}

export default function CommentAttachment({ url, name, mime, size, dark }: CommentAttachmentProps) {
  if (!url) return null;
  const p = paletteFor(mime, name);
  const sizeStr = fmtBytes(size);
  const label = name || 'attachment';

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={name || ''}
      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-[1.5px] text-sm font-semibold max-w-full transition hover:opacity-85"
      style={{
        color: p.text,
        borderColor: dark ? p.borderDark : p.border,
        background: dark ? p.bgDark : p.bg,
      }}>
      <Download className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} />
      <span className="truncate max-w-[260px]">{label}</span>
      {sizeStr && <span className="text-xs font-medium opacity-70">· {sizeStr}</span>}
    </a>
  );
}
