import { useState, useEffect } from 'react';

import { Box, Card, useTheme, Typography } from '@mui/material';

// import { formatAddress } from '../utils/format-address ';
import { formatAddress } from 'src/utils/format-address ';

import { Editor } from './editor/editor';

export default function EditorsBox({
  value = '',
  onContentChange,
  footerData = {},
  showSendWithPabblyBadge = true,
  businessDetails = null,
}) {
  const theme = useTheme();

  // Rich text value and source toggle – keep all existing functionality
  const [editorContent, setEditorContent] = useState(value || '');
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    setEditorContent(value || '');
  }, [value]);

  const handleEditorChange = (updatedValue) => {
    setEditorContent(updatedValue);
    if (onContentChange) {
      onContentChange(updatedValue);
    }
  };
  const handleToggleSource = (newValue) => setShowSource(newValue);

  return (
    <>
      {/* Rich Text Editor section */}
      <Card
        sx={{
          mt: 2,
          mb: 3,
          width: { xs: '100%', sm: 1190 },
          // maxWidth ensures editor never exceeds available space, accounting for:
          // - Container's right padding (16px from pr: 2)
          // - Editor's right margin (16px on sm, 24px on md)
          // This maintains consistent gap at all zoom levels
          maxWidth: { xs: '100%', sm: 'calc(100% - 32px)', md: 'calc(100% - 40px)' },
          height: { xs: 'auto', sm: 510 },
          minHeight: { xs: 500, sm: 810 },
          mx: { xs: 1, sm: 2, md: 3 },
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box', // Ensure padding/margin are included in width calculation
          '[data-mui-color-scheme="light"] &': { backgroundColor: '#ffffff' },
          '[data-mui-color-scheme="dark"] &': { backgroundColor: '#1c252e' },
        }}
      >
        <Editor
          fullItem
          value={editorContent}
          onChange={handleEditorChange}
          showSource={showSource}
          onToggleSource={handleToggleSource}
          placeholder="Write your email content here..."
          slotProps={{
            wrapper: {
              sx: {
                pt: '0px',
                pl: { xs: 2, sm: 3 },
                pr: { xs: 2, sm: 3 },
                width: '100%',
                maxWidth: '100%',
                flex: 1,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'transparent',
              },
            },
            content: {
              sx: {
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                // Hide scrollbar while keeping scroll functionality
                scrollbarWidth: 'none', // Firefox
                '&::-webkit-scrollbar': {
                  display: 'none', // Chrome, Safari, Edge
                },
              },
            },
          }}
        />

        {/* Footer Section - Full width for rich-text (600px only for drag-and-drop & HTML builder), px:3 left/right */}
        <Box
          sx={{
            width: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 48px)' }, // Account for mx margins (16px*2 on xs, 24px*2 on sm+)
            pt: { xs: 1.5, sm: 2 },
            pb: { xs: 1.5, sm: 2 },
            px: { xs: 2, sm: 2 },
            mx: { xs: 2, sm: 3 }, // Left/right margin (24px on sm+) - editor UI only
            mb: { xs: 2, sm: 3 },
            flexShrink: 0,
            maxHeight: 180,
            overflowY: 'auto',
            borderTop: `1px solid ${theme.palette.divider}`,
            '[data-mui-color-scheme="light"] &': {
              backgroundColor: '#f9fafb',
            },
            '[data-mui-color-scheme="dark"] &': {
              backgroundColor: '#1a1a1a',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              textAlign: 'center',
            }}
          >
            {/* Company Name and Address */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {((footerData.companyName && footerData.companyName.trim()) ||
                (businessDetails?.companyName && businessDetails.companyName.trim()) ||
                'Pabbly') && (
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: '0.8125rem', md: '0.875rem' },
                    '[data-mui-color-scheme="light"] &': { color: '#374151' },
                    '[data-mui-color-scheme="dark"] &': { color: '#e5e7eb' },
                  }}
                >
                  {(footerData.companyName && footerData.companyName.trim()) ||
                    (businessDetails?.companyName && businessDetails.companyName.trim()) ||
                    'Pabbly'}
                </Typography>
              )}
              {((typeof footerData.address === 'string' && footerData.address.trim()) ||
                formatAddress(businessDetails?.addressDetails) ||
                'India') && (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    '[data-mui-color-scheme="light"] &': { color: '#6b7280' },
                    '[data-mui-color-scheme="dark"] &': { color: '#9ca3af' },
                  }}
                >
                  {(typeof footerData.address === 'string' && footerData.address.trim()) ||
                    formatAddress(businessDetails?.addressDetails) ||
                    'India'}
                </Typography>
              )}

              {((footerData.websiteAdress && footerData.websiteAdress.trim()) ||
                'https://emails.pabbly.com') && (
                <Typography
                  variant="body2"
                  color="primary.main"
                  sx={{
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    '[data-mui-color-scheme="light"] &': { color: '#2563EB' },
                    '[data-mui-color-scheme="dark"] &': { color: '#2563EB' },
                  }}
                >
                  {(footerData.websiteAdress && footerData.websiteAdress.trim()) ||
                    'https://emails.pabbly.com'}
                </Typography>
              )}
            </Box>

            {/* Links Section - wrap so long text goes to next line after max width (same as description) */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: { xs: 0.25, sm: 1 },
                flexWrap: 'wrap',
                mt: 0,
                px: { xs: 0.5, sm: 0 },
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: { xs: 0.125, sm: 0.5 },
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  maxWidth: '100%',
                }}
              >
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    fontSize: { xs: '12px', md: '0.875rem' },
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%',
                    '[data-mui-color-scheme="light"] &': { color: '#6b7280' },
                    '[data-mui-color-scheme="dark"] &': { color: '#9ca3af' },
                  }}
                >
                  {(footerData.sentToText && footerData.sentToText.trim()) ||
                    'This email was sent to'}{' '}
                  {/* Email Address - Backend will replace {email} with actual subscriber email when sending */}
                  <span>{'{email}'}</span>
                </Typography>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    fontSize: { xs: '12px', md: '0.875rem' },
                    '[data-mui-color-scheme="light"] &': { color: '#6b7280' },
                    '[data-mui-color-scheme="dark"] &': { color: '#9ca3af' },
                  }}
                >
                  {' | '}
                </Typography>
              </Box>
              {((footerData.unsubscribeText && footerData.unsubscribeText.trim()) ||
                'Unsubscribe') && (
                <>
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      fontSize: { xs: '12px', md: '0.875rem' },
                      '[data-mui-color-scheme="light"] &': { color: '#6b7280' },
                      '[data-mui-color-scheme="dark"] &': { color: '#9ca3af' },
                    }}
                  >
                    {' | '}
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href="#"
                    sx={{
                      fontSize: { xs: '12px', md: '0.875rem' },
                      color: '#2563eb',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      '&:hover': {
                        color: '#1d4ed8',
                      },
                    }}
                  >
                    {(footerData.unsubscribeText && footerData.unsubscribeText.trim()) ||
                      'Unsubscribe'}
                  </Typography>
                </>
              )}
              {((footerData.viewInBrowserText && footerData.viewInBrowserText.trim()) ||
                'View in Browser') && (
                <>
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      fontSize: { xs: '12px', md: '0.875rem' },
                      '[data-mui-color-scheme="light"] &': { color: '#6b7280' },
                      '[data-mui-color-scheme="dark"] &': { color: '#9ca3af' },
                    }}
                  >
                    {' | '}
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href="#"
                    sx={{
                      fontSize: { xs: '12px', md: '0.875rem' },
                      color: '#2563eb',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      '&:hover': {
                        color: '#1d4ed8',
                      },
                    }}
                  >
                    {(footerData.viewInBrowserText && footerData.viewInBrowserText.trim()) ||
                      'View in Browser'}
                  </Typography>
                </>
              )}
            </Box>

            {/* Description - whiteSpace: pre-line so Enter/newlines show as line breaks in footer */}
            {((footerData.description && footerData.description.trim()) ||
              'You are receiving this email because you have signed up on our website or subscribed to our email list.') && (
              <Typography
                variant="body2"
                sx={{
                  mt: { xs: 0.5, sm: 0.3 },
                  px: { xs: 0.5, sm: 0 },
                 
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-line',
                  '[data-mui-color-scheme="light"] &': { color: '#6b7280' },
                  '[data-mui-color-scheme="dark"] &': { color: '#9ca3af' },
                }}
              >
                {(footerData.description && footerData.description.trim()) ||
                  'You are receiving this email because you have signed up on our website or subscribed to our email list.'}
              </Typography>
            )}

            {/* Send with Pabbly - only show if showSendWithPabblyBadge is true */}
            {showSendWithPabblyBadge && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  mt: { xs: 0.5, sm: 0.3 },
                  flexWrap: 'wrap',
                  px: { xs: 0.5, sm: 0 },
                }}
              >
                <Box
                  component="img"
                  src="https://assets-emails.pabbly.com/assets/email-builder/send-with-pabbly-light.png"
                  alt="Pabbly"
                  sx={{
                    width: { xs: '100%', sm: '400px' },
                    maxWidth: { xs: '280px', sm: '400px' },
                    height: '20px',
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
                {/* <Typography
                variant="body2"
                sx={{
                  '[data-mui-color-scheme="light"] &': { color: '#6b7280' },
                  '[data-mui-color-scheme="dark"] &': { color: '#9ca3af' },
                  whiteSpace: 'nowrap',
                }}
              >
                Send with{' '}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 600,
                    '[data-mui-color-scheme="light"] &': { color: '#374151' },
                    '[data-mui-color-scheme="dark"] &': { color: '#e5e7eb' },
                  }}
                >
                  Pabbly
                </Box>
              </Typography> */}
              </Box>
            )}
          </Box>
        </Box>
      </Card>
    </>
  );
}
