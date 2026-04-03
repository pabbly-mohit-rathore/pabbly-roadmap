import { SketchPicker } from 'react-color';
import { useRef, useState, useEffect } from 'react';
// import AFontIcon from 'public/assets/icons/richtext-builder/A-font.svg';

import Popover from '@mui/material/Popover';
import { Box, IconButton } from '@mui/material';

import { CONFIG } from 'src/config-global';

export function FontColorBlock({ editor, rawMode, rawApi }) {
  const [anchorEl, setAnchorEl] = useState(null);
  // Keep last explicitly chosen color; do not auto-apply defaults
  const [color, setColor] = useState('');
  const [, setTick] = useState(0);

  const buttonRef = useRef();

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

  // Read current selection color without forcing defaults; support rgba/hex
  const selectedColor = rawMode ? color : editor.getAttributes('textStyle').color;

  const handleMouseDown = (event) => {
    // Capture selection BEFORE focus moves to the button/popover
    event.preventDefault();
    if (rawMode) rawApi?.saveSelection?.();
  };

  const handleClick = (event) => {
    if (inQuote) return; // disabled inside blockquote
    setAnchorEl(event.currentTarget);
    if (rawMode) {
      rawApi?.startColorEdit?.();
    }
    // Initialize picker with current selection color if present
    if (selectedColor) setColor(selectedColor);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (colorResult) => {
    if (inQuote) return; // do not apply when disabled
    const rgbaColor = colorResult.rgb;
    const val = `rgba(${rgbaColor.r}, ${rgbaColor.g}, ${rgbaColor.b}, ${rgbaColor.a})`;
    setColor(val);
    if (rawMode) {
      // During drag, update the active span directly; no selection restore
      if (rawApi?.updateColor) {
        rawApi.updateColor(val);
      } else if (rawApi?.setColor) {
        rawApi.setColor(val);
      }
    } else {
      editor.chain().focus().setColor(val).run();
    }
  };

  const handleCloseAfterPick = () => {
    setAnchorEl(null);
    if (rawMode) rawApi?.endColorEdit?.();
  };

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* A icon - theme-aware color */}
        <Box
          component="img"
          src={`${CONFIG.site.basePath || ''}/assets/icons/richtext-builder/A-font.svg`}
          alt="Font Icon"
          sx={{
            width: 14,
            height: 14,
            '[data-mui-color-scheme="light"] &': {
              filter: 'none',
            },
            '[data-mui-color-scheme="dark"] &': {
              filter: 'invert(1)',
            },
          }}
        />

        {/* Colored underline indicator (reflects selection when available, theme-aware when no color) */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 3,
            left: '50.78%',
            transform: 'translateX(-50%)',
            width: 14,
            height: 2,
            backgroundColor: selectedColor || 'text.primary',
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
        <div role="presentation" onMouseDown={(e) => e.preventDefault()}>
          <SketchPicker color={color} onChange={handleChange} />
        </div>
      </Popover>
    </>
  );
}
