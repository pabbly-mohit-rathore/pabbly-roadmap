import { useRef, useState, useEffect } from 'react';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Portal from '@mui/material/Portal';
import IconButton from '@mui/material/IconButton';

import { BgColorBlock } from './bg-color-block';
import { FontColorBlock } from './font-color-block';

export function InlineBubble({ editor, rawMode, rawApi }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tickingRef = useRef(false);

  useEffect(() => {
    const handleSelection = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        tickingRef.current = false;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          setOpen(false);
          return;
        }
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          setOpen(false);
          return;
        }
        // Only show for selections inside our raw editor surface
        const anchorEl = (sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement) || null;
        const editorHost = anchorEl && anchorEl.closest('.raw-html-editor');
        if (!editorHost) {
          setOpen(false);
          return;
        }

        // Robust rect: try union of client rects when bounding client rect is 0
        let rect = range.getBoundingClientRect();
        if (!(rect.width || rect.height)) {
          const rects = Array.from(range.getClientRects ? range.getClientRects() : []);
          if (rects.length > 0) {
            rect = rects[0];
          }
        }

        if (!(rect && (rect.width || rect.height))) {
          setOpen(false);
          return;
        }
        setCoords({ top: rect.top + window.scrollY - 36, left: Math.max(8, rect.left + window.scrollX) });
        setOpen(true);
      });
    };

    document.addEventListener('selectionchange', handleSelection);
    window.addEventListener('scroll', handleSelection, true);
    window.addEventListener('resize', handleSelection);
    document.addEventListener('keyup', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      window.removeEventListener('scroll', handleSelection, true);
      window.removeEventListener('resize', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  const exec = (cmd) => {
    if (rawMode) {
      rawApi?.exec(cmd);
    } else {
      try {
        if (cmd === 'bold') editor.chain().focus().toggleBold().run();
        if (cmd === 'italic') editor.chain().focus().toggleItalic().run();
        if (cmd === 'underline') editor.chain().focus().toggleUnderline().run();
      } catch (e) {
        // ignore
      }
    }
  };

  if (!open) return null;

  return (
    <Portal>
      {open && (
        <Paper elevation={3} sx={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 1300, p: 0.5 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" onMouseDown={(e) => e.preventDefault()}>
            <IconButton size="small" onClick={() => exec('bold')}> <strong>B</strong> </IconButton>
            <IconButton size="small" onClick={() => exec('italic')}> <em>I</em> </IconButton>
            <IconButton size="small" onClick={() => exec('underline')}> <u>U</u> </IconButton>
            <IconButton size="small" onClick={() => rawMode ? rawApi?.adjustFontSize?.(2) : editor.chain().focus().setFontSize('increase').run()}>A+</IconButton>
            <IconButton size="small" onClick={() => rawMode ? rawApi?.adjustFontSize?.(-2) : editor.chain().focus().setFontSize('decrease').run()}>A-</IconButton>
            <BgColorBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
            <FontColorBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
          </Stack>
        </Paper>
      )}
    </Portal>
  );
}


