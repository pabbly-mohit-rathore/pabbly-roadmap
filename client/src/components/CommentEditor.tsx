import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2,
  List, ListOrdered, Code, Link as LinkIcon,
  Image as ImageIcon, Video, Upload, MousePointerClick,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
// @ts-expect-error -- JSX module without type declarations
import { ResizableImage } from './rich-text-editor/Components/editor/components/img-resize';
import useThemeStore from '../store/themeStore';
import LoadingButton from './ui/LoadingButton';
import { ButtonExtension, type ButtonAttributes } from './ButtonExtension';
import ButtonConfigModal from './ButtonConfigModal';

function TB({ icon: Icon, action, active, title, dark }: { icon: React.ComponentType<{ className?: string }>; action: () => void; active?: boolean; title: string; dark?: boolean }) {
  return (
    <button onClick={action} title={title} type="button"
      className={`p-1 rounded transition ${
        active
          ? dark ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-900'
          : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'
      }`}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

interface CommentEditorProps {
  onSubmit: (html: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  submitting?: boolean;
  compact?: boolean;
  initialContent?: string;
  hideButton?: boolean;
  maxEditorHeight?: string;
  onContentChange?: (html: string) => void;
}

export default function CommentEditor({
  onSubmit,
  placeholder = 'Write a comment...',
  buttonLabel = 'Public Comment',
  submitting = false,
  compact = false,
  initialContent,
  hideButton = false,
  maxEditorHeight,
  onContentChange,
}: CommentEditorProps) {
  const theme = useThemeStore((state) => state.theme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [editingButtonAttrs, setEditingButtonAttrs] = useState<Partial<ButtonAttributes> | undefined>(undefined);
  const d = theme === 'dark';
  const isReply = buttonLabel === 'Reply' || compact;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        link: false,
        underline: false,
      }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false }),
      ResizableImage,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      ButtonExtension,
    ],
    content: initialContent || '',
    onUpdate: ({ editor: e }) => {
      if (onContentChange) onContentChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        // When maxEditorHeight is set, override the global .tiptap min-height: 400px
        // so the editor starts compact and grows with content up to max.
        class: `outline-none px-4 py-3 text-sm ${maxEditorHeight ? '!min-h-0' : (isReply ? 'comment-editor-compact' : 'comment-editor-full')}`,
      },
    },
  });

  // Sync `initialContent` into the editor after mount. Needed for edit flows
  // where content is fetched async and arrives after the editor is mounted.
  const lastSyncedContent = useRef<string | undefined>(initialContent);
  useEffect(() => {
    if (!editor) return;
    if (initialContent === undefined) return;
    if (initialContent === lastSyncedContent.current) return;
    if (editor.getHTML() === initialContent) return;
    editor.commands.setContent(initialContent, { emitUpdate: false });
    lastSyncedContent.current = initialContent;
  }, [initialContent, editor]);

  const handleSubmit = () => {
    if (!editor) return;
    const html = editor.getHTML();
    if (html === '<p></p>' || !html.trim()) return;
    onSubmit(html);
    editor.commands.clearContent();
  };

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url && editor) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => fileInputRef.current?.click();

  // Resize + re-encode an image client-side so we never ship huge base64 blobs
  // to the backend. Keeps DB rows small and stays within Vercel's 4.5 MB payload limit.
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1600;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputMime, 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Only image or video files are allowed.');
      e.target.value = '';
      return;
    }
    // Images get compressed client-side so we can accept larger originals.
    // Videos stay limited because we don't compress them.
    const maxSizeMB = isImage ? 25 : 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`${isImage ? 'Image' : 'Video'} file size is too large (${sizeMB} MB). Max allowed is ${maxSizeMB} MB.`);
      e.target.value = '';
      return;
    }

    if (isImage) {
      try {
        const compressedDataUrl = await compressImage(file);
        editor.chain().focus().insertContent({ type: 'image', attrs: { src: compressedDataUrl } }).run();
      } catch {
        toast.error('Failed to process image. Please try a different file.');
      }
    }
    e.target.value = '';
  };

  const handleInsertButton = (attrs: ButtonAttributes) => {
    if (!editor) return;
    editor.chain().focus().insertButton(attrs).run();
  };

  // Listen for double-click edit events on button nodes
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.attrs) {
        setEditingButtonAttrs(detail.attrs);
        setShowButtonModal(true);
      }
    };
    el.addEventListener('edit-button-node', handler);
    return () => el.removeEventListener('edit-button-node', handler);
  }, []);

  const addVideo = () => {
    const url = prompt('Enter video URL (YouTube/Vimeo):');
    if (url && editor) {
      // Convert YouTube URL to embed
      let embedUrl = url;
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;

      editor.chain().focus().insertContent(
        `<div class="my-2"><iframe src="${embedUrl}" width="100%" height="315" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe></div>`
      ).run();
    }
  };

  if (!editor) return null;

  return (
    <div ref={editorRef} className={`rounded-lg border overflow-hidden transition-colors ${d ? 'bg-gray-800 border-gray-700 hover:border-gray-500 focus-within:border-gray-400' : 'bg-white border-gray-200 hover:border-gray-400 focus-within:border-gray-400'}`}>
      {/* Editor Content */}
      <EditorContent editor={editor} className={`${d ? 'text-white' : 'text-gray-900'} comment-editor-content`}
        style={maxEditorHeight ? { maxHeight: maxEditorHeight, overflowY: 'auto' } : undefined} />

      {/* Toolbar + Submit */}
      <div className={`flex items-center justify-between px-3 py-2 border-t ${d ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-0.5">
          <TB dark={d} icon={Bold} title="Bold" action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
          <TB dark={d} icon={Italic} title="Italic" action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
          <TB dark={d} icon={UnderlineIcon} title="Underline" action={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} />
          <TB dark={d} icon={Heading2} title="Heading" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading')} />
          <TB dark={d} icon={List} title="Bullet List" action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
          <TB dark={d} icon={ListOrdered} title="Ordered List" action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
          <TB dark={d} icon={Code} title="Code" action={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} />
          <TB dark={d} icon={LinkIcon} title="Link" action={addLink} active={editor.isActive('link')} />
          <TB dark={d} icon={ImageIcon} title="Image" action={addImage} />
          <TB dark={d} icon={Video} title="Video" action={addVideo} />
          <TB dark={d} icon={Upload} title="Upload" action={addImage} />
          <TB dark={d} icon={MousePointerClick} title="Button" action={() => { setEditingButtonAttrs(undefined); setShowButtonModal(true); }} />
          <div className={`w-px h-4 mx-1 ${d ? 'bg-gray-600' : 'bg-gray-200'}`} />
          <TB dark={d} icon={AlignLeft} title="Align Left" action={() => {
            if (editor.isActive('image')) { editor.chain().focus().updateAttributes('image', { align: 'left' }).run(); }
            else { editor.chain().focus().setTextAlign('left').run(); }
          }} active={editor.isActive('image') ? editor.getAttributes('image').align === 'left' : editor.isActive({ textAlign: 'left' })} />
          <TB dark={d} icon={AlignCenter} title="Align Center" action={() => {
            if (editor.isActive('image')) { editor.chain().focus().updateAttributes('image', { align: 'center' }).run(); }
            else { editor.chain().focus().setTextAlign('center').run(); }
          }} active={editor.isActive('image') ? editor.getAttributes('image').align === 'center' : editor.isActive({ textAlign: 'center' })} />
          <TB dark={d} icon={AlignRight} title="Align Right" action={() => {
            if (editor.isActive('image')) { editor.chain().focus().updateAttributes('image', { align: 'right' }).run(); }
            else { editor.chain().focus().setTextAlign('right').run(); }
          }} active={editor.isActive('image') ? editor.getAttributes('image').align === 'right' : editor.isActive({ textAlign: 'right' })} />
        </div>

        {!hideButton && (
          <LoadingButton onClick={handleSubmit} loading={submitting} type="button"
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70">
            {buttonLabel}
          </LoadingButton>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />

      <ButtonConfigModal
        isOpen={showButtonModal}
        onClose={() => setShowButtonModal(false)}
        onInsert={handleInsertButton}
        initialAttrs={editingButtonAttrs}
      />
    </div>
  );
}
