import { useCallback } from 'react';
import { useCopyToClipboard } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { useBoolean } from 'src/hooks/use-boolean';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';
import { usePopover } from 'src/components/custom-popover';
import { ConfirmDialog } from 'src/components/confirm-dialog';

// ----------------------------------------------------------------------

export function RichTextFileManagerFolderItem({
  sx,
  folder,
  selected,
  onSelect,
  onDelete,
  onToggleFavorite,
  isImageSelected,
  onImageSelect,
  ...other
}) {
  const { copy } = useCopyToClipboard();

  const share = useBoolean();

  const popover = usePopover();

  const confirm = useBoolean();

  const details = useBoolean();

  const checkbox = useBoolean();

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite();
  }, [onToggleFavorite]);

  const handleImageClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (onImageSelect) {
        onImageSelect();
      }
    },
    [onImageSelect]
  );

  const renderAction = (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        top: 8,
        right: 8,
      }}
    >
      <Checkbox
        color="warning"
        icon={<Iconify icon="eva:star-outline" sx={{ color: 'default' }} />}
        checkedIcon={<Iconify icon="eva:star-fill" />}
        checked={folder.isFavorited || false}
        onChange={handleToggleFavorite}
        inputProps={{
          name: 'checkbox-favorite',
          'aria-label': 'Checkbox favorite',
        }}
      />

      <IconButton
        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
        onClick={() => {
          confirm.onTrue();
          popover.onClose();
        }}
      >
        <Iconify icon="solar:trash-bin-trash-bold" />
      </IconButton>
    </Stack>
  );

  const renderImage = (
    <Box
      onMouseEnter={checkbox.onTrue}
      onMouseLeave={checkbox.onFalse}
      sx={{
        width: '100%',
        height: '180px',
        overflow: 'hidden',
      }}
    >
      <Box
        component="img"
        src={
          folder.imagePath ||
          `${CONFIG.site.basePath}/assets/images/file-manager/default-folder.png`
        }
        alt={folder.imageName || folder.name}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}
        onError={(e) => {
          // Fallback to default image if custom image fails to load
          e.target.src = `${CONFIG.site.basePath}/assets/images/file-manager/IntegrationPost.png`;
        }}
      />
    </Box>
  );

  const renderText = (
    <ListItemText
      onClick={details.onTrue}
      primary={folder.name}
      primaryTypographyProps={{ noWrap: true, typography: 'subtitle1' }}
      secondaryTypographyProps={{
        mt: 0.5,
        component: 'span',
        alignItems: 'center',
        typography: 'caption',
        color: 'text.disabled',
        display: 'inline-flex',
      }}
    />
  );

  return (
    <>
      <Paper
        variant="outlined"
        onClick={onImageSelect ? handleImageClick : undefined}
        sx={{
          gap: 1,
          display: 'flex',
          borderRadius: 2,
          cursor: onImageSelect ? 'pointer' : 'default',
          position: 'relative',
          bgcolor: 'transparent',
          flexDirection: 'column',
          alignItems: 'flex-start',
          // Add selection styling
          ...(isImageSelected && {
            bgcolor: 'primary.lighter',
            borderColor: 'primary.main',
            borderWidth: 2,
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}20`,
          }),
          ...((checkbox.value || selected) && {
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows.z20,
          }),
          '&:hover': {
            ...(onImageSelect && {
              borderColor: 'primary.light',
              boxShadow: (theme) => theme.customShadows.z8,
            }),
          },
          ...sx,
        }}
        {...other}
      >
        {isImageSelected && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 2,
              backgroundColor: 'primary.main',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Iconify icon="eva:checkmark-fill" sx={{ color: 'white', fontSize: 16 }} />
          </Box>
        )}

        {renderImage}

        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: '0px 20px 12px 20px',
          }}
        >
          <Box>{renderText}</Box>
          <Box>{renderAction}</Box>
        </Box>
      </Paper>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button variant="contained" color="error" onClick={onDelete}>
            Delete
          </Button>
        }
      />
    </>
  );
}
