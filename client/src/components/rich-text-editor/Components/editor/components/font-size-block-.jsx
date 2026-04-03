import React, { useState } from 'react';

import { Box, Select, MenuItem, Typography, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from '../classes';

// Font size options ranging from 8 to 78
const fontSizeOptions = [8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 42, 48, 56, 64, 72, 78];

export function FontSizeBlock({ editor, rawMode, rawApi, handleOpenHeadingMenu, handleCloseHeadingMenu }) {
  const [isOpen, setIsOpen] = useState(false);

  // Get current font size from editor
  const getCurrentFontSize = () => {
    if (rawMode) {
      // Ask rawApi for the current computed size if available, fallback to 16
      if (rawApi?.getSelectionFontSizePx) return rawApi.getSelectionFontSizePx();
      return 16;
    }
    const attrs = editor.getAttributes('textStyle');
    const size = attrs.fontSize || 16;
    return typeof size === 'string' ? parseInt(size, 10) : size;
  };


  const [fontSize, setFontSize] = useState(getCurrentFontSize());

  const clampSize = (px) => Math.max(8, Math.min(96, px));
  const applySizePx = (px) => {
    const next = clampSize(px);
    setFontSize(next);
    if (rawMode) {
      rawApi?.restoreSelection?.();
      rawApi?.setFontSizePx(next);
      rawApi?.saveSelection?.();
    } else {
      editor.chain().focus().setFontSize(`${next}px`).run();
    }
  };

  const handleOpen = (event) => {
    setIsOpen(true);
    if (rawMode) rawApi?.saveSelection?.();
    // Refresh the label to reflect current selection's size
    setFontSize(getCurrentFontSize());
    if (handleOpenHeadingMenu) handleOpenHeadingMenu();
  };

  const handleClose = () => {
    setIsOpen(false);
    if (handleCloseHeadingMenu) handleCloseHeadingMenu();
  };

  const handleFontSizeChange = (event) => {
    const { value } = event.target;
    if (value === 'reset') {
      if (rawMode) {
        rawApi?.restoreSelection?.();
        rawApi?.clearFormatting?.(); // removes font-size spans and auto line-height
        rawApi?.saveSelection?.();
      } else {
        editor.chain().focus().unsetFontSize().run();
      }
      handleClose();
      return;
    }
    const newSize = value;
    setFontSize(newSize);

    // Apply font size to selected text
    if (rawMode) {
      // Restore selection captured on open, apply, then save again for consecutive changes
      rawApi?.restoreSelection?.();
      rawApi?.setFontSizePx(newSize);
      rawApi?.saveSelection?.();
    } else {
      editor.chain().focus().setFontSize(`${newSize}px`).run();
    }

    handleClose();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        size="medium"
        onClick={handleOpen}
        onMouseDown={(e) => {
          // Prevent focus loss and preserve selection before the menu opens
          e.preventDefault();
          if (rawMode) rawApi?.saveSelection?.();
        }}
        className={editorClasses.toolbar.fontSizeButton}
        sx={{
          height: '28px',
          fontSize: '1rem',
          minWidth: 'auto',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0.75,
        }}
      >
        <Typography variant="body2" sx={{ mr: 0.5 }}>
          {fontSize}px
        </Typography>
        <Iconify icon="mdi:chevron-down" width={16} />
      </IconButton>

      {/* Quick increment/decrement removed per user request */}

      {isOpen && (
      <Select
      autoFocus
      open={isOpen}
      value={fontSize}
      onClose={handleClose}
      onChange={handleFontSizeChange}
      MenuProps={{
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'left',
        },
        transformOrigin: {
          vertical: 'top',
          horizontal: 'left',
        },
        PaperProps: {
          sx: {
            width: 70,
            maxHeight: 300, // when content exceeds, MUI scrollbar appears
            overflowY: 'auto',
          },
        },
      }}
      sx={{
        position: 'absolute',
        top: 30,
        left: 0,
        opacity: 0,
        height: 0,
        width: 0,
      }}
    >
      <MenuItem value="reset">Reset</MenuItem>
      {fontSizeOptions.map((size) => (
        <MenuItem key={size} value={size} sx={{ justifyContent: 'center', textAlign: 'center' }}>
          {size}
        </MenuItem>
      ))}
    </Select>
    
      )}
    </Box>
  );
}
