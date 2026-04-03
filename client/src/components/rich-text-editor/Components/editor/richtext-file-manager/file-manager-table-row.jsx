import { useCallback } from 'react';
import { useDoubleClick } from 'minimal-shared/hooks';

import { Box } from '@mui/material';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableRow, { tableRowClasses } from '@mui/material/TableRow';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';

import { useBoolean } from 'src/hooks/use-boolean';

import { fData } from 'src/utils/format-number';

import { CONFIG } from 'src/config-global';
import { varAlpha } from 'src/theme/styles';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function RichTextFileManagerTableRow({
  row,
  selected,
  onSelectRow,
  onDeleteRow,
  onToggleFavorite,
  isImageSelected,
  onImageSelect,
}) {
  const theme = useTheme();

  const details = useBoolean();

  const confirm = useBoolean();

  const popover = usePopover();

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite();
  }, [onToggleFavorite]);

  const handleClick = useDoubleClick({
    click: () => {
      details.onTrue();
    },
    doubleClick: () => console.info('DOUBLE CLICK'),
  });

  const defaultStyles = {
    borderTop: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
    borderBottom: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
    '&:first-of-type': {
      borderTopLeftRadius: 16,
      borderBottomLeftRadius: 16,
      borderLeft: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
    },
    '&:last-of-type': {
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      borderRight: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
    },
  };

  const getImageFormat = (item) => {
    let fileName = '';

    // Always get filename from imagePath
    if (item.imagePath) {
      fileName = item.imagePath.split('/').pop() || '';
    }

    // Extract extension
    if (fileName && fileName.includes('.')) {
      const extension = fileName.split('.').pop().toLowerCase();
      return extension;
    }

    // Default fallback
    return 'jpg';
  };

  const handleImageClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (onImageSelect) {
        onImageSelect();
      }
    },
    [onImageSelect]
  );

  return (
    <>
      <TableRow
        selected={selected}
        onClick={onImageSelect ? handleImageClick : undefined}
        sx={{
          borderRadius: 2,
          cursor: onImageSelect ? 'pointer' : 'default',
          ...(isImageSelected && {
            backgroundColor: 'primary.lighter',
            '&:hover': { backgroundColor: 'primary.lighter' },
          }),
          [`&.${tableRowClasses.selected}, &:hover`]: {
            backgroundColor: isImageSelected ? 'primary.lighter' : 'background.paper',
            boxShadow: theme.customShadows.z20,
            transition: theme.transitions.create(['background-color', 'box-shadow'], {
              duration: theme.transitions.duration.shortest,
            }),
          },
          [`& .${tableCellClasses.root}`]: { ...defaultStyles },
          ...(details.value && { [`& .${tableCellClasses.root}`]: { ...defaultStyles } }),
        }}
      >
        <TableCell onClick={onImageSelect ? handleImageClick : handleClick}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {isImageSelected && (
              <Box
                sx={{
                  backgroundColor: 'primary.main',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1,
                }}
              >
                <Iconify icon="eva:checkmark-fill" sx={{ color: 'white', fontSize: 12 }} />
              </Box>
            )}

            <Box
              component="img"
              src={
                row.imagePath ||
                `${CONFIG.site.basePath}/assets/images/file-manager/IntegrationPost.png`
              }
              alt={row.imageName || row.name}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                objectFit: 'cover',
                // Add selection border
                ...(isImageSelected && {
                  border: 2,
                  borderColor: 'primary.main',
                }),
              }}
              onError={(e) => {
                e.target.src = `${CONFIG.site.basePath}/assets/images/file-manager/IntegrationPost.png`;
              }}
            />

            <Typography
              noWrap
              variant="inherit"
              sx={{
                maxWidth: 360,
                cursor: 'pointer',
                ...(details.value && { fontWeight: 'fontWeightBold' }),
                ...(isImageSelected && { color: 'primary.main', fontWeight: 'fontWeightMedium' }),
              }}
            >
              {row.name}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell
          onClick={onImageSelect ? handleImageClick : handleClick}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {fData(row.size)}
        </TableCell>

        <TableCell
          onClick={onImageSelect ? handleImageClick : handleClick}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {getImageFormat(row)}
        </TableCell>

        <TableCell
          onClick={onImageSelect ? handleImageClick : handleClick}
          sx={{ whiteSpace: 'nowrap' }}
          align="right"
        >
          <Typography variant="body2">
            {new Date(row.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            {new Date(row.createdAt).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </Typography>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          {/* Prevent event bubbling on action buttons */}
          <Checkbox
            color="warning"
            icon={<Iconify icon="eva:star-outline" />}
            checkedIcon={<Iconify icon="eva:star-fill" />}
            checked={row.isFavorited || false}
            onChange={(e) => {
              e.stopPropagation();
              handleToggleFavorite();
            }}
            sx={{ p: 0.75 }}
          />

          <IconButton
            color={popover.open ? 'inherit' : 'default'}
            onClick={(e) => {
              e.stopPropagation();
              popover.onOpen(e);
            }}
          >
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              confirm.onTrue();
              popover.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}
