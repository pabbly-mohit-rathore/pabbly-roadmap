import { useRef } from 'react';

import Box from '@mui/material/Box';

import { useBoolean } from 'src/hooks/use-boolean';

import { RichTextFileManagerFolderItem } from './file-manager-folder-item';
import { RichTextFileManagerNewFolderDialog } from './file-manager-new-folder-dialog';

// ----------------------------------------------------------------------

export function RichTextFileManagerGridView({
  table,
  dataFiltered,
  onDeleteItem,
  onToggleFavorite,
  selectedImages,
  onImageSelect,
}) {
  const { selected, onSelectRow: onSelectItem } = table;

  const upload = useBoolean();

  const containerRef = useRef(null);

  return (
    <>
      <Box ref={containerRef}>
        <Box
          gap={3}
          display="grid"
          gridTemplateColumns={{
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          }}
        >
          {dataFiltered
            .filter((i) => i.type === 'folder')
            .map((folder) => (
              <RichTextFileManagerFolderItem
                key={folder.id}
                folder={folder}
                selected={selected.includes(folder.id)}
                onSelect={() => onSelectItem(folder.id)}
                onDelete={() => onDeleteItem(folder.id)}
                onToggleFavorite={() => onToggleFavorite(folder.id)}
                sx={{ maxWidth: 'auto' }}
                isImageSelected={selectedImages && selectedImages.has(folder.id)}
                onImageSelect={onImageSelect ? () => onImageSelect(folder.id) : undefined}
              />
            ))}
        </Box>
      </Box>

      <RichTextFileManagerNewFolderDialog open={upload.value} onClose={upload.onFalse} />
    </>
  );
}
