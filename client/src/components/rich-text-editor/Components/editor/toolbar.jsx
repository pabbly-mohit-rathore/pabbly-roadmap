import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from './classes';
import { LinkBlock } from './components/link-block';
import { ImageBlock } from './components/image-block';
import { EmojiBlock } from './components/emoji-block';
import { TableBlock } from './components/table-block';
import { ToolbarItem } from './components/toolbar-item';
import { BgColorBlock } from './components/bg-color-block';
import { TableControls } from './components/table-controls';
import { FontSizeBlock } from './components/font-size-block-';
import { FontColorBlock } from './components/font-color-block';
import { FontFamilyBlock } from './components/font-family-block';
import { CustomFieldBlock } from './components/custom-field-block';

export function Toolbar({
  sx,
  editor,
  fullItem,
  fullScreen,
  onToggleFullScreen,
  showSource,
  onToggleSource,
  rawMode = false,
  rawApi,
  ...other
}) {
  // Hook must run unconditionally; guard UI later

  const boxStyles = {
    gap: 0.5,
    display: 'flex',
  };

  // Force immediate re-render after structural toggles (e.g., blockquote)
  const [uiTick, setUiTick] = useState(0);

  // List dropdown states
  const [bulletListAnchor, setBulletListAnchor] = useState(null);
  const [orderedListAnchor, setOrderedListAnchor] = useState(null);

  if (!editor) {
    return null;
  }

  // Helper function to check if an image is selected and get its position
  const getSelectedImage = () => {
    try {
      const { state } = editor;
      const { selection } = state;
      const { from, to } = selection;

      let imageNode = null;
      let imagePos = null;

      // Check if cursor is directly on an image node
      const resolvedPos = state.doc.resolve(from);
      const nodeAtPos = resolvedPos.nodeAfter;
      if (nodeAtPos && nodeAtPos.type.name === 'image') {
        imageNode = nodeAtPos;
        imagePos = from;
        return { imageNode, imagePos };
      }

      // Check nodes between selection range
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'image') {
          imageNode = node;
          imagePos = pos;
        }
      });

      return { imageNode, imagePos };
    } catch {
      return { imageNode: null, imagePos: null };
    }
  };

  // Helper function to get current bullet list style
  const getCurrentBulletListStyle = () => {
    if (!editor || rawMode) return 'disc';
    try {
      const attrs = editor.getAttributes('bulletList');
      return attrs['data-list-style'] || 'disc';
    } catch {
      return 'disc';
    }
  };

  // Helper function to get current ordered list style
  const getCurrentOrderedListStyle = () => {
    if (!editor || rawMode) return 'decimal';
    try {
      const attrs = editor.getAttributes('orderedList');
      return attrs['data-list-style'] || 'decimal';
    } catch {
      return 'decimal';
    }
  };

  return (
    <Stack
      className={editorClasses.toolbar.root}
      divider={<Divider orientation="vertical" flexItem sx={{ height: 16, my: 'auto' }} />}
      sx={[
        (theme) => ({
          gap: 1,
          p: 1.25,
          flexWrap: 'wrap',
          flexDirection: 'row',
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderTopLeftRadius: 'inherit',
          borderTopRightRadius: 'inherit',
          borderBottom: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ ...boxStyles }}>
        <FontSizeBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
        <FontFamilyBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
      </Box>

      <Box sx={{ ...boxStyles }}>
        <FontColorBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
        <BgColorBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
      </Box>

      <Box sx={{ ...boxStyles }}>
        <ToolbarItem
          aria-label="Bold"
          active={rawMode ? rawApi?.query('bold') : editor.isActive('bold')}
          className={editorClasses.toolbar.bold}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() =>
            rawMode ? rawApi?.exec('bold') : editor.chain().focus().toggleBold().run()
          }
          icon={
            <path d="M8 11H12.5C13.8807 11 15 9.88071 15 8.5C15 7.11929 13.8807 6 12.5 6H8V11ZM18 15.5C18 17.9853 15.9853 20 13.5 20H6V4H12.5C14.9853 4 17 6.01472 17 8.5C17 9.70431 16.5269 10.7981 15.7564 11.6058C17.0979 12.3847 18 13.837 18 15.5ZM8 13V18H13.5C14.8807 18 16 16.8807 16 15.5C16 14.1193 14.8807 13 13.5 13H8Z" />
          }
        />
        <ToolbarItem
          aria-label="Italic"
          active={rawMode ? rawApi?.query('italic') : editor.isActive('italic')}
          className={editorClasses.toolbar.italic}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() =>
            rawMode ? rawApi?.exec('italic') : editor.chain().focus().toggleItalic().run()
          }
          icon={<path d="M15 20H7V18H9.92661L12.0425 6H9V4H17V6H14.0734L11.9575 18H15V20Z" />}
        />
        <ToolbarItem
          aria-label="Underline"
          active={rawMode ? false : editor.isActive('underline')}
          className={editorClasses.toolbar.underline}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() =>
            rawMode ? rawApi?.toggleUnderline?.() : editor.chain().focus().toggleUnderline().run()
          }
          icon={
            <path d="M8 3V12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12V3H18V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V3H8ZM4 20H20V22H4V20Z" />
          }
        />
        <ToolbarItem
          aria-label="Strike"
          active={rawMode ? rawApi?.query('strikeThrough') : editor.isActive('strike')}
          className={editorClasses.toolbar.strike}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() =>
            rawMode ? rawApi?.exec('strikeThrough') : editor.chain().focus().toggleStrike().run()
          }
          icon={
            <path d="M17.1538 14C17.3846 14.5161 17.5 15.0893 17.5 15.7196C17.5 17.0625 16.9762 18.1116 15.9286 18.867C14.8809 19.6223 13.4335 20 11.5862 20C9.94674 20 8.32335 19.6185 6.71592 18.8555V16.6009C8.23538 17.4783 9.7908 17.917 11.3822 17.917C13.9333 17.917 15.2128 17.1846 15.2208 15.7196C15.2208 15.0939 15.0049 14.5598 14.5731 14.1173C14.5339 14.0772 14.4939 14.0381 14.4531 14H3V12H21V14H17.1538ZM13.076 11H7.62908C7.4566 10.8433 7.29616 10.6692 7.14776 10.4778C6.71592 9.92084 6.5 9.24559 6.5 8.45207C6.5 7.21602 6.96583 6.165 7.89749 5.299C8.82916 4.43299 10.2706 4 12.2219 4C13.6934 4 15.1009 4.32808 16.4444 4.98426V7.13591C15.2448 6.44921 13.9293 6.10587 12.4978 6.10587C10.0187 6.10587 8.77917 6.88793 8.77917 8.45207C8.77917 8.87172 8.99709 9.23796 9.43293 9.55079C9.86878 9.86362 10.4066 10.1135 11.0463 10.3004C11.6665 10.4816 12.3431 10.7148 13.076 11H13.076Z" />
          }
        />
      </Box>

      <Box sx={{ ...boxStyles }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <ToolbarItem
            aria-label="Bullet list"
            active={rawMode ? false : editor.isActive('bulletList')}
            className={editorClasses.toolbar.bulletList}
            onMouseDown={(e) => {
              e.preventDefault();
              if (rawMode) rawApi?.saveSelection?.();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (rawMode) {
                rawApi?.exec('insertUnorderedList');
              } else {
                editor.chain().focus().toggleBulletList().run();
              }
            }}
            icon={
              <path d="M8 4H21V6H8V4ZM4.5 6.5C3.67157 6.5 3 5.82843 3 5C3 4.17157 3.67157 3.5 4.5 3.5C5.32843 3.5 6 4.17157 6 5C6 5.82843 5.32843 6.5 4.5 6.5ZM4.5 13.5C3.67157 13.5 3 12.8284 3 12C3 11.1716 3.67157 10.5 4.5 10.5C5.32843 10.5 6 11.1716 6 12C6 12.8284 5.32843 13.5 4.5 13.5ZM4.5 20.4C3.67157 20.4 3 19.7284 3 18.9C3 18.0716 3.67157 17.4 4.5 17.4C5.32843 17.4 6 18.0716 6 18.9C6 19.7284 5.32843 20.4 4.5 20.4ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z" />
            }
          />
          <Box
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setBulletListAnchor(e.currentTarget);
            }}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              '&:hover': {
                backgroundColor: 'action.hover',
                borderRadius: '4px',
              },
            }}
          >
            <Iconify 
              icon="mingcute:down-line" 
              width={12} 
              height={12} 
              sx={{ color: 'text.primary' }} 
            />
          </Box>

          <ToolbarItem
            aria-label="Ordered list"
            active={rawMode ? false : editor.isActive('orderedList')}
            className={editorClasses.toolbar.orderedList}
            onMouseDown={(e) => {
              e.preventDefault();
              if (rawMode) rawApi?.saveSelection?.();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (rawMode) {
                rawApi?.exec('insertOrderedList');
              } else {
                editor.chain().focus().toggleOrderedList().run();
              }
            }}
            icon={
              <path d="M8 4H21V6H8V4ZM5 3V6H6V7H3V6H4V4H3V3H5ZM3 14V11.5H5V11H3V10H6V12.5H4V13H6V14H3ZM5 19.5H3V18.5H5V18H3V17H6V21H3V20H5V19.5ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z" />
            }
          />
          <Box
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOrderedListAnchor(e.currentTarget);
            }}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              '&:hover': {
                backgroundColor: 'action.hover',
                borderRadius: '4px',
              },
            }}
          >
            <Iconify 
              icon="mingcute:down-line" 
              width={12} 
              height={12} 
              sx={{ color: 'text.primary' }} 
            />
          </Box>
        </Box>

        <Menu
          anchorEl={bulletListAnchor}
          open={Boolean(bulletListAnchor)}
          onClose={() => setBulletListAnchor(null)}
          MenuListProps={{
            'aria-labelledby': 'bullet-list-menu',
          }}
          slotProps={{
            root: {
              onClose: (event, reason) => {
                if (reason === 'backdropClick') {
                  setBulletListAnchor(null);
                }
              },
            },
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
  {['Default', 'Circle', 'Disc', 'Square'].map((style) => {
    // Map menu style to data-list-style value
    const listStyleType =
      style === 'Default'
        ? 'disc'
        : style === 'Circle'
          ? 'circle'
          : style === 'Square'
            ? 'square'
            : 'disc';
    
    // Get current list style and check if this menu item matches
    const currentStyle = getCurrentBulletListStyle();
    const isSelected = editor.isActive('bulletList') && currentStyle === listStyleType;
    
    return (
      <MenuItem
        key={style}
        onClick={() => {
          if (!rawMode && editor) {
            // First ensure bullet list exists
            if (!editor.isActive('bulletList')) {
              editor.chain().focus().toggleBulletList().run();
            }

            // Apply list style using updateAttributes
            editor.chain().focus().updateAttributes('bulletList', { 
              'data-list-style': listStyleType 
            }).run();
          } else {
            rawApi?.exec('insertUnorderedList');
          }
          setBulletListAnchor(null);
        }}
        sx={{
          backgroundColor: isSelected ? 'action.selected' : 'transparent',
          color: isSelected ? 'primary.main' : 'text.primary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {style}
      </MenuItem>
    );
  })}
</Menu>

        <Menu
          anchorEl={orderedListAnchor}
          open={Boolean(orderedListAnchor)}
          onClose={() => setOrderedListAnchor(null)}
          MenuListProps={{
            'aria-labelledby': 'ordered-list-menu',
          }}
          slotProps={{
            root: {
              onClose: (event, reason) => {
                if (reason === 'backdropClick') {
                  setOrderedListAnchor(null);
                }
              },
            },
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          {[
            'Default',  
            'Lower Alpha',
            'Lower Greek',
            'Lower Roman',
            'Upper Alpha',
            'Upper Roman',
          ].map((style) => {
            // Map menu style to data-list-style value
            let listStyle = 'decimal';
            if (style === 'Lower Alpha') listStyle = 'lower-alpha';
            else if (style === 'Lower Greek') listStyle = 'lower-greek';
            else if (style === 'Lower Roman') listStyle = 'lower-roman';
            else if (style === 'Upper Alpha') listStyle = 'upper-alpha';
            else if (style === 'Upper Roman') listStyle = 'upper-roman';
            
            // Get current list style and check if this menu item matches
            const currentStyle = getCurrentOrderedListStyle();
            const isSelected = editor.isActive('orderedList') && currentStyle === listStyle;
            
            return (
              <MenuItem
                key={style}
                onClick={() => {
                  if (!rawMode && editor) {
                    if (!editor.isActive('orderedList')) {
                      editor.chain().focus().toggleOrderedList().run();
                    }
                    // Apply list style using data attribute
                    editor
                      .chain()
                      .focus()
                      .updateAttributes('orderedList', {
                        'data-list-style': listStyle,
                      })
                      .run();
                  } else {
                    rawApi?.exec('insertOrderedList');
                  }
                  setOrderedListAnchor(null);
                }}
                sx={{
                  backgroundColor: isSelected ? 'action.selected' : 'transparent',
                  color: isSelected ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                {style}
              </MenuItem>
            );
          })}
        </Menu>
      </Box>

      <Box sx={{ ...boxStyles }}>
        <ToolbarItem
          aria-label="Align left"
          active={
            rawMode
              ? false
              : (() => {
                  const { imageNode } = getSelectedImage();
                  if (imageNode) {
                    return (imageNode.attrs.align || 'left') === 'left';
                  }
                  return editor.isActive({ textAlign: 'left' });
                })()
          }
          className={editorClasses.toolbar.alignLeft}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() => {
            if (rawMode) {
              rawApi?.align('left');
              return;
            }

            const { imageNode, imagePos } = getSelectedImage();
            if (imageNode && imagePos !== null) {
              // Image is selected, update image alignment
              editor
                .chain()
                .focus()
                .setTextSelection({ from: imagePos, to: imagePos + imageNode.nodeSize })
                .updateAttributes('image', { align: 'left' })
                .run();
            } else {
              // No image selected, update text alignment
              editor
                .chain()
                .focus()
                .setTextAlign('left')
                .updateAttributes('bulletList', { textAlign: 'left' })
                .updateAttributes('orderedList', { textAlign: 'left' })
                .updateAttributes('listItem', { textAlign: 'left' })
                .run();
            }
          }}
          icon={<path d="M3 4H21V6H3V4ZM3 19H17V21H3V19ZM3 14H21V16H3V14ZM3 9H17V11H3V9Z" />}
        />
        <ToolbarItem
          aria-label="Align center"
          active={
            rawMode
              ? false
              : (() => {
                  const { imageNode } = getSelectedImage();
                  if (imageNode) {
                    return (imageNode.attrs.align || 'left') === 'center';
                  }
                  return editor.isActive({ textAlign: 'center' });
                })()
          }
          className={editorClasses.toolbar.alignCenter}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() => {
            if (rawMode) {
              rawApi?.align('center');
              return;
            }

            const { imageNode, imagePos } = getSelectedImage();
            if (imageNode && imagePos !== null) {
              // Image is selected, update image alignment
              editor
                .chain()
                .focus()
                .setTextSelection({ from: imagePos, to: imagePos + imageNode.nodeSize })
                .updateAttributes('image', { align: 'center' })
                .run();
            } else {
              // No image selected, update text alignment
              editor
                .chain()
                .focus()
                .setTextAlign('center')
                .updateAttributes('bulletList', { textAlign: 'center' })
                .updateAttributes('orderedList', { textAlign: 'center' })
                .updateAttributes('listItem', { textAlign: 'center' })
                .run();
            }
          }}
          icon={<path d="M3 4H21V6H3V4ZM5 19H19V21H5V19ZM3 14H21V16H3V14ZM5 9H19V11H5V9Z" />}
        />
        <ToolbarItem
          aria-label="Align right"
          active={
            rawMode
              ? false
              : (() => {
                  const { imageNode } = getSelectedImage();
                  if (imageNode) {
                    return (imageNode.attrs.align || 'left') === 'right';
                  }
                  return editor.isActive({ textAlign: 'right' });
                })()
          }
          className={editorClasses.toolbar.alignRight}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() => {
            if (rawMode) {
              rawApi?.align('right');
              return;
            }

            const { imageNode, imagePos } = getSelectedImage();
            if (imageNode && imagePos !== null) {
              // Image is selected, update image alignment
              editor
                .chain()
                .focus()
                .setTextSelection({ from: imagePos, to: imagePos + imageNode.nodeSize })
                .updateAttributes('image', { align: 'right' })
                .run();
            } else {
              // No image selected, update text alignment
              editor
                .chain()
                .focus()
                .setTextAlign('right')
                .updateAttributes('bulletList', { textAlign: 'right' })
                .updateAttributes('orderedList', { textAlign: 'right' })
                .updateAttributes('listItem', { textAlign: 'right' })
                .run();
            }
          }}
          icon={<path d="M3 4H21V6H3V4ZM7 19H21V21H7V19ZM3 14H21V16H3V14ZM7 9H21V11H7V9Z" />}
        />
        <ToolbarItem
          aria-label="Align justify"
          active={
            rawMode
              ? false
              : (() => {
                  const { imageNode } = getSelectedImage();
                  if (imageNode) {
                    return (imageNode.attrs.align || 'left') === 'justify';
                  }
                  return editor.isActive({ textAlign: 'justify' });
                })()
          }
          className={editorClasses.toolbar.alignJustify}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() => {
            if (rawMode) {
              rawApi?.align('justify');
              return;
            }

            const { imageNode, imagePos } = getSelectedImage();
            if (imageNode && imagePos !== null) {
              // Image is selected, update image alignment
              editor
                .chain()
                .focus()
                .setTextSelection({ from: imagePos, to: imagePos + imageNode.nodeSize })
                .updateAttributes('image', { align: 'justify' })
                .run();
            } else {
              // No image selected, update text alignment
              editor
                .chain()
                .focus()
                .setTextAlign('justify')
                .updateAttributes('bulletList', { textAlign: 'justify' })
                .updateAttributes('orderedList', { textAlign: 'justify' })
                .updateAttributes('listItem', { textAlign: 'justify' })
                .run();
            }
          }}
          icon={<path d="M3 4H21V6H3V4ZM3 19H21V21H3V19ZM3 14H21V16H3V14ZM3 9H21V11H3V9Z" />}
        />
      </Box>

      {fullItem && (
        <Box sx={{ ...boxStyles }}>
          <ToolbarItem
            aria-label="Blockquote"
            active={editor.isActive('blockquote')}
            disabled={getSelectedImage().imageNode !== null}
            className={editorClasses.toolbar.blockquote}
            onMouseDown={(e) => {
              e.preventDefault();
              if (rawMode) rawApi?.saveSelection?.();
            }}
            onClick={() => {
              const { imageNode } = getSelectedImage();
              if (imageNode !== null) {
                return; // Don't apply blockquote if image is selected
              }
              if (rawMode) {
                rawApi?.ensureParagraph?.();
                rawApi?.toggleBlockquote?.();
              } else {
                editor.chain().focus().toggleBlockquote().run();
              }
            }}
            icon={
              <path d="M4.58341 17.3211C3.55316 16.2274 3 15 3 13.0103C3 9.51086 5.45651 6.37366 9.03059 4.82318L9.92328 6.20079C6.58804 8.00539 5.93618 10.346 5.67564 11.822C6.21263 11.5443 6.91558 11.4466 7.60471 11.5105C9.40908 11.6778 10.8312 13.159 10.8312 15C10.8312 16.933 9.26416 18.5 7.33116 18.5C6.2581 18.5 5.23196 18.0095 4.58341 17.3211ZM14.5834 17.3211C13.5532 16.2274 13 15 13 13.0103C13 9.51086 15.4565 6.37366 19.0306 4.82318L19.9233 6.20079C16.588 8.00539 15.9362 10.346 15.6756 11.822C16.2126 11.5443 16.9156 11.4466 17.6047 11.5105C19.4091 11.6778 20.8312 13.159 20.8312 15C20.8312 16.933 19.2642 18.5 17.3312 18.5C16.2581 18.5 15.232 18.0095 14.5834 17.3211Z" />
            }
          />
          <ToolbarItem
            aria-label="Horizontal"
            className={editorClasses.toolbar.hr}
            onClick={() => {
              if (rawMode) {
                rawApi?.insertHorizontalRule?.();
              } else {
                editor.chain().focus().setHorizontalRule().run();
              }
            }}
            icon={<path d="M2 11H4V13H2V11ZM6 11H18V13H6V11ZM20 11H22V13H20V11Z" />}
          />
        </Box>
      )}

      <Box sx={{ ...boxStyles }}>
        <LinkBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
        <ImageBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
      </Box>

      <Box sx={{ ...boxStyles }}>
        {/* <ToolbarItem
          aria-label="Source"
          active={showSource}
          className={editorClasses.toolbar.code}
          onClick={onToggleSource}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m7 8l-4 4l4 4m10-8l4 4l-4 4M14 4l-4 16"
              />
            </svg>
          }
        /> */}
        <EmojiBlock editor={editor} />
        {/* Disable custom field when editing a full HTML template (rawMode) */}
        <CustomFieldBlock editor={editor} rawMode={rawMode} rawApi={rawApi} />
        <TableBlock editor={editor} rawMode={rawMode} />
        {/* <TableBlock editor={editor} /> */}
      <TableControls editor={editor} rawMode={rawMode} rawApi={rawApi} />
      </Box>

      <Box sx={{ ...boxStyles }}>
        <ToolbarItem
          aria-label="HardBreak"
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() =>
            rawMode ? rawApi?.insertBreak() : editor.chain().focus().setHardBreak().run()
          }
          className={editorClasses.toolbar.hardbreak}
          icon={
            <path d="M15 18H16.5C17.8807 18 19 16.8807 19 15.5C19 14.1193 17.8807 13 16.5 13H3V11H16.5C18.9853 11 21 13.0147 21 15.5C21 17.9853 18.9853 20 16.5 20H15V22L11 19L15 16V18ZM3 4H21V6H3V4ZM9 18V20H3V18H9Z" />
          }
        />
        <ToolbarItem
          aria-label="Clear"
          className={editorClasses.toolbar.clear}
          onMouseDown={(e) => {
            e.preventDefault();
            if (rawMode) rawApi?.saveSelection?.();
          }}
          onClick={() =>
            rawMode
              ? rawApi?.clearFormatting?.()
              : editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
          icon={
            <path d="M12.6512 14.0654L11.6047 20H9.57389L10.9247 12.339L3.51465 4.92892L4.92886 3.51471L20.4852 19.0711L19.071 20.4853L12.6512 14.0654ZM11.7727 7.53009L12.0425 5.99999H10.2426L8.24257 3.99999H19.9999V5.99999H14.0733L13.4991 9.25652L11.7727 7.53009Z" />
          }
        />
      </Box>

      {fullItem && (
        <Box sx={{ ...boxStyles }}>
          <ToolbarItem
            aria-label="Undo"
            className={editorClasses.toolbar.undo}
            disabled={!editor.can().chain().focus().undo().run()}
            onClick={() => editor.chain().focus().undo().run()}
            icon={
              <path d="M8 7V11L2 6L8 1V5H13C17.4183 5 21 8.58172 21 13C21 17.4183 17.4183 21 13 21H4V19H13C16.3137 19 19 16.3137 19 13C19 9.68629 16.3137 7 13 7H8Z" />
            }
          />
          <ToolbarItem
            aria-label="Redo"
            className={editorClasses.toolbar.redo}
            disabled={!editor.can().chain().focus().redo().run()}
            onClick={() => editor.chain().focus().redo().run()}
            icon={
              <path d="M16 7H11C7.68629 7 5 9.68629 5 13C5 16.3137 7.68629 19 11 19H20V21H11C6.58172 21 3 17.4183 3 13C3 8.58172 6.58172 5 11 5H16V1L22 6L16 11V7Z" />
            }
          />
        </Box>
      )}
      {/* 
      <Box sx={{ ...boxStyles }}>
        <ToolbarItem
          aria-label="Fullscreen"
          active={fullScreen}
          className={editorClasses.toolbar.fullscreen}
          onClick={onToggleFullScreen}
          icon={
            fullScreen ? (
              <path d="M18 7H22V9H16V3H18V7ZM8 9H2V7H6V3H8V9ZM18 17V21H16V15H22V17H18ZM8 15V21H6V17H2V15H8Z" />
            ) : (
              <path d="M16 3H22V9H20V5H16V3ZM2 3H8V5H4V9H2V3ZM20 19V15H22V21H16V19H20ZM4 19H8V21H2V15H4V19Z" />
            )
          }
        />
      </Box> */}
    </Stack>
  );
}
