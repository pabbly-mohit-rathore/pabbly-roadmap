import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import React, { useRef, useState, useEffect } from 'react';

import { Box, Paper, Typography, ToggleButton, CircularProgress , ToggleButtonGroup } from '@mui/material';

import {
  clearPreviewTemplate,
  selectPreviewTemplate,
  getEmailTemplatePreview,
  selectPreviewTemplateError,
  selectPreviewTemplateLoading,
} from 'src/redux/slices/emailTemplate';

import { Iconify } from 'src/components/iconify';


const CANVAS_CONFIGS = {
  desktop: {
    width: '1600px',
    maxWidth: '1600px',
    scale: 1,
    label: 'Desktop View (600px)',
  },
  mobile: {
    width: '375px',
    maxWidth: '375px',
    scale: 0.625,
    label: 'Mobile View (375px)',
  },
};

const RichTextPreview = () => {
  const dispatch = useDispatch();
  const { templateId } = useParams();

  const previewData = useSelector(selectPreviewTemplate);
  const isLoading = useSelector(selectPreviewTemplateLoading);
  const error = useSelector(selectPreviewTemplateError);

  const [previewMode, setPreviewMode] = useState('desktop');
  const [htmlContent, setHtmlContent] = useState('');
  const [emailTitle, setEmailTitle] = useState('Email Preview');
  const contentRef = useRef(null);

  // Inject editor CSS styles for proper rendering
  useEffect(() => {
    const styleId = 'rich-text-preview-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .rich-text-preview-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        
        .rich-text-preview-content p {
          margin: 0.5em 0;
        }
        
        .rich-text-preview-content h1,
        .rich-text-preview-content h2,
        .rich-text-preview-content h3,
        .rich-text-preview-content h4,
        .rich-text-preview-content h5,
        .rich-text-preview-content h6 {
          margin: 1em 0 0.5em 0;
          font-weight: 600;
        }
        
        .rich-text-preview-content img {
          max-width: 100%;
          height: auto;
          pointer-events: auto !important;
          display: block;
          border: 0;
          outline: none;
          text-decoration: none;
        }
        
        /* Mobile preview - make ALL images responsive */
        .rich-text-preview-content.mobile-preview img,
        .rich-text-preview-content.mobile-preview img[width],
        .rich-text-preview-content.mobile-preview img[style*="width"] {
          max-width: 100% !important;
          width: 100% !important;
          height: auto !important;
          display: block !important;
        }
        
        /* Handle image alignment - images inside divs with text-align should respect alignment */
        .rich-text-preview-content div[style*="text-align: center"],
        .rich-text-preview-content div[style*="text-align:center"] {
          width: 100%;
          text-align: center !important;
        }
        
        .rich-text-preview-content div[style*="text-align: center"] img,
        .rich-text-preview-content div[style*="text-align:center"] img {
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        
        .rich-text-preview-content div[style*="text-align: right"],
        .rich-text-preview-content div[style*="text-align:right"] {
          width: 100%;
          text-align: right !important;
        }
        
        .rich-text-preview-content div[style*="text-align: right"] img,
        .rich-text-preview-content div[style*="text-align:right"] img {
          display: block !important;
          margin-left: auto !important;
          margin-right: 0 !important;
        }
        
        .rich-text-preview-content div[style*="text-align: left"],
        .rich-text-preview-content div[style*="text-align:left"] {
          width: 100%;
          text-align: left !important;
        }
        
        .rich-text-preview-content div[style*="text-align: left"] img,
        .rich-text-preview-content div[style*="text-align:left"] img {
          display: block !important;
          margin-left: 0 !important;
          margin-right: auto !important;
        }
        
        /* Table cell image alignment */
        .rich-text-preview-content td[style*="text-align: center"] img,
        .rich-text-preview-content td[style*="text-align:center"] img,
        .rich-text-preview-content th[style*="text-align: center"] img,
        .rich-text-preview-content th[style*="text-align:center"] img {
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        
        .rich-text-preview-content td[style*="text-align: right"] img,
        .rich-text-preview-content td[style*="text-align:right"] img,
        .rich-text-preview-content th[style*="text-align: right"] img,
        .rich-text-preview-content th[style*="text-align:right"] img {
          display: block !important;
          margin-left: auto !important;
          margin-right: 0 !important;
        }
        
        .rich-text-preview-content td[style*="text-align: left"] img,
        .rich-text-preview-content td[style*="text-align:left"] img,
        .rich-text-preview-content th[style*="text-align: left"] img,
        .rich-text-preview-content th[style*="text-align:left"] img {
          display: block !important;
          margin-left: 0 !important;
          margin-right: auto !important;
        }
        
        /* Block display only when specifically needed */
        .rich-text-preview-content p img,
        .rich-text-preview-content figure img {
          display: block;
        }
        
        .rich-text-preview-content a {
          color: #0066cc;
          text-decoration: underline;
          cursor: pointer !important;
          pointer-events: auto !important;
        }
        
        .rich-text-preview-content a img {
          pointer-events: auto !important;
          cursor: pointer !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
        }
        
        .rich-text-preview-content a:hover img {
          opacity: 0.9;
        }
        
        /* Ensure anchor tags wrapping images are fully clickable */
        .rich-text-preview-content a[href] {
          display: inline-block;
          text-decoration: none;
        }
        
        .rich-text-preview-content a[href] img {
          border: none;
          outline: none;
        }
        
        .rich-text-preview-content table {
          border-collapse: collapse !important;
          table-layout: fixed !important;
          width: 100% !important;
          margin: 1rem 0 !important;
          border: 1px solid #cccccc !important;
          display: table !important;
          background-color: #ffffff !important;
        }
        
        .rich-text-preview-content td,
        .rich-text-preview-content th {
          border: 1px solid #d0d0d0 !important;
          padding: 12px 12px !important;
          text-align: left !important;
          vertical-align: middle !important;
          min-width: 100px !important;
          min-height: 60px !important;
          background-color: #ffffff !important;
          display: table-cell !important;
          box-sizing: border-box !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          white-space: normal !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        /* Ensure all content inside table cells wraps properly */
        .rich-text-preview-content td *,
        .rich-text-preview-content th * {
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
          white-space: normal !important;
        }
        
        /* Ensure paragraphs and content inside cells respect vertical centering */
        .rich-text-preview-content td p,
        .rich-text-preview-content th p {
          margin: 0 !important;
          vertical-align: middle !important;
        }
        
        /* Add spacing between consecutive paragraphs in cells */
        .rich-text-preview-content td p + p,
        .rich-text-preview-content th p + p {
          margin-top: 0.5em !important;
        }
        
        /* Ensure divs and other block elements inside cells don't break vertical centering */
        .rich-text-preview-content td > *:first-child,
        .rich-text-preview-content th > *:first-child {
          margin-top: 0 !important;
        }
        
        .rich-text-preview-content td > *:last-child,
        .rich-text-preview-content th > *:last-child {
          margin-bottom: 0 !important;
        }
        
        .rich-text-preview-content th {
          background-color: #f5f5f5 !important;
          font-weight: 600 !important;
          color: #333333 !important;
        }
        
        .rich-text-preview-content tr {
          display: table-row !important;
        }
        
        /* Bullet List Styles */
        .rich-text-preview-content ul {
          list-style: none !important;
          padding-left: 0 !important;
          margin: 0.5em 0 !important;
        }
        
        .rich-text-preview-content ul > li {
          list-style: none !important;
          padding-left: 1.5em !important;
          position: relative !important;
          min-height: 1.5em;
          line-height: 1.5;
        }
        
        /* Default bullet style (disc) */
        .rich-text-preview-content ul[data-list-style="disc"] > li::before,
        .rich-text-preview-content ul:not([data-list-style]) > li::before {
          content: "•" !important;
          position: absolute !important;
          left: 0 !important;
          top: 0.13em !important;
          font-weight: bold !important;
        }
        
        /* Circle style */
        .rich-text-preview-content ul[data-list-style="circle"] > li::before {
          content: "○" !important;
          position: absolute !important;
          left: 0 !important;
          top: -3px !important;
          font-weight: bold !important;
          font-size: 0.5em !important;
        }
        
        /* Square style */
        .rich-text-preview-content ul[data-list-style="square"] > li::before {
          content: "■" !important;
          position: absolute !important;
          left: 0 !important;
          top: -3px !important;
          font-weight: bold !important;
          font-size: 0.46em !important;
        }
        
        /* Centered bullet lists */
        .rich-text-preview-content ul[style*="text-align: center"] > li,
        .rich-text-preview-content ul[style*="text-align:center"] > li {
          padding-left: 0 !important;
          list-style: disc inside !important;
        }
        
        .rich-text-preview-content ul[style*="text-align: center"] > li::before,
        .rich-text-preview-content ul[style*="text-align:center"] > li::before {
          content: none !important;
        }
        
        /* Ordered List Styles */
        .rich-text-preview-content ol {
          list-style: none !important;
          padding-left: 0 !important;
          margin: 0.5em 0 !important;
          counter-reset: olitem !important;
        }
        
        .rich-text-preview-content ol > li {
          list-style: none !important;
          padding-left: 1.5em !important;
          position: relative !important;
          counter-increment: olitem !important;
          min-height: 1.5em;
          line-height: 1.5;
        }
        
        /* Default decimal style */
        .rich-text-preview-content ol[data-list-style="decimal"] > li::before,
        .rich-text-preview-content ol:not([data-list-style]) > li::before {
          content: counter(olitem) "." !important;
          position: absolute !important;
          left: 0 !important;
          top: 0.13em !important;
          font-weight: bold !important;
        }
        
        /* Lower Alpha style */
        .rich-text-preview-content ol[data-list-style="lower-alpha"] > li::before {
          content: counter(olitem, lower-alpha) "." !important;
          position: absolute !important;
          left: 0 !important;
          top: 7px !important;
          font-weight: bold !important;
        }
        
        /* Lower Greek style */
        .rich-text-preview-content ol[data-list-style="lower-greek"] > li::before {
          content: counter(olitem, lower-greek) "." !important;
          position: absolute !important;
          left: 0 !important;
          top: 7px !important;
          font-weight: bold !important;
        }
        
        /* Lower Roman style */
        .rich-text-preview-content ol[data-list-style="lower-roman"] > li::before {
          content: counter(olitem, lower-roman) "." !important;
          position: absolute !important;
          left: 0 !important;
          top: 7px !important;
          font-weight: bold !important;
        }
        
        /* Upper Alpha style */
        .rich-text-preview-content ol[data-list-style="upper-alpha"] > li::before {
          content: counter(olitem, upper-alpha) "." !important;
          position: absolute !important;
          left: 0 !important;
          top: 7px !important;
          font-weight: bold !important;
        }
        
        /* Upper Roman style */
        .rich-text-preview-content ol[data-list-style="upper-roman"] > li::before {
          content: counter(olitem, upper-roman) "." !important;
          position: absolute !important;
          left: 0 !important;
          top: 7px !important;
          font-weight: bold !important;
        }
        
        /* Centered ordered lists */
        .rich-text-preview-content ol[style*="text-align: center"] > li,
        .rich-text-preview-content ol[style*="text-align:center"] > li {
          padding-left: 0 !important;
          list-style: decimal inside !important;
        }
        
        .rich-text-preview-content ol[style*="text-align: center"] > li::before,
        .rich-text-preview-content ol[style*="text-align:center"] > li::before {
          content: none !important;
        }
        
        .rich-text-preview-content blockquote {
          margin: 0.9em 0;
          padding: 36px 24px;
          padding-left: 65px;
          display: block;
          width: 100%;
          border-left: 6px solid #eef0f2;
          background-color: #f6f7f8;
          color: #6F7B88 !important;
          line-height: 1.6;
          font-weight: 600;
          position: relative;
        }
        
        .rich-text-preview-content blockquote::before {
          content: "\\201C";
          position: absolute;
          left: 20px;
          top: 10px;
          font-size: 48px;
          line-height: 1;
          color: #9AA6B2;
          font-weight: 550;
          font-family: Georgia, Times, "Times New Roman", sans-serif;
          pointer-events: none;
        }
        
        .rich-text-preview-content blockquote p {
          margin: 0;
        }
        
        
        .rich-text-preview-content hr {
          border: 0;
          border-top: 1px solid #DADDE1;
          margin: 12px 0;
          width: 100%;
        }
        
        .rich-text-preview-content [data-email-canvas-root="true"] {
          margin-left: auto;
          margin-right: auto;
          display: block;
        }
        
        /* Rich-text preview: full-width footer with px:3 (24px) - 600px only for drag-and-drop & HTML builder */
        .rich-text-preview-content .pabbly-richtext-footer-inner {
          max-width: none !important;
          width: 100% !important;
          padding: 0 24px !important;
          box-sizing: border-box !important;
        }
        
        /* Mobile view specific styles */
        .rich-text-preview-content.mobile-preview {
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
        }
        
        .rich-text-preview-content.mobile-preview table {
          table-layout: auto !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .rich-text-preview-content.mobile-preview td,
        .rich-text-preview-content.mobile-preview th {
          min-width: 0 !important;
          padding: 8px 12px !important;
          vertical-align: middle !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          white-space: normal !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        .rich-text-preview-content.mobile-preview td *,
        .rich-text-preview-content.mobile-preview th * {
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
          white-space: normal !important;
        }
        
        .rich-text-preview-content.mobile-preview p,
        .rich-text-preview-content.mobile-preview div,
        .rich-text-preview-content.mobile-preview span,
        .rich-text-preview-content.mobile-preview td *,
        .rich-text-preview-content.mobile-preview th * {
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
          white-space: normal !important;
        }
        
        /* Also apply for viewport-based mobile */
        @media (max-width: 370px) {
          .rich-text-preview-content {
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          .rich-text-preview-content img,
          .rich-text-preview-content img[width],
          .rich-text-preview-content img[style*="width"] {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          
          .rich-text-preview-content table {
            table-layout: auto !important;
            width: 100% !important;
          }
          
          .rich-text-preview-content td,
          .rich-text-preview-content th {
            min-width: 0 !important;
            padding: 8px 12px !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
          
          .rich-text-preview-content td *,
          .rich-text-preview-content th * {
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
            white-space: normal !important;
          }
          
          .rich-text-preview-content table {
            table-layout: auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
        .rich-text-preview-content p,
        .rich-text-preview-content div,
        .rich-text-preview-content span {
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
        }
        
        /* Custom field styling for preview */
        .rich-text-preview-content span[data-type="custom-field"],
        .rich-text-preview-content .custom-field-node {
          display: inline !important;
          white-space: nowrap !important;
          word-break: keep-all !important;
          color: inherit !important;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }
        
        .rich-text-preview-content span[data-type="custom-field"] span {
          display: inline !important;
        }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (templateId) {
      dispatch(getEmailTemplatePreview(templateId));
    }

    return () => {
      if (templateId) {
        dispatch(clearPreviewTemplate());
      }
    };
  }, [dispatch, templateId]);

  useEffect(() => {
    if (!templateId || !previewData) {
      return;
    }

    if (previewData.htmlContent || previewData.content) {
      setHtmlContent(previewData.htmlContent || previewData.content || '');
    }
    if (previewData.title || previewData.name) {
      setEmailTitle(previewData.title || previewData.name || 'Email Preview');
    }
  }, [previewData, templateId]);

  useEffect(() => {
    if (templateId) {
      return;
    }

    const storedContent = localStorage.getItem('richTextPreviewContent');
    const storedTitle = localStorage.getItem('richTextPreviewTitle');
    const storedMode = localStorage.getItem('richTextPreviewMode');

    if (storedContent) {
      setHtmlContent(storedContent);
    }
    if (storedTitle) {
      setEmailTitle(storedTitle);
    }
    if (storedMode) {
      setPreviewMode(storedMode);
    }
  }, [templateId]);

  // Make images responsive in mobile preview mode
  useEffect(() => {
    if (!htmlContent || !contentRef.current) return undefined;

    const previewContainer = contentRef.current;
    
    const makeImagesResponsive = () => {
      if (previewMode === 'mobile') {
        const images = previewContainer.querySelectorAll('img');
        images.forEach((img) => {
          // Force images to be responsive in mobile view
          img.style.maxWidth = '100%';
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
        });
      } else {
        // Reset to original styles for desktop
        const images = previewContainer.querySelectorAll('img');
        images.forEach((img) => {
          // Remove mobile-specific styles, let original styles take over
          img.style.width = '';
          img.style.display = '';
          // Keep max-width for general responsiveness
          img.style.maxWidth = '100%';
        });
      }
    };

    // Initial setup
    makeImagesResponsive();

    // Watch for content changes
    const observer = new MutationObserver(makeImagesResponsive);
    observer.observe(previewContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
    };
  }, [htmlContent, previewMode]);

  // Setup links and ensure image links are clickable
  useEffect(() => {
    if (!htmlContent) return undefined;

    const previewContainer = contentRef.current;
    if (!previewContainer) return undefined;

    // Store handlers for cleanup
    const imageHandlers = new WeakMap();

    const setupLinks = () => {
      // Find all anchor tags
      const anchors = previewContainer.querySelectorAll('a[href]');
      
      anchors.forEach((anchor) => {
        const href = anchor.getAttribute('href');
        if (href && !href.startsWith('#') && !/^javascript:/i.test(href)) {
          // Set target to open in new tab
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');
          
          // Handle images inside anchors
          const images = anchor.querySelectorAll('img');
          images.forEach((img) => {
            // Ensure images are clickable
            img.style.pointerEvents = 'auto';
            img.style.cursor = 'pointer';
            img.style.userSelect = 'none';
            img.removeAttribute('draggable');
            
            // Remove existing handler if any
            const existingHandler = imageHandlers.get(img);
            if (existingHandler) {
              img.removeEventListener('click', existingHandler, { capture: true });
            }
            
            // Add click handler that opens the link
            const handleImageClick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              // Open the link in new tab
              if (anchor && anchor.href) {
                window.open(anchor.href, '_blank', 'noopener,noreferrer');
              }
            };
            
            imageHandlers.set(img, handleImageClick);
            img.addEventListener('click', handleImageClick, { capture: true });
          });
        }
      });
    };

    // Use MutationObserver to watch for content changes and setup links
    const observer = new MutationObserver(setupLinks);
    observer.observe(previewContainer, { childList: true, subtree: true });

    // Initial setup
    const timeoutId = setTimeout(setupLinks, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      // Clean up event listeners
      const anchors = previewContainer.querySelectorAll('a[href]');
      anchors.forEach((anchor) => {
        const images = anchor.querySelectorAll('img');
        images.forEach((img) => {
          const handler = imageHandlers.get(img);
          if (handler) {
            img.removeEventListener('click', handler, { capture: true });
          }
        });
      });
    };
  }, [htmlContent]);

  // Check if this is a Campaign Rich Text Editor
  const isCampaignRichTextEditor = previewData?.type === 'campaign' && previewData?.builderType === 'Rich-Text';
  
  // Get the appropriate config based on preview mode and editor type
  const getCurrentConfig = () => {
    if (previewMode === 'mobile') {
      return CANVAS_CONFIGS.mobile;
    }
    // For desktop mode: use 1436px for Campaign Rich Text Editor, otherwise use default 1600px
    if (isCampaignRichTextEditor) {
      return {
        width: '1436px',
        maxWidth: '1436px',
        scale: 1,
        label: 'Desktop View (600px)',
      };
    }
    return CANVAS_CONFIGS.desktop;
  };
  
  const currentConfig = getCurrentConfig();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f6f7f8' }}>
      {/* Preview Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          py: 2,
          px: 4,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1f2937',
              }}
            >
              {emailTitle}
            </Typography>
            <ToggleButtonGroup
              value={previewMode}
              exclusive
              onChange={(event, newMode) => {
                if (newMode !== null) {
                  setPreviewMode(newMode);
                  localStorage.setItem('richTextPreviewMode', newMode);
                }
              }}
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
                <Iconify icon="mdi:monitor" sx={{ mr: 0.5 }} />
              </ToggleButton>
              <ToggleButton value="mobile" aria-label="mobile view">
                <Iconify icon="mdi:cellphone" sx={{ mr: 0.5 }} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Box>

      {/* Preview Content */}
      <Box
        sx={{
          px: 4,
          py: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: currentConfig.width,
            maxWidth: currentConfig.maxWidth,
            minHeight: '400px',
            backgroundColor: '#ffffff',
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            transform: `scale(${currentConfig.scale})`,
            transformOrigin: 'top center',
            mx: previewMode === 'mobile' ? 'auto' : 0,
          }}
        >
          {templateId && isLoading ? (
            <Box
              sx={{
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'text.secondary',
              }}
            >
              <CircularProgress />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Loading preview...
              </Typography>
            </Box>
          ) : error ? (
            <Box
              sx={{
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'text.secondary',
              }}
            >
              <Iconify icon="mdi:alert-circle-outline" width={64} height={64} sx={{ opacity: 0.5, color: 'error.main' }} />
              <Typography variant="h6" sx={{ mt: 2, color: 'error.main' }}>
                Failed to load preview
              </Typography>
              <Typography variant="body2">{error}</Typography>
            </Box>
          ) : !htmlContent || htmlContent.trim() === '' || htmlContent === '<p></p>' ? (
            <Box
              sx={{
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'text.secondary',
              }}
            >
              <Iconify icon="mdi:email-outline" width={64} height={64} sx={{ opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                No content to preview
              </Typography>
              <Typography variant="body2">Create some content in the editor to see the preview</Typography>
            </Box>
          ) : (
            <Box
              ref={contentRef}
              className={`rich-text-preview-content ${previewMode === 'mobile' ? 'mobile-preview' : ''}`}
              sx={{
                p: 3,
                '& *': {
                  maxWidth: '100%',
                },
                '& img': {
                  maxWidth: previewMode === 'mobile' ? '100%' : '100%',
                  width: previewMode === 'mobile' ? '100%' : 'auto',
                  height: 'auto',
                },
              }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default RichTextPreview;

