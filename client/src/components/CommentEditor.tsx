import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2,
  List, ListOrdered, Code, Link as LinkIcon,
  Image as ImageIcon, Video, Upload
} from 'lucide-react';
import useThemeStore from '../store/themeStore';

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
  compact = false,
}: CommentEditorProps) {
  const theme = useThemeStore((state) => state.theme);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    ],
    editorProps: {
      attributes: {
        class: `outline-none ${compact ? 'min-h-[60px]' : 'min-h-[100px]'} px-4 py-3 text-sm`,
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

  const TB = ({ icon: Icon, action, active, title }: { icon: any; action: () => void; active?: boolean; title: string }) => (
    <button onClick={action} title={title} type="button"
      className={`p-1 rounded transition ${
        active
          ? d ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-900'
          : d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'
      }`}>
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className={`rounded-lg border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Editor Content */}
      <EditorContent editor={editor} className={d ? 'text-white' : 'text-gray-900'} />

      {/* Toolbar + Submit */}
      <div className={`flex items-center justify-between px-3 py-2 border-t ${d ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-0.5">
          <TB icon={Bold} title="Bold" action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
          <TB icon={Italic} title="Italic" action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
          <TB icon={UnderlineIcon} title="Underline" action={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} />
          <TB icon={Heading2} title="Heading" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading')} />
          <TB icon={List} title="Bullet List" action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
          <TB icon={ListOrdered} title="Ordered List" action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
          <TB icon={Code} title="Code" action={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} />
          <TB icon={LinkIcon} title="Link" action={addLink} active={editor.isActive('link')} />
          <TB icon={ImageIcon} title="Image" action={addImage} />
          <TB icon={Video} title="Video" action={addVideo} />
          <TB icon={Upload} title="Upload" action={addImage} />
        </div>

        <button onClick={handleSubmit} disabled={submitting} type="button"
          className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition disabled:opacity-50">
          {submitting ? 'Posting...' : buttonLabel}
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
    </div>
  );
}
