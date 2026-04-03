import React, { useState } from 'react';

import { Box, Select, MenuItem, Typography, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from '../classes';

const fontFamilyOptions = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Comic Sans MS',
  'Inter',
  'DM Sans',
  'Nunito Sans',
  'Public Sans',
  'Poppins',
];

export function FontFamilyBlock({ editor, rawMode, rawApi }) {
  const [isOpen, setIsOpen] = useState(false);

  // Get current font family from editor
  const getCurrentFontFamily = () => {
    if (rawMode) return 'Arial';
    const attrs = editor.getAttributes('textStyle');
    return attrs.fontFamily || 'Arial';
  };

  const [fontFamily, setFontFamily] = useState(getCurrentFontFamily());

  const handleOpen = (event) => {
    setIsOpen(true);
    if (rawMode) {
      // Snapshot selection so opening the popover doesn't move caret
      rawApi?.saveSelection?.();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleFontFamilyChange = (event) => {
    const newFamily = event.target.value;
    setFontFamily(newFamily);
    if (rawMode) {
      rawApi?.restoreSelection?.();
      rawApi?.setFontFamily(newFamily);
    } else {
      editor.chain().focus().setMark('textStyle', { fontFamily: newFamily }).run();
    }
    handleClose();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        size="medium"
        onClick={handleOpen}
        onMouseDown={(e) => { e.preventDefault(); if (rawMode) rawApi?.saveSelection?.(); }}
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
        <Typography variant="body2" sx={{ mr: 0.5, color: 'text.primary' }}>
          {fontFamily}
        </Typography>
        <Iconify icon="mdi:chevron-down" width={16} />
      </IconButton>

      {isOpen && (
        <Select
          autoFocus
          open={isOpen}
          value={fontFamily}
          onClose={handleClose}
          onChange={handleFontFamilyChange}
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
                width: 180,
                maxHeight: 300,
                overflowY: 'auto',
                '& .MuiList-root': {
                  py: 0.5,
                },
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f0f0f0',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#c0c0c0',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: '#a0a0a0',
                },
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
          {fontFamilyOptions.map((family) => (
            <MenuItem key={family} value={family} style={{ fontFamily: family }}>
              {family}
            </MenuItem>
          ))}
        </Select>
      )}
    </Box>
  );
}