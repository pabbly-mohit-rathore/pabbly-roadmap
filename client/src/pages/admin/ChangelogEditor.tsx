import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Send, Clock, ChevronLeft,
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Link, Image, Code, Heading1, Quote, Minus,
  Undo2, Redo2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => {
    fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/changelog/${id}`);
      if (response.data.success) {
        const data = response.data.data.entry;
        setEntry(data);
        setTitle(data.title);
        setContent(data.content || '');
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      toast.error('Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await api.put(`/changelog/${id}`, { title, content });
      toast.success('Saved as draft');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required to publish');
      return;
    }
    try {
      await api.put(`/changelog/${id}`, { title, content });
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
      await api.put(`/changelog/${id}`, { title, content });
      await api.post(`/changelog/${id}/publish`, { scheduledAt: scheduleDate });
      toast.success('Scheduled!');
      setShowScheduleModal(false);
      navigate('/admin/changelog');
    } catch (error) {
      toast.error('Failed to schedule');
    }
  };

  // Insert text at cursor position in textarea
  const insertAtCursor = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = before + (selected || 'text') + after;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + (selected || 'text').length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content]);

  const toolbarButtons = [
    { icon: Heading1, action: () => insertAtCursor('## ', '\n'), title: 'Heading' },
    { icon: Bold, action: () => insertAtCursor('**', '**'), title: 'Bold' },
    { icon: Italic, action: () => insertAtCursor('*', '*'), title: 'Italic' },
    { icon: Underline, action: () => insertAtCursor('<u>', '</u>'), title: 'Underline' },
    { icon: Strikethrough, action: () => insertAtCursor('~~', '~~'), title: 'Strikethrough' },
    null, // separator
    { icon: List, action: () => insertAtCursor('- ', '\n'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertAtCursor('1. ', '\n'), title: 'Numbered List' },
    { icon: Quote, action: () => insertAtCursor('> ', '\n'), title: 'Quote' },
    { icon: Minus, action: () => insertAtCursor('\n---\n', ''), title: 'Horizontal Rule' },
    null, // separator
    { icon: Link, action: () => insertAtCursor('[', '](url)'), title: 'Link' },
    { icon: Image, action: () => insertAtCursor('![alt](', ')'), title: 'Image' },
    { icon: Code, action: () => insertAtCursor('`', '`'), title: 'Code' },
  ];

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
    return (
      <div className="text-center py-12">Loading editor...</div>
    );
  }

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
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {entry && (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getStatusBadge(entry.status)}`}>
                {entry.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getTypeBadge(entry.type)}`}>
                {entry.type}
              </span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {entry.allBoards ? 'All Boards' : entry.boards.map(b => b.board.name).join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>

          <button onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
            <Clock className="w-4 h-4" />
            Schedule
          </button>

          <button onClick={handlePublish}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-black text-white hover:bg-gray-800 transition">
            <Send className="w-4 h-4" />
            Publish
          </button>
        </div>
      </div>

      {/* Title Input */}
      <div className={`px-6 py-4 border-b shrink-0 ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title"
          className={`w-full text-2xl font-bold outline-none bg-transparent ${
            theme === 'dark' ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-300'
          }`}
        />
      </div>

      {/* Editor + Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className={`flex-1 flex flex-col border-r ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          {/* Toolbar */}
          <div className={`flex items-center gap-0.5 px-4 py-2 border-b overflow-x-auto ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-[#f8f9fa] border-gray-200'
          }`}>
            {toolbarButtons.map((btn, i) => {
              if (!btn) {
                return <div key={`sep-${i}`} className={`w-px h-6 mx-1 ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                }`} />;
              }
              const Icon = btn.icon;
              return (
                <button key={i} onClick={btn.action} title={btn.title}
                  className={`p-2 rounded transition ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}>
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your changelog content here... Markdown supported."
            className={`flex-1 w-full p-6 outline-none resize-none font-mono text-sm leading-relaxed ${
              theme === 'dark'
                ? 'bg-gray-900 text-gray-200 placeholder-gray-600'
                : 'bg-white text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Right: Live Preview */}
        <div className={`flex-1 overflow-y-auto ${
          theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'
        }`}>
          <div className={`px-4 py-2 border-b text-xs font-semibold uppercase tracking-wider ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}>
            Live Preview
          </div>
          <div className="p-6">
            {title && (
              <h1 className={`text-2xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>{title}</h1>
            )}
            {content ? (
              <div className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                Start writing to see a live preview...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`max-w-sm w-full mx-4 p-6 rounded-xl ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Schedule Publish
            </h3>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg border mb-4 ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
              }`}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowScheduleModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'border-gray-700 text-gray-300' : 'border-gray-200'
                }`}>
                Cancel
              </button>
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
