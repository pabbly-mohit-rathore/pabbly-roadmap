import './emoji-block.css';

import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';

import { Box, Popover, useTheme, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from '../classes';

export function EmojiBlock({ editor }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEmojiSelect = (emojiData) => {
    editor.chain().focus().insertContent(emojiData.emoji).run();
    handleClose();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        size="medium"
        onClick={handleOpen}
        className={editorClasses.toolbar.fontSizeButton}
        sx={{
          width: 28,
          height: 28,
          border: 'none',

          cursor: 'pointer',
          borderRadius: '6px',
          color: 'text.primary',
        }}
        aria-label="Insert emoji"
      >
        <Iconify icon="proicons:emoji" width={20} height={20} />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 0,
            },
          },
        }}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiSelect}
          theme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
          emojiStyle="native"
          searchPlaceholder="Search emojis..."
  
          previewConfig={{
            showPreview: false,
          }}
          // skinTonesDisabled
          width={350}
          height={400}
        />
      </Popover>
    </Box>
  );
}
