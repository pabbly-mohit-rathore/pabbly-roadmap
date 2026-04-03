import { useDispatch } from 'react-redux';
import { EditorView } from '@codemirror/view';
import { Link } from '@tiptap/extension-link';
import CodeMirror from '@uiw/react-codemirror';
import { Color } from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import { StarterKit } from '@tiptap/starter-kit';
import { TableRow } from '@tiptap/extension-table-row';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { useEditor, EditorContent } from '@tiptap/react';
import { html as htmlLang } from '@codemirror/lang-html';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { TableCell } from '@tiptap/extension-table-cell';
import { FontFamily } from '@tiptap/extension-font-family';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TableHeader } from '@tiptap/extension-table-header';
import { useRef, useMemo, useState, useEffect, forwardRef, useCallback } from 'react';

import { Box, Portal, Backdrop, FormHelperText} from '@mui/material';

import { uploadFile } from 'src/redux/slices/media';

import { Toolbar } from './toolbar';
import { editorClasses } from './classes';
import { FontSize } from './extensions/font-size';
import { ResizableImage } from './components/img-resize';
import { BulletListCustom } from './extensions/bullet-list-custom';
import { OrderedListCustom } from './extensions/ordered-list-custom';
import { CustomFieldExtension } from './extensions/custom-field-extension';

export const Editor = forwardRef((props, ref) => {
  const {
    sx,
    error,
    onChange,
    helperText,
    resetValue,
    className,
    editable = true,
    fullItem = false,
    value: content = '',
    showSource: externalShowSource,
    onToggleSource: externalToggleSource,
    placeholder = 'Write something awesome...',
    ...other
  } = props;

  const [fullScreen, setFullScreen] = useState(false);
  const [sourceValue, setSourceValue] = useState(content);
  const updateTimeoutRef = useRef(null);
  const rawHtmlRef = useRef(null);

  // Process TipTap HTML to add email-compatible table attributes
  const processTipTapHTMLForEmail = useCallback((html) => {
    if (!html || typeof html !== 'string') return html;
    
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Process all tables to add email-compatible attributes
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach((table) => {
      // Add required attributes for email clients
      if (!table.hasAttribute('width')) {
        table.setAttribute('width', '100%');
      }
      if (!table.hasAttribute('cellspacing')) {
        table.setAttribute('cellspacing', '0');
      }
      if (!table.hasAttribute('cellpadding')) {
        table.setAttribute('cellpadding', '0');
      }
      if (!table.hasAttribute('border')) {
        table.setAttribute('border', '0');
      }
      
      // Ensure table has proper inline styles
      const existingStyle = table.getAttribute('style') || '';
      if (!existingStyle.includes('border-collapse')) {
        table.setAttribute('style', `${existingStyle}; border-collapse: collapse;`.trim());
      }
      
      // Process all table rows
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        const rowStyle = row.getAttribute('style') || '';
        if (!rowStyle.includes('display')) {
          row.setAttribute('style', `${rowStyle}; display: table-row;`.trim());
        }
        
        // Process all cells
        const cells = row.querySelectorAll('td, th');
        cells.forEach((cell) => {
          const cellStyle = cell.getAttribute('style') || '';
          const isHeader = cell.tagName.toLowerCase() === 'th';
          
          // Add default cell styles if not present
          let newStyle = cellStyle;
          if (!cellStyle.includes('display')) {
            newStyle = `${newStyle}; display: table-cell;`.trim();
          }
          if (!cellStyle.includes('border')) {
            newStyle = `${newStyle}; border: 1px solid #d0d0d0;`.trim();
          }
          if (!cellStyle.includes('padding')) {
            newStyle = `${newStyle}; padding: 12px 12px;`.trim();
          }
          if (isHeader && !cellStyle.includes('background-color')) {
            newStyle = `${newStyle}; background-color: #f5f5f5; font-weight: 600;`.trim();
          }
          
          cell.setAttribute('style', newStyle);
          
          // Ensure empty cells have content
          if (!cell.textContent || cell.textContent.trim() === '') {
            if (!cell.querySelector('*')) {
              cell.innerHTML = '&nbsp;';
            }
          }
        });
      });
    });
    
    // Process ordered lists to ensure proper numbering
    const orderedLists = tempDiv.querySelectorAll('ol');
    orderedLists.forEach((ol) => {
      const existingStyle = ol.getAttribute('style') || '';
      if (!existingStyle.includes('list-style')) {
        ol.setAttribute('style', `${existingStyle}; list-style: decimal; padding-left: 1.5em;`.trim());
      }
    });
    
    // Process unordered lists
    const unorderedLists = tempDiv.querySelectorAll('ul');
    unorderedLists.forEach((ul) => {
      const existingStyle = ul.getAttribute('style') || '';
      if (!existingStyle.includes('list-style')) {
        ul.setAttribute('style', `${existingStyle}; list-style: disc; padding-left: 1.5em;`.trim());
      }
    });
    
    // Process blockquotes - add HTML quote icon for HTML output (source view, copy HTML, etc.)
    // This ensures quote icon appears in HTML output (CSS ::before only works in editor)
    const blockquotes = tempDiv.querySelectorAll('blockquote');
    blockquotes.forEach((bq) => {
      // Remove any existing quote icons to prevent duplicates
      const existingIcons = bq.querySelectorAll('.quote-icon, span[data-tiptap-quote]');
      existingIcons.forEach((icon) => icon.remove());
      
      // Check if blockquote already has a quote icon (check text content for quote character)
      const hasQuoteIcon = 
        bq.querySelector('.quote-icon') !== null ||
        bq.querySelector('span[data-tiptap-quote]') !== null ||
        bq.textContent.trim().startsWith('"') ||
        bq.textContent.trim().startsWith('\u201C');
      
      // Add quote icon if it doesn't exist and blockquote has content
      if (!hasQuoteIcon && bq.textContent && bq.textContent.trim()) {
        const quoteIcon = document.createElement('span');
        quoteIcon.className = 'quote-icon';
        // Style for HTML output - use float:left approach (Gmail compatible)
        quoteIcon.setAttribute(
          'style',
          'float: left; font-size: 52px; line-height: 1.0; color: #9AA6B2; font-weight: 550; font-family: Georgia, Times, "Times New Roman", sans-serif; margin-right: 12px; margin-top: 0; margin-bottom: 0; padding: 0; display: block; width: 48px; text-align: left; vertical-align: top; clear: left;'
        );
        quoteIcon.textContent = '\u201C'; // Left double quotation mark
        
        // Insert quote icon at the beginning of blockquote
        const firstElement = bq.firstElementChild || bq.firstChild;
        if (firstElement) {
          bq.insertBefore(quoteIcon, firstElement);
        } else {
          bq.insertBefore(quoteIcon, bq.firstChild);
        }
        
        // Add margin-top to first paragraph to align with quote icon
        const firstParagraph = bq.querySelector('p');
        if (firstParagraph) {
          const pStyle = firstParagraph.getAttribute('style') || '';
          if (!pStyle.includes('margin-top')) {
            const cleanPStyle = pStyle.replace(/margin\s*:\s*[^;]+;?/gi, '').replace(/margin-top\s*:\s*[^;]+;?/gi, '').trim();
            const newPStyle = `margin-top: 38px !important; ${cleanPStyle}`.trim();
            firstParagraph.setAttribute('style', newPStyle);
          }
        }
      }
    });
    
    return tempDiv.innerHTML;
  }, []);
  const isTypingRef = useRef(false);

  const showSource = externalShowSource ?? false;
  const dispatch = useDispatch();

  const readFileAsDataUrl = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }),
    []
  );

  // CRITICAL: Upload image to get public URL for Gmail compatibility
  // Gmail does NOT support Base64 images - they must be HTTP/HTTPS URLs
  const uploadImageFile = useCallback(
    async (file) => {
      try {
        const result = await dispatch(
          uploadFile({
            file,
            acl: true, // Public access - required for Gmail
            timezone: 'UTC',
          })
        ).unwrap();

        // Extract the public file URL from response
        const fileUrl = result?.data?.fileUrl || result?.data?.cloudUrl || result?.fileUrl;
        
        if (!fileUrl) {
          throw new Error('Upload succeeded but no file URL returned');
        }

        console.log('[Image Upload] Successfully uploaded image, got URL:', fileUrl.substring(0, 100));
        return fileUrl;
      } catch (uploadError) {
        console.error('[Image Upload] Failed to upload image:', uploadError);
        // Fallback to Base64 only for preview (won't work in Gmail)
        const dataUrl = await readFileAsDataUrl(file);
        console.warn('[Image Upload] Using Base64 fallback - this will NOT work in Gmail emails');
        return String(dataUrl);
      }
    },
    [dispatch, readFileAsDataUrl]
  );

  const BLOCKQUOTE_COLOR = '#6F7B88';
  const applyBlockquoteInlineColor = useCallback((html) => {
    if (!html || typeof html !== 'string') return html;
    try {
      const root = document.createElement('div');
      root.innerHTML = html;
      const blockquotes = root.querySelectorAll('blockquote');
      blockquotes.forEach((bq) => {
        const style = bq.getAttribute('style') || '';
        // ensure base color on the blockquote itself
        const withoutExisting = style.replace(/(^|;|\s)color\s*:\s*[^;]+;?/gi, '$1');
        const merged = `${withoutExisting}${withoutExisting && !/;\s*$/.test(withoutExisting) ? ';' : ''}color: ${BLOCKQUOTE_COLOR};`;
        bq.setAttribute('style', merged.trim());
      });
      return root.innerHTML;
    } catch (e) {
      return html;
    }
  }, []);

  const handleToggleFullScreen = useCallback(() => {
    setFullScreen((prev) => !prev);
  }, []);

  const handleToggleSource = useCallback(() => {
    if (externalToggleSource) {
      externalToggleSource(!showSource);
    }
  }, [externalToggleSource, showSource]);

  const handleEditorUpdate = useCallback(
    ({ editor: _editor }) => {
      let html = _editor.getHTML();
      html = applyBlockquoteInlineColor(html);
      // Process HTML only for source view display (for user to see email-compatible HTML)
      // But pass original HTML to onChange so TipTap editor continues to work properly
      const processedHTML = processTipTapHTMLForEmail(html);
      setSourceValue(processedHTML); // Show processed HTML in source view
      // Pass original HTML to onChange - processing will happen when saving
      onChange?.(html);
    },
    [onChange, applyBlockquoteInlineColor, processTipTapHTMLForEmail]
  );

  // Mark the actual fixed-width element inside the pasted HTML as the canvas root
  // (no extra wrapper or style overrides). Also append a trailing paragraph so
  // typing after the template continues in full width.
  const markEmailCanvasRoot = useCallback((rawHtml) => {
    if (!rawHtml || typeof rawHtml !== 'string') return rawHtml;

    if (/data-email-canvas-root\s*=\s*"?true"?/i.test(rawHtml)) return rawHtml;

    const stripped = rawHtml
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
      .replace(/<\/(html|head|body)>/gi, '')
      .replace(/<(html|head|body)[^>]*>/gi, '')
      .trim();

    // Use DOM to find the likely root container (common email patterns)
    const container = document.createElement('div');
    container.innerHTML = stripped;

    // Light sanitization to keep editing possible without changing design
    const sanitizeForEditing = (root) => {
      const elements = root.querySelectorAll('*');
      elements.forEach((node) => {
        const el = node;
        if (!(el instanceof HTMLElement)) {
          return;
        }
        if (el.getAttribute('contenteditable') === 'false') el.removeAttribute('contenteditable');
        const style = el.getAttribute('style') || '';
        if (style) {
          const cleaned = style
            .replace(/user-select\s*:\s*none\s*;?/gi, '')
            .replace(/-webkit-user-select\s*:\s*none\s*;?/gi, '')
            .replace(/pointer-events\s*:\s*none\s*;?/gi, '')
            .replace(/caret-color\s*:\s*transparent\s*;?/gi, '');
          if (cleaned !== style) el.setAttribute('style', cleaned);
        }
        if (el.hasAttribute('onmousedown')) el.removeAttribute('onmousedown');
        if (el.hasAttribute('ondragstart')) el.removeAttribute('ondragstart');
      });
    };
    sanitizeForEditing(container);

    const candidateSelector = [
      'center > table[width]',
      'center > table[style]',
      'table[width]',
      'table[style]',
      'div[style]',
    ].join(',');

    const candidates = Array.from(container.querySelectorAll(candidateSelector));

    const getWidth = (el) => {
      const attr = el.getAttribute('width');
      if (attr && /^\d+$/.test(attr)) return parseInt(attr, 10);
      const style = el.getAttribute('style') || '';
      const m = style.match(/(?:^|;|\s)max?-?width\s*:\s*(\d+)px/i);
      return m ? parseInt(m[1], 10) : 0;
    };

    let best = null;
    let bestWidth = 0;
    candidates.forEach((el) => {
      const w = getWidth(el);
      if (w && w <= 900 && w >= bestWidth) {
        best = el;
        bestWidth = w;
      }
    });

    if (best) {
      best.setAttribute('data-email-canvas-root', 'true');
      const trailing = document.createElement('p');
      trailing.setAttribute('data-after-canvas', 'true');
      trailing.innerHTML = '<br />';
      container.appendChild(trailing);
      return container.innerHTML;
    }

    return stripped;
  }, []);

  const shouldUseRawHtmlMode = useCallback((html) => {
    if (!html) return false;
    const h = html.toLowerCase();

    // Check for MJML (email framework)
    if (h.includes('mj-')) return true;

    // Only trigger raw mode for full email templates, not simple TipTap tables
    // Email templates typically have table as a major structural element with specific patterns
    // TipTap tables are simple and won't have these patterns
    // Nested TipTap tables should stay in the editor, not trigger raw HTML mode

    // Look for email template patterns:
    // 1. Table with width="600" (common email width)
    // 2. Table with background color in style (email template pattern)
    // 3. Table with cellpadding/cellspacing (old email pattern)
    // Note: Removed multiple tables check - nested TipTap tables should stay in editor

    const hasEmailTablePattern =
      /<table[^>]*width\s*=\s*["']?600/i.test(h) ||
      /<table[^>]*style\s*=\s*["'][^"']*background/i.test(h) ||
      /<table[^>]*cellpadding/i.test(h) ||
      /<table[^>]*cellspacing/i.test(h);

    // Don't trigger on simple TipTap tables (including nested tables)
    // TipTap tables don't have email template patterns, so they should stay in editor
    if (h.includes('<table') && !hasEmailTablePattern) {
      return false;
    }

    return hasEmailTablePattern;
  }, []);

  const rawMode = useMemo(() => shouldUseRawHtmlMode(content), [content, shouldUseRawHtmlMode]);

  const rawApi = useMemo(() => {
    const selectionInsideRaw = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const anchor = sel.anchorNode;
      return rawHtmlRef.current && anchor && rawHtmlRef.current.contains(anchor);
    };
    let savedRange = null;
    const ensureSelection = () => {
      if (selectionInsideRaw()) return;
      const sel = window.getSelection();
      // Prefer restoring saved range if we have one; avoid jumping the caret
      if (savedRange && sel) {
        if (rawHtmlRef.current) rawHtmlRef.current.focus();
        sel.removeAllRanges();
        sel.addRange(savedRange.cloneRange());
        return;
      }
      // Fallback: place caret at start of the editable host/canvas
      if (rawHtmlRef.current && sel) {
        const host = rawHtmlRef.current;
        host.focus();
        const range = document.createRange();
        const target = host.firstChild || host;
        try {
          range.setStart(target, 0);
        } catch (e) {
          try {
            range.selectNodeContents(host);
          } catch (err) {
            /* no-op */
          }
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    };
    const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    };
    const restoreSelection = () => {
      const sel = window.getSelection();
      if (!savedRange || !sel) return;
      if (rawHtmlRef.current) rawHtmlRef.current.focus();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    };
    const notifyChange = () => {
      if (rawHtmlRef.current) {
        rawHtmlRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const exec = (command, value = null) => {
      ensureSelection();
      try {
        document.execCommand(command, false, value);
      } catch (e) {
        // ignore
      }
      notifyChange();
    };
    const getHost = () => rawHtmlRef.current;
    const query = (command) => {
      try {
        return document.queryCommandState(command);
      } catch (e) {
        return false;
      }
    };
    const enabled = (command) => {
      try {
        return document.queryCommandEnabled(command);
      } catch (e) {
        return false;
      }
    };
    // Safe underline: toggles span style rather than execCommand to avoid template breakage
    const toggleUnderline = () => {
      // Restore the selection we saved on toolbar mousedown
      restoreSelection();
      ensureSelection();
      const host = getHost();
      if (!host) return;
      const range = getSelectionRange();
      if (!range) return;

      // Only allow inside the editable canvas/after-canvas to avoid corrupting template wrappers
      const containerEl =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer?.parentElement;
      const insideAllowed = !!(
        containerEl &&
        containerEl.closest &&
        (containerEl.closest('[data-email-canvas-root]') ||
          containerEl.closest('[data-after-canvas]'))
      );
      if (!insideAllowed) return;

      // Guard: operate only when selection stays inside a single block container to avoid layout shifts
      const asElement = (n) => (n instanceof Element ? n : n?.parentElement);
      const startEl = asElement(range.startContainer);
      const endEl = asElement(range.endContainer);
      const findBlock = (el) =>
        el && el.closest && el.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, div');
      const startBlock = findBlock(startEl);
      const endBlock = findBlock(endEl);
      if (!startBlock || !endBlock || startBlock !== endBlock) {
        return; // cross-cell or cross-block selections are ignored for safety
      }

      const unwrapUnderlineInFragment = (root) => {
        // Remove <u> tags and inline text-decoration: underline styles
        if (!root) return;
        // unwrap <u>
        root.querySelectorAll('u').forEach((u) => {
          const frag = document.createDocumentFragment();
          while (u.firstChild) frag.appendChild(u.firstChild);
          u.replaceWith(frag);
        });
        // clear underline styles
        root.querySelectorAll('[style]').forEach((el) => {
          const st = el.getAttribute('style') || '';
          const cleaned = st.replace(
            /(^|;|\s)text-decoration\s*:\s*underline\s*!?important?;?/gi,
            '$1'
          );
          if (cleaned !== st) {
            if (cleaned.trim()) el.setAttribute('style', cleaned);
            else el.removeAttribute('style');
          }
        });
      };

      const selectionLooksUnderlined = () => {
        // If every text node intersecting the range is already underlined, treat as toggle-off
        const common = range.commonAncestorContainer;
        const walker = document.createTreeWalker(
          common.nodeType === Node.ELEMENT_NODE ? common : common.parentNode,
          NodeFilter.SHOW_TEXT
        );
        let hasText = false;
        let allUnderlined = true;
        const isNodeUnderlined = (textNode) => {
          const el = textNode.parentElement;
          if (!el) return false;
          if (el.tagName === 'U') return true;
          const st = el.getAttribute('style') || '';
          return /text-decoration\s*:\s*[^;]*underline/i.test(st);
        };
        while (walker.nextNode()) {
          const tn = walker.currentNode;
          if (range.intersectsNode(tn)) {
            if (tn.nodeValue && tn.nodeValue.length > 0) {
              hasText = true;
              if (!isNodeUnderlined(tn)) allUnderlined = false;
            }
          }
        }
        return hasText && allUnderlined;
      };

      const splitTextNode = (node, startOffset, endOffset) => {
        // Splits node into [before][middle][after], returns the middle node
        const len = node.nodeValue.length;
        const start = Math.max(0, Math.min(len, startOffset));
        const end = Math.max(start, Math.min(len, endOffset));
        let middle = node;
        if (end < len) {
          middle = node.splitText(end);
        }
        let target = middle;
        if (start > 0) {
          target = middle.splitText(start);
        }
        return target;
      };

      if (!range.collapsed) {
        // Non-collapsed: wrap or unwrap selection on text nodes only
        if (selectionLooksUnderlined()) {
          // Unwrap underline spans/u inside the selected region
          const frag = range.cloneContents();
          const div = document.createElement('div');
          div.appendChild(frag);
          unwrapUnderlineInFragment(div);
          range.deleteContents();
          const cleaned = document.createDocumentFragment();
          while (div.firstChild) cleaned.appendChild(div.firstChild);
          range.insertNode(cleaned);
        } else {
          const common = startBlock; // constrain to the current block only
          const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
          const spans = [];
          while (walker.nextNode()) {
            const tn = walker.currentNode;
            if (range.intersectsNode(tn)) {
              if (tn.nodeValue && tn.nodeValue.length > 0) {
                // Determine selection bounds within this text node
                const start =
                  tn === range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE
                    ? range.startOffset
                    : 0;
                const end =
                  tn === range.endContainer && range.endContainer.nodeType === Node.TEXT_NODE
                    ? range.endOffset
                    : tn.nodeValue.length;
                if (start !== end) {
                  const target = splitTextNode(tn, start, end);
                  const span = document.createElement('span');
                  span.setAttribute('style', 'text-decoration: underline !important');
                  target.parentNode.insertBefore(span, target);
                  span.appendChild(target);
                  spans.push(span);
                }
              }
            }
          }
          // Restore selection to end of last span to keep UX consistent
          const sel = window.getSelection();
          if (sel && spans.length > 0) {
            sel.removeAllRanges();
            const r = document.createRange();
            try {
              r.selectNodeContents(spans[spans.length - 1]);
              r.collapse(false);
            } catch (e) {
              /* no-op */
            }
            sel.addRange(r);
          }
        }
      } else {
        // Collapsed: insert zero-width span with underline to continue typing
        // Safer behavior: if no selection, do nothing (to avoid underlining the whole email inadvertently)
        return;
      }
      notifyChange();
    };
    const insertHorizontalRule = () => {
      // Insert a safe email-friendly HR
      const hr =
        '<hr style="border:0; border-top: 1px solid #DADDE1; margin: 12px 0; width: 100%;" />';
      exec('insertHTML', hr);
    };
    const insertBreak = () => {
      if (document.queryCommandSupported('insertLineBreak')) {
        exec('insertLineBreak');
      } else {
        exec('insertHTML', '<br>');
      }
    };
    const ensureParagraph = () => {
      const host = rawHtmlRef.current;
      if (!host) return;
      const isEmpty =
        !host.innerHTML || host.innerHTML.trim() === '' || host.textContent.trim() === '';
      if (isEmpty) {
        host.innerHTML = '<p><br /></p>';
        const p = host.querySelector('p');
        const range = document.createRange();
        try {
          range.selectNodeContents(p);
          range.collapse(true);
        } catch (e) {
          /* no-op */
        }
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        notifyChange();
      }
    };
    const align = (pos) => {
      const map = {
        left: 'justifyLeft',
        center: 'justifyCenter',
        right: 'justifyRight',
        justify: 'justifyFull',
      };
      exec(map[pos] || 'justifyLeft');
    };
    const getSelectionRange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      return sel.getRangeAt(0);
    };
    const getSelectedHtml = () => {
      const range = getSelectionRange();
      if (!range || range.collapsed) return '';
      const frag = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(frag);
      return div.innerHTML;
    };
    const isInBlockquote = () => {
      const range = getSelectionRange();
      if (!range) return false;
      const container =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer?.parentElement;
      if (!container) return false;
      return !!(container.closest && container.closest('blockquote'));
    };
    const toggleBlockquote = () => {
      restoreSelection();
      const range = getSelectionRange();
      if (!range) return;
      const container =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer?.parentElement;

      // Skip when caret/selection is on an image/logo
      const isInImage = (node) => {
        const el = node instanceof Element ? node : node?.parentElement;
        return !!(el && (el.tagName === 'IMG' || (el.closest && el.closest('img'))));
      };
      if (isInImage(range.startContainer) || isInImage(range.endContainer)) {
        return;
      }

      // Helper: find the currently active blockquote around the selection/caret
      const getActiveBlockquote = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const aEl =
          sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
        const fEl = sel.focusNode instanceof Element ? sel.focusNode : sel.focusNode?.parentElement;
        const bqA = aEl && aEl.closest ? aEl.closest('blockquote') : null;
        const bqF = fEl && fEl.closest ? fEl.closest('blockquote') : null;
        if (bqA && bqF) {
          // if both inside quotes, prefer the inner-most common
          return bqA === bqF ? bqA : bqA.contains(fEl) ? bqA : bqF.contains(aEl) ? bqF : bqA;
        }
        return bqA || bqF || null;
      };

      // Utility: remove temporary paragraphs we add inside table cells/lists to enable wrapping
      const removeTempParagraphs = (root) => {
        if (!root || !(root instanceof Element)) return;
        const temps = root.querySelectorAll('p[data-rt-temp="1"]');
        temps.forEach((p) => {
          const parent = p.parentNode;
          if (!parent) return;
          const fragRm = document.createDocumentFragment();
          while (p.firstChild) fragRm.appendChild(p.firstChild);
          parent.replaceChild(fragRm, p);
        });
      };

      // Force quoted text grey and remember prior colors so unquote restores
      const paintGrey = (bq) => {
        try {
          if (!bq || !(bq instanceof Element)) return;
          const nodes = [bq, ...Array.from(bq.querySelectorAll('*'))];
          // Pass 1: capture original colors before any change
          nodes.forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            try {
              if (!el.getAttribute('data-prev-color')) {
                const computed = window.getComputedStyle(el);
                const prev = computed && computed.color ? computed.color : '';
                el.setAttribute('data-prev-color', prev);
              }
            } catch (e) {
              /* no-op */
            }
          });
          // Pass 2: apply grey
          nodes.forEach((el) => {
            if (el instanceof HTMLElement && el.style && el.style.setProperty) {
              el.style.setProperty('color', '#6F7B88', 'important');
            }
          });
        } catch (e) {
          /* no-op */
        }
      };

      // 1) If inside any blockquote, unwrap ALL nested blockquotes
      const unwrapOnce = (bq) => {
        const parent = bq.parentNode;
        if (!parent) return;
        // Restore original colors from saved attributes
        try {
          const restore = (el) => {
            const prev = el.getAttribute && el.getAttribute('data-prev-color');
            if (prev) {
              if (el.style && el.style.setProperty) el.style.setProperty('color', prev, '');
              el.removeAttribute('data-prev-color');
            } else if (el.style) {
              el.style.removeProperty('color');
            }
          };
          restore(bq);
          bq.querySelectorAll('*').forEach((el) => {
            if (el instanceof HTMLElement) restore(el);
          });
        } catch (e) {
          /* no-op */
        }
        const frag = document.createDocumentFragment();
        while (bq.firstChild) frag.appendChild(bq.firstChild);
        parent.replaceChild(frag, bq);
        removeTempParagraphs(parent);
      };
      // Prefer unwrapping the nearest blockquote (toggle off) if caret/selection is inside one
      const found = getActiveBlockquote();
      if (found) {
        unwrapOnce(found);
        notifyChange();
        saveSelection();
        return;
      }

      // If either range endpoint sits inside a blockquote, treat as toggle off
      const startEl =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer?.parentElement;
      const endEl =
        range.endContainer instanceof Element
          ? range.endContainer
          : range.endContainer?.parentElement;
      const bqStart = startEl && startEl.closest ? startEl.closest('blockquote') : null;
      const bqEnd = endEl && endEl.closest ? endEl.closest('blockquote') : null;
      if (bqStart || bqEnd) {
        unwrapOnce(bqStart || bqEnd);
        notifyChange();
        saveSelection();
        return;
      }

      // Helpers to find a safe paragraph-like element to wrap without breaking table/list layout
      const findBlockForWrap = (node) => {
        if (!node || !(node instanceof Element)) return null;
        // Prefer paragraphs/headings
        let target = node.closest('p, h1, h2, h3, h4, h5, h6');
        if (target) return target;
        // If inside list item, wrap its first paragraph or create one
        const li = node.closest('li');
        if (li) {
          target = li.querySelector('p');
          if (!target) {
            const p = document.createElement('p');
            p.setAttribute('data-rt-temp', '1');
            while (li.firstChild) p.appendChild(li.firstChild);
            li.appendChild(p);
            target = p;
          }
          return target;
        }
        // Inside table cells, never wrap the cell itself – create/select a paragraph inside
        const cell = node.closest('td, th');
        if (cell) {
          target = cell.querySelector('p, h1, h2, h3, h4, h5, h6');
          if (!target) {
            const p = document.createElement('p');
            p.setAttribute('data-rt-temp', '1');
            while (cell.firstChild) p.appendChild(cell.firstChild);
            cell.appendChild(p);
            target = p;
          }
          return target;
        }
        // No generic div fallback; do not wrap large containers accidentally
        return null;
      };

      const wrapSingleBlock = (blockEl) => {
        if (!blockEl) return;
        // Avoid double wrap
        const already = blockEl.closest('blockquote');
        if (already) {
          unwrapOnce(already);
          return;
        }
        const bqNode = document.createElement('blockquote');
        try {
          const computed = window.getComputedStyle(blockEl);
          if (computed && computed.color) bqNode.setAttribute('data-prev-color', computed.color);
        } catch (e) {
          /* no-op */
        }
        blockEl.parentNode?.insertBefore(bqNode, blockEl);
        bqNode.appendChild(blockEl);
        paintGrey(bqNode);
        const sel2 = window.getSelection();
        if (sel2) {
          sel2.removeAllRanges();
          const r = document.createRange();
          try {
            r.selectNodeContents(blockEl);
            r.collapse(false);
          } catch (e) {
            /* no-op */
          }
          sel2.addRange(r);
        }
      };

      // 2) Wrap selection or nearest block
      if (!range.collapsed) {
        // If selection lies entirely within the same blockquote, treat as toggle-off (unwrap)
        const startNode =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer?.parentElement;
        const endNodeSel =
          range.endContainer instanceof Element
            ? range.endContainer
            : range.endContainer?.parentElement;
        const startBQ = startNode && startNode.closest ? startNode.closest('blockquote') : null;
        const endBQ = endNodeSel && endNodeSel.closest ? endNodeSel.closest('blockquote') : null;
        if (startBQ && startBQ === endBQ) {
          unwrapOnce(startBQ);
          notifyChange();
          saveSelection();
          return;
        }
        // If the common ancestor sits under a blockquote, unwrap that (handles LTR selection that starts outside and ends inside)
        const ca = range.commonAncestorContainer;
        const caEl = ca instanceof Element ? ca : ca?.parentElement;
        const caBQ = caEl && caEl.closest ? caEl.closest('blockquote') : null;
        if (caBQ) {
          unwrapOnce(caBQ);
          notifyChange();
          saveSelection();
          return;
        }
        // If selection covers different blocks (e.g. ends on HR/another block), wrap only the start block
        const startBlock = findBlockForWrap(startNode);
        const endBlock = findBlockForWrap(endNodeSel);
        // If selection spans different blocks, act on start block only
        if (startBlock && (!endBlock || startBlock !== endBlock)) {
          wrapSingleBlock(startBlock);
          notifyChange();
          saveSelection();
          return;
        }
        // If selection sits within a single block, wrap that whole block (not just substring)
        if (startBlock && endBlock && startBlock === endBlock) {
          wrapSingleBlock(startBlock);
          notifyChange();
          saveSelection();
          return;
        }
        // If selection already contains a blockquote somewhere, unwrap them first to avoid nesting
        const fragmentCheck = range.cloneContents();
        let createdBq = null;
        if (fragmentCheck.querySelector && fragmentCheck.querySelector('blockquote')) {
          // unwrap all blockquotes inside selection
          const temp = document.createElement('div');
          temp.appendChild(fragmentCheck);
          temp.querySelectorAll('blockquote').forEach((bq) => {
            const frag = document.createDocumentFragment();
            while (bq.firstChild) frag.appendChild(bq.firstChild);
            bq.replaceWith(frag);
          });
          // replace selection with cleaned content wrapped once
          const cleaned = document.createDocumentFragment();
          while (temp.firstChild) cleaned.appendChild(temp.firstChild);
          const wrap = document.createElement('blockquote');
          try {
            const sc =
              range.startContainer instanceof Element
                ? range.startContainer
                : range.startContainer?.parentElement;
            const refEl = sc && (sc.closest('p, h1, h2, h3, h4, h5, h6') || sc);
            const computed = refEl ? window.getComputedStyle(refEl) : null;
            if (computed && computed.color) wrap.setAttribute('data-prev-color', computed.color);
          } catch (e) {
            /* no-op */
          }
          wrap.appendChild(cleaned);
          range.deleteContents();
          range.insertNode(wrap);
          createdBq = wrap;
          paintGrey(createdBq);
        } else {
          const wrap = document.createElement('blockquote');
          try {
            const sc =
              range.startContainer instanceof Element
                ? range.startContainer
                : range.startContainer?.parentElement;
            const refEl = sc && (sc.closest('p, h1, h2, h3, h4, h5, h6') || sc);
            const computed = refEl ? window.getComputedStyle(refEl) : null;
            if (computed && computed.color) wrap.setAttribute('data-prev-color', computed.color);
          } catch (e) {
            /* no-op */
          }
          wrap.appendChild(range.extractContents());
          range.insertNode(wrap);
          createdBq = wrap;
          paintGrey(createdBq);
        }
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          const endNode =
            createdBq ||
            (range.startContainer instanceof Element
              ? range.startContainer
              : range.startContainer?.parentElement) ||
            document.activeElement ||
            document.body;
          const newRange = document.createRange();
          try {
            newRange.selectNodeContents(endNode);
            newRange.collapse(false);
          } catch (e) {
            /* no-op */
          }
          sel.addRange(newRange);
        }
        notifyChange();
        saveSelection();
        return;
      }

      const targetBlock = findBlockForWrap(container);
      if (!targetBlock) return;
      // If target itself is inside blockquote (edge race), unwrap and exit
      if (targetBlock.closest('blockquote')) {
        let bq = targetBlock.closest('blockquote');
        while (bq) {
          unwrapOnce(bq);
          bq = targetBlock.closest('blockquote');
        }
        notifyChange();
        saveSelection();
        return;
      }
      const bq = document.createElement('blockquote');
      try {
        const computed = window.getComputedStyle(targetBlock);
        if (computed && computed.color) bq.setAttribute('data-prev-color', computed.color);
      } catch (e) {
        /* no-op */
      }
      targetBlock.parentNode?.insertBefore(bq, targetBlock);
      bq.appendChild(targetBlock);
      paintGrey(bq);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const newRange = document.createRange();
        try {
          newRange.selectNodeContents(targetBlock);
          newRange.collapse(false);
        } catch (e) {
          /* no-op */
        }
        sel.addRange(newRange);
      }
      notifyChange();
      saveSelection();
    };
    const wrapSelectionWithSpan = (styleText) => {
      const range = getSelectionRange();
      if (!range || range.collapsed) return;
      const span = document.createElement('span');
      // Keep inline styles editable (avoid !important so later updates work)
      try {
        span.setAttribute('style', `${styleText}`);
      } catch (e) {
        /* no-op */
      }
      try {
        range.surroundContents(span);
      } catch (e) {
        // Fallback: extract and insert to avoid DOMException when selection includes partial nodes
        try {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        } catch (err) {
          // Final fallback to execCommand
          const html = getSelectedHtml();
          if (html) exec('insertHTML', `<span style="${styleText}">${html}</span>`);
        }
      }
      notifyChange();
      saveSelection();
    };
    const wrapSelectionWithLink = (href) => {
      restoreSelection();
      const range = getSelectionRange();
      if (!range) return;

      const raw = String(href || '').trim();
      const normalized = /^(https?:|mailto:|#)/i.test(raw) ? raw : raw ? `https://${raw}` : '';

      if (!normalized) return;

      // Set anchor attributes properly
      const setAnchorAttrs = (a) => {
        a.setAttribute('href', normalized);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.style.color = '#0066cc';
        a.style.textDecoration = 'underline';
        a.style.cursor = 'pointer';
      };

      // Check if selection contains or is inside an anchor
      const startEl =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer?.parentElement;

      // Find if we're inside an existing anchor
      const existingA = startEl && startEl.closest ? startEl.closest('a') : null;

      if (
        existingA &&
        existingA.contains(range.startContainer) &&
        existingA.contains(range.endContainer)
      ) {
        // Update existing link - don't create new one
        setAnchorAttrs(existingA);
        notifyChange();
        saveSelection();
        return;
      }

      // Remove any anchors inside the selection first
      const fragment = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      const anchorsInSelection = tempDiv.querySelectorAll('a');

      if (anchorsInSelection.length > 0) {
        // Remove anchor tags but keep their text
        anchorsInSelection.forEach((anchor) => {
          const text = anchor.textContent || '';
          anchor.replaceWith(document.createTextNode(text));
        });
      }

      // Get clean text from selection (trim to remove &nbsp; and extra spaces)
      const selectedText = range.toString().trim();

      if (!selectedText) return;

      // Create new link
      const a = document.createElement('a');
      setAnchorAttrs(a);
      a.textContent = selectedText;

      // Delete original selection and insert new link
      range.deleteContents();
      range.insertNode(a);

      // Place caret after the link
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartAfter(a);
        newRange.collapse(true);
        sel.addRange(newRange);
      }

      notifyChange();
      saveSelection();
    };
    const unsetLinkAtSelection = () => {
      restoreSelection();
      const range = getSelectionRange();
      if (!range) return;
      if (range.collapsed) {
        const el =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer?.parentElement;
        const a = el && el.closest ? el.closest('a') : null;
        if (a) {
          const frag = document.createDocumentFragment();
          while (a.firstChild) frag.appendChild(a.firstChild);
          a.replaceWith(frag);
          notifyChange();
        }
        return;
      }
      const frag = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(frag);
      div.querySelectorAll('a').forEach((a) => {
        const f2 = document.createDocumentFragment();
        while (a.firstChild) f2.appendChild(a.firstChild);
        a.replaceWith(f2);
      });
      range.deleteContents();
      const cleaned = document.createDocumentFragment();
      while (div.firstChild) cleaned.appendChild(div.firstChild);
      range.insertNode(cleaned);
      notifyChange();
    };
    // Inline edit sessions (bg may use a temporary span; color uses execCommand)
    const activeColorSpan = null;
    let bgRaf = null;
    let pendingBgValue = null;
    const insertWrapperFromSavedSelection = (attr) => {
      // Prefer the savedRange captured on mousedown to avoid losing selection
      const range =
        savedRange && !savedRange.collapsed ? savedRange.cloneRange() : getSelectionRange();
      if (!range || range.collapsed) return null;
      const sel = window.getSelection();
      if (sel) {
        if (rawHtmlRef.current) rawHtmlRef.current.focus();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const html = getSelectedHtml();
      if (!html) return null;
      const id = `${attr.includes('raw-col') ? 'rawcol' : attr.includes('raw-bg') ? 'rawbg' : 'raw'}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      exec('insertHTML', `<span ${attr}="${id}">${html}</span>`);
      return rawHtmlRef.current?.querySelector(`span[${attr}="${id}"]`) || null;
    };

    const rgbaToHex = (rgbaString) => {
      if (!rgbaString) return null;
      // Expect formats like rgba(r, g, b, a) or rgb(r, g, b) or #rrggbb
      const hexMatch = rgbaString.trim().match(/^#([0-9a-fA-F]{6})$/);
      if (hexMatch) return `#${hexMatch[1].toLowerCase()}`;
      const rgbMatch = rgbaString
        .replace(/\s+/g, '')
        .match(/^rgba?\((\d+),(\d+),(\d+)(?:,(0|0?\.\d+|1))?\)$/i);
      if (!rgbMatch) return null;
      const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10)));
      const toHex = (n) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const startColorEdit = () => {
      // No wrapper for color; rely on native foreColor for minimal DOM changes
      saveSelection();
    };
    const updateColor = (val) => {
      restoreSelection();
      const hex = rgbaToHex(val) || val;
      try {
        document.execCommand('styleWithCSS', true);
      } catch (e) {
        /* no-op */
      }
      let applied = false;
      try {
        if (hex) {
          applied = document.execCommand('foreColor', false, hex);
        }
      } catch (e) {
        applied = false;
      }
      if (!applied) {
        wrapSelectionWithSpan(`color:${val} !important`);
      }
      // Refresh saved selection so dragging the picker keeps updating the correct range
      saveSelection();
      notifyChange();
    };
    const endColorEdit = () => {
      /* no-op */
    };

    const startBgEdit = () => {
      saveSelection();
    };
    const updateBg = (val) => {
      pendingBgValue = val;
      if (bgRaf) return;
      bgRaf = window.requestAnimationFrame(() => {
        bgRaf = null;
        const v = pendingBgValue;
        pendingBgValue = null;
        restoreSelection();
        let applied = false;
        try {
          document.execCommand('styleWithCSS', true);
        } catch (e) {
          /* no-op */
        }
        try {
          applied = document.execCommand('hiliteColor', false, v);
        } catch (e) {
          applied = false;
        }
        if (!applied) {
          try {
            applied = document.execCommand('backColor', false, v);
          } catch (e) {
            applied = false;
          }
        }
        if (!applied) {
          wrapSelectionWithSpan(`background-color:${v} !important`);
        }
        // Do NOT dispatch change on every drag tick; it is expensive and causes jank.
        saveSelection();
      });
    };
    const endBgEdit = () => {
      if (bgRaf) {
        cancelAnimationFrame(bgRaf);
        bgRaf = null;
      }
      // Emit a single change after user finishes picking
      notifyChange();
    };
    const setFontFamily = (family) => {
      try {
        document.execCommand('styleWithCSS', true);
      } catch (e) {
        /* no-op */
      }
      exec('fontName', family);
    };
    const setFontSizePx = (px) => {
      restoreSelection();
      const range = getSelectionRange();
      if (!range || range.collapsed) return;

      try {
        document.execCommand('styleWithCSS', true);
      } catch (e) {
        /* no-op */
      }

      const numericPx = typeof px === 'number' ? px : parseInt(String(px), 10);
      if (Number.isNaN(numericPx)) return;

      const lineHeightPx = Math.round(numericPx * 1.5);

      // Try to update an existing sized span if caret lies inside one
      const findSizedSpansInRange = () => {
        const result = [];
        const root =
          range.commonAncestorContainer instanceof Element
            ? range.commonAncestorContainer
            : range.commonAncestorContainer?.parentElement;
        if (!root) return result;
        const all = root.querySelectorAll(
          'span[data-rt-fs="1"], span[style*="font-size"], span[style*="line-height"]'
        );
        const intersects = (node) => {
          try {
            const r = document.createRange();
            r.selectNodeContents(node);
            return !(
              r.compareBoundaryPoints(Range.END_TO_START, range) <= 0 ||
              r.compareBoundaryPoints(Range.START_TO_END, range) >= 0
            );
          } catch (e) {
            return false;
          }
        };
        all.forEach((sp) => {
          if (intersects(sp)) result.push(sp);
        });
        // Also include ancestor span if caret started inside one
        let n =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer?.parentElement;
        while (n && n !== getHost()) {
          if (n.tagName === 'SPAN' && !result.includes(n)) result.push(n);
          n = n.parentElement;
        }
        return result.filter(Boolean);
      };
      const sizedSpans = findSizedSpansInRange();
      const normalizeSizedSpans = (blockRoot) => {
        if (!blockRoot) return;
        try {
          const items = Array.from(blockRoot.querySelectorAll('span[data-rt-fs="1"]'));
          items.forEach((sp) => {
            // Remove empty spans
            if (!sp.textContent || sp.textContent.trim() === '') {
              sp.remove();
              return;
            }
            // Flatten nested sized spans
            const nested = sp.querySelectorAll('span[data-rt-fs="1"]');
            nested.forEach((inner) => {
              while (inner.firstChild) sp.insertBefore(inner.firstChild, inner);
              inner.remove();
            });
          });
          // Merge adjacent with same style
          const walker = document.createTreeWalker(blockRoot, NodeFilter.SHOW_ELEMENT, null);
          let node = walker.nextNode();
          while (node) {
            if (node.tagName === 'SPAN' && node.getAttribute('data-rt-fs') === '1') {
              let next = node.nextSibling;
              while (
                next &&
                next.nodeType === 1 &&
                next.tagName === 'SPAN' &&
                next.getAttribute('data-rt-fs') === '1' &&
                next.getAttribute('style') === node.getAttribute('style')
              ) {
                while (next.firstChild) node.appendChild(next.firstChild);
                const toRemove = next;
                next = next.nextSibling;
                toRemove.remove();
              }
            }
            node = walker.nextNode();
          }
        } catch (e) {
          /* no-op */
        }
      };
      if (sizedSpans.length > 0) {
        sizedSpans.forEach((sp) => {
          sp.style.fontSize = `${numericPx}px`;
          sp.style.lineHeight = `${lineHeightPx}px`;
          sp.style.display = 'inline-block';
          try {
            sp.setAttribute('data-rt-fs', '1');
          } catch (e) {
            /* no-op */
          }
        });
        const blockRoot =
          (sizedSpans[0] && sizedSpans[0].closest('p, div, td, th, li, h1, h2, h3, h4, h5, h6')) ||
          getHost();
        normalizeSizedSpans(blockRoot);
        // Lock paragraph line-height to its current computed height (prevents expansion after resize)
        try {
          if (blockRoot && blockRoot !== getHost() && !blockRoot.getAttribute('data-rt-lock-lh')) {
            const cs = window.getComputedStyle(blockRoot);
            const baseLh = cs.lineHeight;
            if (baseLh && baseLh !== 'normal') {
              blockRoot.style.setProperty('line-height', baseLh, 'important');
              blockRoot.setAttribute('data-rt-lock-lh', '1');
            }
          }
        } catch (e) {
          /* no-op */
        }
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          const after = document.createRange();
          try {
            after.setStartAfter(sizedSpans[sizedSpans.length - 1]);
            after.collapse(true);
            sel.addRange(after);
          } catch (e) {
            /* no-op */
          }
        }
      } else {
        // Create a fresh wrapper
        const span = document.createElement('span');
        span.style.fontSize = `${numericPx}px`;
        span.style.lineHeight = `${lineHeightPx}px`;
        span.style.display = 'inline-block';
        span.setAttribute('data-rt-fs', '1');
        try {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            const newRange = document.createRange();
            try {
              newRange.setStartAfter(span);
              newRange.collapse(true);
              sel.addRange(newRange);
            } catch (e) {
              /* no-op */
            }
          }
          const blockRoot = span.closest('p, div, td, th, li, h1, h2, h3, h4, h5, h6') || getHost();
          normalizeSizedSpans(blockRoot);
          try {
            if (
              blockRoot &&
              blockRoot !== getHost() &&
              !blockRoot.getAttribute('data-rt-lock-lh')
            ) {
              const cs = window.getComputedStyle(blockRoot);
              const baseLh = cs.lineHeight;
              if (baseLh && baseLh !== 'normal') {
                blockRoot.style.setProperty('line-height', baseLh, 'important');
                blockRoot.setAttribute('data-rt-lock-lh', '1');
              }
            }
          } catch (e2) {
            /* no-op */
          }
        } catch (e) {
          // Fallback
          wrapSelectionWithSpan(
            `font-size:${numericPx}px; line-height:${lineHeightPx}px; display:inline-block;`
          );
        }
      }
      notifyChange();
    };
    const getSelectionFontSizePx = () => {
      const range = getSelectionRange();
      if (!range) return 16;
      const node =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer?.parentElement;
      if (!node) return 16;
      const computed = window.getComputedStyle(node);
      const px = parseInt(computed.fontSize || '16', 10);
      return Number.isNaN(px) ? 16 : px;
    };
    const adjustFontSize = (delta) => {
      saveSelection();
      const base = getSelectionFontSizePx();
      const next = Math.max(8, Math.min(96, base + delta));
      setFontSizePx(next);
    };
    const clearFormatting = () => {
      restoreSelection();
      const range = getSelectionRange();
      if (!range) return;
      try {
        // 1) Remove font-size & inline line-height from inline spans within the selection
        const frag = range.cloneContents();
        const container = document.createElement('div');
        container.appendChild(frag);
        container.querySelectorAll('[style*="font-size"]').forEach((el) => {
          const st = el.getAttribute('style') || '';
          const cleaned = st.replace(/(^|;|\s)font-size\s*:\s*[^;]+;?/gi, '$1');
          if (cleaned.trim()) el.setAttribute('style', cleaned);
          else el.removeAttribute('style');
        });
        container.querySelectorAll('[style*="line-height"]').forEach((el) => {
          const st = el.getAttribute('style') || '';
          const cleaned = st.replace(/(^|;|\s)line-height\s*:\s*[^;]+;?/gi, '$1');
          if (cleaned.trim()) el.setAttribute('style', cleaned);
          else el.removeAttribute('style');
        });
        // unwrap spans that ended up style-less
        container.querySelectorAll('span').forEach((sp) => {
          if (!sp.getAttribute('style')) {
            const d = document.createDocumentFragment();
            while (sp.firstChild) d.appendChild(sp.firstChild);
            sp.replaceWith(d);
          }
        });
        // Replace selection with cleaned fragment
        range.deleteContents();
        const cleaned = document.createDocumentFragment();
        while (container.firstChild) cleaned.appendChild(container.firstChild);
        range.insertNode(cleaned);
      } catch (e) {
        /* no-op */
      }

      // 2) Remove auto/locked line-height on any ancestor blocks we tagged
      try {
        const el =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer?.parentElement;
        const host = getHost();
        let node = el && el.closest('p, div, td, th, li, h1, h2, h3, h4, h5, h6');
        let hops = 0;
        while (node && node !== (host || document.body) && hops < 6) {
          if (
            node.getAttribute &&
            (node.getAttribute('data-rt-auto-lh') === '1' ||
              node.getAttribute('data-rt-lock-lh') === '1')
          ) {
            try {
              node.style.removeProperty('line-height');
            } catch (e) {
              /* no-op */
            }
            try {
              node.removeAttribute('data-rt-auto-lh');
            } catch (e) {
              /* no-op */
            }
            try {
              node.removeAttribute('data-rt-lock-lh');
            } catch (e) {
              /* no-op */
            }
          }
          node = node.parentElement;
          hops += 1;
        }
      } catch (e) {
        /* no-op */
      }
      notifyChange();
      saveSelection();
    };

    return {
      exec,
      query,
      enabled,
      insertBreak,
      insertHorizontalRule,
      align,
      toggleBlockquote,
      toggleUnderline,
      setColor: updateColor,
      setBgColor: updateBg,
      setFontFamily,
      setFontSizePx,
      adjustFontSize,
      getSelectionFontSizePx,
      saveSelection,
      restoreSelection,
      startColorEdit,
      updateColor,
      endColorEdit,
      startBgEdit,
      updateBg,
      endBgEdit,
      isInBlockquote,
      ensureParagraph,
      wrapSelectionWithLink,
      unsetLinkAtSelection,
      clearFormatting,
      wrapSelectionWithSpan,
    };
  }, []);

  const editor = useEditor({
    content: rawMode ? '<p></p>' : content ? markEmailCanvasRoot(content) : '<p></p>',
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {},
        },
        paragraph: {
          HTMLAttributes: {},
        },
        blockquote: {
          HTMLAttributes: {
            class: editorClasses.content.blockquote,
            style: 'color: #6F7B88 !important',
          },
        },
        codeBlock: false,
        // Ensure list nodes carry our classes so styles apply consistently
        listItem: {
          HTMLAttributes: { class: editorClasses.content.listItem },
        },
        bulletList: false, // Disable default, use custom below
        orderedList: false, // Disable default, use custom below
      }),
      BulletListCustom.configure({
        HTMLAttributes: { 
          class: editorClasses.content.bulletList,
        },
      }),
      OrderedListCustom.configure({
        HTMLAttributes: { 
          class: editorClasses.content.orderedList,
        },
      }),
      Underline,
      TextAlign.configure({
        types: [
          'heading',
          'paragraph',
          'div',
          'tableCell',
          'tableHeader',
          'listItem',
          'bulletList',
          'orderedList',
        ],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        validate: (href) => /^https?:\/\//i.test(href) || href.startsWith('#'),
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      ResizableImage,
      TextStyle.extend({
        addAttributes() {
          const parentAttrs = TextStyle.config?.addAttributes?.() ?? {};
          return {
            ...parentAttrs,
            backgroundColor: {
              default: null,
              parseHTML: (element) => element.style.backgroundColor || null,
              renderHTML: (attributes) =>
                attributes.backgroundColor
                  ? { style: `background-color: ${attributes.backgroundColor}` }
                  : {},
            },
          };
        },
      }),
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: editorClasses.content.table,
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: editorClasses.content.tableRow,
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: editorClasses.content.tableHeader,
          style: 'text-align: inherit',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: editorClasses.content.tableCell,
          style: 'text-align: inherit',
        },
      }),
      FontFamily,
      Placeholder.configure({
        placeholder,
      }),
      CustomFieldExtension,
    ],
    onUpdate: handleEditorUpdate,
    editorProps: {
      attributes: {
        // Add 'tiptap' so styling rules in styles.jsx apply to the ProseMirror root
        class: 'tiptap editor-content-area',
        'data-placeholder': placeholder,
        style: `--placeholder-text: "${placeholder}";`,
      },
      transformPastedHTML(html) {
        if (rawMode) return html;
        
        // Sanitize pasted HTML to prevent horizontal expansion
        const sanitizePastedHTML = (htmlString) => {
          if (!htmlString || typeof htmlString !== 'string') return htmlString;
          
          // Create a temporary DOM element to parse and sanitize HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlString;
          
          // Process all elements to remove/constrain fixed widths and prevent horizontal overflow
          const allElements = tempDiv.querySelectorAll('*');
          allElements.forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            
            const style = el.getAttribute('style') || '';
            let newStyle = style;
            
            // Remove or constrain fixed widths that exceed container
            const widthMatch = style.match(/width\s*:\s*(\d+)px/gi);
            if (widthMatch) {
              widthMatch.forEach((match) => {
                const widthValue = parseInt(match.match(/\d+/)?.[0] || '0', 10);
                // If width is too large (likely causing horizontal scroll), remove it or set to 100%
                if (widthValue > 800) {
                  newStyle = newStyle.replace(/width\s*:\s*\d+px/gi, '');
                  // Add max-width constraint instead
                  if (!newStyle.includes('max-width')) {
                    newStyle = `${newStyle ? `${newStyle}; ` : ''}max-width: 100%`;
                  }
                }
              });
            }
            
            // Remove min-width that's too large
            const minWidthMatch = style.match(/min-width\s*:\s*(\d+)px/gi);
            if (minWidthMatch) {
              minWidthMatch.forEach((match) => {
                const minWidthValue = parseInt(match.match(/\d+/)?.[0] || '0', 10);
                if (minWidthValue > 800) {
                  newStyle = newStyle.replace(/min-width\s*:\s*\d+px/gi, '');
                }
              });
            }
            
            // Remove white-space: nowrap which prevents wrapping
            newStyle = newStyle.replace(/white-space\s*:\s*nowrap\s*;?/gi, '');
            
            // Ensure word-wrap is enabled
            if (!newStyle.includes('word-wrap') && !newStyle.includes('overflow-wrap')) {
              newStyle = `${newStyle ? `${newStyle}; ` : ''}overflow-wrap: break-word; word-wrap: break-word`;
            }
            
            // Ensure box-sizing is border-box for proper width calculation
            if (!newStyle.includes('box-sizing')) {
              newStyle = `${newStyle ? `${newStyle}; ` : ''}box-sizing: border-box`;
            }
            
            // Update style attribute if changed
            if (newStyle !== style) {
              el.setAttribute('style', newStyle.trim());
            }
            
            // Remove width attribute if it's too large
            const widthAttr = el.getAttribute('width');
            if (widthAttr) {
              const widthValue = parseInt(widthAttr, 10);
              if (!Number.isNaN(widthValue) && widthValue > 800) {
                el.removeAttribute('width');
                // Add max-width style instead
                const currentStyle = el.getAttribute('style') || '';
                if (!currentStyle.includes('max-width')) {
                  el.setAttribute('style', `${currentStyle ? `${currentStyle}; ` : ''}max-width: 100%`);
                }
              }
            }
          });
          
          return tempDiv.innerHTML;
        };
        
        const sanitized = sanitizePastedHTML(html);
        return markEmailCanvasRoot(sanitized);
      },
      transformPastedText(text) {
        if (!text || rawMode) return text;
        
        // URL regex pattern
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        
        // Check if text contains URLs
        if (urlPattern.test(text)) {
          // Insert text with URLs converted to links
          // This will be handled by the Link extension's paste rules
          return text;
        }
        
        return text;
      },
      handlePaste(view, event) {
        // Check if pasted content contains URLs in plain text
        const dt = event.clipboardData;
        if (!dt) {
          // Fallback to default behavior
          return false;
        }

        const pastedText = dt.getData('text/plain') || '';
        const htmlData = dt.getData('text/html') || '';

        // If plain text contains URLs, let TipTap/Link handle it normally
        if (pastedText) {
          const urlPattern = /(https?:\/\/[^\s]+)/g;
          const urls = pastedText.match(urlPattern);

          if (urls && urls.length > 0 && !rawMode) {
            // If text contains URLs, let TipTap's link paste rule handle it
            // The Link extension has linkOnPaste: true, so it should auto-convert
            return false; // Let default paste handler process it
          }
        }

        // PRIORITY 1: Check for image files (drag-drop or file paste)
        const files = Array.from(dt.files || []);
        const imgFiles = files.filter((f) => f.type && f.type.startsWith('image/'));
        if (imgFiles.length > 0) {
          event.preventDefault();
          // CRITICAL: Upload images to get public URLs (Gmail requires HTTP/HTTPS URLs, not Base64)
          Promise.all(
            imgFiles.map((file) =>
              uploadImageFile(file)
                .then((imageUrl) => {
                  // Store uploaded public URL - this will work in Gmail
                  editor
                    ?.chain()
                    .focus()
                    .setImage({ src: imageUrl })
                    .run();
                })
                .catch((err) => {
                  console.error('[Paste] Failed to upload image:', err);
                })
            )
          );
          return true;
        }

        // PRIORITY 2: Check for clipboard image data (when copying image from browser/app)
        // This handles cases where image is copied (not as file) and pasted
        const clipboardItems = dt.items ? Array.from(dt.items) : [];
        const imageItem = clipboardItems.find((item) => item.type.startsWith('image/'));

        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            // CRITICAL: Upload clipboard image to get public URL for Gmail
            uploadImageFile(file)
              .then((imageUrl) => {
                editor
                  ?.chain()
                  .focus()
                  .setImage({ src: imageUrl })
                  .run();
              })
              .catch((err) => {
                console.error('[Clipboard Paste] Failed to upload image:', err);
              });
          }
          return true;
        }

        // PRIORITY 3: Fix multi-line plain-text paste so each line stays on its own line
        // Only intervene when there is NO rich HTML data (to avoid breaking copy/paste
        // from inside the editor or other rich text sources)
        if (!rawMode && pastedText && !htmlData) {
          const hasLineBreaks = /[\r\n]/.test(pastedText);
          if (hasLineBreaks) {
            event.preventDefault();

            const normalizeNewlines = (str) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const escapeHtml = (str) =>
              str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const lines = normalizeNewlines(pastedText).split('\n');

            // Build simple paragraphs so each source line becomes its own block
            const html = lines
              .map((line) =>
                line.trim()
                  ? `<p>${escapeHtml(line)}</p>`
                  : '<p><br /></p>'
              )
              .join('');

            editor
              ?.chain()
              .focus()
              .insertContent(html)
              .run();

            return true;
          }
        }

        return false;
      },
      handleDrop(view, event) {
        if (!event.dataTransfer) return false;
        const files = Array.from(event.dataTransfer.files || []);
        const imgFiles = files.filter((f) => f.type && f.type.startsWith('image/'));
        if (imgFiles.length === 0) return false;
        event.preventDefault();
        // CRITICAL: Upload images to get public URLs for Gmail compatibility
        Promise.all(
          imgFiles.map((file) =>
            uploadImageFile(file)
              .then((imageUrl) => {
                editor
                  ?.chain()
                  .focus()
                  .setImage({ src: imageUrl })
                  .run();
              })
              .catch((err) => {
                console.error('[Drop] Failed to upload image:', err);
              })
          )
        );
        return true;
      },
      handleClick(view, pos, event) {
        // Handle link clicks in TipTap editor
        const { target } = event;
        const anchor = target.closest('a');
        if (!anchor) return false;

        // Allow opening link with Ctrl/Cmd+Click (let browser handle it)
        if (event.ctrlKey || event.metaKey) {
          return false;
        }

        event.preventDefault();
        event.stopPropagation();

        const href = anchor.getAttribute('href');
        if (href) {
          try {
            window.open(href, '_blank', 'noopener,noreferrer');
          } catch (err) {
            console.error('Failed to open link:', err);
          }
        }
        return true;
      },
    },
    parseOptions: {
      preserveWhitespace: 'full',
    },
    enableInputRules: false,
    enablePasteRules: false,
    ...other,
  });

  const handleCodeChange = useCallback(
    (val) => {
      setSourceValue(val);

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          try {
            const next = markEmailCanvasRoot(val);
            const withInline = applyBlockquoteInlineColor(next);
            // Process HTML for source view display
            const processedHTML = processTipTapHTMLForEmail(withInline);
            setSourceValue(processedHTML); // Update source view with processed HTML
            
            if (!rawMode) {
              // Set original (unprocessed) HTML back to editor so TipTap works properly
              editor.commands.setContent(withInline, false, {
                preserveWhitespace: 'full',
              });
            }
            // Pass original HTML to onChange - processing will happen when saving
            onChange?.(withInline);
          } catch (err) {
            console.error('Error updating content:', err);
          }
        }
      }, 500);
    },
    [editor, onChange, markEmailCanvasRoot, rawMode, applyBlockquoteInlineColor, processTipTapHTMLForEmail]
  );

  // Track previous content to detect changes
  const previousContentRef = useRef(content);

  // Update sourceValue when content changes or when switching to source view
  useEffect(() => {
    if (content) {
      if (showSource) {
        // When in source view, show processed HTML (email-compatible)
        const processedContent = processTipTapHTMLForEmail(content);
        setSourceValue(processedContent);
      } else {
        // When not in source view, keep original content
        // It will be processed when user switches to source view via handleEditorUpdate
        setSourceValue(content);
      }
    } else {
      // When content becomes empty, also clear sourceValue
      setSourceValue('');
    }
  }, [content, showSource, processTipTapHTMLForEmail]);

  // Sync editor content when content prop changes (including empty content)
  // This handles: (1) content becomes empty (clear editor for new campaigns)
  //              (2) content changes from empty to non-empty (template loaded with content)
  //              (3) editor is empty but content prop has value (initial load or sync issue)
  useEffect(() => {
    if (!editor || editor.isDestroyed || rawMode) {
      previousContentRef.current = content;
      return;
    }

    // Check if content prop changed from previous value
    const previousContent = previousContentRef.current;
    if (previousContent === content) {
      return;
    }

    // Update ref to track current content
    previousContentRef.current = content;

    // Normalize for empty state comparison
    const isEmptyContent = !content || content.trim() === '' || content.trim() === '<p></p>';
    const currentEditorHtml = editor.getHTML();
    const isEditorEmpty = !currentEditorHtml || currentEditorHtml.trim() === '' || currentEditorHtml.trim() === '<p></p>';

    // Handle empty content - clear the editor (e.g., new campaign opened)
    if (isEmptyContent && !isEditorEmpty) {
      editor.commands.clearContent();
      setSourceValue('');
      return;
    }

    // Handle non-empty content when editor is empty (e.g., template loaded with content)
    if (!isEmptyContent && isEditorEmpty) {
      editor.commands.setContent(markEmailCanvasRoot(content), false, {
        preserveWhitespace: 'full',
      });
    }
  }, [content, editor, markEmailCanvasRoot, rawMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!rawMode) {
        if (editor && !editor.isDestroyed) {
          if (editor.isEmpty && content && content !== '<p></p>') {
            editor.commands.setContent(markEmailCanvasRoot(content), false, {
              preserveWhitespace: 'full',
            });
          }
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [content, editor, markEmailCanvasRoot, rawMode]);

  useEffect(() => {
    if (resetValue && !content && editor && !editor.isDestroyed) {
      editor.commands.clearContent();
      setSourceValue('');
    }
  }, [content, resetValue, editor]);

  useEffect(() => {
    if (fullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [fullScreen]);

  useEffect(
    () => () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const styleId = 'prosemirror-reset-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
          .ProseMirror {
            min-height: 400px;
            outline: none;
            padding-top: 16px; /* unified first-element spacing */
            white-space: pre-wrap;
            overflow-x: hidden !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Prevent any child elements from causing horizontal overflow */
          .ProseMirror * {
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
          }
          
          /* Ensure tables don't overflow */
          .ProseMirror table {
            max-width: 100% !important;
            table-layout: fixed !important;
          }
          
          /* Ensure divs and other block elements don't overflow */
          .ProseMirror div,
          .ProseMirror p,
          .ProseMirror span,
          .ProseMirror pre,
          .ProseMirror code {
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
          }
          [data-mui-color-scheme="dark"] .ProseMirror {
            background-color: #1c252e;
          }
          /* Placeholder styles - TipTap placeholder extension support */
          .ProseMirror.is-editor-empty p:first-child::before,
          .tiptap.is-editor-empty p:first-child::before,
          .editor-content-area.is-editor-empty p:first-child::before {
            content: var(--placeholder-text, attr(data-placeholder));
            float: left;
            color: #999;
            pointer-events: none;
            height: 0;
          }
          /* TipTap's default placeholder selector */
          .ProseMirror p.is-editor-empty:first-child::before,
          .tiptap p.is-editor-empty:first-child::before {
            content: var(--placeholder-text, attr(data-placeholder));
            float: left;
            color: #999;
            pointer-events: none;
            height: 0;
          }
          /* Ensure no element adds extra top spacing; rely on container padding */
          .ProseMirror > * { margin-top: 0 !important; }
          .ProseMirror p {
            margin: 0.5em 0;
          }
          .ProseMirror h1 { margin: 1.2em 0 0.6em 0; }
          .ProseMirror h2 { margin: 1em 0 0.5em 0; }
          .ProseMirror h3 { margin: 0.8em 0 0.4em 0; }
          .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 { margin: 0.7em 0 0.3em 0; }
          .ProseMirror img {
            max-width: 100%;
            height: auto;
            display: block;
            margin-top: 0 !important; /* Remove top spacing */
            margin-bottom: 0px !important; /* Remove bottom spacing */
          }
    
          /* Image resize container styles */
          .ProseMirror .image-resizable {
          position: relative;
          display: inline-block;
          }

        /* TABLE STYLES - PROPER SYNTAX */
  .ProseMirror table {
    border-collapse: collapse !important;
    table-layout: fixed !important;
    width: 100% !important;
    margin: 1rem 0 !important;
    border: 1px solid #cccccc !important;
    display: table !important;
    background-color: #ffffff !important;
    isolation: isolate !important;
    position: relative !important;
    z-index: 1 !important;
  }

  .ProseMirror table::before,
  .ProseMirror table::after {
    content: "" !important;
    display: table !important;
    clear: both !important;
  }

  .ProseMirror td,
  .ProseMirror th {
    border: 1px solid #d0d0d0 !important;
    padding: 12px 12px !important;
    text-align: left !important;
    vertical-align: middle !important;
    min-width: 100px !important;
    min-height: 60px !important;
    background-color: #ffffff !important;
    display: table-cell !important;
    box-sizing: border-box !important;
    position: relative !important;
  }

  .ProseMirror th {
    background-color: #f5f5f5 !important;
    font-weight: 600 !important;
    color: #333333 !important;
  }

  .ProseMirror tr {
    display: table-row !important;
  }
          
          .ProseMirror blockquote { 
            margin: 0.9em 0;
            padding: 36px 24px;
            padding-left: 65px;
            display: block;
            width: 100%;
            border-left: 6px solid #eef0f2;
            background-color: #f6f7f8;
            color: #6F7B88 !important;
            line-height: 1.6;
            font-weight: 600;
            position: relative;
          }
          .ProseMirror blockquote::before {
            content: "\\201C";
            position: absolute;
            left: 20px;
            top: 10px;
            font-size: 48px;
            line-height: 1;
            color: #9AA6B2;
            font-weight: 550;
            font-family: Georgia, Times, "Times New Roman", sans-serif;
            pointer-events: none;
          }
          /* Hide HTML quote icon in editor - CSS ::before handles it */
          .ProseMirror blockquote span[data-tiptap-quote],
          .tiptap blockquote span[data-tiptap-quote],
          .editor-content-area blockquote span[data-tiptap-quote] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
          }
          .ProseMirror blockquote p { margin: 0; }
        /* Editor view list layout:
           - Keep bullets and text aligned horizontally using flex
           - Vertically align bullets to the TOP of multi-line items so the dot
             always lines up with the first text line (not the vertical middle).
        */

  .ProseMirror ul { 
    list-style: none !important; 
    padding-left: 28px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
  }

  .ProseMirror ul[style*="text-align: center"],
  .ProseMirror ul[style*="text-align:center"] {
    align-items: center !important;
  }

  .ProseMirror ul[style*="text-align: right"],
  .ProseMirror ul[style*="text-align:right"] {
    align-items: flex-end !important;
  }

  .ProseMirror ul li { 
    display: flex !important;
    align-items: baseline !important; /* Vertically center bullet with first text line */
    text-align: inherit !important;
  }

  .ProseMirror ul li::before {
    content: "•" !important;
    margin-right: 10px !important;
    flex-shrink: 0 !important;
    position: relative !important;
    top: 0.125em !important;  /* Scales with font size (2px at 16px base) */
    font-weight: bold !important;  /* Bold bullet */
    font-size: 1.6em !important;   /* Bigger bullet - scales with list item font size */
  }

  /* Bullet list styles based on data-list-style attribute */
  .ProseMirror ul[data-list-style="disc"] li::before,
  .ProseMirror ul:not([data-list-style]) li::before {
    content: "•" !important;
  }

  .ProseMirror ul[data-list-style="circle"] li::before {
    content: "○" !important;
    margin-right: 10px !important;
    flex-shrink: 0 !important;
    position: relative !important;
    top: -0.25em !important;  /* Scales with font size (-3px at 16px base) */
    font-weight: bold !important;  /* Bold bullet */
    font-size: 0.55em !important;  /* Scales with list item font size */
  }

  .ProseMirror ul[data-list-style="square"] li::before {
    content: "■" !important;
    font-size: 0.52em !important;  /* Scales with list item font size */
    top: -0.3em !important;  /* Scales with font size (-3px at 16px base) */
  }

  .ProseMirror ol { 
    list-style: none !important; 
    padding-left: 28px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    counter-reset: item !important;
  }

  .ProseMirror ol[style*="text-align: center"],
  .ProseMirror ol[style*="text-align:center"] {
    align-items: center !important;
  }

  .ProseMirror ol[style*="text-align: right"],
  .ProseMirror ol[style*="text-align:right"] {
    align-items: flex-end !important;
  }

  .ProseMirror ol li { 
    display: flex !important;
    align-items: top !important; /* Vertically center number with first text line */
    text-align: inherit !important;
    counter-increment: item !important;
  }

  .ProseMirror ol li::before {
    content: counter(item) "." !important;
    margin-right: 8px !important;
    flex-shrink: 0 !important;
    position: relative !important;
    top: 0.13em !important;  /* Scales with font size */
    font-weight: 600 !important;  /* Bold number */
    font-size: 1em !important;  /* Match list item font size - scales dynamically */
  }

  /* Ordered list styles based on data-list-style attribute */
  .ProseMirror ol[data-list-style="decimal"] li::before,
  .ProseMirror ol:not([data-list-style]) li::before {
    content: counter(item) "." !important;
    top: 0.46875em !important;  /* Scales with font size (7.5px at 16px base) */
  }

  .ProseMirror ol[data-list-style="lower-alpha"] li::before {
    content: counter(item, lower-alpha) "." !important;
    top: 0.4375em !important;  /* Scales with font size (7px at 16px base) */
  }

  .ProseMirror ol[data-list-style="lower-greek"] li::before {
    content: counter(item, lower-greek) "." !important;
    top: 0.4375em !important;  /* Scales with font size (7px at 16px base) */
  }

  .ProseMirror ol[data-list-style="lower-roman"] li::before {
    content: counter(item, lower-roman) "." !important;
    top: 0.5em !important;  /* Scales with font size (8px at 16px base) */
  }

  .ProseMirror ol[data-list-style="upper-alpha"] li::before {
    content: counter(item, upper-alpha) "." !important;
    top: 0.51875em !important;  /* Scales with font size (8.3px at 16px base) */
  }

  .ProseMirror ol[data-list-style="upper-roman"] li::before {
    content: counter(item, upper-roman) "." !important;
    top: 0.51875em !important;  /* Scales with font size (8.3px at 16px base) */
  }

          /* Raw HTML editor: normalize paragraph spacing so top/bottom are balanced */
          .raw-html-editor p { margin: 0.5em 0 !important; }
          .raw-html-editor p:first-child { margin-top: 0 !important; }
          .raw-html-editor p:last-child { margin-bottom: 0 !important; }

          .raw-html-editor {
            padding-top: 16px !important; /* match ProseMirror */
          }
          .raw-html-editor > * { margin-top: 0 !important; }
          .raw-html-editor img {
            max-width: 100%;
            height: auto;
            margin-bottom: 8px;
          }

          /* Raw HTML editor: force list markers visible inside email templates */
          .raw-html-editor ul { list-style: none !important; padding-left: 1.5em !important; margin: 0.5em 0 !important; }
          .raw-html-editor ul[style*="text-align: center"],
          .raw-html-editor ul[style*="text-align: right"],
          .raw-html-editor ul[style*="text-align: justify"],
          .raw-html-editor ul:has(li[style*="text-align: center"]),
          .raw-html-editor ul:has(li[style*="text-align: right"]),
          .raw-html-editor ul:has(li[style*="text-align: justify"]) { padding-left: 0 !important; }
          .raw-html-editor ul > li { list-style: none !important; }
          .raw-html-editor ul > li::before { content: "•"; display: inline-block; width: 1em; margin-right: 6px; text-align: inherit; }
          /* Switch to native markers when container or item is aligned to ensure centering works even for single lines */
          .raw-html-editor ul[style*="text-align: center"] > li,
          .raw-html-editor ul[style*="text-align: right"] > li,
          .raw-html-editor ul[style*="text-align: justify"] > li { list-style: disc inside !important; }
          .raw-html-editor ul[style*="text-align: center"] > li::before,
          .raw-html-editor ul[style*="text-align: right"] > li::before,
          .raw-html-editor ul[style*="text-align: justify"] > li::before { content: none !important; width: 0; margin-right: 0; }

          .raw-html-editor ol { list-style: none !important; padding-left: 1.5em !important; margin: 0.5em 0 !important; counter-reset: olitem; }
          .raw-html-editor ol[style*="text-align: center"],
          .raw-html-editor ol[style*="text-align: right"],
          .raw-html-editor ol[style*="text-align: justify"],
          .raw-html-editor ol:has(li[style*="text-align: center"]),
          .raw-html-editor ol:has(li[style*="text-align: right"]),
          .raw-html-editor ol:has(li[style*="text-align: justify"]) { padding-left: 0 !important; }
          .raw-html-editor ol > li { list-style: none !important; counter-increment: olitem; }
          .raw-html-editor ol > li::before { content: counter(olitem) "."; display: inline-block; width: 2ch; margin-right: 6px; text-align: inherit; }
          .raw-html-editor ol[style*="text-align: center"] > li,
          .raw-html-editor ol[style*="text-align: right"] > li,
          .raw-html-editor ol[style*="text-align: justify"] > li { list-style: decimal inside !important; }
          .raw-html-editor ol[style*="text-align: center"] > li::before,
          .raw-html-editor ol[style*="text-align: right"] > li::before,
          .raw-html-editor ol[style*="text-align: justify"] > li::before { content: none !important; width: 0; margin-right: 0; }
          .raw-html-editor li { display: list-item !important; }
          .raw-html-editor [data-email-canvas-root="true"] ul { list-style: disc !important; }
          .raw-html-editor [data-email-canvas-root="true"] li { list-style-type: disc !important; }

          /* Raw HTML editor: blockquote style matching MUI preview */
          .raw-html-editor blockquote { 
            margin: 0.9em 0;
            padding: 36px 24px;
            padding-left: 65px;
            display: block;
            width: 100%;
            border-left: 6px solid #eef0f2;
            background-color: #f6f7f8;
            color: #6F7B88 !important;
            line-height: 1.6;
            font-weight: 600;
            position: relative;
          }
          .raw-html-editor blockquote::before {
            content: "\\201C";
            position: absolute;
            left: 20px;
            top: 10px;
            font-size: 48px;
            line-height: 1;
            color: #9AA6B2;
            font-weight: 550;
            font-family: Georgia, Times, "Times New Roman", sans-serif;
            pointer-events: none;
          }
          .raw-html-editor blockquote p { margin: 0; }
        `;
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Keep raw HTML surface in sync when switching modes or external content changes.
  // Do NOT rewrite innerHTML while user is typing, to avoid caret jumps.
  useEffect(() => {
    if (!rawMode || !rawHtmlRef.current || showSource || isTypingRef.current) return;
    const next = markEmailCanvasRoot(content || '');
    const withInline = applyBlockquoteInlineColor(next);
    // Only update if different to avoid clobbering selection unnecessarily
    if (
      typeof withInline === 'string' &&
      withInline.trim() !== rawHtmlRef.current.innerHTML.trim()
    ) {
      rawHtmlRef.current.innerHTML = withInline;
    }
  }, [rawMode, content, showSource, markEmailCanvasRoot, applyBlockquoteInlineColor]);

  const handleRawInput = useCallback(() => {
    if (!rawHtmlRef.current) return;
    const html = rawHtmlRef.current.innerHTML;
    isTypingRef.current = true;
    const withInline = applyBlockquoteInlineColor(html);
    setSourceValue(withInline);
    onChange?.(withInline);
    // release flag on next tick
    setTimeout(() => {
      isTypingRef.current = false;
    }, 0);
  }, [onChange, applyBlockquoteInlineColor]);

  // Prevent accidental navigation and image drag in raw mode
  useEffect(() => {
    if (!rawMode || !rawHtmlRef.current) return undefined;
    const host = rawHtmlRef.current;

    const handleClick = (e) => {
      // ✅ Better link detection
      let anchor = e.target;

      // Check if clicked element is a link or inside a link
      if (anchor.tagName !== 'A') {
        anchor = e.target.closest('a');
      }

      if (anchor && anchor.tagName === 'A' && host.contains(anchor)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const href = anchor.getAttribute('href');
        console.log('🔗 Link clicked:', href); // Debug

        if (href && href !== '#' && href.trim() !== '') {
          try {
            const newWindow = window.open(href, '_blank', 'noopener,noreferrer');
            if (!newWindow) {
              console.error('Popup blocked!');
            }
          } catch (err) {
            console.error('Failed to open link:', err);
          }
        }
        return;
      }

      // Rest of your existing code...
      const img = e.target.closest && e.target.closest('img');
      if (img) {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          try {
            range.setStartBefore(img);
          } catch (err) {
            /* no-op */
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return;
      }

      const ensureInside = () => {
        if (!isSelectionInsideAllowed()) {
          const canvas = getCanvasRoot();
          if (canvas) placeCaretInside(canvas);
          else placeCaretInside(host);
        }
      };
      ensureInside();
    };
    const findFirstTextNode = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.nodeValue && node.nodeValue.trim().length > 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP,
      });
      return walker.nextNode();
    };

    const placeCaretInside = (el, atEnd = false) => {
      if (!el) return;
      let node = null;
      if (el.nodeType === Node.TEXT_NODE) {
        node = el;
      } else {
        node = findFirstTextNode(el) || el.firstChild;
      }
      if (!node) return;
      const range = document.createRange();
      if (node.nodeType === Node.TEXT_NODE) {
        range.setStart(node, atEnd ? node.nodeValue.length : 0);
      } else {
        range.setStart(node, 0);
      }
      range.collapse(true);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    };

    const getCanvasRoot = () => host.querySelector('[data-email-canvas-root]');
    const getAfterCanvas = () => host.querySelector('[data-after-canvas]');

    const setCaretFromEvent = (e) => {
      // If the click is already inside allowed canvas zones, let the browser handle caret normally
      if (e.target.closest('[data-email-canvas-root], [data-after-canvas]')) return;
      // Prefer native caret calculations; if not valid, fall back to nearest text node inside target
      const x = e.clientX;
      const y = e.clientY;
      let range = null;
      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos && pos.offsetNode && host.contains(pos.offsetNode)) {
          range = document.createRange();
          range.setStart(
            pos.offsetNode,
            Math.min(pos.offset, pos.offsetNode?.length ?? pos.offset)
          );
          range.collapse(true);
        }
      } else if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y);
        if (r && r.startContainer && host.contains(r.startContainer)) range = r;
      }
      if (range) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
      }
      // Fallback: place caret at first text node within clicked cell/element
      let targetEl = e.target.closest(
        '[data-email-canvas-root], [data-after-canvas], td, th, div, span, p'
      );
      if (!targetEl) targetEl = getCanvasRoot() || host;
      // If click happened outside both canvas and after-canvas, force caret inside canvas
      if (!e.target.closest('[data-email-canvas-root], [data-after-canvas]')) {
        targetEl = getCanvasRoot() || targetEl;
      }
      placeCaretInside(targetEl);
    };

    const isSelectionInsideAllowed = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const container =
        sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      if (!container) return false;
      return !!container.closest('[data-email-canvas-root], [data-after-canvas]');
    };

    const isSelectionInsideHost = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const container =
        sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      if (!container) return false;
      return host.contains(container);
    };

    const insertImageHtml = (src) => {
      try {
        document.execCommand(
          'insertHTML',
          false,
          `<img src="${src}" style="max-width:100%;height:auto;" />`
        );
      } catch (e) {
        // ignore
      }
      host.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const redirectTyping = (e) => {
      // Redirect only when selection is outside allowed canvas OR outside host
      if (isSelectionInsideHost() && isSelectionInsideAllowed()) return;
      e.preventDefault();
      // Redirect caret into the canvas (start) to avoid inserting above
      const canvas = getCanvasRoot();
      if (canvas) {
        placeCaretInside(canvas);
      } else {
        placeCaretInside(host);
      }
    };
    const handleFocusIn = () => {
      // When the editable div gains focus, keep caret inside the canvas
      if (!isSelectionInsideAllowed()) {
        const canvas = getCanvasRoot();
        if (canvas) placeCaretInside(canvas);
        else placeCaretInside(host);
      }
    };
    const handlePaste = (e) => {
      // Before pasting, ensure caret is inside the canvas to prevent insertion above
      if (!isSelectionInsideAllowed()) {
        const canvas = getCanvasRoot();
        if (canvas) placeCaretInside(canvas, true);
        else placeCaretInside(host, true);
      }
      const dt = e.clipboardData;
      if (!dt) return;
      const items = Array.from(dt.items || []);
      const imgItems = items.filter((it) => it.type && it.type.startsWith('image/'));
      if (imgItems.length === 0) return;
      e.preventDefault();
      imgItems.forEach((it) => {
        const file = it.getAsFile();
        if (!file) return;
        // CRITICAL: Upload image for Gmail compatibility (raw HTML mode)
        uploadImageFile(file)
          .then((imageUrl) => {
            insertImageHtml(imageUrl);
          })
          .catch(() => {});
      });
    };
    const handleDrop = (e) => {
      const files = Array.from(e.dataTransfer?.files || []);
      const imgs = files.filter((f) => f.type && f.type.startsWith('image/'));
      if (imgs.length === 0) return;
      e.preventDefault();
      if (!isSelectionInsideAllowed()) {
        const canvas = getCanvasRoot();
        if (canvas) placeCaretInside(canvas, true);
        else placeCaretInside(host, true);
      }
      imgs.forEach((file) => {
        // CRITICAL: Upload image for Gmail compatibility (raw HTML mode)
        uploadImageFile(file)
          .then((imageUrl) => {
            insertImageHtml(imageUrl);
          })
          .catch(() => {});
      });
    };
    host.addEventListener('mousedown', () => {
      isTypingRef.current = true;
    });
    host.addEventListener('mouseup', () => {
      isTypingRef.current = false;
    });
    // Use capture phase to ensure link clicks are handled first
    host.addEventListener('click', handleClick, true);
    host.addEventListener('mouseup', setCaretFromEvent);
    host.addEventListener('beforeinput', redirectTyping);
    host.addEventListener('focusin', handleFocusIn);
    host.addEventListener('paste', handlePaste);
    host.addEventListener('drop', handleDrop);
    const handleKeyDown = (ev) => {
      // Only intervene if selection drifted completely outside the host
      if (!isSelectionInsideHost() && ev.key.length === 1) {
        redirectTyping(ev);
        return;
      }

      // Custom Backspace behavior: prefer deleting the focused sub-block (img/text)
      // and only delete the entire cell if truly at the start of the cell with no child content before caret
      if (ev.key === 'Backspace') {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        // Only when caret is collapsed
        if (!range.collapsed) return;
        // Only act when inside allowed canvas
        if (!isSelectionInsideAllowed()) return;

        const anchorEl =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer?.parentElement;
        if (!anchorEl) return;

        // 1) Delete the current sub-block (paragraph, heading, image, etc) when the caret is at its start
        const blockSelector =
          'p, h1, h2, h3, h4, h5, h6, ul, ol, li, div, figure, section, article, blockquote, img';
        const currentBlock = anchorEl.closest && anchorEl.closest(blockSelector);
        const isAtStartOfBlock = (block) => {
          if (!block) return false;
          try {
            const r = document.createRange();
            r.selectNodeContents(block);
            r.collapse(true);
            r.setEnd(
              range.startContainer,
              Math.min(range.startOffset, range.startContainer?.length ?? range.startOffset)
            );
            const frag = r.cloneContents();
            const div = document.createElement('div');
            div.appendChild(frag);
            const text = (div.textContent || '').replace(/\u200B/g, '').trim();
            const hasMeaningfulBefore = text.length > 0 || div.querySelector('img, table, hr');
            return !hasMeaningfulBefore;
          } catch (e) {
            return false;
          }
        };
        if (currentBlock && isAtStartOfBlock(currentBlock)) {
          // Avoid removing the entire canvas root accidentally
          const isCanvas =
            currentBlock.hasAttribute && currentBlock.hasAttribute('data-email-canvas-root');
          if (!isCanvas) {
            ev.preventDefault();
            const focusTarget =
              currentBlock.previousElementSibling ||
              currentBlock.nextElementSibling ||
              currentBlock.parentElement;
            currentBlock.remove();
            if (focusTarget) {
              placeCaretInside(focusTarget, true);
            } else {
              const canvas = getCanvasRoot();
              placeCaretInside(canvas || host, true);
            }
            host.dispatchEvent(new Event('input', { bubbles: true }));
            return;
          }
        }

        // 2) Prefer removing only the focused cell, never the whole table block
        let cell = anchorEl.closest && anchorEl.closest('td, th');
        // If caret sits on TR/TABLE accidentally, snap to the nearest cell
        if (!cell) {
          const tr = anchorEl.closest && anchorEl.closest('tr');
          if (tr) {
            cell = tr.querySelector('td, th');
          }
        }
        if (!cell) return;

        // Determine if caret is at the very start of the cell (no meaningful content before)
        let atCellStart = false;
        try {
          const startRange = document.createRange();
          startRange.selectNodeContents(cell);
          startRange.collapse(true);
          // Set end to current caret
          startRange.setEnd(
            range.startContainer,
            Math.min(range.startOffset, range.startContainer?.length ?? range.startOffset)
          );
          const frag = startRange.cloneContents();
          const div = document.createElement('div');
          div.appendChild(frag);
          const beforeText = (div.textContent || '').replace(/\u200B/g, '').trim();
          const hasNonEmptyBefore = beforeText.length > 0 || div.querySelector('img, table, hr');
          atCellStart = !hasNonEmptyBefore;
        } catch (e) {
          atCellStart = false;
        }

        if (atCellStart) {
          ev.preventDefault();
          // Prefer deleting the first meaningful child block at the caret (text/img), not the whole cell
          const isMeaningless = (node) => {
            if (!node) return true;
            if (node.nodeType === Node.TEXT_NODE)
              return !node.nodeValue || node.nodeValue.replace(/\u200B/g, '').trim() === '';
            if (node.nodeType === Node.ELEMENT_NODE) return node.tagName === 'BR';
            return true;
          };
          const firstChild = (() => {
            let n = cell.firstChild;
            while (n && isMeaningless(n)) n = n.nextSibling;
            return n;
          })();
          const removeNodeAndFocus = (nodeToRemove) => {
            if (!nodeToRemove || nodeToRemove === cell) return false;
            const focusEl =
              nodeToRemove.nextElementSibling || nodeToRemove.previousElementSibling || cell;
            nodeToRemove.remove();
            placeCaretInside(focusEl, true);
            host.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          };
          let removed = false;
          if (firstChild) {
            if (firstChild.nodeType === Node.ELEMENT_NODE) {
              const el = firstChild;
              // If it's a table with multiple rows, delete only the first row (commonly image vs text rows)
              if (el.tagName === 'TABLE') {
                const trs = el.querySelectorAll('tr');
                if (trs.length > 1) {
                  const row = trs[0];
                  row.remove();
                  placeCaretInside(el, true);
                  host.dispatchEvent(new Event('input', { bubbles: true }));
                  removed = true;
                } else {
                  removed = removeNodeAndFocus(el);
                }
              } else if (
                /^(P|H1|H2|H3|H4|H5|H6|DIV|FIGURE|UL|OL|BLOCKQUOTE|IMG)$/i.test(el.tagName)
              ) {
                removed = removeNodeAndFocus(el);
              }
            } else if (firstChild.nodeType === Node.TEXT_NODE) {
              // If a stray text node at the very start, remove the parent block if applicable
              const block = cell.querySelector('p, h1, h2, h3, h4, h5, h6, div, blockquote');
              if (block) {
                removed = removeNodeAndFocus(block);
              }
            }
          }
          // If we couldn't safely remove a sub-block, fall back to removing the cell
          if (!removed) {
            // Choose a sibling cell to keep focus after deletion
            const nextFocusCell = cell.previousElementSibling || cell.nextElementSibling;
            const parentRow = cell.parentElement;
            cell.remove();
            if (nextFocusCell) {
              placeCaretInside(nextFocusCell, true);
            } else if (parentRow) {
              placeCaretInside(parentRow, true);
            } else {
              const canvas = getCanvasRoot();
              placeCaretInside(canvas || host, true);
            }
            host.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    };
    host.addEventListener('keydown', handleKeyDown);
    const applyImgGuards = () => {
      const imgs = host.querySelectorAll('img');
      imgs.forEach((img) => {
        img.setAttribute('draggable', 'false');
        img.style.userSelect = 'none';
      });
    };
    const applyInlineQuoteColor = () => {
      try {
        const bqs = host.querySelectorAll('blockquote');
        bqs.forEach((bq) => {
          const style = bq.getAttribute('style') || '';
          const withoutExisting = style.replace(/(^|;|\s)color\s*:\s*[^;]+;?/gi, '$1');
          const merged = `${withoutExisting}${withoutExisting && !/;\s*$/.test(withoutExisting) ? ';' : ''}color: ${BLOCKQUOTE_COLOR} !important;`;
          bq.setAttribute('style', merged.trim());
        });
      } catch (e) {
        /* ignore */
      }
    };
    applyImgGuards();
    applyInlineQuoteColor();
    const observer = new MutationObserver(() => {
      applyImgGuards();
      applyInlineQuoteColor();
    });
    observer.observe(host, { childList: true, subtree: true });
    return () => {
      host.removeEventListener('click', handleClick, true);
      host.removeEventListener('mouseup', setCaretFromEvent);
      host.removeEventListener('beforeinput', redirectTyping);
      host.removeEventListener('focusin', handleFocusIn);
      host.removeEventListener('paste', handlePaste);
      host.removeEventListener('drop', handleDrop);
      observer.disconnect();
      host.removeEventListener('keydown', handleKeyDown);
    };
  }, [rawMode, readFileAsDataUrl, uploadImageFile]);

  useEffect(() => {
    if (!editor || rawMode) return undefined;
    const host = editor.view?.dom;
    if (!host) return undefined;

    const applyDomInline = () => {
      try {
        const bqs = host.querySelectorAll('blockquote');
        bqs.forEach((bq) => {
          const style = bq.getAttribute('style') || '';
          const withoutExisting = style.replace(/(^|;|\s)color\s*:\s*[^;]+;?/gi, '$1');
          const merged = `${withoutExisting}${withoutExisting && !/;\s*$/.test(withoutExisting) ? ';' : ''}color: ${BLOCKQUOTE_COLOR};`;
          const target = merged.trim();
          if (style.trim() !== target) {
            bq.setAttribute('style', target);
          }
        });
      } catch (e) {
        // ignore
      }
    };

    // Run on init and on editor changes
    applyDomInline();
    const off1 = editor.on('update', applyDomInline);
    const off2 = editor.on('selectionUpdate', applyDomInline);

    return () => {
      try {
        off1?.();
      } catch (e) {
        /* noop */
      }
      try {
        off2?.();
      } catch (e) {
        /* noop */
      }
    };
  }, [editor, rawMode]);

  return (
    <Portal disablePortal={!fullScreen}>
      {fullScreen && <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.modal - 1 }} />}

      <Box
        {...props.slotProps?.wrapper}
        sx={[
          () => ({
            display: 'flex',
            flexDirection: 'column',
            height: fullScreen ? '100vh' : '100%',
            position: fullScreen ? 'fixed' : 'relative',
            top: fullScreen ? 0 : 'auto',
            left: fullScreen ? 0 : 'auto',
            right: fullScreen ? 0 : 'auto',
            bottom: fullScreen ? 0 : 'auto',
            zIndex: fullScreen ? (theme) => theme.zIndex.modal : 'auto',
            '[data-mui-color-scheme="light"] &': { backgroundColor: '#ffffff' },
            '[data-mui-color-scheme="dark"] &': { backgroundColor: '#1c252e' },
            ...(!editable && { cursor: 'not-allowed' }),
          }),
          ...(Array.isArray(props.slotProps?.wrapper?.sx)
            ? props.slotProps?.wrapper?.sx ?? []
            : [props.slotProps?.wrapper?.sx]),
        ]}
      >
        <Box sx={{ flexShrink: 0 }}>
          <Toolbar
            editor={editor}
            fullItem={fullItem}
            fullScreen={fullScreen}
            onToggleFullScreen={handleToggleFullScreen}
            showSource={showSource}
            onToggleSource={handleToggleSource}
            rawMode={rawMode}
            rawApi={rawApi}
          />
       

        </Box>

        <Box
          sx={[
            {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
              maxHeight: fullScreen ? 'calc(100vh - 48px)' : 720,
              border: error 
                ? '1px solid #f44336' 
                : (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ddd'}`,
              borderTop: 'none',
              backgroundColor: 'transparent',
            },

            ...(props &&
            props.slotProps &&
            props.slotProps.content &&
            Array.isArray(props.slotProps.content.sx)
              ? props.slotProps.content.sx
              : [
                  (props &&
                    props.slotProps &&
                    props.slotProps.content &&
                    props.slotProps.content.sx) ||
                    {},
                ]),
          ]}
        >
          {showSource ? (
            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <CodeMirror
                value={sourceValue}
                height="100%"
                extensions={[htmlLang(), EditorView.lineWrapping]}
                onChange={handleCodeChange}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                }}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  height: '100%',
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                // pt: 2,
                flex: 1,
                overflow: 'auto',
                minHeight: 0,
                px: 2,
                // py: 2,
                position: 'relative',
                '[data-mui-color-scheme="light"] &': { 
                  backgroundColor: '#f6f7f8',
                  scrollbarColor: '#c1c1c1 #f1f1f1',
                },
                '[data-mui-color-scheme="dark"] &': { 
                  backgroundColor: '#1c252e',
                  scrollbarColor: '#4a5568 #1c252e',
                },
                // Scrollbar styling for dark mode
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  '[data-mui-color-scheme="light"] &': { backgroundColor: '#f1f1f1' },
                  '[data-mui-color-scheme="dark"] &': { backgroundColor: '#1c252e' },
                },
                '&::-webkit-scrollbar-thumb': {
                  '[data-mui-color-scheme="light"] &': { backgroundColor: '#c1c1c1' },
                  '[data-mui-color-scheme="dark"] &': { backgroundColor: '#4a5568' },
                  borderRadius: '4px',
                  '&:hover': {
                    '[data-mui-color-scheme="light"] &': { backgroundColor: '#a8a8a8' },
                    '[data-mui-color-scheme="dark"] &': { backgroundColor: '#5a6578' },
                  },
                },
              }}
            >
              {rawMode ? (
                <div
                  ref={rawHtmlRef}
                  className="raw-html-editor"
                  contentEditable
                  spellCheck={false}
                  onInput={handleRawInput}
                  suppressContentEditableWarning
                  style={{ paddingTop: '16px' }}
                />
              ) : (
                <EditorContent
                  ref={ref}
                  spellCheck="false"
                  autoComplete="off"
                  autoCapitalize="off"
                  editor={editor}
                  className={editorClasses.content.root}
                />
              )}
            </Box>
          )}
        </Box>

        {helperText && (
          <FormHelperText error={error} sx={{ px: 2, flexShrink: 0 }}>
            {helperText}
          </FormHelperText>
        )}
      </Box>
    </Portal>
  );
});
