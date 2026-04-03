import { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import { Box, Tab, Tabs, Divider } from '@mui/material';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useBoolean } from 'src/hooks/use-boolean';
import { useSetState } from 'src/hooks/use-set-state';

import { fIsAfter, fIsBetween } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { fileFormat } from 'src/components/file-thumbnail';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { useTable, rowInPage, getComparator } from 'src/components/table';

import { RICHTEXT_FILE_TYPE_OPTIONS } from '../richtext-file-manager/_files';
import { RichTextFileManagerTable } from '../richtext-file-manager/file-manager-table';
import { RichTextFileManagerFilters } from '../richtext-file-manager/file-manager-filters';
import { RichTextFileManagerGridView } from '../richtext-file-manager/file-manager-grid-view';
import { RichTextFileManagerNewFolderDialog } from '../richtext-file-manager/file-manager-new-folder-dialog';

// ----------------------------------------------------------------------

// Custom data array to replace _allFiles
const CUSTOM_FILES_DATA = [
  {
    id: '1',
    name: 'Climber',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/Climber.svg`,
    size: 2500000, // 2.5MB in bytes
    createdAt: new Date('2024-01-15'),
    modifiedAt: new Date('2025-01-20'),
    isFavorited: true,
    url: 'https://example.com/marketing',
    totalFiles: 25,
  },
  {
    id: '2',
    name: 'Unicorn',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/Unicorn.gif`,
    size: 5800000, // 5.8MB in bytes
    createdAt: new Date('2024-02-10'),
    modifiedAt: new Date('2025-01-22'),
    isFavorited: false,
    url: 'https://example.com/products',
    totalFiles: 42,
  },
  {
    id: '3',
    name: 'Bee',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/Bee.jpg`,
    size: 1200000, // 1.2MB in bytes
    createdAt: new Date('2024-03-05'),
    modifiedAt: new Date('2025-01-18'),
    isFavorited: true,
    url: 'https://example.com/brand',
    totalFiles: 15,
  },
  {
    id: '4',
    name: 'Spiti',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/n1kh1l.patel.png`,
    size: 3400000, // 3.4MB in bytes
    createdAt: new Date('2024-04-12'),
    modifiedAt: new Date('2025-01-25'),
    isFavorited: false,
    url: 'https://example.com/social',
    totalFiles: 68,
  },
  {
    id: '5',
    name: 'Tractor',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/Tractor.gif`,
    size: 890000, // 890KB in bytes
    createdAt: new Date('2024-05-20'),
    modifiedAt: new Date('2025-01-21'),
    isFavorited: true,
    url: 'https://example.com/docs',
    totalFiles: 12,
  },
  {
    id: '6',
    name: 'Bokeh',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/Bokeh.jpg`,
    size: 1600000, // 1.6MB in bytes
    createdAt: new Date('2024-06-08'),
    modifiedAt: new Date('2025-01-23'),
    isFavorited: false,
    url: 'https://example.com/templates',
    totalFiles: 28,
  },
  {
    id: '7',
    name: 'Leaf',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/Leaf.jpg`,
    size: 4200000, // 4.2MB in bytes
    createdAt: new Date('2024-07-14'),
    modifiedAt: new Date('2025-01-24'),
    isFavorited: true,
    url: 'https://example.com/campaigns',
    totalFiles: 35,
  },
  {
    id: '8',
    name: 'Sunflower',
    type: 'folder',
    imagePath: `${CONFIG.site.basePath}/assets/images/file-manager/Sunflower.jpg`,
    size: 2800000, // 2.8MB in bytes
    createdAt: new Date('2024-08-03'),
    modifiedAt: new Date('2025-01-19'),
    isFavorited: false,
    url: 'https://example.com/training',
    totalFiles: 18,
  },
];

// ----------------------------------------------------------------------

export function RichTextfileManagerView({ open, onClose, onSelect }) {
  const table = useTable({ defaultRowsPerPage: 10 });

  const openDateRange = useBoolean();

  const confirm = useBoolean();

  const upload = useBoolean();

  const [view, setView] = useState('grid');

  // Use custom data instead of _allFiles
  const [tableData, setTableData] = useState(CUSTOM_FILES_DATA);
  const [selectedImages, setSelectedImages] = useState(new Set());

  const filters = useSetState({
    name: '',
    type: [],
    startDate: null,
    endDate: null,
  });

  const [currentTab, setCurrentTab] = useState('images');

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const dateError = fIsAfter(filters.state.startDate, filters.state.endDate);

  const handleToggleFavorite = useCallback((id) => {
    setTableData((prevData) =>
      prevData.map((item) => (item.id === id ? { ...item, isFavorited: !item.isFavorited } : item))
    );
  }, []);

  const getFilteredData = () => {
    // First filter to only folders
    let filteredData = tableData.filter((item) => item.type === 'folder');

    if (currentTab === 'favImages') {
      // Show only favorited folders
      filteredData = filteredData.filter((item) => item.isFavorited);
    }

    return applyFilter({
      inputData: filteredData,
      comparator: getComparator(table.order, table.orderBy),
      filters: filters.state,
      dateError,
    });
  };

  const dataFiltered = getFilteredData();

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!filters.state.name ||
    filters.state.type.length > 0 ||
    (!!filters.state.startDate && !!filters.state.endDate);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleChangeView = useCallback((event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  }, []);

  const handleDeleteItem = useCallback(
    (id) => {
      const deleteRow = tableData.filter((row) => row.id !== id);

      toast.success('Delete success!');

      setTableData(deleteRow);

      table.onUpdatePageDeleteRow(dataInPage.length);
    },
    [dataInPage.length, table, tableData]
  );

  const handleDeleteItems = useCallback(() => {
    const deleteRows = tableData.filter((row) => !table.selected.includes(row.id));

    toast.success('Delete success!');

    setTableData(deleteRows);

    table.onUpdatePageDeleteRows({
      totalRowsInPage: dataInPage.length,
      totalRowsFiltered: dataFiltered.length,
    });
  }, [dataFiltered.length, dataInPage.length, table, tableData]);

  // Add handler for image selection
  const handleImageSelect = useCallback((imageId) => {
    setSelectedImages((prev) => {
      const newSet = new Set();
      if (prev.has(imageId)) {
        // Deselect if already selected
        return newSet;
      }
      // Select only this image (single selection)
      newSet.add(imageId);
      return newSet;
    });
  }, []);

  // Add handler for inserting selected image
  const handleInsertImage = useCallback(() => {
    if (selectedImages.size > 0 && onSelect) {
      const selectedImageId = Array.from(selectedImages)[0];
      const selectedImage = tableData.find((item) => item.id === selectedImageId);
      if (selectedImage) {
        // Remove focus before closing dialog to avoid aria-hidden warning
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        
        onSelect(selectedImage.imagePath);
        
        // Wait a bit before closing to ensure focus is removed
        setTimeout(() => {
          onClose();
        }, 50);
      }
    }
  }, [selectedImages, tableData, onSelect, onClose]);

  // Add handler for new image uploaded
  const handleImageUploaded = useCallback((newImageData) => {
    const newImage = {
      id: `uploaded_${Date.now()}`,
      name: newImageData.name || 'New Image',
      type: 'folder',
      imagePath: newImageData.src,
      size: newImageData.size || 0,
      createdAt: new Date(),
      modifiedAt: new Date(),
      isFavorited: false,
      url: newImageData.src,
      totalFiles: 1,
    };

    setTableData((prevData) => [newImage, ...prevData]);
  }, []);

  // Reset selected images when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedImages(new Set());
    }
  }, [open]);

  const renderFilters = (
    <Stack
      spacing={2}
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      justifyContent="space-between"
    >
      <RichTextFileManagerFilters
        filters={filters}
        dateError={dateError}
        onResetPage={table.onResetPage}
        openDateRange={openDateRange.value}
        onOpenDateRange={openDateRange.onTrue}
        onCloseDateRange={openDateRange.onFalse}
        options={{ types: RICHTEXT_FILE_TYPE_OPTIONS }}
      />
      <Box sx={{ alignItems: 'center', display: 'flex', gap: '16px' }}>
        <ToggleButtonGroup size="small" value={view} exclusive onChange={handleChangeView}>
          <ToggleButton value="grid">
            <Iconify icon="mingcute:dot-grid-fill" />
          </ToggleButton>
          <ToggleButton value="list">
            <Iconify icon="solar:list-bold" />
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Insert button - shows when an image is selected */}
        {selectedImages.size > 0 && (
          <Button
            variant="outlined"
            startIcon={<Iconify icon="eva:checkmark-fill" />}
            onClick={handleInsertImage}
            color="primary"
            size="medium"
          >
            Insert
          </Button>
        )}

        <Button
          variant="contained"
          startIcon={<Iconify icon="eva:cloud-upload-fill" />}
          onClick={upload.onTrue}
          color="primary"
          size="medium"
        >
          Add New Image
        </Button>
      </Box>
    </Stack>
  );

  const renderContent = () => {
    if (notFound) {
      return (
        <EmptyContent
          filled
          title={currentTab === 'favImages' ? 'No favorite images' : 'No files found'}
          description={
            currentTab === 'favImages'
              ? "You haven't favorited any images yet. Click the star icon on images to add them to favorites."
              : 'Try adjusting your filters or add some files.'
          }
          sx={{ py: 10 }}
        />
      );
    }

    return (
      <>
        {view === 'list' ? (
          <RichTextFileManagerTable
            table={table}
            dataFiltered={dataFiltered}
            onDeleteRow={handleDeleteItem}
            onToggleFavorite={handleToggleFavorite}
            notFound={notFound}
            onOpenConfirm={confirm.onTrue}
            selectedImages={selectedImages}
            onImageSelect={handleImageSelect}
          />
        ) : (
          <RichTextFileManagerGridView
            table={table}
            dataFiltered={dataFiltered}
            onDeleteItem={handleDeleteItem}
            onToggleFavorite={handleToggleFavorite}
            onOpenConfirm={confirm.onTrue}
            selectedImages={selectedImages}
            onImageSelect={handleImageSelect}
          />
        )}
      </>
    );
  };

  const allFolders = tableData.filter((item) => item.type === 'folder');
  const favoriteFolders = allFolders.filter((item) => item.isFavorited);

  return (
    <>
      <Dialog
        open={open}
        onClose={(event, reason) => {
          // Remove focus before closing dialog to avoid aria-hidden warning
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          // Wait a bit before calling onClose to ensure focus is removed
          setTimeout(() => {
            onClose(event, reason);
          }, 50);
        }}
        maxWidth="lg"
        fullWidth
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h4">File manager</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={() => {
                // Remove focus before closing dialog
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                setTimeout(() => {
                  onClose();
                }, 50);
              }}>
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <Divider style={{ borderStyle: 'dashed' }} />
        <Box
          sx={{
            p: '24px 24px 0px 24px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'background.paper',
            borderColor: 'divider',
            boxShadow: (theme) => `0 2px 8px ${theme.vars.palette.action.hover}`,
          }}
        >
          <Stack sx={{ mb: 3 }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  minHeight: '48px',
                },
              }}
            >
              <Tab
                label={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Iconify icon="solar:folder-outline" width={20} height={20} />
                    {`My Images (${allFolders.length})`}
                  </div>
                }
                value="images"
              />
              <Tab
                label={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Iconify icon="eva:star-outline" width={20} height={20} />
                    {`Fav Images (${favoriteFolders.length})`}
                  </div>
                }
                value="favImages"
              />
            </Tabs>
          </Stack>
          <Stack spacing={2.5} sx={{ mb: 3 }}>
            {renderFilters}
            {canReset}
          </Stack>
        </Box>
        <DialogContent sx={{ p: 3 }}>{renderContent()}</DialogContent>
      </Dialog>

      <RichTextFileManagerNewFolderDialog
        open={upload.value}
        onClose={upload.onFalse}
        onImageUploaded={handleImageUploaded}
      />

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Are you sure want to delete <strong> {table.selected.length} </strong> items?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleDeleteItems();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}

function applyFilter({ inputData, comparator, filters, dateError }) {
  const { name, type, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter(
      (file) => file.name.toLowerCase().indexOf(name.toLowerCase()) !== -1
    );
  }

  if (type.length) {
    inputData = inputData.filter((file) => type.includes(fileFormat(file.type)));
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((file) => fIsBetween(file.createdAt, startDate, endDate));
    }
  }

  return inputData;
}
