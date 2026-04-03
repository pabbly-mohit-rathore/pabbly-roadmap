import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import React, { useRef, useState, useEffect } from 'react';

import {
  Box,
  List,
  Button,
  Dialog,
  Divider,
  Popover,
  Tooltip,
  ListItem,
  TextField,
  IconButton,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  DialogActions,
  DialogContent,
  ListItemButton,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { copyHTMLToClipboard, exportRichTextEmailToHTML } from './utils/html-export';

export default function RichTextEditorHeader({
  previewMode = 'desktop',
  onPreviewModeChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onPreview,
  canHistory = false,
  emailTitle: propEmailTitle = 'Newsletter',
  onEmailTitleChange,
  // New props for HTML export
  editorContent = '',
  globalBackground = null,
  contentBackground = null,
  footerData = null,
  showSendWithPabblyBadge = true,
  businessDetails = null,
  onSave,
  isSaving = false,
  campaignId,
  templateId,
  onSend,
  onSaveCampaign,
  onSaveTemplate,
  onSaveCampaignAsTemplate,
  campaignType,
  campaignLoading = false,
  templateType, // 'template' or 'campaign'
   }) {
  const navigate = useNavigate();

  // --- States ---
  const [emailTitle, setEmailTitle] = useState(propEmailTitle);
  const [titleWidth, setTitleWidth] = useState(0);
  const hiddenTextRef = useRef(null);
  const [htmlPopoverAnchor, setHtmlPopoverAnchor] = useState(null);
  const [savePopoverAnchor, setSavePopoverAnchor] = useState(null);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');

  // Sync with prop if it changes
  useEffect(() => {
    setEmailTitle(propEmailTitle);
  }, [propEmailTitle]);

  // Same as drag & drop builder: measure hidden span to size title input (width auto, max 200px, truncate)
  useEffect(() => {
    if (hiddenTextRef.current) {
      setTitleWidth(hiddenTextRef.current.offsetWidth + 10);
    }
  }, [emailTitle]);

  // --- Handlers ---
  // Hide Send button if:
  // 1. templateType is 'template' (we're creating/editing a template, not a campaign)
  // 2. OR campaignType is "API / Workflow Campaign" or "API/Workflow"
  // Show Send button for Regular campaigns when campaignId exists and templateType is 'campaign' or undefined
  // Keep button visible even when campaign data is loading (campaignType is null) if we have a campaignId
  const isApiWorkflowCampaign = campaignType === 'API / Workflow Campaign' || campaignType === 'API/Workflow';
  const isTemplateType = templateType === 'template';
  const showSendButton = 
    Boolean(campaignId) && 
    !isTemplateType &&
    // Show button if campaignType is null (data loading) OR if it's not an API/Workflow campaign
    (campaignType === null || !isApiWorkflowCampaign);

  const handleSendEmail = async () => {
    try {
      // If onSend prop is provided, use it (it will handle save + navigate)
      if (onSend) {
        await onSend();
        return;
      }
      
      // Fallback if onSend is not provided
      toast.error('Send functionality not available');
    } catch (error) {
      console.error('Error in handleSendEmail:', error);
      // Error is already handled in onSend function
    }
  };

  const handleSaveEmail = (event) => {
    // If templateType is 'template', save directly as template (no popover)
    if (templateType === 'template') {
      try {
        if (templateId && onSaveTemplate) {
          onSaveTemplate();
          toast.success('Template saved successfully!');
          return;
        }

        // Fallback to onSave if provided
        if (onSave) {
          onSave();
          return;
        }

        toast.warning('Nothing to save');
      } catch (error) {
        console.error('Error saving:', error);
        toast.error('Failed to save. Please try again.');
      }
      return;
    }

    // If from Campaign page (campaignId exists and templateType is 'campaign' or undefined), show popover
    if (campaignId) {
      setSavePopoverAnchor(event.currentTarget);
      return;
    }

    // Fallback: If from Template page (only templateId exists), save directly
    try {
      if (templateId && onSaveTemplate) {
        onSaveTemplate();
        toast.success('Template saved successfully!');
        return;
      }

      // Fallback to onSave if provided
      if (onSave) {
        onSave();
        return;
      }

      // Fallback if neither exists
      toast.warning('Nothing to save');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleSavePopoverClose = () => {
    setSavePopoverAnchor(null);
  };

  const handleSaveCampaign = async () => {
    handleSavePopoverClose();
    try {
      if (onSaveCampaign) {
        await onSaveCampaign();
        // Toast notification is handled by the parent component
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      // Error toast is handled by the parent component
    }
  };

  const handleSaveAsNewTemplate = () => {
    // Close popover and open dialog
    handleSavePopoverClose();
    setSaveTemplateDialogOpen(true);
  };

  const handleSaveTemplateDialogClose = () => {
    setSaveTemplateDialogOpen(false);
    setTemplateNameInput('');
  };

  const handleTemplateNameSave = async () => {
    if (!templateNameInput.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      if (onSaveCampaignAsTemplate) {
        await onSaveCampaignAsTemplate(templateNameInput.trim());
        handleSaveTemplateDialogClose();
      } else {
        toast.error('Save functionality not available');
        handleSaveTemplateDialogClose();
      }
    } catch (error) {
      console.error('Error saving as template:', error);
      // Error message already shown in handler
    }
  };

  const handleTemplateNameCancel = () => {
    // Just close the dialog
    handleSaveTemplateDialogClose();
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
    } else {
      toast.info('Undo last action');
    }
  };

  const handleRedo = () => {
    if (onRedo) {
      onRedo();
    } else {
      toast.info('Redo last action');
    }
  };

  const handlePreviewModeChange = (event, newMode) => {
    if (newMode !== null && onPreviewModeChange) {
      onPreviewModeChange(newMode);
      toast.info(`Switched to ${newMode} view`);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview();
      toast.info('Opening preview in new tab');
    }
  };

  const handleTogglePreview = () => {
    handlePreview();
  };

  const handleHistory = () => {
    navigate('/app/history');
  };

  const handleCopyHTML = async () => {
    try {
      // Generate HTML from current rich text editor content
      const html = exportRichTextEmailToHTML(editorContent, emailTitle, globalBackground, contentBackground, footerData, showSendWithPabblyBadge, businessDetails);

      // Copy to clipboard
      const success = await copyHTMLToClipboard(html);

      if (success) {
        toast.success('HTML code copied to clipboard!');
      } else {
        toast.error('Failed to copy HTML to clipboard');
      }
    } catch (error) {
      console.error('Error copying HTML:', error);
      toast.error('Failed to copy HTML to clipboard');
    }

    // Close popover
    setHtmlPopoverAnchor(null);
  };

  const handleDownloadHTML = () => {
    try {
      // Generate HTML from current rich text editor content
      const html = exportRichTextEmailToHTML(editorContent, emailTitle, globalBackground, contentBackground, footerData, showSendWithPabblyBadge, businessDetails);

      // Create blob and download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${emailTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('HTML file downloaded successfully!');
    } catch (error) {
      console.error('Error downloading HTML:', error);
      toast.error('Failed to download HTML file');
    }

    // Close popover
    setHtmlPopoverAnchor(null);
  };

  const handleHtmlPopoverOpen = (event) => {
    setHtmlPopoverAnchor(event.currentTarget);
  };

  const handleHtmlPopoverClose = () => {
    setHtmlPopoverAnchor(null);
  };

  // --- UI ---
  return (
    <Box
      width={{ xs: '100%', md: 'fit-content' }}
      sx={{
        '[data-mui-color-scheme="light"] &': { backgroundColor: '#fff',boxShadow: '0 2px 4px rgba(84, 95, 111, .16), 0 0 1px rgba(37, 45, 91, .04)' },
        '[data-mui-color-scheme="dark"] &': { backgroundColor: '#1c252e' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        borderRadius: '6px',
        // boxShadow: '0 2px 4px rgba(84, 95, 111, .16), 0 0 1px rgba(37, 45, 91, .04)',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      {/* --- Email Title (same as drag & drop builder: width from content, max 200px, truncate) --- */}
      <Tooltip disableInteractive title={emailTitle || ''} arrow placement="top">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            variant="standard"
            required
            value={emailTitle}
            onChange={(e) => {
              const newTitle = e.target.value;
              setEmailTitle(newTitle);
              if (onEmailTitleChange) {
                onEmailTitleChange(newTitle);
              }
            }}
            InputProps={{
              style: {
                fontWeight: 600,
                fontSize: '16px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }}
            sx={{
              width: `${Math.min(titleWidth, 200)}px`,
              minWidth: 0,
              '& .MuiInput-root': {
                overflow: 'hidden',
                minWidth: 0,
                '& input': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                },
              },
              '& .MuiInput-root:before, & .MuiInput-root:after': {
                display: 'none',
              },
            }}
          />
          <span
            ref={hiddenTextRef}
            style={{
              visibility: 'hidden',
              position: 'absolute',
              whiteSpace: 'pre',
              fontWeight: '600',
              fontSize: '16px',
            }}
          >
            {emailTitle}
          </span>
        </Box>
      </Tooltip>

      {/* Divider */}
      {/* <Divider orientation="vertical" flexItem /> */}

      {/* --- Preview Mode Toggle Buttons --- */}
      {/* <ToggleButtonGroup
        value={previewMode}
        exclusive
        onChange={handlePreviewModeChange}
        aria-label="preview mode"
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 1.5,
            py: 0.5,
            border: '1px solid rgba(0, 0, 0, 0.12)',
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            },
          },
        }}
      >
        <ToggleButton value="desktop" aria-label="desktop view">
          <Iconify icon="mdi:monitor" />
        </ToggleButton>
        <ToggleButton value="mobile" aria-label="mobile view">
          <Iconify icon="mdi:cellphone" sx={{ mr: 0.5 }} />
        </ToggleButton>
      </ToggleButtonGroup> */}

      {/* Divider */}
      <Divider orientation="vertical" flexItem />

      {/* --- Action Icons --- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Preview in New Tab" arrow>
          <IconButton onClick={handleTogglePreview}>
            <Iconify icon="eva:eye-fill" sx={{ width: 22, height: 22 }} />
          </IconButton>
        </Tooltip>

        {/* <Tooltip title="Undo" arrow>
          <span>
            <IconButton onClick={handleUndo} disabled={!canUndo}>
              <Iconify icon="mdi:undo" sx={{ width: 22, height: 22 }} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Redo" arrow>
          <span>
            <IconButton onClick={handleRedo} disabled={!canRedo}>
              <Iconify icon="mdi:redo" sx={{ width: 22, height: 22 }} />
            </IconButton>
          </span>
        </Tooltip> */}

        <Tooltip title="History" arrow>
          <IconButton onClick={handleHistory} disabled={!canHistory}>
            <Iconify icon="mdi:history" sx={{ width: 22, height: 22 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="HTML Export" arrow>
          <IconButton onClick={handleHtmlPopoverOpen}>
            <Iconify icon="mdi:code-tags" sx={{ width: 22, height: 22 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={isSaving ? 'Saving…' : 'Save'} arrow>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<Iconify icon={isSaving ? 'eos-icons:loading' : 'mdi:content-save'} />} 
            onClick={handleSaveEmail}
            disabled={isSaving}
          >
            Save
          </Button>
        </Tooltip>

      </Box>

      {showSendButton && (
        <>
          <Divider orientation="vertical" flexItem />
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mdi:send" />}
            onClick={handleSendEmail}
          >
            Send
          </Button>
        </>
      )}

      {/* --- HTML Export Popover --- */}
      <Popover
        open={Boolean(htmlPopoverAnchor)}
        anchorEl={htmlPopoverAnchor}
        onClose={handleHtmlPopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            minWidth: 200,
            mt: 1,
          },
        }}
      >
        <List sx={{ p: 0 }}>
          <ListItem disablePadding>
            <Tooltip title="Copy email HTML code" arrow placement="right">
              <ListItemButton onClick={handleCopyHTML}>
                <ListItemIcon>
                  <Iconify icon="mdi:content-copy" sx={{ width: 20, height: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Copy HTML" />
              </ListItemButton>
            </Tooltip>
          </ListItem>
          <ListItem disablePadding>
            <Tooltip title="Download email as HTML file" arrow placement="right">
              <ListItemButton onClick={handleDownloadHTML}>
                <ListItemIcon>
                  <Iconify icon="mdi:download" sx={{ width: 20, height: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Download HTML" />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      </Popover>

      {/* --- Save Popover --- (only shown when from Campaign page, not for templates) */}
      {campaignId && templateType !== 'template' && (
        <Popover
          open={Boolean(savePopoverAnchor)}
          anchorEl={savePopoverAnchor}
          onClose={handleSavePopoverClose}
          sx={{ mt: 1 }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <List sx={{ p: 0 }}>
            <ListItem disablePadding>
              <ListItemButton onClick={handleSaveCampaign}>
                <ListItemIcon>
                  <Iconify icon="mdi:content-save" sx={{ width: 20, height: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Save Campaign" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleSaveAsNewTemplate}>
                <ListItemIcon>
                  <Iconify icon="mdi:file-plus" sx={{ width: 20, height: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Save as New Template" />
              </ListItemButton>
            </ListItem>
          </List>
        </Popover>
      )}

      {/* --- Save as New Template Dialog --- */}
      <Dialog
        open={saveTemplateDialogOpen}
        onClose={handleSaveTemplateDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Save as New Template
            <IconButton size="small" onClick={handleSaveTemplateDialogClose}>
              <Iconify icon="mdi:close" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Template Name"
            placeholder="Enter template name"
            value={templateNameInput}
            onChange={(e) => setTemplateNameInput(e.target.value)}
            helperText="Enter a name for your new template."
          />
        </DialogContent>
        <DialogActions sx={{ py: 2 }}>
          <Button onClick={handleTemplateNameSave} variant="contained" color="primary">
            Save
          </Button>
          <Button onClick={handleTemplateNameCancel} variant="outlined" color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
