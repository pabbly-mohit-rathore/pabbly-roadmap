import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useParams, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { Box, TextField, Typography } from '@mui/material';

import { paths } from 'src/routes/paths';

// import { formatAddress } from './utils/format-address ';
import { formatAddress } from 'src/utils/format-address ';

import { getBusinessDetails } from 'src/redux/slices/business';
import { getFiles, addScreenshotManually } from 'src/redux/slices/media';
import { updateCampaign, getCampaignById, clearSelectedCampaign } from 'src/redux/slices/campaign';
import {
  updateEmailTemplate,
  clearCurrentTemplate,
  getEmailTemplateById,
  selectCurrentTemplate,
  updatePrebuiltTemplate,
  saveCampaignAsTemplate,
  selectUpdateTemplateLoading,
  selectCurrentTemplateLoading,
  captureEmailTemplateScreenshot,
} from 'src/redux/slices/emailTemplate';

import EditorsBox from './Components/editors-box';
import RichTextEditorHeader from './rich-text-editor-header';
// import EditorsComponent fro./Components/editors-boxent';
import {
  removeFooterFromHTML,
  prepareHTMLForEmailSending,
  convertProcessedHTMLToTipTap,
} from './utils/html-export';

/** Default footer data shape; used to normalize loaded or saved footer so all keys exist */
const DEFAULT_FOOTER_DATA_SHAPE = {
  companyName: '',
  websiteAdress: '',
  address: '',
  sentToText: '',
  unsubscribeText: '',
  viewInBrowserText: '',
  description: '',
};

const STORAGE_KEY_TEMPLATE_FOOTERS = 'pem_saved_template_footers';

/** Get footer data saved for a template (from "Save as Template") - persists across navigation */
function getTemplateFooterFromStorage(templateId) {
  if (!templateId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATE_FOOTERS);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const footer = map[templateId];
    if (!footer || typeof footer !== 'object') return null;
    return { ...DEFAULT_FOOTER_DATA_SHAPE, ...footer };
  } catch {
    return null;
  }
}

/** Save footer for a template so it shows when user opens template after navigating away */
function setTemplateFooterInStorage(templateId, footerData) {
  if (!templateId || !footerData) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATE_FOOTERS);
    const map = raw ? JSON.parse(raw) : {};
    map[templateId] = { ...DEFAULT_FOOTER_DATA_SHAPE, ...footerData };
    localStorage.setItem(STORAGE_KEY_TEMPLATE_FOOTERS, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** Normalize footer object from API (may use footerData or footer_settings etc.) into our shape */
function getNormalizedFooterFromTemplate(template) {
  if (!template) return null;
  const raw =
    template.footerData ||
    template.footer_settings ||
    template.footerSettings ||
    null;
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...DEFAULT_FOOTER_DATA_SHAPE,
    companyName: raw.companyName ?? raw.company_name ?? '',
    websiteAdress: raw.websiteAdress ?? raw.website_adress ?? raw.websiteAddress ?? '',
    address: raw.address ?? '',
    sentToText: raw.sentToText ?? raw.sent_to_text ?? '',
    unsubscribeText: raw.unsubscribeText ?? raw.unsubscribe_text ?? '',
    viewInBrowserText: raw.viewInBrowserText ?? raw.view_in_browser_text ?? '',
    description: raw.description ?? '',
  };
}

const CANVAS_CONFIGS = {
  desktop: {
    width: '600px',
    maxWidth: '600px',
    scale: 1,
    label: 'Desktop View (600px)',
  },
  mobile: {
    width: '375px',
    maxWidth: '375px',
    scale: 0.8,
    label: 'Mobile View (375px)',
  },
};

/* AI FUNCTIONALITY COMMENTED OUT
const AIPromptSection = () => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim()) {
      // TODO: Implement AI prompt functionality
      console.log('AI Prompt:', prompt);
    }
    toast.success('AI Prompt submitted successfully!');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            '[data-mui-color-scheme="light"] &': { color: '#1f2937' },
            '[data-mui-color-scheme="dark"] &': { color: 'var(--palette-text-secondary)' },
          }}
        >
          AI Prompt
        </Typography>
        <IconButton size="small" sx={{ color: '#6b7280' }}>
          <Iconify icon="mdi:information-outline" width={16} />
        </IconButton>
      </Box>
      <TextField
        fullWidth
        placeholder="Enter prompt to create email."
        size="medium"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleSubmit} size="small" sx={{ color: '#6b7280' }}>
                <Iconify
                  sx={{ '[data-mui-color-scheme="dark"] &': { color: '#ffffff' } }}
                  icon="mingcute:mail-ai-fill"
                  width={26}
                />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '13px',
          },
        }}
        helperText={
          <>
            Enter AI prompt according to your needs.{' '}
            <span style={{ color: '#0D68E9', cursor: 'pointer' }}>Add AI Platform</span>
          </>
        }
      />
    </Box>
  );
};
END OF AI FUNCTIONALITY COMMENTED OUT */

// ========================
// MAIN COMPONENT
// ========================

const RichTextEditorBuilder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const currentTemplate = useSelector(selectCurrentTemplate);
  const templateLoading = useSelector(selectCurrentTemplateLoading);
  const savingTemplate = useSelector(selectUpdateTemplateLoading);

  // Get campaign ID from URL params or Redux state
  const currentCampaign = useSelector((state) => state.campaign.currentCampaign.data);
  const selectedCampaign = useSelector((state) => state.campaign.selectedCampaign.data);
  const selectedCampaignLoading = useSelector((state) => state.campaign.selectedCampaign.loading);
  const urlCampaignId = searchParams.get('campaignId');

  // Use selectedCampaign if available (after refresh), otherwise use currentCampaign (during creation flow)
  const campaignData = selectedCampaign || currentCampaign;
  // Get campaignId from URL, Redux state, or template (for campaign templates)
  // Template's campaignId is used as fallback when navigating back from send campaign page
  const templateCampaignId = currentTemplate?.type === 'campaign' ? currentTemplate?.campaignId : null;
  const campaignIdFromUrlOrState = urlCampaignId || campaignData?.id || campaignData?._id || templateCampaignId;

  // Get business details for showSendWithPabblyBadge
  const { businessDetails } = useSelector((state) => state.business);
  const { businessId: currentBusinessId } = useSelector((state) => state.user);

  // Fetch business details if not available
  useEffect(() => {
    if (currentBusinessId && !businessDetails) {
      dispatch(getBusinessDetails());
    }
  }, [currentBusinessId, businessDetails, dispatch]);

  // Get showSendWithPabblyBadge from business details, default to true
  const showSendWithPabblyBadge = useMemo(() => {
    const flag = businessDetails?.showSendWithPabblyBadge;
    if (flag === false) {
      return false;
    }
    if (flag === true) {
      return true;
    }
    return true;
  }, [businessDetails]);

  // Get campaignType from campaignData (checks both currentCampaign and selectedCampaign)
  const campaignType = campaignData?.campaignDetails?.campaignType || null;
  
  // Get templateType from currentTemplate (defaults to 'template' if not available)
  const templateType = currentTemplate?.type || 'template';

  // Determine if we're waiting for campaign data to load
  // Only check URL/state for campaignId, not template data
  // This prevents the Send button from showing prematurely on page refresh
  const hasCampaignId = urlCampaignId || campaignIdFromUrlOrState;
  const isWaitingForCampaignData = hasCampaignId && !campaignData;

  // Clear campaign state when opening template directly (no campaignId in URL AND no active campaign in Redux)
  // This ensures Send button is hidden when templates are opened from Templates page
  // BUT preserves campaign state during campaign creation flow (when currentCampaign exists in Redux)
  // AND preserves state when template has campaignId (returning from send campaign page)
  useEffect(() => {
    // Only clear if:
    // 1. No campaignId in URL
    // 2. AND no currentCampaign in Redux (which indicates active campaign creation flow)
    // 3. AND no templateCampaignId (template is not a campaign template)
    // 4. AND there's selectedCampaign (stale data from previous session)
    // This way we preserve campaign state during creation and when returning from send page
    if (!urlCampaignId && !currentCampaign && !templateCampaignId && selectedCampaign) {
      console.log(
        'Clearing stale campaign state - template opened directly without campaign context'
      );
      dispatch(clearSelectedCampaign());
    }
  }, [urlCampaignId, currentCampaign, templateCampaignId, selectedCampaign, dispatch]);

  // Fetch campaign data if we have a campaign ID from URL or template but no campaign data in Redux
  // Fetch from URL param (active campaign context) or from template (when returning from send page)
  useEffect(() => {
    const campaignIdToFetch = urlCampaignId || templateCampaignId;
    // Fetch if we have a campaign ID and no campaign data yet
    if (campaignIdToFetch && !campaignData) {
      console.log('Fetching campaign data for ID:', campaignIdToFetch);
      dispatch(getCampaignById(campaignIdToFetch));
    }
    // Note: We fetch from template's campaignId when templateType is 'campaign' to support
    // navigation back from send campaign page where URL param might not be preserved
  }, [urlCampaignId, templateCampaignId, campaignData, dispatch]);

  const [previewMode, setPreviewMode] = useState('desktop');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [emailTitle, setEmailTitle] = useState('Newsletter');
  const [isUserSaving, setIsUserSaving] = useState(false);
  const [footerData, setFooterData] = useState({
    companyName: '',
    websiteAdress: '', // Empty by default, will show "https://emails.pabbly.com" in preview/email
    address: '', // Empty by default, will show "India" in preview/email
    sentToText: '', // Empty by default, will show "This email was sent to" in preview/email
    unsubscribeText: '', // Empty by default, will show "Unsubscribe" in preview/email
    viewInBrowserText: '', // Empty by default, will show "View in Browser" in preview/email
    description: '',
    isCustomized: false, // Empty by default, will show default description in preview/email
  });
  const lastLoadedTemplateIdRef = useRef(null);
  const nameUpdateTimeoutRef = useRef(null);
  // Store footerData by template id when saving as template, so we can restore it when opening the new template (in case API doesn't return it yet)
  const savedTemplateFooterDataRef = useRef({});
  // const [snackbar, setSnackbar] = useState({
  //   open: false,
  //   message: '',
  //   severity: 'success',
  // });

  useEffect(() => {
    if (templateId) {
      dispatch(getEmailTemplateById(templateId));
      // Reset ref when component mounts or templateId changes
      // This ensures content reloads when navigating back to the same template
      lastLoadedTemplateIdRef.current = null;
    }

    return () => {
      // Clear template on unmount to ensure fresh data on next visit
      // The ref reset above ensures content will reload when component remounts
      dispatch(clearCurrentTemplate());
    };
  }, [dispatch, templateId]);

  useEffect(() => {
    // Reset editor content when currentTemplate becomes null/undefined (during template switch)
    if (!currentTemplate) {
      // Don't clear content immediately - wait to see if template loads
      // This prevents clearing content when navigating back and template is being fetched
      return;
    }

    const currentTemplateId = currentTemplate._id || currentTemplate.id;
    
    // Check if this template matches the URL templateId
    const templateMatchesUrl = currentTemplateId === templateId;

    // Only load content if this is a different template (initial load, template switch, or navigating back)
    // When navigating back, lastLoadedTemplateIdRef is reset to null, so isNewTemplate will be true
    const isNewTemplate = lastLoadedTemplateIdRef.current !== currentTemplateId;

    if (currentTemplate.name) {
      setEmailTitle(currentTemplate.name);
    }

    // Load footerData: API > localStorage (from "Save as Template") > ref (same session) > business details
    // localStorage is needed because after "Save as Template" user navigates to Templates and edits there (new page = ref is lost)
    if (isNewTemplate) {
      const normalizedFromTemplate = getNormalizedFooterFromTemplate(currentTemplate);
      const fromStorage = getTemplateFooterFromStorage(currentTemplateId);
      const fromRef = savedTemplateFooterDataRef.current[currentTemplateId];
    
      // 1️⃣ If footer saved in template (API)
      if (normalizedFromTemplate) {
        setFooterData({
          ...DEFAULT_FOOTER_DATA_SHAPE,
          ...normalizedFromTemplate,
          isCustomized: true,
        });
      }
    
      // 2️⃣ If saved in localStorage (Save As Template case)
      else if (fromStorage) {
        setFooterData({
          ...DEFAULT_FOOTER_DATA_SHAPE,
          ...fromStorage,
          isCustomized: true,
        });
      }
    
      // 3️⃣ If saved in same session ref
      else if (fromRef) {
        setFooterData({
          ...DEFAULT_FOOTER_DATA_SHAPE,
          ...fromRef,
          isCustomized: true,
        });
      }
    
      // 4️⃣ Otherwise load business defaults
      else if (businessDetails) {
        setFooterData({
          ...DEFAULT_FOOTER_DATA_SHAPE,
          companyName: businessDetails.companyName || '',
          websiteAdress: businessDetails.website || '',
          address: formatAddress(businessDetails.addressDetails) || '',
          isCustomized: false,
        });
      }
    }
    

    // Load content on initial load, template switch, or when returning to editor
    // Always use 'content' field for editing (original TipTap HTML)
    // 'htmlContent' is the email-compatible version used for sending
    if (isNewTemplate) {
      const hasValidContent =
        typeof currentTemplate.content === 'string' && currentTemplate.content.trim();
      const hasValidHtmlContent =
        typeof currentTemplate.htmlContent === 'string' && currentTemplate.htmlContent.trim();

      if (hasValidContent) {
        // Use original TipTap HTML for editing (footer should never be in content field)
        setEditorContent(currentTemplate.content);
        lastLoadedTemplateIdRef.current = currentTemplateId;
      } else if (hasValidHtmlContent) {
        // Fallback: if content not available, use htmlContent (but this is processed HTML)
        // This should only happen for old templates that don't have 'content' field
        // IMPORTANT: Convert processed HTML back to TipTap-compatible format
        // 1. Remove footer (footer should never be in editor content)
        // 2. Convert table-based lists back to native lists
        // 3. Remove email-specific attributes that trigger raw mode
        const contentWithoutFooter = removeFooterFromHTML(currentTemplate.htmlContent);
        const tipTapCompatibleContent = convertProcessedHTMLToTipTap(contentWithoutFooter);
        setEditorContent(tipTapCompatibleContent);
        lastLoadedTemplateIdRef.current = currentTemplateId;
      } else {
        setEditorContent('');
        lastLoadedTemplateIdRef.current = currentTemplateId;
      }
    }
  }, [currentTemplate, templateId, businessDetails]);

  // Populate footer data from business details when business is loaded
  // Only set defaults if footerData fields are empty (don't override user/template values)

  useEffect(() => {
    if (!businessDetails) return;
  
    setFooterData((prev) => {
      if (prev.isCustomized) return prev;
  
      return {
        ...prev,
        companyName: businessDetails.companyName || '',
        websiteAdress: businessDetails.website || '',
        address: formatAddress(businessDetails.addressDetails),
      };
    });
  }, [businessDetails]);
  
  

  const refreshScreenshots = useCallback(
    () => dispatch(getFiles({ categoryFolder: 'screenshots' })),
    [dispatch]
  );

  // ========================
  // EVENT HANDLERS
  // ========================

  const handlePreviewModeChange = useCallback((mode) => {
    setPreviewMode(mode);
  }, []);

  const handleTogglePreviewMode = useCallback(() => {
    setIsPreviewMode(!isPreviewMode);
  }, [isPreviewMode]);

  const handleUndo = useCallback(() => {
    // TODO: Implement undo functionality
  }, []);

  const handleRedo = useCallback(() => {
    // TODO: Implement redo functionality
  }, []);

  const handlePreview = useCallback(() => {
    // Store content and title in localStorage (works across tabs)
    localStorage.setItem('richTextPreviewContent', editorContent || '');
    localStorage.setItem('richTextPreviewTitle', emailTitle || 'Email Preview');
    localStorage.setItem('richTextPreviewMode', previewMode || 'desktop');

    // Open preview in new tab with template ID
    // Uses paths.app.emailPreview which includes basePath prefix (same as other builders)
    const previewUrl = templateId
      ? `${paths.app.emailPreview}/${templateId}`
      : paths.app.emailPreview;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  }, [editorContent, emailTitle, previewMode, templateId]);

  const handleEditorContentChange = useCallback((content) => {
    setEditorContent(content);
  }, []);

  // Debounced name update handler
  const handleNameUpdate = useCallback(
    async (newName) => {
      if (!newName || !newName.trim() || !templateId) {
        return;
      }

      const trimmedName = newName.trim();
      // Use templateType from outer scope (or get from currentTemplate if not available)
      const currentTemplateType = currentTemplate?.type || 'template';

      // Skip update if name hasn't changed
      const currentName = currentTemplate?.name || '';
      if (trimmedName === currentName) {
        return;
      }

      try {
        // If type is 'template', only update template name
        if (currentTemplateType === 'template') {
          await dispatch(
            updateEmailTemplate({
              templateId,
              templateData: { name: trimmedName },
            })
          ).unwrap();
        }
        // If type is 'campaign', update both campaign and template in parallel
        else if (currentTemplateType === 'campaign') {
          // Update both template and campaign names in parallel for better performance
          const updatePromises = [
            dispatch(
              updateEmailTemplate({
                templateId,
                templateData: { name: trimmedName },
              })
            ).unwrap(),
          ];

          // Also update campaign name if campaignId exists
          if (campaignIdFromUrlOrState) {
            updatePromises.push(
              dispatch(
                updateCampaign({
                  campaignId: campaignIdFromUrlOrState,
                  updateData: {
                    campaignDetails: {
                      campaignName: trimmedName,
                    },
                  },
                })
              ).unwrap()
            );
          }

          // Execute both updates in parallel
          await Promise.all(updatePromises);
        }
      } catch (error) {
        console.error('Error updating name:', error);
        // Don't show error toast for debounced updates to avoid spam
      }
    },
    [templateId, currentTemplate, campaignIdFromUrlOrState, dispatch]
  );

  const handleEmailTitleChange = useCallback(
    (title) => {
      setEmailTitle(title);

      // Clear existing timeout
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }

      // Set new timeout for debounced update (1 second delay)
      nameUpdateTimeoutRef.current = setTimeout(() => {
        handleNameUpdate(title);
      }, 1000);
    },
    [handleNameUpdate]
  );

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!templateId) {
      toast.error('Template not found. Please reopen the editor from Templates page.');
      return;
    }

    const trimmedTitle = emailTitle?.trim();
    if (!trimmedTitle) {
      toast.error('Please enter a template name before saving.');
      return;
    }

    setIsUserSaving(true);
    try {
      // Convert TipTap HTML to email-compatible format with inlined styles
      // This ensures tables, lists, and all styling work in email clients like Gmail
      const emailCompatibleHTML = prepareHTMLForEmailSending(
        editorContent || '',
        footerData,
        showSendWithPabblyBadge,
        businessDetails
      );

      const payload = {
        name: trimmedTitle,
        builderType: 'Rich-Text',
        status: currentTemplate?.status || 'draft',
        htmlContent: emailCompatibleHTML, // Save email-compatible HTML
        content: editorContent || '', // Keep original TipTap HTML for editing
        footerData, // Save footer data to preserve Business Name, Address, etc.
      };

      // Use updatePrebuiltTemplate for prebuilt templates, otherwise use updateEmailTemplate
      const updateAction = currentTemplate?.isPrebuilt
        ? updatePrebuiltTemplate
        : updateEmailTemplate;

      const response = await dispatch(
        updateAction({ templateId, templateData: payload })
      ).unwrap();

      const updatedTemplate = response?.data;
      if (updatedTemplate?.name) {
        setEmailTitle(updatedTemplate.name);
      }
      // Don't update editorContent after save - keep current content since we just saved it
      // Updating from response can cause content to disappear if backend doesn't return it properly

      setTemplateFooterInStorage(templateId, footerData);

      // Automatically capture screenshot after successful save
      try {
        const screenshotResult = await dispatch(
          captureEmailTemplateScreenshot(templateId)
        ).unwrap();

        // Extract screenshot data from response (even though backend doesn't return it, check if it exists)
        const screenshotData = screenshotResult?.data;
        if (screenshotData?.cloudUrl && screenshotData?.filePath) {
          // Manually add screenshot to Redux state immediately
          const newScreenshot = {
            fileName: `${templateId}.png`,
            fileUrl: screenshotData.cloudUrl,
            filePath: screenshotData.filePath,
            fileType: 'image',
            lastModified: new Date().toISOString(),
          };

          // Dispatch action to add screenshot to state
          dispatch(addScreenshotManually(newScreenshot));
        }

        // Refresh from R2 to keep UI thumbnails in sync
        refreshScreenshots();
      } catch (screenshotError) {
        // Screenshot capture failed, but template is saved - fail silently
      }
    } catch (error) {
      const message = error?.message || error?.data?.message || 'Failed to save template.';
      toast.error(message);
    } finally {
      setIsUserSaving(false);
    }
  }, [
    dispatch,
    templateId,
    emailTitle,
    currentTemplate,
    editorContent,
    footerData,
    showSendWithPabblyBadge,
    businessDetails,
    refreshScreenshots,
  ]);

  // Save campaign handler - saves the current email design to the campaign template
  // Uses updateEmailTemplate slice since campaign is also a template (type: 'campaign')
  const handleSaveCampaign = useCallback(async () => {
    if (!templateId) {
      console.warn('No template ID available for saving campaign');
      toast.error('Template ID not found');
      return;
    }

    setIsUserSaving(true);
    try {
      // Convert TipTap HTML to email-compatible format with inlined styles
      const emailCompatibleHTML = prepareHTMLForEmailSending(
        editorContent || '',
        footerData,
        showSendWithPabblyBadge,
        businessDetails
      );

      // Prepare the template update data
      const updateData = {
        builderType: currentTemplate?.builderType || 'Rich-Text',
        status: currentTemplate?.status || 'active',
        htmlContent: emailCompatibleHTML, // Save email-compatible HTML
        content: editorContent || '', // Keep original TipTap HTML for editing
        footerData, // Save footer data to preserve Business Name, Address, etc.
      };

      // Dispatch the update template action (campaign is a template with type: 'campaign')
      const result = await dispatch(
        updateEmailTemplate({
          templateId,
          templateData: updateData,
        })
      ).unwrap();

      if (result) {
        toast.success('Campaign saved successfully!');
        setTemplateFooterInStorage(templateId, footerData);

        // Capture screenshot in background (non-blocking)
        dispatch(captureEmailTemplateScreenshot(templateId))
          .unwrap()
          .then(() => {
            // Refresh immediately so campaign list stays up to date
            refreshScreenshots();
          })
          .catch(() => {
            // Ignore screenshot errors; campaign content already saved
          });
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(error?.message || 'Failed to save campaign');
      throw error;
    } finally {
      setIsUserSaving(false);
    }
  }, [
    templateId,
    currentTemplate,
    editorContent,
    footerData,
    showSendWithPabblyBadge,
    businessDetails,
    dispatch,
    refreshScreenshots,
  ]);

  // Save campaign as template handler - saves campaign as new template
  const handleSaveCampaignAsTemplate = useCallback(
    async (newName) => {
      if (!templateId) {
        console.warn('No template ID available for saving as template');
        toast.error('Template ID not found');
        return;
      }

      try {
        // Convert TipTap HTML to email-compatible format with inlined styles
        const emailCompatibleHTML = prepareHTMLForEmailSending(
          editorContent || '',
          footerData,
          showSendWithPabblyBadge,
          businessDetails
        );

        // Normalize footer so backend receives a complete object (all keys; no undefined)
        const normalizedFooter = {
          ...DEFAULT_FOOTER_DATA_SHAPE,
          companyName: footerData.companyName ?? '',
          websiteAdress: footerData.websiteAdress ?? '',
          address: footerData.address ?? '',
          sentToText: footerData.sentToText ?? '',
          unsubscribeText: footerData.unsubscribeText ?? '',
          viewInBrowserText: footerData.viewInBrowserText ?? '',
          description: footerData.description ?? '',
        };

        const templateData = {
          builderType: currentTemplate?.builderType || 'Rich-Text',
          status: currentTemplate?.status || 'active',
          htmlContent: emailCompatibleHTML,
          content: editorContent || '',
          footerData: normalizedFooter, // So business name, address, website link, description appear when template is reused
        };

        const result = await dispatch(
          saveCampaignAsTemplate({
            templateId,
            templateData,
            newName,
          })
        ).unwrap();

        if (result) {
          toast.success('Campaign saved as template successfully!');

          const newTemplateId = result?.data?.newTemplate?._id || result?.data?.newTemplate?.id;
          if (newTemplateId) {
            // Persist footer so when user goes to Templates → Edit this template, same footer shows (survives navigation)
            savedTemplateFooterDataRef.current[newTemplateId] = normalizedFooter;
            setTemplateFooterInStorage(newTemplateId, normalizedFooter);
            dispatch(captureEmailTemplateScreenshot(newTemplateId))
              .unwrap()
              .then(() => {
                // Refresh immediately so new template thumbnail appears right away
                refreshScreenshots();
              })
              .catch(() => {
                // Ignore screenshot errors for cloned template
              });
          }
          // Dialog will be closed by header component
        }
      } catch (error) {
        console.error('Error saving campaign as template:', error);
        toast.error(error?.message || 'Failed to save campaign as template');
        throw error;
      }
    },
    [
      templateId,
      currentTemplate,
      editorContent,
      footerData,
      showSendWithPabblyBadge,
      businessDetails,
      dispatch,
      refreshScreenshots,
    ]
  );

  // Handle send email - saves campaign first, then navigates to send page
  const handleSend = useCallback(async () => {
    try {
      // Only use campaignId from URL/state (active campaign context), not from template data
      const campaignId = campaignIdFromUrlOrState;

      // Save the current email design to the campaign before navigating
      if (campaignId && templateId) {
        await handleSaveCampaign();

        // Small delay to ensure backend has persisted changes before navigation
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Navigate to send campaign page with campaignId as path parameter
      if (campaignId) {
        navigate(`${paths.app.sendCampaign}/${campaignId}`);
      } else {
        toast.error('Campaign ID not found. Please create a campaign first.');
        navigate(paths.app.campaign.root);
      }
    } catch (error) {
      console.error('Error saving campaign before sending:', error);
      toast.error('Failed to save campaign. Please try again.');
    }
  }, [campaignIdFromUrlOrState, templateId, handleSaveCampaign, navigate]);

  // const hideSnackbar = useCallback(() => {
  //   setSnackbar((prev) => ({ ...prev, open: false }));
  // }, []);

  const designData = useMemo(() => currentTemplate?.designData || {}, [currentTemplate]);

  // ========================
  // RENDER
  // ========================

  if (templateId && templateLoading && !currentTemplate) {
    return (
      <Box
        sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography variant="body1" color="text.secondary">
          Loading template…
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
        {/* Left Side - Email Preview */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            '[data-mui-color-scheme="light"] &': { borderRight: '1px solid #e5e7eb' },
            '[data-mui-color-scheme="dark"] &': { borderRight: '1px solid #404040' },
            overflow: 'hidden',
            height: '100%',
            pr: 2, // Add right padding to maintain gap between editor and footer settings at all zoom levels
            minWidth: 0, // Allow flex item to shrink below its content size
          }}
        >
          {/* Fixed Header Section */}
          <Box
            sx={{
              flexShrink: 0,
              ml: 3,
              mt: 2,
              mb: 2,
              zIndex: 100,
            }}
          >
            <RichTextEditorHeader
              previewMode={previewMode}
              onPreviewModeChange={handlePreviewModeChange}
              isPreviewMode={isPreviewMode}
              onTogglePreviewMode={handleTogglePreviewMode}
              canUndo={false}
              canRedo={false}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onPreview={handlePreview}
              emailTitle={emailTitle}
              onEmailTitleChange={handleEmailTitleChange}
              editorContent={editorContent}
              globalBackground={designData?.globalBackground}
              contentBackground={designData?.contentBackground}
              footerData={footerData}
              showSendWithPabblyBadge={showSendWithPabblyBadge}
              businessDetails={businessDetails}
              onSave={handleSave}
              isSaving={isUserSaving}
              campaignId={campaignIdFromUrlOrState || null}
              templateId={templateId}
              onSaveCampaign={handleSaveCampaign}
              onSaveTemplate={handleSave}
              onSaveCampaignAsTemplate={handleSaveCampaignAsTemplate}
              onSend={handleSend}
              campaignType={campaignType}
              campaignLoading={selectedCampaignLoading || isWaitingForCampaignData}
              templateType={templateType}
            />
          </Box>

          {/* Scrollable Editor Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
              width: '100%',
              maxWidth: '100%',
              // Hide scrollbar while keeping scroll functionality
              scrollbarWidth: 'none', // Firefox
              '&::-webkit-scrollbar': {
                display: 'none', // Chrome, Safari, Edge
              },
            }}
          >
            <EditorsBox
              value={editorContent}
              onContentChange={handleEditorContentChange}
              footerData={footerData}
              showSendWithPabblyBadge={showSendWithPabblyBadge}
              businessDetails={businessDetails}
            />
          </Box>
        </Box>

        {/* Right Side - Code Editor */}
        <Box
          sx={{
            width: '32%',
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            '[data-mui-color-scheme="light"] &': { backgroundColor: '#ffffff' },
            '[data-mui-color-scheme="dark"] &': { backgroundColor: '#141a21' },
            overflow: 'auto',
            // Hide scrollbar while keeping scroll functionality
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': {
              display: 'none', // Chrome, Safari, Edge
            },
          }}
        >
          {/* Contents Header */}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Rich Text Email Builder
          </Typography>

          {/* AI Prompt Section - COMMENTED OUT */}
          {/* <Box sx={{ p: 2, gap: 3, display: 'flex', flexDirection: 'column', mt: 3 }}>
            <AIPromptSection />
          </Box> */}

          {/* Footer Settings Section */}
          <Box sx={{ p: 2, gap: 3, display: 'flex', flexDirection: 'column', mt: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                '[data-mui-color-scheme="light"] &': { color: '#1f2937' },
                '[data-mui-color-scheme="dark"] &': { color: 'var(--palette-text-secondary)' },
              }}
            >
              Footer Settings
            </Typography>

            <TextField
              fullWidth
              label="Business Name"
              value={footerData.companyName}
              onChange={(e) => setFooterData({ ...footerData, companyName: e.target.value })}
              size="large"
              placeholder={businessDetails?.companyName || 'Pabbly'}
              helperText={`To comply with anti-spam legislation, the sender's business name must be included in all email communications. Leave empty to use default: '${businessDetails?.companyName || 'Pabbly'}'.`}
            />

            <TextField
              fullWidth
              label="Business Address"
              value={footerData.address}
              onChange={(e) =>
                setFooterData({
                  ...footerData,
                  address: e.target.value,
                  isCustomized: true,
                })
              }
              
              size="large"
              placeholder={ formatAddress(businessDetails?.addressDetails) || 'India'}
              helperText={`To comply with anti-spam legislation, the sender's physical address must be included in all email communications. Leave empty to use default:  '${formatAddress(businessDetails?.addressDetails) || 'India'}'.`}
            />

            <TextField
              fullWidth
              label="Website Link"
              value={footerData.websiteAdress}
              onChange={(e) => setFooterData({ ...footerData, websiteAdress: e.target.value })}
              size="large"
              multiline
              minRows={1}
              maxRows={3}
              placeholder={businessDetails?.website || 'https://emails.pabbly.com'}
              helperText={`Enter your website URL (including https://). Leave empty to use default: '${businessDetails?.website || 'https://emails.pabbly.com'}'.`}
              InputProps={{ style: { wordBreak: 'break-word', overflowWrap: 'break-word' } }}
            />

            <TextField
              fullWidth
              label='"This email was sent to" {email}'
              value={footerData.sentToText}
              onChange={(e) => setFooterData({ ...footerData, sentToText: e.target.value })}
              size="large"
              multiline
              minRows={1}
              maxRows={3}
              placeholder="This email was sent to"
              helperText="Enter the text that will appear before the recipient's email address in the footer. Leave empty to use default: 'This email was sent to'."
              InputProps={{ style: { wordBreak: 'break-word', overflowWrap: 'break-word' } }}
            />

            <TextField
              fullWidth
              label="Unsubscribe"
              value={footerData.unsubscribeText}
              onChange={(e) => setFooterData({ ...footerData, unsubscribeText: e.target.value })}
              size="large"
              multiline
              minRows={1}
              maxRows={3}
              placeholder="Unsubscribe"
              helperText="Enter the text for the unsubscribe link in the footer. Leave empty to use default: 'Unsubscribe'."
              InputProps={{ style: { wordBreak: 'break-word', overflowWrap: 'break-word' } }}
            />

            <TextField
              fullWidth
              label="View in Browser"
              value={footerData.viewInBrowserText}
              onChange={(e) => setFooterData({ ...footerData, viewInBrowserText: e.target.value })}
              size="large"
              multiline
              minRows={1}
              maxRows={3}
              placeholder="View in Browser"
              helperText="Enter the text for the view in browser link in the footer. Leave empty to use default: 'View in Browser'."
              InputProps={{ style: { wordBreak: 'break-word', overflowWrap: 'break-word' } }}
            />

            <TextField
              fullWidth
              label="Subscription Message"
              value={footerData.description}
              onChange={(e) => setFooterData({ ...footerData, description: e.target.value })}
              size="large"
              multiline
              rows={3}
              placeholder="You are receiving this email because you have signed up on our website or subscribed to our email list."
              helperText="Enter additional footer text or description that will appear at the bottom of the email. Leave empty to use default description."
            />
          </Box>

          {/* Code Editor or other content can go here */}
        </Box>
      </Box>
    </Box>
  );
};

export default RichTextEditorBuilder;
