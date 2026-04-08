import { useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2,
  List, ListOrdered, Code, Link as LinkIcon,
  Image as ImageIcon, Video, Upload, MousePointerClick
} from 'lucide-react';
import useThemeStore from '../store/themeStore';
import LoadingButton from './ui/LoadingButton';
import { ButtonExtension, type ButtonAttributes } from './ButtonExtension';
import ButtonConfigModal from './ButtonConfigModal';

function TB({ icon: Icon, action, active, title, dark }: { icon: any; action: () => void; active?: boolean; title: string; dark?: boolean }) {
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
}

export default function CommentEditor({
  onSubmit,
  placeholder = 'Write a comment...',
  buttonLabel = 'Public Comment',
  submitting = false,
}: CommentEditorProps) {
  const theme = useThemeStore((state) => state.theme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [editingButtonAttrs, setEditingButtonAttrs] = useState<Partial<ButtonAttributes> | undefined>(undefined);
  const d = theme === 'dark';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        // @ts-ignore
        link: false,
        underline: false,
      }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false }),
      ImageExt.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg my-2' } }),
      Placeholder.configure({ placeholder }),
      ButtonExtension,
    ],
    editorProps: {
      attributes: {
        class: 'outline-none px-4 py-3 text-sm',
        style: 'min-height: 200px; max-height: 600px; overflow-y: auto;',
      },
    },
  });

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
    if (file.size > 10 * 1024 * 1024) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
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
    <div ref={editorRef} className={`rounded-lg border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Editor Content */}
      <EditorContent editor={editor} className={`${d ? 'text-white' : 'text-gray-900'} comment-editor-content`} />

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
        </div>

        <LoadingButton onClick={handleSubmit} loading={submitting} type="button"
          className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-70">
          {buttonLabel}
        </LoadingButton>
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
