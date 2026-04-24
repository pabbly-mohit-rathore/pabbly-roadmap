import { Download, FileText, Image as ImageIcon, FileArchive, File as FileIcon } from 'lucide-react';

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

function pickIcon(mime?: string | null) {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return ImageIcon;
  if (m.includes('zip') || m.includes('rar') || m.includes('7z')) return FileArchive;
  if (m.includes('pdf') || m.includes('word') || m.includes('excel') || m.includes('sheet') || m.includes('presentation') || m.startsWith('text/')) return FileText;
  return FileIcon;
}

export default function CommentAttachment({ url, name, mime, size, dark }: CommentAttachmentProps) {
  if (!url) return null;
  const Icon = pickIcon(mime);
  const sizeStr = fmtBytes(size);
  const isImage = (mime || '').toLowerCase().startsWith('image/');

  if (isImage) {
    return (
      <div className="mt-2">
        <a href={url} target="_blank" rel="noopener noreferrer" download={name || ''}
          className="inline-block max-w-xs rounded-lg overflow-hidden border transition hover:opacity-90"
          style={{ borderColor: dark ? '#374151' : '#e5e7eb' }}>
          <img src={url} alt={name || 'attachment'}
            className="block max-h-64 w-auto object-contain bg-gray-50 dark:bg-gray-900" />
        </a>
        <div className={`mt-1 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="font-medium">{name || 'image'}</span>
          {sizeStr && <span className="ml-2">· {sizeStr}</span>}
        </div>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={name || ''}
      className={`mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm max-w-full transition ${
        dark
          ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
      }`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium truncate max-w-[260px]">{name || 'attachment'}</span>
      {sizeStr && <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>· {sizeStr}</span>}
      <Download className={`w-3.5 h-3.5 flex-shrink-0 ml-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`} />
    </a>
  );
}
