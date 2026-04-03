import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Send, Clock, ChevronLeft,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Code, Heading1, Heading2, Quote, Minus, Undo2, Redo2, Code2
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  allBoards: boolean;
  publishedAt: string | null;
  author: { id: string; name: string };
  boards: { board: { id: string; name: string; color: string } }[];
}

export default function ChangelogEditor() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExt,
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      ImageExt.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg' },
      }),
      Placeholder.configure({
        placeholder: 'Write your changelog content here...',
      }),
    ],
    onUpdate: ({ editor: e }) => {
      setPreviewHtml(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4 ' +
          (theme === 'dark' ? 'prose-invert' : ''),
      },
    },
  });

  useEffect(() => {
    fetchEntry();
  }, [id]);

  // Set editor content when entry loads
  useEffect(() => {
    if (editor && entry?.content) {
      editor.commands.setContent(entry.content);
      setPreviewHtml(entry.content);
    }
  }, [editor, entry]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/changelog/${id}`);
      if (response.data.success) {
        const data = response.data.data.entry;
        setEntry(data);
        setTitle(data.title);
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      toast.error('Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const getEditorContent = () => previewHtml || editor?.getHTML() || '';

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await api.put(`/changelog/${id}`, { title, content: getEditorContent() });
      toast.success('Saved as draft');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !getEditorContent().trim()) {
      toast.error('Title and content are required to publish');
      return;
    }
    try {
      await api.put(`/changelog/${id}`, { title, content: getEditorContent() });
      await api.post(`/changelog/${id}/publish`);
      toast.success('Published!');
      navigate('/admin/changelog');
    } catch (error) {
      toast.error('Failed to publish');
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) {
      toast.error('Select a date');
      return;
    }
    try {
      await api.put(`/changelog/${id}`, { title, content: getEditorContent() });
      await api.post(`/changelog/${id}/publish`, { scheduledAt: scheduleDate });
      toast.success('Scheduled!');
      setShowScheduleModal(false);
      navigate('/admin/changelog');
    } catch (error) {
      toast.error('Failed to schedule');
    }
  };

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      new: 'bg-emerald-100 text-emerald-700',
      improved: 'bg-blue-100 text-blue-700',
      fixed: 'bg-orange-100 text-orange-700',
    };
    return config[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-700',
      scheduled: 'bg-blue-100 text-blue-700',
      published: 'bg-green-100 text-green-700',
    };
    return config[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <div className="text-center py-12">Loading editor...</div>;
  }

  const ToolbarButton = ({ icon: Icon, action, active, title: btnTitle }: {
    icon: any; action: () => void; active?: boolean; title: string;
  }) => (
    <button onClick={action} title={btnTitle}
      className={`p-2 rounded transition ${
        active
          ? theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-900'
          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}>
      <Icon className="w-4 h-4" />
    </button>
  );

  const Separator = () => (
    <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`} />
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top Bar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/changelog')}
            className={`flex items-center gap-1 text-sm ${
              theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {entry && (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getStatusBadge(entry.status)}`}>
                {entry.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getTypeBadge(entry.type)}`}>
                {entry.type}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
            <Clock className="w-4 h-4" /> Schedule
          </button>
          <button onClick={handlePublish}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-black text-white hover:bg-gray-800 transition">
            <Send className="w-4 h-4" /> Publish
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-hidden ${
        theme === 'dark' ? 'bg-gray-950' : 'bg-[#f5f5f5]'
      }`}>
        <div className="flex gap-0 h-full">
          {/* Left: Editor Card */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Title Input */}
            <div className={`px-5 py-4 border-b ${
              theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title"
                className={`w-full text-xl font-bold outline-none bg-transparent ${
                  theme === 'dark' ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-300'
                }`} />
            </div>

            {/* Toolbar */}
            <div className={`flex items-center gap-0.5 px-3 py-2 border-b overflow-x-auto ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-[#f8f9fa] border-gray-200'
            }`}>
              <ToolbarButton icon={Heading1} title="Heading 1"
                action={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor?.isActive('heading', { level: 1 })} />
              <ToolbarButton icon={Heading2} title="Heading 2"
                action={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor?.isActive('heading', { level: 2 })} />
              <Separator />
              <ToolbarButton icon={Bold} title="Bold"
                action={() => editor?.chain().focus().toggleBold().run()}
                active={editor?.isActive('bold')} />
              <ToolbarButton icon={Italic} title="Italic"
                action={() => editor?.chain().focus().toggleItalic().run()}
                active={editor?.isActive('italic')} />
              <ToolbarButton icon={UnderlineIcon} title="Underline"
                action={() => editor?.chain().focus().toggleUnderline().run()}
                active={editor?.isActive('underline')} />
              <ToolbarButton icon={Strikethrough} title="Strikethrough"
                action={() => editor?.chain().focus().toggleStrike().run()}
                active={editor?.isActive('strike')} />
              <Separator />
              <ToolbarButton icon={List} title="Bullet List"
                action={() => editor?.chain().focus().toggleBulletList().run()}
                active={editor?.isActive('bulletList')} />
              <ToolbarButton icon={ListOrdered} title="Numbered List"
                action={() => editor?.chain().focus().toggleOrderedList().run()}
                active={editor?.isActive('orderedList')} />
              <ToolbarButton icon={Quote} title="Blockquote"
                action={() => editor?.chain().focus().toggleBlockquote().run()}
                active={editor?.isActive('blockquote')} />
              <ToolbarButton icon={Minus} title="Horizontal Rule"
                action={() => editor?.chain().focus().setHorizontalRule().run()} />
              <Separator />
              <ToolbarButton icon={LinkIcon} title="Link" action={addLink}
                active={editor?.isActive('link')} />
              <ToolbarButton icon={ImageIcon} title="Image" action={addImage} />
              <ToolbarButton icon={Code} title="Inline Code"
                action={() => editor?.chain().focus().toggleCode().run()}
                active={editor?.isActive('code')} />
              <ToolbarButton icon={Code2} title="Code Block"
                action={() => editor?.chain().focus().toggleCodeBlock().run()}
                active={editor?.isActive('codeBlock')} />
              <Separator />
              <ToolbarButton icon={Undo2} title="Undo"
                action={() => editor?.chain().focus().undo().run()} />
              <ToolbarButton icon={Redo2} title="Redo"
                action={() => editor?.chain().focus().redo().run()} />
            </div>

            {/* Editor Box */}
            <div className={`flex-1 overflow-y-auto ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}>
              <EditorContent editor={editor} className="h-full" />
            </div>
          </div>

          {/* Right: Live Preview Card */}
          <div className={`flex-1 flex flex-col border-l overflow-hidden min-w-0 ${
            theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider shrink-0 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}>
              Live Preview
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {title && (
                <h1 className={`text-2xl font-bold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{title}</h1>
              )}
              {previewHtml && previewHtml !== '<p></p>' ? (
                <div
                  className={`tiptap ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                  Start writing to see a live preview...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`max-w-sm w-full mx-4 p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Schedule Publish
            </h3>
            <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg border mb-4 ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
              }`} />
            <div className="flex gap-3">
              <button onClick={() => setShowScheduleModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'border-gray-700 text-gray-300' : 'border-gray-200'
                }`}>Cancel</button>
              <button onClick={handleSchedule}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
