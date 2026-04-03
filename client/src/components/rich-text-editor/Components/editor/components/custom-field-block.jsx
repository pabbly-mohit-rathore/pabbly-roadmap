import './custom-field-block.css';

import { useDispatch, useSelector } from 'react-redux';
import React, { useMemo, useState, useEffect } from 'react';

import { Box, Popover, MenuList, MenuItem, IconButton, Typography } from '@mui/material';

import { fetchCustomFields } from 'src/redux/slices/customField';

import { Iconify } from 'src/components/iconify';

import { editorClasses } from '../classes';

// Standard fields from Business model (always available)
const STANDARD_FIELDS = [
  { id: 'first_name', label: 'First Name', tag: '{first_name}' },
  { id: 'last_name', label: 'Last Name', tag: '{last_name}' },
  { id: 'email', label: 'Email', tag: '{email}' },
  { id: 'mobile_number', label: 'Mobile', tag: '{mobile_number}' },
  { id: 'lead_score', label: 'Lead Score', tag: '{lead_score}' },
  { id: 'date_of_birth', label: 'Date of Birth', tag: '{date_of_birth}' },
  { id: 'country', label: 'Country', tag: '{country}' },
  { id: 'city', label: 'City', tag: '{city}' },
];

export function CustomFieldBlock({ editor, disabled = false, rawMode = false }) {
  const dispatch = useDispatch();
  const { list: customFieldsList } = useSelector((state) => state.customField);
  const [anchorEl, setAnchorEl] = useState(null);

  // Fetch custom fields from Redux on component mount
  useEffect(() => {
    dispatch(fetchCustomFields());
  }, [dispatch]);

  // Combine standard fields with custom fields from Business model
  const allFields = useMemo(() => {
    // Get custom fields from Redux (Business model customFields)
    const customFields = (customFieldsList.items || [])
      .filter((field) => field.name && field.personalizationTag && !field.isBlankField)
      .map((field) => ({
        id: field._id || field.name,
        label: field.name,
        tag: field.personalizationTag || `{${field.name}}`,
        isCustom: true,
      }));

    // Combine standard fields first, then custom fields
    return [...STANDARD_FIELDS, ...customFields];
  }, [customFieldsList.items]);

  const handleOpen = (event) => {
    if (rawMode || disabled) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFieldSelect = (field) => {
    if (!editor || rawMode) return;
    
    try {
      // Extract tag content (remove curly braces) for proper personalization
      const tagContent = field.tag ? field.tag.replace(/[{}]/g, '') : field.label;
      
      editor
        .chain()
        .focus()
        .insertCustomField({
          fieldId: field.id,
          fieldLabel: tagContent, // Use tag content for proper personalization
          fieldColor: field.color || 'primary',
        })
        // INSERT A SPACE after custom field to fix cursor position
        .insertContent(' ')
        .run();
    } catch (error) {
      console.error('Failed to insert custom field:', error);
    }
  
    handleClose();
  };

  const isDisabled = disabled || rawMode;

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        size="medium"
        onClick={handleOpen}
        disabled={isDisabled}
        className={editorClasses.toolbar.fontSizeButton}
        sx={{
          width: 28,
          height: 28,
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          borderRadius: '6px',
          color: isDisabled ? 'text.disabled' : 'text.primary',
          opacity: isDisabled ? 0.5 : 1,
        }}
        aria-label="Insert custom field"
      >
        <Iconify icon="ph:brackets-curly-bold" width={20} height={20} />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              minWidth: 280,
              maxHeight: 400,
              overflowY: 'auto',
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Insert Custom Field
        </Typography>
        <MenuList>
          {allFields.length === 0 ? (
            <MenuItem disabled>No custom fields available</MenuItem>
          ) : (
            allFields.map((field) => (
              <MenuItem key={field.id} onClick={() => handleFieldSelect(field)}>
                {field.label}
              </MenuItem>
            ))
          )}
        </MenuList>
      </Popover>
    </Box>
  );
}
