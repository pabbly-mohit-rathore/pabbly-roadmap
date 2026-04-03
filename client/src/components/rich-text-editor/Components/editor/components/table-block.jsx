// components/table-block.jsx
import React, { useState } from 'react';

import { Box, Grid, Button, Popover, IconButton, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from '../classes';

export function TableBlock({ editor, rawMode = false }) { // ADD rawMode prop
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (event) => {
    // Don't open in raw mode
    if (rawMode) {
      console.warn('Tables not supported in raw HTML mode');
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const insertTable = (rows, cols) => {
    if (!editor || rawMode) return; // Guard against raw mode
    
    try {
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
    } catch (error) {
      console.error('Table insert error:', error);
    }
    
    handleClose();
  };

  const tableSizes = [
    { rows: 3, cols: 3, label: '3x3' },
    { rows: 4, cols: 4, label: '4x4' },
    { rows: 5, cols: 5, label: '5x5' },
    { rows: 6, cols: 6, label: '6x6' },
  ];

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        size="medium"
        onClick={handleOpen}
        disabled={rawMode} // Disable in raw mode
        className={editorClasses.toolbar.fontSizeButton}
        sx={{
          width: 28,
          height: 28,
          border: 'none',
          cursor: rawMode ? 'not-allowed' : 'pointer', // Show disabled cursor
          borderRadius: '6px',
          color: rawMode ? 'text.disabled' : 'text.primary', // Grey out when disabled
          opacity: rawMode ? 0.5 : 1,
        }}
        aria-label="Insert table"
      >
        <Iconify
          icon="mdi:table"
          width={20}
          height={20}
        />
      </IconButton>
      <Popover
        open={Boolean(anchorEl) && !rawMode} // Don't open in raw mode
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          paper: {
            sx: {
              p: 2,
              minWidth: 200,
            },
          },
          root: {
            // Remove aria-hidden to fix accessibility warning
            onKeyDown: (e) => {
              // Allow Escape to close
              if (e.key === 'Escape') {
                handleClose();
              }
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Insert Table
        </Typography>
        <Grid container spacing={1}>
          {tableSizes.map((size) => (
            <Grid item xs={6} key={`${size.rows}x${size.cols}`}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => insertTable(size.rows, size.cols)}
                sx={{
                  width: '100%',
                  height: 40,
                  fontSize: '12px',
                }}
              >
                {size.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Popover>
    </Box>
  );
}