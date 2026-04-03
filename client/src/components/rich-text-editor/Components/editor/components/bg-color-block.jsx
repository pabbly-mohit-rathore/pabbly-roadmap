import { SketchPicker } from 'react-color';
import { useRef, useState, useEffect } from 'react';

import { IconButton } from '@mui/material';
import Popover from '@mui/material/Popover';

import { Iconify } from 'src/components/iconify';

// Normalize color to #rrggbb for reliable application (execCommand, TipTap mark)
function rgbaToHex(rgba) {
  if (!rgba) return null;
  if (typeof rgba === 'string') {
    const hexMatch = rgba.trim().match(/^#([0-9a-fA-F]{6})$/);
    if (hexMatch) return `#${hexMatch[1].toLowerCase()}`;
    const rgbMatch = rgba.replace(/\s+/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,(0|0?\.\d+|1))?\)$/i);
    if (!rgbMatch) return null;
    const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10)));
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  const { r, g, b } = rgba;
  const toHex = (n) => Math.max(0, Math.min(255, Math.trunc(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function BgColorBlock({ editor, rawMode, rawApi }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [color, setColor] = useState('');
  const [, setTick] = useState(0);

  const buttonRef = useRef();
  const tiptapSavedSelRef = useRef(null);

  useEffect(() => {
    if (!editor || rawMode) return undefined;
    const rerender = () => setTick((t) => (t + 1) % 1000000);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);
    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor, rawMode]);

  if (!editor) return null;

  const isInTiptapBlockquote = () => {
    try {
      const { state } = editor;
      if (!state) return false;
      let found = false;
      state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
        if (node && node.type && node.type.name === 'blockquote') found = true;
      });
      return found;
    } catch (e) {
      return editor.isActive('blockquote');
    }
  };

  const inQuote = rawMode ? !!rawApi?.isInBlockquote?.() : isInTiptapBlockquote();

  // Helper to get background color from raw HTML selection
  const getRawSelectionBgColor = () => {
    if (!rawMode) return null;
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      
      // Traverse up to find element with background-color
      while (node && node !== document.body) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const style = window.getComputedStyle(node);
          const bgColor = style.backgroundColor;
          // Check if it has a visible background (not transparent/rgba(0,0,0,0))
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            return bgColor;
          }
        }
        node = node.parentNode;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Read current selection background color from textStyle.backgroundColor
  const selectedColor = rawMode 
    ? (getRawSelectionBgColor() || color)
    : editor.getAttributes('textStyle').backgroundColor;

  const handleMouseDown = (event) => {
    event.preventDefault();
    if (rawMode) {
      rawApi?.saveSelection?.();
    } else if (editor) {
      try {
        const sel = editor.state?.selection;
        if (sel) tiptapSavedSelRef.current = { from: sel.from, to: sel.to };
      } catch (e) {
        tiptapSavedSelRef.current = null;
      }
    }
  };

  const handleClick = (event) => {
    if (inQuote) return; // disabled in blockquote
    setAnchorEl(event.currentTarget);
    
    // Initialize color state with FRESH selection read
    if (rawMode) {
      const freshColor = getRawSelectionBgColor();
      setColor(freshColor || '#000000');
      rawApi?.saveSelection?.();
      rawApi?.startBgEdit?.();
    } else {
      const freshColor = editor.getAttributes('textStyle').backgroundColor;
      setColor(freshColor || '#000000');
      try {
        const sel = editor.state?.selection;
        if (sel) tiptapSavedSelRef.current = { from: sel.from, to: sel.to };
      } catch (e) {
        tiptapSavedSelRef.current = null;
      }
    }
  };

  const handleChange = (colorResult) => {
    if (inQuote) return; // do not apply when disabled
    const rgba = colorResult.rgb;
    const rgbaStr = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
    const hex = rgbaToHex(rgba);
    const valToApply = hex || rgbaStr;
    
    setColor(valToApply); // Update local state with hex priority
    
    if (rawMode) {
      if (rawApi?.updateBg) {
        rawApi.updateBg(valToApply);
      } else if (rawApi?.setBgColor) {
        rawApi.setBgColor(valToApply);
      }
    } else if (editor) {
      // Force live update on the exact selection saved at open
      const saved = tiptapSavedSelRef.current;
      const chain = editor.chain().focus();
      if (saved && typeof saved.from === 'number' && typeof saved.to === 'number') {
        chain.setTextSelection({ from: saved.from, to: saved.to });
      }
      chain
        .setMark('textStyle', { backgroundColor: valToApply })
        .run();
    }
  };

  const handlePickerMouseDown = (e) => {
    e.preventDefault();
  };

  const handleCloseAfterPick = () => {
    setAnchorEl(null);
    if (rawMode) rawApi?.endBgEdit?.();
    tiptapSavedSelRef.current = null;
  };

  // Always show a visible indicator - use selected color or default yellow
  const indicatorColor = selectedColor || '#000000';

  return (
    <>
      <IconButton
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        type="button"
        disabled={inQuote}
        style={{
          width: 28,
          height: 28,
          border: 'none',
          cursor: inQuote ? 'not-allowed' : 'pointer',
          opacity: inQuote ? 0.5 : 1,
          borderRadius: '6px',
          position: 'relative',
          padding: 0,
        }}
      >
        <Iconify 
          icon="rivet-icons:pencil-solid" 
          sx={{ 
            width: 14, 
            height: 16, 
            color: 'text.primary' 
          }} 
        />
        <span
          style={{
            position: 'absolute',
            bottom: 3,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50%',
            height: 2,
            backgroundColor: indicatorColor,
            borderRadius: 1,
          }}
        />
      </IconButton>
      <Popover
        open={Boolean(anchorEl) && !inQuote}
        anchorEl={anchorEl}
        onClose={handleCloseAfterPick}
        keepMounted
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <div role="presentation" onMouseDown={handlePickerMouseDown}>
          <SketchPicker color={color} onChange={handleChange} />
        </div>
      </Popover>
    </>
  );
}