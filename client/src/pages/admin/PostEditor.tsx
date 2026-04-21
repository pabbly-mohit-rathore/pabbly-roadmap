import { useEffect, useState, useRef, useCallback } from 'react';
import InputDialog from '../../components/ui/InputDialog';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Send, ChevronLeft,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Code, Heading1, Heading2, Quote, Minus, Undo2, Redo2, Code2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, RemoveFormatting, Palette, Highlighter
} from 'lucide-react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import mentionSuggestion from '../../components/rich-text-editor/mentionSuggestion';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import HighlightExt from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import { Extension, mergeAttributes, Node } from '@tiptap/core';
import { HexColorPicker } from 'react-colorful';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import toast from 'react-hot-toast';
import Tooltip from '../../components/ui/Tooltip';

// FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, '') || null,
          renderHTML: (attributes: Record<string, any>) => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ commands }: any) => {
        return commands.setMark('textStyle', { fontSize: size });
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Resizable Image Component
function ResizableImageComponent({ node, updateAttributes, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const align = node.attrs.align || 'left';

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = imgRef.current?.offsetWidth || 300;
    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(100, startWidth + (ev.clientX - startX));
      updateAttributes({ width: newWidth });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper data-drag-handle style={{ textAlign: align, margin: '0.5rem 0' }}>
      <div className={`relative inline-block ${selected ? 'ring-2 ring-blue-500 rounded' : ''}`}>
        <img ref={imgRef} src={node.attrs.src} alt={node.attrs.alt || ''}
          style={{ width: node.attrs.width ? `${node.attrs.width}px` : 'auto', maxWidth: '100%', display: 'block' }}
          className="rounded-lg" draggable={false} />
        {selected && (
          <div onMouseDown={handleMouseDown} className="absolute right-0 bottom-0 w-4 h-4 bg-blue-500 rounded-tl" style={{ cursor: 'se-resize' }} />
        )}
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImage = Node.create({
  name: 'resizableImage',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: null }, width: { default: null }, align: { default: 'left' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="resizable-image"] img', priority: 60 }, { tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const w = HTMLAttributes.width ? `width: ${HTMLAttributes.width}px; max-width: 100%;` : 'max-width: 100%;';
    const a = HTMLAttributes.align || 'left';
    const textAlign = a === 'center' ? 'center' : a === 'right' ? 'right' : 'left';
    const margin = a === 'center' ? 'margin-left: auto; margin-right: auto;' : a === 'right' ? 'margin-left: auto;' : '';
    return ['div', { 'data-type': 'resizable-image', style: `text-align: ${textAlign}; margin: 0.5rem 0; clear: both;` },
      ['img', mergeAttributes(HTMLAttributes, { style: `${w} ${margin} display: block;`, class: 'rounded-lg' })]];
  },
  addNodeView() { return ReactNodeViewRenderer(ResizableImageComponent); },
});

interface Post {
  id: string;
  title: string;
  content: string | null;
  description: string;
  status: string;
  type: string;
  priority: string;
  isDraft: boolean;
  board: { id: string; name: string; slug: string; color: string };
  author: { id: string; name: string };
  tags: { tag: { id: string; name: string; color: string } }[];
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const FONT_FAMILIES = ['Inter', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];

export default function PostEditor() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const backPath = isAdminRoute ? '/admin/all-posts' : '/user/feature-requests';

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [fontColor, setFontColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [lastSaved, setLastSaved] = useState('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
      ResizableImage,
      Placeholder.configure({ placeholder: 'Write your post content here...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell.extend({ content: 'block+' }),
      TableHeader.extend({ content: 'block+' }),
      TextStyle, FontSize, FontFamily, Color,
      HighlightExt.configure({ multicolor: true }),
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
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      requestAnimationFrame(() => { setPreviewHtml(html); triggerAutoSave(); });
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4 ' + (theme === 'dark' ? 'prose-invert' : ''),
      },
    },
  });

  useEffect(() => { fetchPost(); }, [id]);
  useEffect(() => {
    if (editor && post?.content) {
      editor.commands.setContent(post.content);
      setPreviewHtml(post.content);
    }
  }, [editor, post]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/by-id/${id}`);
      if (response.data.success) {
        const data = response.data.data.post;
        setPost(data);
        setTitle(data.title);
      }
    } catch {
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => autoSave(), 3000);
  };

  const autoSave = async () => {
    if (!id || !editor) return;
    try {
      await api.put(`/posts/${id}`, { title, content: editor.getHTML() });
      setLastSaved(new Date().toLocaleTimeString());
    } catch { /* silent */ }
  };

  useEffect(() => { if (post) triggerAutoSave(); }, [title]);
  useEffect(() => { return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); }; }, []);

  const getEditorContent = () => previewHtml || editor?.getHTML() || '';

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/posts/${id}`, { title, content: getEditorContent() });
      setLastSaved(new Date().toLocaleTimeString());
      toast.success('Saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    try {
      setPublishing(true);
      await api.put(`/posts/${id}`, { title, content: getEditorContent() });
      await api.post(`/posts/${id}/publish`);
      toast.success('Post published!');
      navigate(backPath);
    } catch { toast.error('Failed to publish'); }
    finally { setPublishing(false); }
  };

  const [linkDialog, setLinkDialog] = useState<'link' | 'image' | null>(null);

  const addLink = () => setLinkDialog('link');
  const addImageFromUrl = () => setLinkDialog('image');

  const handleUrlConfirm = useCallback((url: string) => {
    if (!editor) return;
    if (linkDialog === 'link') editor.chain().focus().setLink({ href: url }).run();
    else if (linkDialog === 'image') editor.chain().focus().insertContent({ type: 'resizableImage', attrs: { src: url } }).run();
    setLinkDialog(null);
  }, [editor, linkDialog]);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().insertContent({ type: 'resizableImage', attrs: { src: reader.result as string } }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getSelectedImage = () => {
    if (!editor) return null;
    const { state } = editor;
    const { from } = state.selection;
    const node = state.doc.nodeAt(from);
    if (node?.type.name === 'resizableImage') return { node, pos: from };
    // Check if selection is inside/around an image (NodeSelection)
    const $from = state.doc.resolve(from);
    for (let d = $from.depth; d >= 0; d--) {
      const ancestor = $from.node(d);
      if (ancestor.type.name === 'resizableImage') return { node: ancestor, pos: $from.before(d) };
    }
    // Check node before
    if (from > 0) {
      const nodeBefore = state.doc.nodeAt(from - 1);
      if (nodeBefore?.type.name === 'resizableImage') return { node: nodeBefore, pos: from - 1 };
    }
    return null;
  };

  const setAlign = (alignment: string) => {
    if (!editor) return;
    const img = getSelectedImage();
    if (img) {
      editor.chain().focus().command(({ tr }) => {
        tr.setNodeMarkup(img.pos, undefined, { ...img.node.attrs, align: alignment });
        return true;
      }).run();
    } else {
      editor.chain().focus().setTextAlign(alignment).run();
    }
  };

  const getAlignActive = (alignment: string) => {
    if (!editor) return false;
    const img = getSelectedImage();
    if (img) return (img.node.attrs.align || 'left') === alignment;
    return editor.isActive({ textAlign: alignment });
  };

  const insertTable = () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  const getTypeBadge = (type: string) => {
    const c: Record<string, string> = { feature: 'bg-blue-100 text-blue-700', bug: 'bg-red-100 text-red-700', improvement: 'bg-purple-100 text-purple-700', integration: 'bg-emerald-100 text-emerald-700' };
    return c[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <LoadingBar />;

  const TB = ({ icon: Icon, action, active }: { icon: any; action: () => void; active?: boolean; title?: string }) => (
    <button onClick={action}
      className={`p-1.5 rounded transition ${
        active
          ? theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-900'
          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
      }`}>
      <Icon className="w-4 h-4" />
    </button>
  );

  const Sep = () => <div className={`w-px h-5 mx-0.5 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`} />;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top Bar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <Tooltip title="Click here to go back."><button onClick={() => navigate(backPath)}
            className={`flex items-center gap-1 text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button></Tooltip>
          {post && (
            <div className="flex items-center gap-2">
              {post.isDraft && <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700">Draft</span>}
              <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getTypeBadge(post.type)}`}>{post.type}</span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>in {post.board.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              Auto-saved {lastSaved}
            </span>
          )}
          <Tooltip title="Click here to save as draft."><button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button></Tooltip>
          <LoadingButton onClick={handlePublish} loading={publishing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-70">
            <Send className="w-4 h-4" /> Publish Post
          </LoadingButton>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#f5f5f5]'}`}>
        <div className="flex gap-6 h-full">
          {/* Left: Editor Card */}
          <div className="flex-1 flex flex-col min-w-0 overflow-visible">
            {/* Title & Description */}
            <div className={`px-5 py-4 rounded-t-xl border border-b-0 ${
              theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className={`w-full text-xl font-bold outline-none bg-transparent ${
                  theme === 'dark' ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-300'
                }`} />
              {post?.description && (
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>
              )}
            </div>

            {/* Toolbar */}
            <div className={`flex items-center gap-0.5 px-3 py-1.5 border-x border-b overflow-x-auto flex-wrap ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-[#f8f9fa] border-gray-200'
            }`}>
              <select value="" onChange={(e) => {
                const val = e.target.value;
                if (!val || !editor) return;
                const { from, to } = editor.state.selection;
                if (from === to) editor.chain().focus().selectParentNode().setMark('textStyle', { fontSize: val }).run();
                else editor.chain().focus().setMark('textStyle', { fontSize: val }).run();
              }} className={`px-1.5 py-1 rounded text-xs border cursor-pointer ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'
              }`}>
                <option value="" disabled>Size</option>
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select value="" onChange={(e) => {
                const val = e.target.value;
                if (!val || !editor) return;
                const { from, to } = editor.state.selection;
                if (from === to) editor.chain().focus().selectParentNode().setFontFamily(val).run();
                else editor.chain().focus().setFontFamily(val).run();
              }} className={`px-1.5 py-1 rounded text-xs border cursor-pointer ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'
              }`}>
                <option value="" disabled>Font</option>
                {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>

              <Sep />

              <div>
                <button id="postFontColorBtn" onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
                 
                  className={`p-1.5 rounded transition flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}>
                  <Palette className="w-4 h-4" />
                  <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: fontColor }} />
                </button>
              </div>

              <div>
                <button id="postHighlightColorBtn" onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
                 
                  className={`p-1.5 rounded transition flex items-center gap-1 ${
                    editor?.isActive('highlight')
                      ? theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-900'
                      : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'
                  }`}>
                  <Highlighter className="w-4 h-4" />
                  <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: highlightColor }} />
                </button>
              </div>

              <Sep />

              <TB icon={Bold} title="Bold" action={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} />
              <TB icon={Italic} title="Italic" action={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} />
              <TB icon={UnderlineIcon} title="Underline" action={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} />
              <TB icon={Strikethrough} title="Strikethrough" action={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} />

              <Sep />

              <TB icon={List} title="Bullet List" action={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} />
              <TB icon={ListOrdered} title="Numbered List" action={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} />

              <Sep />

              <TB icon={AlignLeft} title="Align Left" action={() => setAlign('left')} active={getAlignActive('left')} />
              <TB icon={AlignCenter} title="Align Center" action={() => setAlign('center')} active={getAlignActive('center')} />
              <TB icon={AlignRight} title="Align Right" action={() => setAlign('right')} active={getAlignActive('right')} />
              <TB icon={AlignJustify} title="Justify" action={() => editor?.chain().focus().setTextAlign('justify').run()} active={editor?.isActive({ textAlign: 'justify' })} />

              <Sep />

              <TB icon={Quote} title="Blockquote" action={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} />
              <TB icon={Minus} title="Horizontal Rule" action={() => editor?.chain().focus().setHorizontalRule().run()} />

              <Sep />

              <TB icon={LinkIcon} title="Link" action={addLink} active={editor?.isActive('link')} />
              <TB icon={ImageIcon} title="Image URL" action={addImageFromUrl} />

              <Sep />

              <TB icon={Heading1} title="Heading 1" action={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} />
              <TB icon={Heading2} title="Heading 2" action={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} />
              <TB icon={Code} title="Inline Code" action={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} />
              <TB icon={Code2} title="Code Block" action={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')} />
              <TB icon={TableIcon} title="Insert Table" action={insertTable} />

              {editor?.isActive('table') && (
                <>
                  <Sep />
                  <button onClick={() => editor?.chain().focus().addColumnAfter().run()} title="Add Column"
                    className={`px-1.5 py-1 rounded text-[10px] font-semibold transition ${theme === 'dark' ? 'text-green-400 hover:bg-gray-700' : 'text-green-700 bg-green-50 hover:bg-green-100'}`}>+ Col</button>
                  <button onClick={() => editor?.chain().focus().deleteColumn().run()} title="Remove Column"
                    className={`px-1.5 py-1 rounded text-[10px] font-semibold transition ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-700 bg-red-50 hover:bg-red-100'}`}>- Col</button>
                  <button onClick={() => editor?.chain().focus().addRowAfter().run()} title="Add Row"
                    className={`px-1.5 py-1 rounded text-[10px] font-semibold transition ${theme === 'dark' ? 'text-green-400 hover:bg-gray-700' : 'text-green-700 bg-green-50 hover:bg-green-100'}`}>+ Row</button>
                  <button onClick={() => editor?.chain().focus().deleteRow().run()} title="Remove Row"
                    className={`px-1.5 py-1 rounded text-[10px] font-semibold transition ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-700 bg-red-50 hover:bg-red-100'}`}>- Row</button>
                  <button onClick={() => editor?.chain().focus().deleteTable().run()} title="Delete Table"
                    className={`px-1.5 py-1 rounded text-[10px] font-semibold transition ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-700 bg-red-50 hover:bg-red-100'}`}>Del Table</button>
                </>
              )}

              <TB icon={RemoveFormatting} title="Clear Formatting" action={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} />
              <Sep />
              <TB icon={Undo2} title="Undo" action={() => editor?.chain().focus().undo().run()} />
              <TB icon={Redo2} title="Redo" action={() => editor?.chain().focus().redo().run()} />
            </div>

            {/* Editor Box */}
            <div className={`flex-1 rounded-b-xl border border-t-0 overflow-y-auto ${
              theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <EditorContent editor={editor} className="h-full" />
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className={`flex-1 flex flex-col rounded-xl border overflow-hidden min-w-0 ${
            theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider shrink-0 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}>Live Preview</div>
            <div className="px-6 py-5 flex-1 overflow-y-auto">
              {title && (
                <h1 className={`text-2xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
              )}
              {post?.description && (
                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>
              )}
              {previewHtml && previewHtml !== '<p></p>' ? (
                <div className={`tiptap-preview ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}
                  dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Start writing to see a live preview...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Font Color Picker */}
      {showColorPicker && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setShowColorPicker(false)} />
          <div className={`fixed z-[999] p-3 rounded-lg shadow-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
            style={{
              top: (document.getElementById('postFontColorBtn')?.getBoundingClientRect().bottom ?? 200) + 8,
              left: document.getElementById('postFontColorBtn')?.getBoundingClientRect().left ?? 200,
            }}>
            <HexColorPicker color={fontColor} onChange={(c) => { setFontColor(c); editor?.chain().focus().setColor(c).run(); }}
              style={{ width: '200px', height: '160px' }} />
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={fontColor}
                onChange={(e) => { setFontColor(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) editor?.chain().focus().setColor(e.target.value).run(); }}
                className={`flex-1 px-2 py-1 rounded text-xs border font-mono ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
              <button onClick={() => setShowColorPicker(false)} className="px-2 py-1 text-xs bg-[#059669] text-white rounded hover:bg-[#047857]">Done</button>
            </div>
          </div>
        </>
      )}

      {/* Highlight Color Picker */}
      {showHighlightPicker && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setShowHighlightPicker(false)} />
          <div className={`fixed z-[999] p-3 rounded-lg shadow-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
            style={{
              top: (document.getElementById('postHighlightColorBtn')?.getBoundingClientRect().bottom ?? 200) + 8,
              left: document.getElementById('postHighlightColorBtn')?.getBoundingClientRect().left ?? 200,
            }}>
            <HexColorPicker color={highlightColor} onChange={(c) => { setHighlightColor(c); editor?.chain().focus().toggleHighlight({ color: c }).run(); }}
              style={{ width: '200px', height: '160px' }} />
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={highlightColor}
                onChange={(e) => { setHighlightColor(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) editor?.chain().focus().toggleHighlight({ color: e.target.value }).run(); }}
                className={`flex-1 px-2 py-1 rounded text-xs border font-mono ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
              <button onClick={() => setShowHighlightPicker(false)} className="px-2 py-1 text-xs bg-[#059669] text-white rounded hover:bg-[#047857]">Done</button>
            </div>
          </div>
        </>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

      <InputDialog
        open={!!linkDialog}
        title={linkDialog === 'image' ? 'Enter Image URL' : 'Enter URL'}
        placeholder={linkDialog === 'image' ? 'https://example.com/image.png' : 'https://example.com'}
        confirmLabel={linkDialog === 'image' ? 'Add Image' : 'Add Link'}
        onConfirm={handleUrlConfirm}
        onCancel={() => setLinkDialog(null)}
      />
    </div>
  );
}
