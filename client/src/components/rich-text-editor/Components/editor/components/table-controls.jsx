import React, { useState, useEffect } from 'react';

import { Box } from '@mui/material';

import { ToolbarItem } from './toolbar-item';

export function TableControls({ editor }) {
  // State to force re-render when selection changes
  const [, setTick] = useState(0);

  // Listen to editor selection updates to re-render when clicking into table
  useEffect(() => {
    if (!editor) return undefined;
    const rerender = () => setTick((t) => (t + 1) % 1000000);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);
    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  if (!editor || !editor.isActive('table')) {
    return null;
  }

  // Get current column count from the table
  const getColumnCount = () => {
    const { state } = editor;
    const { selection } = state;
    const { $anchor } = selection;
    
    // Find the table node by walking up the document tree
    let tableNode = null;
    let { depth } = $anchor;
    
    while (depth > 0 && !tableNode) {
      const node = $anchor.node(depth);
      if (node && node.type.name === 'table') {
        tableNode = node;
        break;
      }
      depth -= 1;
    }
    
    if (tableNode) {
      // Find the first row to count columns
      const firstRow = tableNode.firstChild;
      if (firstRow && firstRow.type.name === 'tableRow') {
        return firstRow.childCount;
      }
    }
    
    // Fallback: try to find table row node using editor's state
    let columnCount = 0;
    state.doc.descendants((node) => {
      if (node.type.name === 'tableRow' && columnCount === 0) {
        columnCount = node.childCount;
        return false; // Stop iteration
      }
      return true;
    });
    
    return columnCount;
  };

  const columnCount = getColumnCount();
  const isMaxColumnsReached = columnCount >= 6;

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
     
      
      {/* Add Row Above */}
      <ToolbarItem
        aria-label="Add row above"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#637381" d="M22 14a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7h2v-2h4v2h2v-2h4v2h2v-2h4v2h2zM4 14h4v3H4zm6 0h4v3h-4zm10 0v3h-4v-3zm-9-4h2V7h3V5h-3V2h-2v3H8v2h3z"/></svg>}
      />

      {/* Add Row Below */}
      <ToolbarItem
        aria-label="Add row below"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#637381" d="M22 10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3h2v2h4V3h2v2h4V3h2v2h4V3h2zM4 10h4V7H4zm6 0h4V7h-4zm10 0V7h-4v3zm-9 4h2v3h3v2h-3v3h-2v-3H8v-2h3z"/></svg>}
      />

      {/* Add Column Before */}
      <ToolbarItem
        aria-label="Add column before"
        onClick={() => {
          if (!isMaxColumnsReached) {
            editor.chain().focus().addColumnBefore().run();
          }
        }}
        disabled={isMaxColumnsReached}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#637381" d="M13 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h9V2zm7 8v4h-7v-4zm0 6v4h-7v-4zm0-12v4h-7V4zM9 11H6V8H4v3H1v2h3v3h2v-3h3z"/></svg>}
      />

      {/* Add Column After */}
      <ToolbarItem
        aria-label="Add column after"
        onClick={() => {
          if (!isMaxColumnsReached) {
            editor.chain().focus().addColumnAfter().run();
          }
        }}
        disabled={isMaxColumnsReached}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#637381" d="M11 2a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H2V2zm-7 8v4h7v-4zm0 6v4h7v-4zM4 4v4h7V4zm11 7h3V8h2v3h3v2h-3v3h-2v-3h-3z"/></svg>}
      />

      

      {/* Delete Row */}
      <ToolbarItem
        aria-label="Delete row"
        onClick={() => editor.chain().focus().deleteRow().run()}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#637381" d="M9.41 13L12 15.59L14.59 13L16 14.41L13.41 17L16 19.59L14.59 21L12 18.41L9.41 21L8 19.59L10.59 17L8 14.41zM22 9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2zM4 9h4V6H4zm6 0h4V6h-4zm6 0h4V6h-4z"/></svg>}
      />

      {/* Delete Column */}
      <ToolbarItem
        aria-label="Delete column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#637381" d="M4 2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m0 8v4h7v-4zm0 6v4h7v-4zM4 4v4h7V4zm13.59 8L15 9.41L16.41 8L19 10.59L21.59 8L23 9.41L20.41 12L23 14.59L21.59 16L19 13.41L16.41 16L15 14.59z"/></svg>}
      />

      {/* Delete Table */}
      <ToolbarItem
        aria-label="Delete table"
        onClick={() => editor.chain().focus().deleteTable().run()}
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#637381" d="M12.35 20H10v-3h2.09c.12-.72.37-1.39.72-2H10v-3h4v1.54c.58-.54 1.25-.93 2-1.19V12h4v.35c.75.26 1.42.65 2 1.19V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h9.54c-.54-.58-.93-1.25-1.19-2M16 7h4v3h-4zm-6 0h4v3h-4zM8 20H4v-3h4zm0-5H4v-3h4zm0-5H4V7h4zm6.46 5.88l1.42-1.42L18 16.59l2.12-2.13l1.42 1.42L19.41 18l2.13 2.12l-1.42 1.42L18 19.41l-2.12 2.13l-1.42-1.42L16.59 18z"/></svg>}
      />
    </Box>
  );
} 