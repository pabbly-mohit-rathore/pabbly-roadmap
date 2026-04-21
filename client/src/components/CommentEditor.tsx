import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import InputDialog from './ui/InputDialog';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import mentionSuggestion from './rich-text-editor/mentionSuggestion';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2,
  List, ListOrdered, Code, Link as LinkIcon,
  Image as ImageIcon, Video, MousePointerClick,
  AlignLeft, AlignCenter, AlignRight, ChevronDown, Check,
} from 'lucide-react';
// @ts-expect-error -- JSX module without type declarations
import { ResizableImage } from './rich-text-editor/Components/editor/components/img-resize';
import useThemeStore from '../store/themeStore';
import LoadingButton from './ui/LoadingButton';
import Tooltip from './ui/Tooltip';
import { ButtonExtension, type ButtonAttributes } from './ButtonExtension';
import ButtonConfigModal from './ButtonConfigModal';

function TB({ icon: Icon, action, active, dark }: { icon: React.ComponentType<{ className?: string }>; action: () => void; active?: boolean; title?: string; dark?: boolean }) {
  return (
    <button onClick={action} type="button"
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
  onSubmit: (html: string, isInternal?: boolean) => void;
  placeholder?: string;
  buttonLabel?: string;
  submitting?: boolean;
  compact?: boolean;
  initialContent?: string;
  hideButton?: boolean;
  maxEditorHeight?: string;
  onContentChange?: (html: string) => void;
  /** When true, show a split-button to toggle between Public and Internal comment */
  showInternalOption?: boolean;
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
  showInternalOption = false,
}: CommentEditorProps) {
  const theme = useThemeStore((state) => state.theme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [editingButtonAttrs, setEditingButtonAttrs] = useState<Partial<ButtonAttributes> | undefined>(undefined);
  const editingButtonPos = useRef<number | null>(null);
  const [commentMode, setCommentMode] = useState<'public' | 'internal'>('public');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuPortalRef = useRef<HTMLDivElement>(null);
  const d = theme === 'dark';
  const isReply = buttonLabel === 'Reply' || compact;

  useEffect(() => {
    if (!modeMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modeMenuRef.current && !modeMenuRef.current.contains(target)) setModeMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modeMenuOpen]);

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
      Mention.configure({
        HTMLAttributes: { class: 'mention-tag', 'data-type': 'mention' },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        renderHTML: ({ node, options }) => [
          'span',
          {
            ...options.HTMLAttributes,
            'data-mention-id': node.attrs.id,
            'data-mention-label': node.attrs.label,
          },
          `@${node.attrs.label ?? node.attrs.id}`,
        ],
        suggestion: mentionSuggestion,
      }),
    ],
    content: initialContent || '',
    onUpdate: ({ editor: e }) => {
      if (onContentChange) onContentChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        // When maxEditorHeight is set, override the global .tiptap min-height: 400px
        // so the editor starts compact and grows with content up to max.
        class: `outline-none px-4 py-3 text-sm ${maxEditorHeight ? 'dialog-editor' : (isReply ? 'comment-editor-compact' : 'comment-editor-full')}`,
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
    onSubmit(html, showInternalOption && commentMode === 'internal');
    editor.commands.clearContent();
  };

  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const addLink = () => {
    setShowLinkDialog(true);
  };

  const handleLinkConfirm = (url: string) => {
    if (url && editor) editor.chain().focus().setLink({ href: url }).run();
    setShowLinkDialog(false);
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
    if (editingButtonPos.current !== null) {
      // Update existing button node at the saved position
      const pos = editingButtonPos.current;
      editor.chain().focus().setNodeSelection(pos).deleteSelection().insertButton(attrs).run();
      editingButtonPos.current = null;
    } else {
      editor.chain().focus().insertButton(attrs).run();
    }
  };

  // Listen for double-click edit events on button nodes
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.attrs) {
        const a = detail.attrs;
        // Normalize booleans — TipTap may store as strings after HTML round-trip
        setEditingButtonAttrs({
          ...a,
          fullWidth: a.fullWidth === true || a.fullWidth === 'true',
          openInNewTab: a.openInNewTab === true || a.openInNewTab === 'true',
        });
        editingButtonPos.current = detail.pos ?? null;
        setShowButtonModal(true);
      }
    };
    el.addEventListener('edit-button-node', handler);
    return () => el.removeEventListener('edit-button-node', handler);
  }, []);

  const [showVideoDialog, setShowVideoDialog] = useState(false);

  const addVideo = () => setShowVideoDialog(true);

  const handleVideoConfirm = (url: string) => {
    if (url && editor) {
      let embedUrl = url;
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;

      editor.chain().focus().insertContent(
        `<div class="my-2"><iframe src="${embedUrl}" width="100%" height="315" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe></div>`
      ).run();
    }
    setShowVideoDialog(false);
  };

  if (!editor) return null;

  return (
    <div ref={editorRef} className={`rounded-lg border transition-colors ${d ? 'bg-gray-800 border-gray-700 hover:border-gray-500 focus-within:border-gray-400' : 'bg-white border-gray-200 hover:border-gray-400 focus-within:border-gray-400'}`}>
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
          <TB dark={d} icon={MousePointerClick} title="Button" action={() => { setEditingButtonAttrs(undefined); editingButtonPos.current = null; setShowButtonModal(true); }} />
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
          showInternalOption && buttonLabel !== 'Reply' && buttonLabel !== 'Save' ? (
            // Split-button: main submit (Public/Internal) + dropdown to switch modes
            <div ref={modeMenuRef} className="relative inline-flex">
              <Tooltip title={commentMode === 'internal' ? 'Internal — only admins and team members can see this.' : 'Public — everyone can see this.'}>
                <LoadingButton onClick={handleSubmit} loading={submitting} type="button"
                  className={`px-4 py-2 text-sm font-semibold rounded-l-lg transition disabled:opacity-70 ${
                    commentMode === 'internal'
                      ? 'bg-amber-500 hover:bg-amber-600 text-gray-900'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}>
                  {commentMode === 'internal' ? 'Internal Comment' : 'Public Comment'}
                </LoadingButton>
              </Tooltip>
              <Tooltip title="Switch comment type.">
                <button type="button" onClick={() => setModeMenuOpen((v) => !v)}
                  className={`px-2 py-2 rounded-r-lg transition border-l ${
                    commentMode === 'internal'
                      ? 'bg-amber-500 hover:bg-amber-600 border-amber-400 text-gray-900'
                      : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white'
                  }`}>
                  <ChevronDown className={`w-4 h-4 transition-transform ${modeMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </Tooltip>
              {modeMenuOpen && (
                <div ref={modeMenuPortalRef}
                  className={`absolute right-0 top-full mt-1 rounded-lg border shadow-2xl p-1 ${
                    d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                  }`}
                  style={{ minWidth: '220px', zIndex: 50 }}>
                  <button type="button" onClick={() => { setCommentMode('public'); setModeMenuOpen(false); }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                      commentMode === 'public'
                        ? d ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                        : d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                    <div>
                      <div className="text-sm font-semibold">Public Comment</div>
                      <div className={`text-xs mt-0.5 ${
                        commentMode === 'public'
                          ? d ? 'text-emerald-400/80' : 'text-emerald-600/80'
                          : d ? 'text-gray-400' : 'text-gray-500'
                      }`}>Visible to everyone</div>
                    </div>
                    {commentMode === 'public' && <Check className="w-4 h-4 text-[#059669] flex-shrink-0" />}
                  </button>
                  <button type="button" onClick={() => { setCommentMode('internal'); setModeMenuOpen(false); }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                      commentMode === 'internal'
                        ? d ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-800'
                        : d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                    <div>
                      <div className="text-sm font-semibold">Internal Comment</div>
                      <div className={`text-xs mt-0.5 ${
                        commentMode === 'internal'
                          ? d ? 'text-amber-300/80' : 'text-amber-700/80'
                          : d ? 'text-gray-400' : 'text-gray-500'
                      }`}>Admin &amp; team only</div>
                    </div>
                    {commentMode === 'internal' && <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Tooltip title={buttonLabel === 'Reply' ? 'Click here to post your reply.' : buttonLabel === 'Save' ? 'Click here to save changes.' : 'Click here to post your comment.'}>
              <LoadingButton onClick={handleSubmit} loading={submitting} type="button"
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70">
                {buttonLabel}
              </LoadingButton>
            </Tooltip>
          )
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />

      <ButtonConfigModal
        isOpen={showButtonModal}
        onClose={() => setShowButtonModal(false)}
        onInsert={handleInsertButton}
        initialAttrs={editingButtonAttrs}
      />

      <InputDialog
        open={showLinkDialog}
        title="Enter URL"
        placeholder="https://example.com"
        confirmLabel="Add Link"
        onConfirm={handleLinkConfirm}
        onCancel={() => setShowLinkDialog(false)}
      />

      <InputDialog
        open={showVideoDialog}
        title="Enter Video URL"
        placeholder="https://youtube.com/watch?v=..."
        confirmLabel="Add Video"
        onConfirm={handleVideoConfirm}
        onCancel={() => setShowVideoDialog(false)}
      />
    </div>
  );
}
