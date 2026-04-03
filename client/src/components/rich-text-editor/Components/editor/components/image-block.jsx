import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { FileManagerView } from 'src/app-sections/email-builder/file-manager-dialog';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from '../classes';
import { ToolbarItem } from './toolbar-item';

// ----------------------------------------------------------------------

export function ImageBlock({ editor }) {
  const [url, setUrl] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);

  const handleOpenPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  // Custom image insert command that places cursor DIRECTLY below image (no extra space)
  const insertImageAtPosition = useCallback(
    (imageSrc) => {
      if (!editor || !imageSrc) return;

      try {
        const { state, view } = editor;
        const { selection, tr, schema } = state;
        const { $from } = selection;

        // Check if current selection is an image node - if so, replace it
        // Use similar logic to getSelectedImage in toolbar.jsx
        let imageNodeToReplace = null;
        let imageNodePos = null;

        const { from, to } = selection;
        const resolvedPos = state.doc.resolve(from);

        // Check if cursor is directly on an image node (nodeAfter)
        const nodeAtPos = resolvedPos.nodeAfter;
        if (nodeAtPos && nodeAtPos.type.name === 'image') {
          imageNodeToReplace = nodeAtPos;
          imageNodePos = from;
        }

        // Check nodes between selection range (in case image is selected)
        if (!imageNodeToReplace) {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'image') {
              imageNodeToReplace = node;
              imageNodePos = pos;
            }
          });
        }

        // Also check node before position
        if (!imageNodeToReplace) {
          const { nodeBefore } = resolvedPos;
          if (nodeBefore && nodeBefore.type.name === 'image') {
            imageNodeToReplace = nodeBefore;
            imageNodePos = from - nodeBefore.nodeSize;
          }
        }

        if (imageNodeToReplace && imageNodePos !== null) {
          // Replace the selected image with new image, preserving dimensions
          const newImageNode = schema.nodes.image.create({
            src: imageSrc,
            width: imageNodeToReplace.attrs.width,
            height: imageNodeToReplace.attrs.height,
          });

          const transaction = tr.replaceWith(
            imageNodePos,
            imageNodePos + imageNodeToReplace.nodeSize,
            newImageNode
          );
          view.dispatch(transaction);

          // Focus the editor after replacement
          setTimeout(() => {
            view.focus();
          }, 100);
          return;
        }

        // Check if we're inside a table cell
        let isInTableCell = false;

        for (let d = $from.depth; d > 0; d -= 1) {
          const node = $from.node(d);
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            isInTableCell = true;
            break;
          }
        }

        if (isInTableCell) {
          // Strategy: Just insert the image, then add a zero-width space after it for cursor
          const insertPos = selection.from;

          // Check if cursor is at start of an empty paragraph
          const $pos = state.doc.resolve(insertPos);
          const { nodeBefore, nodeAfter, parent } = $pos;

          // If we're in an empty paragraph, replace it with the image
          const isInEmptyParagraph = parent.type.name === 'paragraph' && parent.content.size === 0;

          let transaction;

          if (isInEmptyParagraph) {
            // Replace the empty paragraph with image
            const parentPos = insertPos - $pos.parentOffset - 1;
            const imageNode = schema.nodes.image.create({ src: imageSrc });

            transaction = tr.replaceWith(parentPos, parentPos + parent.nodeSize, imageNode);

            // Add a new empty paragraph after image for cursor
            const afterImagePos = parentPos + imageNode.nodeSize;
            const emptyParagraph = schema.nodes.paragraph.create();
            transaction = transaction.insert(afterImagePos, emptyParagraph);

            // Place cursor inside that paragraph
            const cursorPos = afterImagePos + 1; // +1 to get inside the paragraph
            transaction = transaction.setSelection(
              state.selection.constructor.near(transaction.doc.resolve(cursorPos), 1)
            );
          } else {
            // Insert image at current position + paragraph after it
            const imageNode = schema.nodes.image.create({ src: imageSrc });
            const emptyParagraph = schema.nodes.paragraph.create();

            transaction = tr.insert(insertPos, [imageNode, emptyParagraph]);

            // Place cursor inside the paragraph after image
            const cursorPos = insertPos + imageNode.nodeSize + 1;
            transaction = transaction.setSelection(
              state.selection.constructor.near(transaction.doc.resolve(cursorPos), 1)
            );
          }

          // Dispatch the transaction
          view.dispatch(transaction);

          // Ensure focus after popover closes and aria-hidden is removed
          // Use longer delay to ensure MUI has removed aria-hidden from root
          setTimeout(() => {
            // Check if root still has aria-hidden before focusing
            const rootEl = document.getElementById('root');
            if (rootEl && rootEl.getAttribute('aria-hidden') === 'true') {
              // Wait a bit more if aria-hidden is still present
              setTimeout(() => {
                view.focus();
              }, 100);
            } else {
              view.focus();
            }
          }, 200);
        } else {
          // For normal content: insert image and place cursor after it
          const insertPos = selection.from;

          // Check if cursor is at start of an empty paragraph
          const $pos = state.doc.resolve(insertPos);
          const { parent } = $pos;

          // If we're in an empty paragraph, replace it with the image
          const isInEmptyParagraph = parent.type.name === 'paragraph' && parent.content.size === 0;

          let transaction;

          if (isInEmptyParagraph) {
            // Replace the empty paragraph with image
            const parentPos = insertPos - $pos.parentOffset - 1;
            const imageNode = schema.nodes.image.create({ src: imageSrc });

            transaction = tr.replaceWith(parentPos, parentPos + parent.nodeSize, imageNode);

            // Add a new empty paragraph after image for cursor
            const afterImagePos = parentPos + imageNode.nodeSize;
            const emptyParagraph = schema.nodes.paragraph.create();
            transaction = transaction.insert(afterImagePos, emptyParagraph);

            // Place cursor inside that paragraph
            const cursorPos = afterImagePos + 1; // +1 to get inside the paragraph
            transaction = transaction.setSelection(
              state.selection.constructor.near(transaction.doc.resolve(cursorPos), 1)
            );
          } else {
            // Insert image at current position + paragraph after it
            const imageNode = schema.nodes.image.create({ src: imageSrc });
            const emptyParagraph = schema.nodes.paragraph.create();

            transaction = tr.insert(insertPos, [imageNode, emptyParagraph]);

            // Place cursor inside the paragraph after image
            const cursorPos = insertPos + imageNode.nodeSize + 1;
            transaction = transaction.setSelection(
              state.selection.constructor.near(transaction.doc.resolve(cursorPos), 1)
            );
          }

          // Dispatch the transaction
          view.dispatch(transaction);

          // Ensure focus after popover closes and aria-hidden is removed
          // Use longer delay to ensure MUI has removed aria-hidden from root
          setTimeout(() => {
            // Check if root still has aria-hidden before focusing
            const rootEl = document.getElementById('root');
            if (rootEl && rootEl.getAttribute('aria-hidden') === 'true') {
              // Wait a bit more if aria-hidden is still present
              setTimeout(() => {
                view.focus();
              }, 100);
            } else {
              view.focus();
            }
          }, 200);
        }
      } catch (error) {
        console.error('Failed to insert image:', error);
        // Fallback to default insertion
        try {
          editor.chain().focus().setImage({ src: imageSrc }).run();
        } catch (fallbackError) {
          console.error('Fallback insertion also failed:', fallbackError);
        }
      }
    },
    [editor]
  );

  const handleUpdateUrl = useCallback(() => {
    // Remove focus from button before closing popover to avoid aria-hidden warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    handleClosePopover();

    if (anchorEl && url) {
      // Wait for popover to close and aria-hidden to be removed
      setTimeout(() => {
        // Check if root still has aria-hidden before inserting
        const rootEl = document.getElementById('root');
        if (rootEl && rootEl.getAttribute('aria-hidden') === 'true') {
          // Wait more if aria-hidden is still present
          setTimeout(() => {
            insertImageAtPosition(url);
            setUrl('');
          }, 150);
        } else {
          insertImageAtPosition(url);
          setUrl('');
        }
      }, 200);
    }
  }, [anchorEl, url, insertImageAtPosition]);

  const handlePickFile = useCallback(() => {
    // Remove focus from button before closing popover to avoid aria-hidden warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    handleClosePopover();

    // Wait for popover to close before opening file manager
    setTimeout(() => {
      setFileManagerOpen(true);
    }, 100);
  }, []);

  const handleFileManagerClose = useCallback(() => {
    // Remove focus from any active element before closing dialog
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setFileManagerOpen(false);

    // Wait for dialog to close and aria-hidden to be removed before focusing editor
    setTimeout(() => {
      if (editor && editor.view) {
        editor.view.focus();
      }
    }, 150);
  }, [editor]);

  const handleImageSelect = useCallback(
    (imageSrc) => {
      if (imageSrc) {
        // Remove focus before closing dialog to avoid aria-hidden warning
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        setFileManagerOpen(false);

        // Wait for dialog to close and aria-hidden to be removed before inserting image
        setTimeout(() => {
          // Check if root still has aria-hidden before inserting
          const rootEl = document.getElementById('root');
          if (rootEl && rootEl.getAttribute('aria-hidden') === 'true') {
            // Wait more if aria-hidden is still present
            setTimeout(() => {
              insertImageAtPosition(imageSrc);
            }, 150);
          } else {
            insertImageAtPosition(imageSrc);
          }
        }, 200);
      } else {
        // Remove focus before closing dialog
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setFileManagerOpen(false);
      }
    },
    [insertImageAtPosition]
  );

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        setUploading(true);
        const dataUrl = await readFileAsDataUrl(file);
        if (dataUrl) {
          // Remove focus before closing popover
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          handleClosePopover();

          // Wait for popover to close and aria-hidden to be removed
          setTimeout(() => {
            // Check if root still has aria-hidden before inserting
            const rootEl = document.getElementById('root');
            if (rootEl && rootEl.getAttribute('aria-hidden') === 'true') {
              // Wait more if aria-hidden is still present
              setTimeout(() => {
                insertImageAtPosition(String(dataUrl));
              }, 150);
            } else {
              insertImageAtPosition(String(dataUrl));
            }
          }, 200);
        } else {
          handleClosePopover();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to read image file', err);
        handleClosePopover();
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [insertImageAtPosition]
  );

  if (!editor) {
    return null;
  }

  return (
    <>
      <ToolbarItem
        aria-label="Image"
        className={editorClasses.toolbar.image}
        onClick={handleOpenPopover}
        icon={
          <path d="M20 5H4V19L13.2923 9.70649C13.6828 9.31595 14.3159 9.31591 14.7065 9.70641L20 15.0104V5ZM2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z" />
        }
      />
      <Popover
        id={anchorEl ? 'simple-popover' : undefined}
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{ paper: { sx: { p: 2.5 } } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Insert image
        </Typography>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Enter URL here..."
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && url) {
                event.preventDefault();
                // Remove focus from textfield before closing popover
                if (event.target instanceof HTMLElement) {
                  event.target.blur();
                }
                handleUpdateUrl();
              }
            }}
            sx={{ width: 350 }}
            autoFocus
          />
        </Box>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'right' }}>
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              color="primary"
              onClick={handlePickFile}
              disabled={uploading}
              startIcon={<Iconify icon="material-symbols:upload-rounded" />}
            >
              {uploading ? 'Reading…' : 'Upload image'}
            </Button>
          </Box>
          <Box>
            <Button variant="contained" color="primary" onClick={handleUpdateUrl} disabled={!url}>
              Apply URL
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* <RichTextfileManagerView
        open={fileManagerOpen}
        onClose={handleFileManagerClose}
        onSelect={handleImageSelect}
      /> */}
      <FileManagerView
        open={fileManagerOpen}
        onClose={handleFileManagerClose}
        onSelect={handleImageSelect}
      />
    </>
  );
}
