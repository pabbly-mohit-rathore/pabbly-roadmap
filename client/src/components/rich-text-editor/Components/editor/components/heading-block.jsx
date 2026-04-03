import { useState } from 'react';

import Menu from '@mui/material/Menu';
import { listClasses } from '@mui/material/List';
import ButtonBase, { buttonBaseClasses } from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

import { ToolbarItem } from './toolbar-item';

// import { ToolbarItem } from './toolbar-item';

const HEADING_OPTIONS = [
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
];

// ----------------------------------------------------------------------

export function HeadingBlock({ editor, rawMode = false, rawApi }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (rawMode) rawApi?.saveSelection?.();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!editor) {
    return null;
  }

  // In raw HTML mode, we emulate headings using inline styles only (safe for email templates)
  const applyRawHeading = (level) => {
    if (!rawApi) return;
    rawApi?.restoreSelection?.();
    const sizeMap = { 1: 32, 2: 24, 3: 20, 4: 18, 5: 16, 6: 14 };
    if (!level) {
      // Paragraph: reset to base size and remove bold if applied
      rawApi?.setFontSizePx?.(16);
      if (rawApi?.query && rawApi.query('bold')) {
        rawApi.exec('bold');
      }
      return;
    }
    const px = sizeMap[level] || 16;
    rawApi?.setFontSizePx?.(px);
    if (rawApi?.query && !rawApi.query('bold')) {
      rawApi.exec('bold');
    }
  };

  return (
    <>
      <ButtonBase
        id="heading-menu-button"
        aria-label="Heading menu button"
        aria-controls={anchorEl ? 'heading-menu-button' : undefined}
        aria-haspopup="true"
        aria-expanded={anchorEl ? 'true' : undefined}
        onClick={handleClick}
        sx={(theme) => ({
          px: 1,
          width: 46,
          height: 32,
          borderRadius: 0.75,
          typography: 'body2',
          justifyContent: 'space-between',
        })}
      >
        {rawMode
          ? 'P'
          : (editor.isActive('heading', { level: 1 }) && 'H1') ||
            (editor.isActive('heading', { level: 2 }) && 'H2') ||
            (editor.isActive('heading', { level: 3 }) && 'H3') ||
            (editor.isActive('heading', { level: 4 }) && 'H4') ||
            (editor.isActive('heading', { level: 5 }) && 'H5') ||
            (editor.isActive('heading', { level: 6 }) && 'H6') ||
            'P'}
        <Iconify
          width={16}
          icon={anchorEl ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
        />
      </ButtonBase>
      {/* Remove font size dropdown */}

      <Menu
        id="heading-menu"
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        MenuListProps={{ 'aria-labelledby': 'heading-button' }}
        slotProps={{
          paper: {
            sx: {
              width: 120,
              [`& .${listClasses.root}`]: { gap: 0.5, display: 'flex', flexDirection: 'column' },
              [`& .${buttonBaseClasses.root}`]: {
                px: 1,
                width: 1,
                height: 34,
                borderRadius: 0.75,
                justifyContent: 'flex-start',
                '&:hover': { backgroundColor: 'action.hover' },
              },
            },
          },
        }}
      >
        <ToolbarItem
          component="li"
          label="P"
          active={rawMode ? false : editor.isActive('paragraph')}
          onClick={() => {
            handleClose();
            if (rawMode) {
              applyRawHeading(0);
            } else {
              editor.chain().focus().setParagraph().run();
            }
          }}
        />

        {HEADING_OPTIONS.map((heading, index) => {
          const level = index + 1;

          return (
            <ToolbarItem
              aria-label={heading}
              component="li"
              key={heading}
              label={heading}
              active={rawMode ? false : editor.isActive('heading', { level })}
              onClick={() => {
                handleClose();
                if (rawMode) {
                  applyRawHeading(level);
                } else {
                  editor.chain().focus().toggleHeading({ level }).run();
                }
              }}
              sx={{
                ...(heading !== 'Paragraph' && {
                  fontSize: 18 - index,
                  fontWeight: 'fontWeightBold',
                }),
              }}
            />
          );
        })}
      </Menu>
    </>
  );
}
