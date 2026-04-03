import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function RichTextFileManagerFilters({ filters, onResetPage }) {
  const handleFilterName = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ name: event.target.value });
    },
    [filters, onResetPage]
  );

  const renderFilterName = (
    <TextField
      fullWidth
      value={filters.state.name}
      onChange={handleFilterName}
      placeholder="Search..."
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        ),
      }}
      sx={{ flexGrow: 1 }}
    />
  );

  return (
    <Stack
      flexGrow={1}
      spacing={1}
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'flex-end', md: 'center' }}
    >
      {renderFilterName}
    </Stack>
  );
}
