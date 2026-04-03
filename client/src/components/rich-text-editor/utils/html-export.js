/**
 * HTML Export Utility for Rich Text Email Builder
 * Converts rich text editor content to clean HTML email with all styling preserved
 */

// Helper function to convert styles object to CSS string
const stylesToCSS = (styles) =>
  Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join(' ');

// Clean and sanitize HTML content for email compatibility
const sanitizeHTMLForEmail = (htmlContent) => {
  if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p></p>') {
    return '';
  }

  // Remove any script tags and event handlers for security
  const sanitized = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');

  return sanitized;
};

// Generate footer HTML
const generateFooterHTML = (footerData = {}, showSendWithPabblyBadge = true, businessDetails = null) => {
  if (!footerData || Object.keys(footerData).length === 0) {
    return '';
  }

  const {
    companyName = '',
    websiteAdress = '',
    address = '',
    sentToText = '',
    unsubscribeText = '',
    viewInBrowserText = '',
    description = '',
  } = footerData;

  // Use business details as defaults if fields are empty, otherwise use hardcoded defaults
  // Priority: footerData value > businessDetails > hardcoded default
  const displayCompanyName = (companyName && companyName.trim()) || (businessDetails?.companyName && businessDetails.companyName.trim()) || 'Pabbly';
  const displaywebsiteAdress = (websiteAdress && websiteAdress.trim()) || (businessDetails?.website && businessDetails.website.trim()) || 'https://emails.pabbly.com';
  const displayAddress = (address && address.trim()) || (businessDetails?.addressDetails && businessDetails.addressDetails.trim()) || 'India';
  const displaySentToText = (sentToText && sentToText.trim()) || 'This email was sent to';
  const displayUnsubscribeText = (unsubscribeText && unsubscribeText.trim()) || 'Unsubscribe';
  const displayViewInBrowserText =
    (viewInBrowserText && viewInBrowserText.trim()) || 'View in Browser';
  const displayDescription =
    (description && description.trim()) ||
    'You are receiving this email because you have signed up on our website or subscribed to our email list.';

  // Footer HTML – 16px padding so border line doesn't touch body
  // Rich-text ONLY: full width in editor, preview, and when received (Gmail etc.). Drag & Drop / HTML use 600px (email-builder/utils/html-export.js).
  // Table layout ensures Gmail and other clients render full width reliably (div max-width can be overridden by clients).
  let footerHTML = '<div style="width: 100%; max-width: 100%; margin-top: 24px; border-top: 1px solid #e5e7eb; background-color: #f9fafb; padding: 16px; box-sizing: border-box; overflow-x: hidden;">';
  footerHTML += '<table role="presentation" class="pabbly-richtext-footer-inner" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 100%; margin: 0; border-collapse: collapse; table-layout: fixed;"><tr><td style="text-align: center; padding: 0; box-sizing: border-box; line-height: 1;">';

  // Company Name, Address, and Website Link
  // Order: Company Name → Address → Website Link (matches editor preview)
  // Spacing: Equal 8px gap between all elements for better readability
  if (displayCompanyName || displayAddress || displaywebsiteAdress) {
    if (displayCompanyName) {
      footerHTML += `<div class="footer-company-name" style="padding: 0 0 8px 0; margin: 0; text-align: center; font-size: 14px; font-weight: 500; color: #374151; line-height: 1.43; word-wrap: break-word; overflow-wrap: break-word;">${displayCompanyName}</div>`;
    }
    if (displayAddress) {
      footerHTML += `<div class="footer-address" style="padding: 0 0 8px 0; margin: 0; text-align: center; font-size: 14px; color: #6b7280; line-height: 1.43; word-wrap: break-word; overflow-wrap: break-word;">${displayAddress}</div>`;
    }
    if (displaywebsiteAdress) {
      footerHTML += `<div class="footer-website" style="padding: 0 0 8px 0; margin: 0; text-align: center; font-size: 14px; line-height: 1.43; word-wrap: break-word; overflow-wrap: break-word;"><a href="${displaywebsiteAdress}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; word-break: break-all;">${displaywebsiteAdress}</a></div>`;
    }
  }

  // Links Section - text wraps after max width (same as description); long URLs/text go to next line
  // Spacing: 8px gap from website link above (uniform spacing throughout footer)
  if (displaySentToText || displayUnsubscribeText || displayViewInBrowserText) {
    footerHTML += '<div class="footer-links-container" style="padding: 0 0 8px 0; text-align: center; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; word-break: break-word; overflow-wrap: break-word;">';

    if (displaySentToText) {
      footerHTML +=
        '<span class="footer-link-text" style="font-size: 14px; color: #6b7280; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%; white-space: normal;">';
      footerHTML += `${displaySentToText} `;
      // Email Address - backend will replace {email} with actual subscriber email (plain text, no chip styling, no curly braces)
      // Backend should replace {email} with just the email address (e.g., subscriber@example.com) without any curly braces
      footerHTML += '{email}';
      footerHTML += '</span>';
    }

    if (displayUnsubscribeText) {
      footerHTML +=
        '<span class="footer-separator" style="padding: 0 4px; font-size: 14px; color: #6b7280; line-height: 1.5;"> | </span>';
      // Unsubscribe link - backend will replace #unsubscribe with actual unsubscribe URL
      footerHTML += `<a href="#unsubscribe" class="footer-link" style="font-size: 14px; color: #2563eb; text-decoration: underline; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%; white-space: normal;">${displayUnsubscribeText}</a>`;
    }

    if (displayViewInBrowserText) {
      footerHTML +=
        '<span class="footer-separator" style="padding: 0 4px; font-size: 14px; color: #6b7280; line-height: 1.5;"> | </span>';
      // View in Browser link - backend will replace #view-in-browser with actual preview URL
      footerHTML += `<a href="#view-in-browser" class="footer-link" style="font-size: 14px; color: #2563eb; text-decoration: underline; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%; white-space: normal;">${displayViewInBrowserText}</a>`;
    }

    footerHTML += '</div>';
  }

  // Description - white-space: pre-line so Enter/newlines in description show as line breaks in email
  // Spacing: 8px gap from links section above (uniform spacing - links section has 8px bottom padding)
  if (displayDescription) {
    const escapedDescription = displayDescription
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    footerHTML += `<div class="footer-description" style="padding: 0 0 8px 0; text-align: center; font-size: 14px; color: #6b7280; line-height: 1.43; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-line; width: 100%; box-sizing: border-box;">${escapedDescription}</div>`;
  }

  // Send with Pabbly - only show if showSendWithPabblyBadge is true
  // Spacing: 4px gap from description above (uniform spacing - description has 4px bottom padding)
  if (showSendWithPabblyBadge) {
    footerHTML += '<div style="padding: 0; text-align: center; width: 100%; box-sizing: border-box;">';
    footerHTML +=
      '<img src="https://assets-emails.pabbly.com/assets/email-builder/send-with-pabbly-light.png" alt="Pabbly" width="20" height="20" style="max-width: 150px; width: 150px; height: 20px; display: block; border: 0; outline: none; text-decoration: none; margin: 0 auto;" />';
    footerHTML += '</div>';
  }

  footerHTML += '</td></tr></table>';
  footerHTML += '</div>';

  return footerHTML;
};

// Generate complete HTML email with proper email structure
const generateCompleteEmailHTML = (
  emailTitle,
  contentHTML,
  globalBackgroundCSS = '',
  contentBackgroundCSS = '',
  footerHTML = ''
) => {
  // If no content, return empty email template
  if (!contentHTML || contentHTML.trim() === '' || contentHTML === '<p></p>') {
    return generateEmptyEmailHTML(emailTitle);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${emailTitle}</title>
    <style>
        /* Email client compatibility styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            max-width: 100%;
        }
        /* Reset styles */
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            overflow-x: hidden !important;
            max-width: 100% !important;
        }
        /* Box sizing reset for email compatibility */
        *, *::before, *::after {
            box-sizing: border-box !important;
        }
        /* Rich text content styles - preserve all inline styles */
        .rich-text-email-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 24px;
            text-align: left; /* Default alignment - inline styles will override */
            box-sizing: border-box;
            overflow-x: hidden;
        }
        
        /* Paragraphs - preserve inline styles */
        .rich-text-email-content p {
            margin: 0.5em 0;
            text-align: left; /* Default left alignment */
        }
        
        /* Headings - preserve inline styles */
        .rich-text-email-content h1,
        .rich-text-email-content h2,
        .rich-text-email-content h3,
        .rich-text-email-content h4,
        .rich-text-email-content h5,
        .rich-text-email-content h6 {
            margin: 1em 0 0.5em 0;
            font-weight: 600;
            text-align: left; /* Default left alignment */
        }
        
        /* Default text alignment - ensure left alignment by default for all elements */
        .rich-text-email-content > * {
            text-align: left;
        }
        
        /* Divs default to left */
        .rich-text-email-content div {
            text-align: left;
        }
        
        /* Text alignment - preserve inline styles from TipTap
           Note: Inline styles have highest specificity, but we add these rules
           to ensure email client compatibility */
        .rich-text-email-content p[style*="text-align"],
        .rich-text-email-content h1[style*="text-align"],
        .rich-text-email-content h2[style*="text-align"],
        .rich-text-email-content h3[style*="text-align"],
        .rich-text-email-content h4[style*="text-align"],
        .rich-text-email-content h5[style*="text-align"],
        .rich-text-email-content h6[style*="text-align"],
        .rich-text-email-content div[style*="text-align"],
        .rich-text-email-content li[style*="text-align"] {
            /* Inline styles will take precedence */
        }
        
        /* Images - preserve inline styles and alignment */
        /* NOTE: Inline styles with !important will override these defaults */
        /* Default: responsive behavior (max-width: 100%) for images without explicit width */
        .rich-text-email-content img {
            max-width: 100%;
            height: auto;
            display: block;
            border: 0;
            outline: none;
            text-decoration: none;
        }
        
        /* Full-width images - block display */
        .rich-text-email-content img[style*="width: 100%"] {
            display: block !important;
        }
        
        /* Images with explicit pixel width - preserve actual width */
        /* Inline styles with !important will override max-width: 100% */
        .rich-text-email-content img[width] {
            /* Let inline styles handle width and max-width */
        }
        
        /* Handle image alignment - email clients need text-align on parent */
        .rich-text-email-content div[style*="text-align: center"],
        .rich-text-email-content div[style*="text-align:center"] {
            width: 100%;
            text-align: center !important;
        }
        
        .rich-text-email-content div[style*="text-align: center"] img,
        .rich-text-email-content div[style*="text-align:center"] img {
            display: block !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        
        .rich-text-email-content div[style*="text-align: right"],
        .rich-text-email-content div[style*="text-align:right"] {
            width: 100%;
            text-align: right !important;
        }
        
        .rich-text-email-content div[style*="text-align: right"] img,
        .rich-text-email-content div[style*="text-align:right"] img {
            display: block !important;
            margin-left: auto !important;
            margin-right: 0 !important;
        }
        
        .rich-text-email-content div[style*="text-align: left"],
        .rich-text-email-content div[style*="text-align:left"] {
            width: 100%;
            text-align: left !important;
        }
        
        .rich-text-email-content div[style*="text-align: left"] img,
        .rich-text-email-content div[style*="text-align:left"] img {
            display: block !important;
            margin-left: 0 !important;
            margin-right: auto !important;
        }
        
        /* Table cell image alignment */
        .rich-text-email-content td[style*="text-align: center"] img,
        .rich-text-email-content td[style*="text-align:center"] img,
        .rich-text-email-content th[style*="text-align: center"] img,
        .rich-text-email-content th[style*="text-align:center"] img {
            display: block !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        
        .rich-text-email-content td[style*="text-align: right"] img,
        .rich-text-email-content td[style*="text-align:right"] img,
        .rich-text-email-content th[style*="text-align: right"] img,
        .rich-text-email-content th[style*="text-align:right"] img {
            display: block !important;
            margin-left: auto !important;
            margin-right: 0 !important;
        }
        
        .rich-text-email-content td[style*="text-align: left"] img,
        .rich-text-email-content td[style*="text-align:left"] img,
        .rich-text-email-content th[style*="text-align: left"] img,
        .rich-text-email-content th[style*="text-align:left"] img {
            display: block !important;
            margin-left: 0 !important;
            margin-right: auto !important;
        }
        
        .rich-text-email-content p img,
        .rich-text-email-content figure img {
            display: block;
        }
        
        /* Links - preserve inline styles */
        .rich-text-email-content a {
            color: #0066cc;
            text-decoration: underline;
        }
        
        .rich-text-email-content a img {
            border: none;
            outline: none;
        }
        
        /* Underline support - preserve inline styles */
        .rich-text-email-content u {
            text-decoration: underline;
        }
        
        /* Note: All inline styles (font-family, font-size, color, background-color, 
           text-decoration, font-weight, etc.) are automatically preserved via 
           the style attribute in the HTML content. Inline styles have the highest 
           CSS specificity and will override any CSS rules. */
        
        .rich-text-email-content strong,
        .rich-text-email-content b {
            font-weight: bold;
        }
        
        .rich-text-email-content em,
        .rich-text-email-content i {
            font-style: italic;
        }
        
        /* Table styles */
        .rich-text-email-content table {
            border-collapse: collapse !important;
            table-layout: fixed !important;
            width: 100% !important;
            margin: 1rem 0 !important;
            border: 1px solid #cccccc !important;
            display: table !important;
            background-color: #ffffff !important;
        }
        
        .rich-text-email-content td,
        .rich-text-email-content th {
            border: 1px solid #d0d0d0 !important;
            padding: 12px 12px !important;
            text-align: left; /* Default, but inline styles will override */
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
        .rich-text-email-content td *,
        .rich-text-email-content th * {
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
            white-space: normal !important;
        }
        
        /* Ensure paragraphs and content inside cells respect vertical centering */
        .rich-text-email-content td p,
        .rich-text-email-content th p {
            margin: 0 !important;
            vertical-align: middle !important;
        }
        
        /* Add spacing between consecutive paragraphs in cells */
        .rich-text-email-content td p + p,
        .rich-text-email-content th p + p {
            margin-top: 0.5em !important;
        }
        
        /* Ensure divs and other block elements inside cells don't break vertical centering */
        .rich-text-email-content td > *:first-child,
        .rich-text-email-content th > *:first-child {
            margin-top: 0 !important;
        }
        
        .rich-text-email-content td > *:last-child,
        .rich-text-email-content th > *:last-child {
            margin-bottom: 0 !important;
        }
        
        /* Ensure table cells preserve inline text-align styles */
        .rich-text-email-content td[style*="text-align"],
        .rich-text-email-content th[style*="text-align"] {
            /* Inline styles will override the default left alignment */
        }
        
        .rich-text-email-content th {
            background-color: #f5f5f5 !important;
            font-weight: 600 !important;
            color: #333333 !important;
        }
        
        .rich-text-email-content tr {
            display: table-row !important;
        }
        
        /* Bullet List Styles - Match editor styles exactly */
        .rich-text-email-content ul {
            list-style: none !important;
            padding-left: 28px !important;
            margin: 0 0 0.5em 0 !important;
        }
        
        .rich-text-email-content ul > li {
            list-style: none !important;
            padding-left: 28px !important;
            position: relative !important;
            min-height: 1.5em !important;
            line-height: 1.5 !important;
        }
        
        /* Default bullet style (disc) - Match editor exactly */
        .rich-text-email-content ul[data-list-style="disc"] > li::before,
        .rich-text-email-content ul:not([data-list-style]) > li::before {
            content: "•" !important;
            position: absolute !important;
            left: 10px !important;
            top: -6px !important;  /* Scales with font size (2px at 16px base) */
            font-weight: bold !important;
            font-size: 1.4em !important;  /* Scales with list item font size */
            line-height: 1.5 !important;
        }
        
        /* Circle style - Match editor exactly */
        /* Editor uses position: relative with top: -0.1875em in flexbox baseline context */
        /* In absolute positioning, we need to account for line-height (1.5em) and baseline alignment */
        /* The circle bullet (0.5em font-size) needs to be positioned to align with text baseline */
        /* Scales with font size to maintain proper alignment */
        .rich-text-email-content ul[data-list-style="circle"] > li::before {
            content: "○" !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.75em !important;  /* Scales with font size to maintain baseline alignment */
            font-weight: bold !important;
            font-size: 0.55em !important;  /* Scales with list item font size */
        }
        
        /* Square style - Match editor exactly */
        /* Editor uses position: relative with top: -0.1875em in flexbox baseline context */
        /* In absolute positioning, we need to account for line-height (1.5em) and baseline alignment */
        /* The square bullet (0.46em font-size) is slightly smaller than circle, needs more vertical adjustment */
        /* Scales with font size to maintain proper alignment */
        .rich-text-email-content ul[data-list-style="square"] > li::before {
            content: "■" !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.8em !important;  /* Scales with font size to maintain baseline alignment */
            font-weight: bold !important;
            font-size: 0.50em !important;  /* Scales with list item font size */
        }
        
        /* Centered bullet lists */
        .rich-text-email-content ul[style*="text-align: center"] > li,
        .rich-text-email-content ul[style*="text-align:center"] > li {
            padding-left: 0 !important;
            list-style: disc inside !important;
        }
        
        .rich-text-email-content ul[style*="text-align: center"] > li::before,
        .rich-text-email-content ul[style*="text-align:center"] > li::before {
            content: none !important;
        }
        
        /* Right-aligned bullet lists */
        .rich-text-email-content ul[style*="text-align: right"] > li,
        .rich-text-email-content ul[style*="text-align:right"] > li {
            padding-left: 0 !important;
            list-style: disc inside !important;
        }
        
        .rich-text-email-content ul[style*="text-align: right"] > li::before,
        .rich-text-email-content ul[style*="text-align:right"] > li::before {
            content: none !important;
        }
        
        /* Justify-aligned bullet lists */
        .rich-text-email-content ul[style*="text-align: justify"] > li,
        .rich-text-email-content ul[style*="text-align:justify"] > li {
            padding-left: 0 !important;
            list-style: disc inside !important;
        }
        
        .rich-text-email-content ul[style*="text-align: justify"] > li::before,
        .rich-text-email-content ul[style*="text-align:justify"] > li::before {
            content: none !important;
        }
        
        /* Ordered List Styles - Match editor styles exactly */
        .rich-text-email-content ol {
            list-style: none !important;
            padding-left: 28px !important;
            margin: 0 0 0.5em 0 !important;
            counter-reset: item !important;
        }
        
        .rich-text-email-content ol > li {
            list-style: none !important;
            padding-left: 28px !important;
            position: relative !important;
            counter-increment: item !important;
            min-height: 1.5em !important;
            line-height: 1.5 !important;
        }
        
        /* Default decimal style - Match editor exactly */
        /* Editor uses top: 0.46875em to match other ordered list styles - scales with font size */
        .rich-text-email-content ol[data-list-style="decimal"] > li::before,
        .rich-text-email-content ol:not([data-list-style]) > li::before {
            content: counter(item) "." !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.5px !important;  /* Scales with font size (7.5px at 16px base) */
            font-weight: 600 !important;
            font-size: 1em !important;  /* Match list item font size - scales dynamically */
            line-height: 1.5 !important;
        }
        
        /* Lower Alpha style - Match editor exactly */
        .rich-text-email-content ol[data-list-style="lower-alpha"] > li::before {
            content: counter(item, lower-alpha) "." !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.5px !important;  /* Scales with font size (7px at 16px base) */
            font-weight: 600 !important;
            font-size: 1em !important;  /* Match list item font size - scales dynamically */
        }
        
        /* Lower Greek style - Match editor exactly */
        .rich-text-email-content ol[data-list-style="lower-greek"] > li::before {
            content: counter(item, lower-greek) "." !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.3px !important;  /* Scales with font size (7px at 16px base) */
            font-weight: 600 !important;
            font-size: 1em !important;  /* Match list item font size - scales dynamically */
        }
        
        /* Lower Roman style - Match editor exactly */
        .rich-text-email-content ol[data-list-style="lower-roman"] > li::before {
            content: counter(item, lower-roman) "." !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.5px !important;  /* Scales with font size (8px at 16px base) */
            font-weight: 600 !important;
            font-size: 1em !important;  /* Match list item font size - scales dynamically */
        }
        
        /* Upper Alpha style - Match editor exactly */
        .rich-text-email-content ol[data-list-style="upper-alpha"] > li::before {
            content: counter(item, upper-alpha) "." !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.6px !important;  /* Scales with font size (8.3px at 16px base) */
            font-weight: 600 !important;
            font-size: 0.92em !important;  /* Match list item font size - scales dynamically */
        }
        
        /* Upper Roman style - Match editor exactly */
        .rich-text-email-content ol[data-list-style="upper-roman"] > li::before {
            content: counter(item, upper-roman) "." !important;
            position: absolute !important;
            left: 10px !important;
            top: 0.5px !important;  /* Scales with font size (8.3px at 16px base) */
            font-weight: 600 !important;
            font-size: 1em !important;  /* Match list item font size - scales dynamically */
        }
        
        /* Centered ordered lists */
        .rich-text-email-content ol[style*="text-align: center"] > li,
        .rich-text-email-content ol[style*="text-align:center"] > li {
            padding-left: 0 !important;
            list-style: decimal inside !important;
        }
        
        .rich-text-email-content ol[style*="text-align: center"] > li::before,
        .rich-text-email-content ol[style*="text-align:center"] > li::before {
            content: none !important;
        }
        
        /* Right-aligned ordered lists */
        .rich-text-email-content ol[style*="text-align: right"] > li,
        .rich-text-email-content ol[style*="text-align:right"] > li {
            padding-left: 0 !important;
            list-style: decimal inside !important;
        }
        
        .rich-text-email-content ol[style*="text-align: right"] > li::before,
        .rich-text-email-content ol[style*="text-align:right"] > li::before {
            content: none !important;
        }
        
        /* Justify-aligned ordered lists */
        .rich-text-email-content ol[style*="text-align: justify"] > li,
        .rich-text-email-content ol[style*="text-align:justify"] > li {
            padding-left: 0 !important;
            list-style: decimal inside !important;
        }
        
        .rich-text-email-content ol[style*="text-align: justify"] > li::before,
        .rich-text-email-content ol[style*="text-align:justify"] > li::before {
            content: none !important;
        }
        
        /* Blockquote styles - Gmail compatible */
        .rich-text-email-content blockquote {
            margin: 0.9em 0;
            padding: 10px 24px 36px 20px;
            display: block;
            width: 100%;
            border-left: 6px solid #eef0f2;
            background-color: #f6f7f8;
            color: #6F7B88 !important;
            line-height: 1.6;
            font-weight: 600;
            overflow: hidden;
            box-sizing: border-box;
        }
        
        /* Quote icon styles - Gmail compatible float approach */
        /* Preview shows quote at left: 20px, top: 10px - we achieve this with padding and float */
        /* Quote icon floats at top, text appears below it with margin-top */
        /* Font-size slightly larger than normal (52px instead of 48px) for better visibility */
        .rich-text-email-content blockquote .quote-icon {
            float: left;
            font-size: 52px;
            line-height: 1.0;
            color: #9AA6B2;
            font-weight: 550;
            font-family: Georgia, Times, "Times New Roman", sans-serif;
            margin-right: 12px;
            margin-top: 0;
            margin-bottom: 0;
            padding: 0;
            display: block;
            width: 48px;
            text-align: left;
            vertical-align: top;
            clear: left;
        }
        
        /* Blockquote paragraphs - flow next to floated quote icon, aligned with quote icon */
        .rich-text-email-content blockquote p {
            margin: 0;
            padding: 0;
            overflow: hidden;
            display: block;
            line-height: 1.6;
        }
        
        /* First paragraph - add margin-top to push text down BELOW the quote icon */
        /* Quote icon is 48px font-size, so text needs significant margin-top to appear clearly below it */
        /* Text should appear below quote icon, not aligned at baseline */
        .rich-text-email-content blockquote p:first-child {
            margin-top: 38px !important;
            padding-top: 0;
            margin-bottom: 0;
            margin-left: 0;
            margin-right: 0;
        }
        
        /* Horizontal rule styles */
        .rich-text-email-content hr {
            border: 0;
            border-top: 1px solid #DADDE1;
            margin: 12px 0;
            width: 100%;
        }
        
        /* Preserve data-email-canvas-root styling */
        .rich-text-email-content [data-email-canvas-root="true"] {
            margin-left: auto;
            margin-right: auto;
            display: block;
        }
        
        /* Preserve inline styles on spans and divs */
        .rich-text-email-content span[style],
        .rich-text-email-content div[style],
        .rich-text-email-content p[style],
        .rich-text-email-content h1[style],
        .rich-text-email-content h2[style],
        .rich-text-email-content h3[style],
        .rich-text-email-content h4[style],
        .rich-text-email-content h5[style],
        .rich-text-email-content h6[style] {
            /* All inline styles are preserved via style attribute */
        }
        
        /* Email client compatibility: Ensure text-align inline styles work */
        /* For elements with inline text-align styles, ensure they're respected */
        .rich-text-email-content p[style*="text-align: center"],
        .rich-text-email-content p[style*="text-align:center"],
        .rich-text-email-content h1[style*="text-align: center"],
        .rich-text-email-content h1[style*="text-align:center"],
        .rich-text-email-content h2[style*="text-align: center"],
        .rich-text-email-content h2[style*="text-align:center"],
        .rich-text-email-content h3[style*="text-align: center"],
        .rich-text-email-content h3[style*="text-align:center"],
        .rich-text-email-content h4[style*="text-align: center"],
        .rich-text-email-content h4[style*="text-align:center"],
        .rich-text-email-content h5[style*="text-align: center"],
        .rich-text-email-content h5[style*="text-align:center"],
        .rich-text-email-content h6[style*="text-align: center"],
        .rich-text-email-content h6[style*="text-align:center"],
        .rich-text-email-content div[style*="text-align: center"],
        .rich-text-email-content div[style*="text-align:center"] {
            text-align: center !important;
        }
        
        .rich-text-email-content p[style*="text-align: right"],
        .rich-text-email-content p[style*="text-align:right"],
        .rich-text-email-content h1[style*="text-align: right"],
        .rich-text-email-content h1[style*="text-align:right"],
        .rich-text-email-content h2[style*="text-align: right"],
        .rich-text-email-content h2[style*="text-align:right"],
        .rich-text-email-content h3[style*="text-align: right"],
        .rich-text-email-content h3[style*="text-align:right"],
        .rich-text-email-content h4[style*="text-align: right"],
        .rich-text-email-content h4[style*="text-align:right"],
        .rich-text-email-content h5[style*="text-align: right"],
        .rich-text-email-content h5[style*="text-align:right"],
        .rich-text-email-content h6[style*="text-align: right"],
        .rich-text-email-content h6[style*="text-align:right"],
        .rich-text-email-content div[style*="text-align: right"],
        .rich-text-email-content div[style*="text-align:right"] {
            text-align: right !important;
        }
        
        .rich-text-email-content p[style*="text-align: left"],
        .rich-text-email-content p[style*="text-align:left"],
        .rich-text-email-content h1[style*="text-align: left"],
        .rich-text-email-content h1[style*="text-align:left"],
        .rich-text-email-content h2[style*="text-align: left"],
        .rich-text-email-content h2[style*="text-align:left"],
        .rich-text-email-content h3[style*="text-align: left"],
        .rich-text-email-content h3[style*="text-align:left"],
        .rich-text-email-content h4[style*="text-align: left"],
        .rich-text-email-content h4[style*="text-align:left"],
        .rich-text-email-content h5[style*="text-align: left"],
        .rich-text-email-content h5[style*="text-align:left"],
        .rich-text-email-content h6[style*="text-align: left"],
        .rich-text-email-content h6[style*="text-align:left"],
        .rich-text-email-content div[style*="text-align: left"],
        .rich-text-email-content div[style*="text-align:left"] {
            text-align: left !important;
        }
        
        .rich-text-email-content p[style*="text-align: justify"],
        .rich-text-email-content p[style*="text-align:justify"],
        .rich-text-email-content h1[style*="text-align: justify"],
        .rich-text-email-content h1[style*="text-align:justify"],
        .rich-text-email-content h2[style*="text-align: justify"],
        .rich-text-email-content h2[style*="text-align:justify"],
        .rich-text-email-content h3[style*="text-align: justify"],
        .rich-text-email-content h3[style*="text-align:justify"],
        .rich-text-email-content h4[style*="text-align: justify"],
        .rich-text-email-content h4[style*="text-align:justify"],
        .rich-text-email-content h5[style*="text-align: justify"],
        .rich-text-email-content h5[style*="text-align:justify"],
        .rich-text-email-content h6[style*="text-align: justify"],
        .rich-text-email-content h6[style*="text-align:justify"],
        .rich-text-email-content div[style*="text-align: justify"],
        .rich-text-email-content div[style*="text-align:justify"] {
            text-align: justify !important;
        }
        
        /* Table cells - preserve inline text-align styles */
        .rich-text-email-content td[style*="text-align: center"],
        .rich-text-email-content td[style*="text-align:center"],
        .rich-text-email-content th[style*="text-align: center"],
        .rich-text-email-content th[style*="text-align:center"] {
            text-align: center !important;
        }
        
        .rich-text-email-content td[style*="text-align: right"],
        .rich-text-email-content td[style*="text-align:right"],
        .rich-text-email-content th[style*="text-align: right"],
        .rich-text-email-content th[style*="text-align:right"] {
            text-align: right !important;
        }
        
        .rich-text-email-content td[style*="text-align: left"],
        .rich-text-email-content td[style*="text-align:left"],
        .rich-text-email-content th[style*="text-align: left"],
        .rich-text-email-content th[style*="text-align:left"] {
            text-align: left !important;
        }
        
        .rich-text-email-content td[style*="text-align: justify"],
        .rich-text-email-content td[style*="text-align:justify"],
        .rich-text-email-content th[style*="text-align: justify"],
        .rich-text-email-content th[style*="text-align:justify"] {
            text-align: justify !important;
        }
        
        /* Email container and footer overflow prevention */
        .email-container {
            max-width: 100% !important;
            overflow-x: hidden !important;
        }
        /* Rich-text footer: full width in received mail (Gmail etc.) - table width 100% */
        .pabbly-richtext-footer-inner {
            width: 100% !important;
            max-width: 100% !important;
        }
        
        @media only screen and (max-width: 600px) {
    .email-container {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
    }
    .rich-text-email-content {
        padding: 16px !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
    }
    /* Images responsive */
    .rich-text-email-content img {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
    }
    /* Table cells 4px padding on mobile */
    .rich-text-email-content td,
    .rich-text-email-content th {
        padding: 4px !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
        max-width: 100% !important;
        overflow: hidden !important;
        min-width: 0 !important;
    }
    
    /* Ensure all content inside table cells wraps on mobile */
    .rich-text-email-content td *,
    .rich-text-email-content th * {
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
        white-space: normal !important;
    }
    
    /* Table should use auto layout on mobile for better wrapping */
    .rich-text-email-content table {
        table-layout: auto !important;
        width: 100% !important;
        max-width: 100% !important;
    }
    /* Footer links - stack vertically on mobile */
    .footer-links-container {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
    }
    .footer-links-container .footer-link-text,
    .footer-links-container .footer-link,
    .footer-links-container .footer-separator {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 4px 0 !important;
        text-align: center !important;
        box-sizing: border-box !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
    }
    .footer-links-container .footer-separator {
        display: none !important;
    }
}

/* 480px breakpoint */
@media only screen and (max-width: 480px) {
    .rich-text-email-content td,
    .rich-text-email-content th {
        padding: 4px !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
        max-width: 100% !important;
        overflow: hidden !important;
        min-width: 0 !important;
    }
    
    /* Ensure all content inside table cells wraps on mobile */
    .rich-text-email-content td *,
    .rich-text-email-content th * {
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
        white-space: normal !important;
    }
    
    /* Table should use auto layout on mobile for better wrapping */
    .rich-text-email-content table {
        table-layout: auto !important;
        width: 100% !important;
        max-width: 100% !important;
    }
    /* Footer links - stack vertically on mobile */
    .footer-links-container {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
    }
    .footer-links-container .footer-link-text,
    .footer-links-container .footer-link,
    .footer-links-container .footer-separator {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 4px 0 !important;
        text-align: center !important;
        box-sizing: border-box !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
    }
    .footer-links-container .footer-separator {
        display: none !important;
    }
}

/* 375px breakpoint - tumhara mobile width */
@media only screen and (max-width: 375px) {
    .rich-text-email-content td,
    .rich-text-email-content th {
        padding: 4px !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
        max-width: 100% !important;
        overflow: hidden !important;
        min-width: 0 !important;
    }
    
    /* Ensure all content inside table cells wraps on mobile */
    .rich-text-email-content td *,
    .rich-text-email-content th * {
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
        white-space: normal !important;
    }
    
    /* Table should use auto layout on mobile for better wrapping */
    .rich-text-email-content table {
        table-layout: auto !important;
        width: 100% !important;
        max-width: 100% !important;
    }
    /* Footer links - stack vertically on mobile */
    .footer-links-container {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
    }
    .footer-links-container .footer-link-text,
    .footer-links-container .footer-link,
    .footer-links-container .footer-separator {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 4px 0 !important;
        text-align: center !important;
        box-sizing: border-box !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
    }
    .footer-links-container .footer-separator {
        display: none !important;
    }
}
        
    </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; max-width: 100%; overflow-x: hidden; ${globalBackgroundCSS};">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; max-width: 100%;">
        <tr>
            <td style="padding: 0; text-align: left;">
                <div class="email-container" style="width: 100%; max-width: 100%; margin: 0; ${contentBackgroundCSS}; overflow: hidden; overflow-x: hidden; box-sizing: border-box; text-align: left;">
                    <div class="rich-text-email-content">
                        ${contentHTML}
                        ${footerHTML}
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

// Generate empty email HTML
const generateEmptyEmailHTML = (emailTitle) =>
  generateCompleteEmailHTML(
    emailTitle,
    `
    <div style="height: 163px; margin: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #666; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <p>No content</p>
    </div>
`,
    'background-color: transparent;',
    'background-color: #ffffff;'
  );

// Get default inline styles for common HTML elements
// NOTE: Images are NOT included here because they need special handling based on actual width
// Images will be processed separately in the inlineStyles function to preserve actual width
const getDefaultInlineStyles = () => ({
  p: 'margin: 0.5em 0; text-align: left;',
  h1: 'margin: 1em 0 0.5em 0; font-weight: 600; text-align: left;',
  h2: 'margin: 1em 0 0.5em 0; font-weight: 600; text-align: left;',
  h3: 'margin: 1em 0 0.5em 0; font-weight: 600; text-align: left;',
  h4: 'margin: 1em 0 0.5em 0; font-weight: 600; text-align: left;',
  h5: 'margin: 1em 0 0.5em 0; font-weight: 600; text-align: left;',
  h6: 'margin: 1em 0 0.5em 0; font-weight: 600; text-align: left;',
  // Images are handled separately in inlineStyles function to preserve actual width
  // DO NOT set default max-width: 100% here as it will override actual width preservation
  // img: 'max-width: 100%; height: auto; display: inline-block; border: 0; outline: none; text-decoration: none;',
  a: 'color: #0066cc; text-decoration: underline;',
  // Don't set default styles for ul/ol here - they will be handled separately in inlineStyles
  hr: 'border: 0; border-top: 1px solid #DADDE1; margin: 12px 0; width: 100%;',
});

// Merge existing inline styles with new styles
const mergeStyles = (existingStyle, newStyle) => {
  if (!existingStyle) return newStyle;
  if (!newStyle) return existingStyle;
  // Remove duplicate properties from existing style
  const existingProps = existingStyle
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s);
  const newProps = newStyle
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s);
  const existingKeys = new Set(existingProps.map((p) => p.split(':')[0].trim().toLowerCase()));
  const merged = [...existingProps];
  newProps.forEach((prop) => {
    const key = prop.split(':')[0].trim().toLowerCase();
    if (!existingKeys.has(key)) {
      merged.push(prop);
    }
  });
  return merged.join('; ').replace(/;\s*;/g, ';');
};

// Inline styles and add email-compatible attributes
const inlineStyles = (htmlContent, defaultStyles) => {
  if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Process all elements to add default inline styles
  Object.keys(defaultStyles).forEach((tagName) => {
    const elements = tempDiv.querySelectorAll(tagName);
    elements.forEach((element) => {
      const existingStyle = element.getAttribute('style') || '';
      const defaultStyle = defaultStyles[tagName];
      const mergedStyle = mergeStyles(existingStyle, defaultStyle);
      element.setAttribute('style', mergedStyle);
    });
  });

  // Handle images - ensure src attribute is preserved and images are email-compatible
  // Gmail requires explicit width attributes and proper styling for full-width images
  // Editor container width is 600px (desktop), so we check if image is full width
  // When image is resized to full width in layout (close to 600px), export as 100% width
  // When image is resized smaller, export with actual resized dimensions
  const EDITOR_CONTAINER_WIDTH = 1070; // Desktop editor container width
  const FULL_WIDTH_TOLERANCE = 2; // Allow 2px tolerance (598px or more = full width, exports as 100%)
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    // Ensure src attribute exists and is valid
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (src) {
      // Preserve src attribute
      img.setAttribute('src', src);
      // Remove data-src if src is set
      if (img.hasAttribute('data-src') && img.getAttribute('src')) {
        img.removeAttribute('data-src');
      }
    } else {
      // If no src, try to get from data attributes or remove the image
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) {
        img.setAttribute('src', dataSrc);
        img.removeAttribute('data-src');
      } else {
        // If still no src, add a placeholder or remove
        console.warn('Image without src attribute found, removing or adding placeholder');
        // Option: add placeholder
        img.setAttribute(
          'src',
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E"
        );
        img.setAttribute('alt', 'Image not available');
      }
    }

    // Ensure alt attribute exists for email compatibility
    if (!img.hasAttribute('alt')) {
      img.setAttribute('alt', '');
    }

    // Get existing style to check for width settings
    const existingStyle = img.getAttribute('style') || '';

    // DEBUG: Log image attributes to understand what TipTap outputs
    // Enable this temporarily to debug width detection issues
    // Set DEBUG_IMAGE_WIDTH to true in browser console or uncomment the console.log below
    // const DEBUG_IMAGE_WIDTH = window.location.search.includes('debug=image');
    // if (DEBUG_IMAGE_WIDTH) {
    //   console.log('Image element:', {
    //     widthAttr: img.getAttribute('width'),
    //     heightAttr: img.getAttribute('height'),
    //     style: existingStyle,
    //     src: img.getAttribute('src')?.substring(0, 50),
    //     outerHTML: img.outerHTML.substring(0, 300),
    //     parentHTML: parentDiv ? parentDiv.outerHTML.substring(0, 200) : 'no parent'
    //   });
    // }

    // Check if image should be full width based on actual pixel width
    // Editor container width is 600px (desktop)
    // If image is resized to full width (>= 598px), export as 100% width
    // If image is resized smaller (< 598px), export with actual resized dimensions

    // Method 1: Get pixel width from width attribute (TipTap stores width as number in width attribute)
    // TipTap's renderHTML outputs width as a number in the width attribute (e.g., width="500")
    const widthAttr = img.getAttribute('width');
    let pixelWidth = null;

    // Check width attribute first (this is how TipTap stores image width in HTML output)
    if (widthAttr) {
      // TipTap outputs width as a number string (e.g., "500", "600", not "500px")
      // Remove any 'px' suffix if present (shouldn't be, but safety check)
      const widthStr = widthAttr.toString().replace(/px/gi, '').trim();
      const widthNum = parseInt(widthStr, 10);
      if (!Number.isNaN(widthNum) && widthNum > 0) {
        pixelWidth = widthNum;
      }
    }

    // Method 2: Extract pixel width from inline style (e.g., "width: 600px" or "width: 599px")
    // Sometimes width might be in style attribute instead of width attribute
    if (pixelWidth === null || pixelWidth === 0) {
      const widthMatch = existingStyle.match(/width\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
      if (widthMatch && widthMatch[1]) {
        const styleWidth = parseFloat(widthMatch[1]);
        if (!Number.isNaN(styleWidth) && styleWidth > 0) {
          pixelWidth = styleWidth;
        }
      }
    }

    // Method 3: Check parent div style (should NOT be used for width detection)
    // TipTap wraps images in div with width: 100% for alignment, but this is NOT the image width
    const parentDiv = img.closest('div');
    const parentStyle = parentDiv ? parentDiv.getAttribute('style') || '' : '';
    
    // Extract alignment from parent div's text-align style
    let imageAlignment = 'left'; // default
    if (parentStyle) {
      const alignMatch = parentStyle.match(/text-align\s*:\s*([^;]+)/i);
      if (alignMatch && alignMatch[1]) {
        const alignValue = alignMatch[1].trim();
        if (alignValue === 'center' || alignValue === 'right' || alignValue === 'left') {
          imageAlignment = alignValue;
        }
      }
    }
    
    // Also check if image is in a table cell and get cell alignment
    const tableCell = img.closest('td, th');
    if (tableCell) {
      const cellStyle = tableCell.getAttribute('style') || '';
      const cellAlignMatch = cellStyle.match(/text-align\s*:\s*([^;]+)/i);
      if (cellAlignMatch && cellAlignMatch[1]) {
        const cellAlignValue = cellAlignMatch[1].trim();
        if (cellAlignValue === 'center' || cellAlignValue === 'right' || cellAlignValue === 'left') {
          imageAlignment = cellAlignValue;
        }
      }
    }

    // DO NOT use parent div width for image width detection
    // Parent div's width: 100% is for alignment only, NOT for image sizing

    // Method 4: Check for width: 100% DIRECTLY on image (not on parent div)
    // IMPORTANT: TipTap wraps images in div with width: 100% for alignment, but this doesn't mean image is full width
    // We ONLY check image's own style/attribute, NOT parent div's width: 100%
    const hasPercentageWidth =
      existingStyle.includes('width: 100%') ||
      existingStyle.includes('width:100%') ||
      img.getAttribute('width') === '100%';

    // Method 5: Check if image is inside a table cell
    // ALL images in table cells should be responsive and scale to 100% width on mobile
    let isTableImage = false;
    let isTableImageFullWidth = false;
    // tableCell already defined above when checking alignment
    if (tableCell) {
      isTableImage = true;
      // Find the table containing this cell
      const table = tableCell.closest('table');
      if (table && pixelWidth !== null && pixelWidth > 0) {
        // Count columns in first row
        const firstRow = table.querySelector('tr');
        const columnCount = firstRow ? firstRow.querySelectorAll('td, th').length : 0;

        if (columnCount > 0) {
          // Calculate column width percentage
          const columnWidthPercent = 100 / columnCount;

          // Calculate maximum available width in the cell
          // Table width is 100% of container (600px), so column width = 600px * (columnWidthPercent / 100)
          // Cell padding is 12px on all sides
          // Cell border is 1px on each side = 2px total horizontal border
          const CELL_PADDING_HORIZONTAL = 24; // 12px left + 12px right
          const CELL_BORDER_HORIZONTAL = 2; // 1px left + 1px right
          const maxColumnWidth =
            (EDITOR_CONTAINER_WIDTH * columnWidthPercent) / 100 -
            CELL_PADDING_HORIZONTAL -
            CELL_BORDER_HORIZONTAL;

          // If image width is close to or equal to the maximum column width, treat it as full-width
          // Use tolerance to account for rounding differences
          const COLUMN_WIDTH_TOLERANCE = 5; // Allow 5px tolerance for table column width detection
          if (pixelWidth >= maxColumnWidth - COLUMN_WIDTH_TOLERANCE) {
            isTableImageFullWidth = true;
          }
        }
      }
    }

    // Determine if image is full width
    // CRITICAL RULE: Image is full width ONLY if:
    // (1) Image has explicit 100% width in its own style/attribute, OR
    // (2) Image's pixel width >= (EDITOR_CONTAINER_WIDTH - TOLERANCE) i.e., >= 598px
    //
    // NOTE: Table images that reach max column width are handled separately - they fill the column, not the full email width
    //
    // We DO NOT check parent div's width: 100% because TipTap always wraps images in div with width: 100% for alignment
    // Parent div's width: 100% is for alignment, NOT for determining image width
    //
    // Export behavior:
    // - 600px width attribute = full width → exports as 100% width (width: 100%, width="600")
    // - 599px width attribute = full width → exports as 100% width (width: 100%, width="600")
    // - 598px width attribute = full width → exports as 100% width (width: 100%, width="600")
    // - 597px width attribute = smaller → exports with actual width (width: 597px, width="597")
    // - 500px width attribute = smaller → exports with actual width (width: 500px, width="500")
    // - 400px width attribute = smaller → exports with actual width (width: 400px, width="400")
    // - Table image at max column width = full width of column only (width: 100% of cell, not full email)
    // - NO width attribute = preserve responsive behavior (max-width: 100%, no width attribute)
    //
    // Key point: If pixelWidth is null (no width attribute), we do NOT assume full width
    // Only if pixelWidth exists and is >= 598px, we treat it as full width and export as 100%
    // Table images are handled separately to fill only their column
    const isFullWidth =
      hasPercentageWidth ||
      (pixelWidth !== null && pixelWidth >= EDITOR_CONTAINER_WIDTH - FULL_WIDTH_TOLERANCE);

    // For Gmail compatibility, we need both style and width attribute
    let imgStyle;
    let finalWidth = null;
    
    // For email clients, images need proper alignment handling
    // Use display: block with margin: 0 auto for center, or float for left/right
    // But for better email client support, we'll use table-based alignment or inline-block with text-align on parent
    let alignmentStyle = '';
    if (imageAlignment === 'center') {
      // Center alignment: use margin: 0 auto with display: block
      alignmentStyle = 'display: block !important; margin-left: auto !important; margin-right: auto !important;';
    } else if (imageAlignment === 'right') {
      // Right alignment: use margin-left: auto with display: block
      alignmentStyle = 'display: block !important; margin-left: auto !important; margin-right: 0 !important;';
    } else {
      // Left alignment (default): use margin: 0
      alignmentStyle = 'display: block !important; margin-left: 0 !important; margin-right: auto !important;';
    }

    // Handle table images - ALL images in table cells should be responsive
    if (isTableImage) {
      // ALL table cell images should scale to 100% width on mobile
      // For desktop, preserve original width if it exists, but ensure mobile responsiveness
      if (isTableImageFullWidth) {
        // Table image at max column width - fill the table cell/column only
        // Use 100% width to fill the cell, but don't break out of table structure
        // For table cells, alignment is handled by the cell's text-align, so use inline-block
        const tableAlignmentStyle = imageAlignment === 'center' 
          ? 'display: block !important; margin-left: auto !important; margin-right: auto !important;'
          : imageAlignment === 'right'
          ? 'display: block !important; margin-left: auto !important; margin-right: 0 !important;'
          : 'display: block !important; margin-left: 0 !important; margin-right: auto !important;';
        imgStyle = mergeStyles(
          existingStyle,
          `width: 100% !important; max-width: 100% !important; height: auto !important; ${tableAlignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`
        );
        // Don't set a fixed pixel width - let it be 100% of the cell
        // The table cell will constrain it to the column width
        finalWidth = null; // Let CSS handle the width via 100%
      } else if (pixelWidth !== null && pixelWidth > 0) {
        // Smaller table images - preserve desktop width but ensure mobile responsiveness
        // Apply max-width: 100% for mobile scaling, but keep width for desktop
        // Preserve original width for desktop, but add max-width: 100% for mobile
        const roundedWidth = Math.round(pixelWidth);
        // Remove any existing width/max-width from existingStyle to avoid conflicts
        let cleanExistingStyle = existingStyle
          .replace(/width\s*:\s*[^;]+;?/gi, '')
          .replace(/max-width\s*:\s*[^;]+;?/gi, '')
          .replace(/;\s*;/g, ';')
          .trim();
        cleanExistingStyle = cleanExistingStyle.replace(/^;\s*|\s*;$/g, '').trim();

        // Set width for desktop, but max-width: 100% ensures mobile scaling
        // Use !important to override any conflicting styles
        // For table cells, use proper alignment
        const tableAlignmentStyle = imageAlignment === 'center' 
          ? 'display: block !important; margin-left: auto !important; margin-right: auto !important;'
          : imageAlignment === 'right'
          ? 'display: block !important; margin-left: auto !important; margin-right: 0 !important;'
          : 'display: block !important; margin-left: 0 !important; margin-right: auto !important;';
        const newImageStyle = `width: ${roundedWidth}px !important; max-width: 100% !important; height: auto !important; ${tableAlignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`;
        imgStyle = cleanExistingStyle ? `${newImageStyle} ${cleanExistingStyle}` : newImageStyle;
        // Set width attribute for email client compatibility (desktop)
        finalWidth = roundedWidth.toString();
      } else {
        // No explicit width - use 100% for full responsiveness
        // For table cells, use proper alignment
        const tableAlignmentStyle = imageAlignment === 'center' 
          ? 'display: block !important; margin-left: auto !important; margin-right: auto !important;'
          : imageAlignment === 'right'
          ? 'display: block !important; margin-left: auto !important; margin-right: 0 !important;'
          : 'display: block !important; margin-left: 0 !important; margin-right: auto !important;';
        imgStyle = mergeStyles(
          existingStyle,
          `width: 100% !important; max-width: 100% !important; height: auto !important; ${tableAlignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`
        );
        finalWidth = null;
      }
      // Remove height attribute to allow auto scaling
      if (img.hasAttribute('height')) {
        img.removeAttribute('height');
      }
    } else if (isFullWidth) {
      // Full width image (outside table) - Gmail compatible styling
      // Gmail requires explicit width attribute and !important styles
      // Apply alignment styles
      imgStyle = mergeStyles(
        existingStyle,
        `width: 100% !important; max-width: 100% !important; height: auto !important; ${alignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`
      );
      // Set width attribute for Gmail (Gmail respects width attribute more than CSS)
      // Use 600px as standard email width, but Gmail will scale it to container
      finalWidth = '600';
      // Remove height attribute to allow auto scaling
      if (img.hasAttribute('height')) {
        img.removeAttribute('height');
      }
    } else {
      // Image is NOT full width - preserve actual resized dimensions (less than 598px or no width attribute)
      // CRITICAL: Always preserve actual width if it exists, even if it's < 598px
      // This ensures images resized smaller than full width export with their actual dimensions

      // Check if image has explicit pixel width
      const hasExplicitWidth = pixelWidth !== null && pixelWidth > 0;

      if (hasExplicitWidth) {
        // Image has explicit pixel width (e.g., 598px, 500px, 400px, etc.) - preserve it EXACTLY
        // DO NOT make it full width - preserve actual size
        const roundedWidth = Math.round(pixelWidth);

        // Remove any existing width/max-width from existingStyle to avoid conflicts
        // We want to explicitly set the width, so remove any existing width-related styles first
        let cleanExistingStyle = existingStyle
          .replace(/width\s*:\s*[^;]+;?/gi, '')
          .replace(/max-width\s*:\s*[^;]+;?/gi, '')
          .replace(/;\s*;/g, ';')
          .trim();
        cleanExistingStyle = cleanExistingStyle.replace(/^;\s*|\s*;$/g, '').trim();

        // Use explicit pixel width in style for desktop, but max-width: 100% for mobile responsiveness
        // This allows images to scale down on mobile while maintaining desktop size
        // Apply alignment styles
        const newImageStyle = `width: ${roundedWidth}px !important; max-width: 100% !important; height: auto !important; ${alignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`;
        imgStyle = cleanExistingStyle ? `${newImageStyle} ${cleanExistingStyle}` : newImageStyle;
        // Set width attribute to actual pixel width (Gmail respects width attribute for desktop)
        // max-width: 100% in inline style ensures mobile scaling
        finalWidth = roundedWidth.toString();
        // Preserve height if exists for aspect ratio
        const existingHeight = img.getAttribute('height');
        if (existingHeight) {
          img.setAttribute('height', existingHeight);
        } else {
          // Remove height to allow auto scaling based on width
          img.removeAttribute('height');
        }
      } else {
        // No explicit pixel width found - image doesn't have width attribute or style
        // This should NOT happen if TipTap is working correctly, but handle it gracefully
        // Check if image has width attribute that we might have missed
        const existingWidthAttr = img.getAttribute('width');
        const existingHeight = img.getAttribute('height');

        if (existingWidthAttr && existingWidthAttr !== '100%') {
          // Try to parse the width attribute again (might be in a different format)
          const widthStr = existingWidthAttr.toString().replace(/px/gi, '').trim();
          const widthNum = parseInt(widthStr, 10);

          if (!Number.isNaN(widthNum) && widthNum > 0) {
            // We found a valid width - use it
            const roundedWidth = Math.round(widthNum);
            if (roundedWidth >= EDITOR_CONTAINER_WIDTH - FULL_WIDTH_TOLERANCE) {
              // This should have been caught above, but handle it as full width (export as 100%)
              // Apply alignment styles
              imgStyle = mergeStyles(
                existingStyle,
                `width: 100% !important; max-width: 100% !important; height: auto !important; ${alignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`
              );
              finalWidth = '600';
            } else {
              // Preserve actual width for desktop, but allow mobile scaling
              // Remove any existing width/max-width from existingStyle to avoid conflicts
              let cleanExistingStyle = existingStyle
                .replace(/width\s*:\s*[^;]+;?/gi, '')
                .replace(/max-width\s*:\s*[^;]+;?/gi, '')
                .replace(/;\s*;/g, ';')
                .trim();
              cleanExistingStyle = cleanExistingStyle.replace(/^;\s*|\s*;$/g, '').trim();

              // Set width for desktop, but max-width: 100% for mobile responsiveness
              // Apply alignment styles
              const newImageStyle = `width: ${roundedWidth}px !important; max-width: 100% !important; height: auto !important; ${alignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`;
              imgStyle = cleanExistingStyle
                ? `${newImageStyle} ${cleanExistingStyle}`
                : newImageStyle;
              finalWidth = roundedWidth.toString();
            }
          } else {
            // Invalid width attribute - remove it and use natural sizing with mobile responsiveness
            // Apply alignment styles
            imgStyle = mergeStyles(
              existingStyle,
              `width: 100% !important; max-width: 100% !important; height: auto !important; ${alignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`
            );
            finalWidth = null;
            if (img.hasAttribute('width')) {
              img.removeAttribute('width');
            }
          }
        } else {
          // No width attribute at all - this means image was inserted without explicit width
          // Use responsive styling for full mobile compatibility
          // Apply alignment styles
          imgStyle = mergeStyles(
            existingStyle,
            `width: 100% !important; max-width: 100% !important; height: auto !important; ${alignmentStyle} border: 0 !important; outline: none !important; text-decoration: none !important;`
          );
          finalWidth = null;
          // Remove width attribute if it exists but is invalid
          if (img.hasAttribute('width') && img.getAttribute('width') === '100%') {
            img.removeAttribute('width');
          }
        }

        if (existingHeight) {
          img.setAttribute('height', existingHeight);
        } else {
          img.removeAttribute('height');
        }
      }
    }

    // Set the style attribute
    img.setAttribute('style', imgStyle);

    // Set or remove width attribute based on finalWidth
    // For table images at max column width, we don't set a fixed width attribute
    // so it can be 100% of the cell width via CSS
    if (finalWidth) {
      img.setAttribute('width', finalWidth);
    } else if (isTableImage && isTableImageFullWidth) {
      // For table images at max width, remove width attribute to let CSS 100% handle it
      if (img.hasAttribute('width')) {
        img.removeAttribute('width');
      }
    } else if (!isTableImage && img.hasAttribute('width')) {
      // For non-table images without finalWidth, remove width attribute
      img.removeAttribute('width');
    }
    // Note: For smaller table images, we keep the width attribute for desktop
    // but max-width: 100% in inline style ensures mobile responsiveness

    // For all images, ensure parent div has proper alignment styling for email clients
    // Email clients need text-align on parent div for proper image alignment
    if (parentDiv) {
      const parentDivStyle = parentDiv.getAttribute('style') || '';
      // Preserve existing text-align if present, otherwise add alignment
      let parentStyleToAdd = 'width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important;';
      
      // Only add text-align if not already present
      if (!parentDivStyle.includes('text-align')) {
        parentStyleToAdd += ` text-align: ${imageAlignment} !important;`;
      }
      
      const mergedParentStyle = mergeStyles(parentDivStyle, parentStyleToAdd);
      parentDiv.setAttribute('style', mergedParentStyle);
    }
    
    // For table cells containing images, ensure cell has proper text-align
    if (tableCell) {
      const cellStyle = tableCell.getAttribute('style') || '';
      // Only add text-align if not already present
      if (!cellStyle.includes('text-align')) {
        const cellStyleToAdd = `text-align: ${imageAlignment} !important;`;
        const mergedCellStyle = mergeStyles(cellStyle, cellStyleToAdd);
        tableCell.setAttribute('style', mergedCellStyle);
      }
    }
  });

  // Handle tables - email clients require explicit attributes
  const tables = tempDiv.querySelectorAll('table');
  tables.forEach((table) => {
    // Add required attributes for email clients
    if (!table.hasAttribute('width')) {
      table.setAttribute('width', '100%');
    }
    if (!table.hasAttribute('cellspacing')) {
      table.setAttribute('cellspacing', '0');
    }
    if (!table.hasAttribute('cellpadding')) {
      table.setAttribute('cellpadding', '0');
    }
    if (!table.hasAttribute('border')) {
      table.setAttribute('border', '0');
    }

    // Count columns in first row to ensure equal width distribution
    const firstRow = table.querySelector('tr');
    const columnCount = firstRow ? firstRow.querySelectorAll('td, th').length : 0;
    const columnWidth = columnCount > 0 ? `${Math.floor(100 / columnCount)}%` : 'auto';

    // Ensure table has proper inline styles with fixed table-layout for equal widths
    const existingStyle = table.getAttribute('style') || '';
    const tableStyle = mergeStyles(
      existingStyle,
      `border-collapse: collapse; table-layout: fixed; width: 100%; max-width: 100%; margin: 1rem 0; border: 1px solid #cccccc; background-color: #ffffff; overflow: hidden;`
    );
    table.setAttribute('style', tableStyle);

    // Process all table rows
    const rows = table.querySelectorAll('tr');
    rows.forEach((row) => {
      const rowStyle = row.getAttribute('style') || '';
      row.setAttribute('style', mergeStyles(rowStyle, 'display: table-row;'));

      // Process all cells - ensure equal width for all columns
      const cells = row.querySelectorAll('td, th');
      cells.forEach((cell, index) => {
        const isHeader = cell.tagName.toLowerCase() === 'th';
        const cellStyle = cell.getAttribute('style') || '';

        // Set equal width for all cells in the same column
        const widthStyle = columnCount > 0 ? `width: ${columnWidth};` : '';

        const defaultCellStyle = isHeader
          ? `${widthStyle} border: 1px solid #d0d0d0; padding: 12px 12px; text-align: left; vertical-align: middle; background-color: #f5f5f5; font-weight: 600; color: #333333; display: table-cell; box-sizing: border-box; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; white-space: normal; max-width: 100%; overflow: hidden;`
          : `${widthStyle} border: 1px solid #d0d0d0; padding: 12px 12px; text-align: left; vertical-align: middle; background-color: #ffffff; display: table-cell; box-sizing: border-box; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; white-space: normal; max-width: 100%; overflow: hidden;`;
        cell.setAttribute('style', mergeStyles(cellStyle, defaultCellStyle));

        // Process all child elements inside the cell to ensure proper text wrapping
        const cellChildren = cell.querySelectorAll('*');
        cellChildren.forEach((child) => {
          const childStyle = child.getAttribute('style') || '';
          const wrappingStyles = 'word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; max-width: 100%; white-space: normal;';
          child.setAttribute('style', mergeStyles(childStyle, wrappingStyles));
        });

        // Also set width attribute for email client compatibility
        if (columnCount > 0 && !cell.hasAttribute('width')) {
          cell.setAttribute('width', columnWidth);
        }

        // Ensure empty cells have content
        if (!cell.textContent || cell.textContent.trim() === '') {
          if (!cell.querySelector('*')) {
            cell.innerHTML = '&nbsp;';
          }
        }
      });
    });
  });

  // Handle ordered lists - inject markers directly into HTML for Gmail compatibility
  // Gmail has limited support for ::before pseudo-elements, so we inject markers as HTML
  const orderedLists = tempDiv.querySelectorAll('ol');
  orderedLists.forEach((ol) => {
    const existingStyle = ol.getAttribute('style') || '';
    const listStyle = ol.getAttribute('data-list-style') || 'decimal';

    // Remove any conflicting list-style or padding-left from existing style
    let olStyle = existingStyle
      .replace(/list-style\s*:\s*[^;]+;?/gi, '')
      .replace(/list-style-type\s*:\s*[^;]+;?/gi, '')
      .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
      .replace(/counter-reset\s*:\s*[^;]+;?/gi, '')
      .replace(/;\s*;/g, ';')
      .trim();
    olStyle = olStyle.replace(/^;\s*|\s*;$/g, '').trim();

    // Add required styles for ordered lists
    const requiredStyles = 'list-style: none !important; padding-left: 0 !important; margin: 0 0 0.5em 0;';
    const finalOlStyle = mergeStyles(olStyle, requiredStyles);
    ol.setAttribute('style', finalOlStyle);

    // Helper function to format number based on list style
    const formatNumber = (num, style) => {
      switch (style) {
        case 'lower-alpha':
          return String.fromCharCode(96 + num); // a, b, c...
        case 'upper-alpha':
          return String.fromCharCode(64 + num); // A, B, C...
        case 'lower-roman':
          return toRoman(num).toLowerCase();
        case 'upper-roman':
          return toRoman(num);
        case 'lower-greek':
          return toGreek(num);
        case 'decimal':
        default:
          return num.toString();
      }
    };

    // Helper function to convert number to Roman numeral
    const toRoman = (num) => {
      const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
      const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
      let result = '';
      for (let i = 0; i < values.length; i += 1) {
        while (num >= values[i]) {
          result += numerals[i];
          num -= values[i];
        }
      }
      return result;
    };

    // Helper function to convert number to Greek letter
    const toGreek = (num) => {
      const greekLetters = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'];
      if (num <= greekLetters.length) {
        return greekLetters[num - 1];
      }
      return num.toString();
    };

    // Inject markers directly into list items
    let itemCounter = 0;
    const listItems = ol.querySelectorAll('li');
    listItems.forEach((li) => {
      itemCounter += 1;
      const liStyle = li.getAttribute('style') || '';
      
      // Check if marker already exists (to avoid duplicates)
      const hasMarker = li.querySelector('.list-marker') !== null;
      if (!hasMarker) {
        // Get the formatted number
        const number = formatNumber(itemCounter, listStyle);
        const markerText = `${number}.`;

        // Use table-based approach for better Gmail compatibility
        // Wrap content in a table with marker in first cell and content in second cell
        const table = document.createElement('table');
        table.setAttribute('cellpadding', '0');
        table.setAttribute('cellspacing', '0');
        table.setAttribute('border', '0');
        table.setAttribute('style', 'width: 100%; border-collapse: collapse;');
        
        const tbody = document.createElement('tbody');
        const tr = document.createElement('tr');
        
        // Marker cell - align to baseline with slight upward adjustment for perfect alignment
        const markerCell = document.createElement('td');
        markerCell.setAttribute('style', 'vertical-align: baseline; padding: 0; padding-right: 8px; width: 30px; text-align: right; font-weight: 600; line-height: 1.5; margin-top: -1px;');
        markerCell.textContent = markerText;
        
        // Content cell - align to baseline to match marker
        const contentCell = document.createElement('td');
        contentCell.setAttribute('style', 'vertical-align: baseline; padding: 0; width: 100%; line-height: 1.5;');
        
        // Move all existing content to content cell
        while (li.firstChild) {
          contentCell.appendChild(li.firstChild);
        }
        
        // If content cell is empty, add a non-breaking space to maintain height
        if (!contentCell.hasChildNodes()) {
          contentCell.innerHTML = '&nbsp;';
        }
        
        tr.appendChild(markerCell);
        tr.appendChild(contentCell);
        tbody.appendChild(tr);
        table.appendChild(tbody);
        
        // Replace li content with table
        li.innerHTML = '';
        li.appendChild(table);
      }
      
      // Remove any conflicting styles
      let cleanLiStyle = liStyle
        .replace(/list-style\s*:\s*[^;]+;?/gi, '')
        .replace(/list-style-type\s*:\s*[^;]+;?/gi, '')
        .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
        .replace(/counter-increment\s*:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanLiStyle = cleanLiStyle.replace(/^;\s*|\s*;$/g, '').trim();

      // Add required styles - no padding needed as table handles spacing
      const requiredLiStyles = 'list-style: none !important; padding-left: 0 !important; min-height: 1.5em !important; line-height: 1.5 !important; display: list-item !important;';
      const finalLiStyle = mergeStyles(cleanLiStyle, requiredLiStyles);
      li.setAttribute('style', finalLiStyle);
    });
  });

  // Handle unordered lists - inject markers directly into HTML for Gmail compatibility
  // Gmail has limited support for ::before pseudo-elements, so we inject markers as HTML
  const unorderedLists = tempDiv.querySelectorAll('ul');
  unorderedLists.forEach((ul) => {
    const existingStyle = ul.getAttribute('style') || '';
    const listStyle = ul.getAttribute('data-list-style') || 'disc';

    // Determine bullet character and styling based on list style
    let bulletChar = '•'; // default disc
    let bulletFontSize = '1em'; // Match text size for proper vertical centering
    
    if (listStyle === 'circle') {
      bulletChar = '○';
      bulletFontSize = '1em'; // Same as text for consistent baseline alignment
    } else if (listStyle === 'square') {
      bulletChar = '■';
      bulletFontSize = '0.85em'; // Slightly smaller for visual balance
    }

    // Remove any conflicting list-style or padding-left from existing style
    let ulStyle = existingStyle
      .replace(/list-style\s*:\s*[^;]+;?/gi, '')
      .replace(/list-style-type\s*:\s*[^;]+;?/gi, '')
      .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
      .replace(/;\s*;/g, ';')
      .trim();
    ulStyle = ulStyle.replace(/^;\s*|\s*;$/g, '').trim();

    // Add required styles for bullet lists
    const requiredStyles = 'list-style: none !important; padding-left: 0 !important; margin: 0 0 0.5em 0;';
    const finalUlStyle = mergeStyles(ulStyle, requiredStyles);
    ul.setAttribute('style', finalUlStyle);

    // Inject markers directly into list items using table-based approach
    const listItems = ul.querySelectorAll('li');
    listItems.forEach((li) => {
      const liStyle = li.getAttribute('style') || '';
      
      // Check if marker already exists (to avoid duplicates)
      const hasMarker = li.querySelector('.list-marker') !== null;
      if (!hasMarker) {
        // Use table-based approach for perfect Gmail compatibility
        const table = document.createElement('table');
        table.setAttribute('cellpadding', '0');
        table.setAttribute('cellspacing', '0');
        table.setAttribute('border', '0');
        table.setAttribute('style', 'width: 100%; border-collapse: collapse;');
        
        const tbody = document.createElement('tbody');
        const tr = document.createElement('tr');
        
        // Marker cell - use baseline alignment for perfect vertical centering
        // Key fix: vertical-align: baseline ensures bullet sits on text baseline
        // No top/margin adjustments needed - baseline does the work
        const markerCell = document.createElement('td');
        markerCell.setAttribute('style', `vertical-align: baseline; padding: 0; padding-right: 8px; width: 24px; text-align: left; font-size: ${bulletFontSize}; line-height: 1.5; font-weight: bold;`);
        markerCell.textContent = bulletChar;
        
        // Content cell - also baseline aligned to match marker
        const contentCell = document.createElement('td');
        contentCell.setAttribute('style', 'vertical-align: baseline; padding: 0; width: 100%; line-height: 1.5;');
        
        // Move all existing content to content cell
        while (li.firstChild) {
          contentCell.appendChild(li.firstChild);
        }
        
        // If content cell is empty, add a non-breaking space to maintain height
        if (!contentCell.hasChildNodes()) {
          contentCell.innerHTML = '&nbsp;';
        }
        
        tr.appendChild(markerCell);
        tr.appendChild(contentCell);
        tbody.appendChild(tr);
        table.appendChild(tbody);
        
        // Replace li content with table
        li.innerHTML = '';
        li.appendChild(table);
      }
      
      // Remove any conflicting styles
      let cleanLiStyle = liStyle
        .replace(/list-style\s*:\s*[^;]+;?/gi, '')
        .replace(/list-style-type\s*:\s*[^;]+;?/gi, '')
        .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanLiStyle = cleanLiStyle.replace(/^;\s*|\s*;$/g, '').trim();

      // Add required styles - no padding needed as table handles spacing
      const requiredLiStyles = 'list-style: none !important; padding-left: 0 !important; min-height: 1.5em !important; line-height: 1.5 !important; display: list-item !important;';
      const finalLiStyle = mergeStyles(cleanLiStyle, requiredLiStyles);
      li.setAttribute('style', finalLiStyle);
    });
  });

  // Handle blockquotes - preserve existing color if set, otherwise use default
  // This includes blockquotes inside table cells
  // Email clients don't support ::before pseudo-elements, so we add quote icon as HTML
  const blockquotes = tempDiv.querySelectorAll('blockquote');
  blockquotes.forEach((bq) => {
    const existingStyle = bq.getAttribute('style') || '';

    // Check if this blockquote is inside a table cell
    const isInTableCell = bq.closest('td, th') !== null;

    // Check if color is already set (from applyBlockquoteInlineColor)
    const hasColor = /color\s*:\s*[^;]+/i.test(existingStyle);

    // Check if quote icon already exists (to avoid duplicates)
    // Also check for any existing quote marks in the content
    const hasQuoteIcon =
      bq.querySelector('.quote-icon') !== null ||
      bq.innerHTML.trim().startsWith('<span') ||
      bq.textContent.trim().startsWith('"') ||
      bq.textContent.trim().startsWith('\u201C');

    // Extract existing color if present
    let existingColor = '#6F7B88';
    if (hasColor) {
      const colorMatch = existingStyle.match(/color\s*:\s*([^;!]+)/i);
      if (colorMatch) {
        existingColor = colorMatch[1].trim();
      }
    }

    // Default blockquote styles - full styling for email compatibility
    // Preview shows: padding: 36px 24px, padding-left: 65px, quote at left: 20px, top: 10px
    // For Gmail: use padding: 10px 24px 36px 20px (top: 10px to align with quote, left: 20px for quote space)
    // Quote icon will float left, and text will flow next to it, aligned at top
    let defaultBqStyle;
    if (isInTableCell) {
      // Simpler styling for table cells with quote icon
      defaultBqStyle = `border-left: 4px solid #6F7B88; padding: 0.5em 0 0.5em 1.5em; margin: 0.5em 0; display: block; color: ${existingColor}; overflow: hidden;`;
    } else {
      // Full blockquote design - match preview styling but Gmail compatible
      // padding: 10px top (same as quote top position), 24px right, 36px bottom, 20px left (quote space)
      defaultBqStyle = `margin: 0.9em 0; padding: 10px 24px 36px 20px; display: block; width: 100%; border-left: 6px solid #eef0f2; background-color: #f6f7f8; line-height: 1.6; font-weight: 600; overflow: hidden; box-sizing: border-box; color: ${existingColor} !important;`;
    }

    // Merge styles - remove existing color first, then add all styles
    const styleWithoutColor = existingStyle.replace(/color\s*:\s*[^;!]+;?/gi, '').trim();
    const bqStyle = mergeStyles(styleWithoutColor, defaultBqStyle);

    // Clean up any double semicolons or extra spaces
    const cleanedStyle = bqStyle
      .replace(/;\s*;/g, ';')
      .replace(/^\s*;\s*|\s*;\s*$/g, '')
      .trim();
    bq.setAttribute('style', cleanedStyle);

    // Add quote icon as actual HTML content (email clients don't support ::before)
    // Preview shows quote at left: 20px, top: 10px - we achieve this with float (Gmail compatible)
    // Remove any existing quote icons first to avoid duplicates
    const existingIcons = bq.querySelectorAll('.quote-icon');
    existingIcons.forEach((icon) => icon.remove());

    if (!hasQuoteIcon) {
      // Check if blockquote has content
      const hasContent = bq.textContent && bq.textContent.trim();
      if (hasContent) {
        // Create quote icon element - use same Unicode character as editor (\u201C)
        const quoteIcon = document.createElement('span');
        if (isInTableCell) {
          // For table cells, use inline approach (Gmail compatible)
          quoteIcon.setAttribute(
            'style',
            'font-size: 24px; line-height: 1; color: #9AA6B2; font-weight: 550; font-family: Georgia, Times, "Times New Roman", sans-serif; display: inline-block; vertical-align: top; margin-right: 0.25em; float: left;'
          );
        } else {
          // For regular blockquotes, use float:left to match preview design in Gmail
          // Preview: quote at left: 20px, top: 10px
          // Quote icon floats at top-left, text appears below it with margin-top: 38px
          // Font-size slightly larger (52px) than before (48px) for better visibility
          // Use clear: left to ensure quote icon stays on left and text flows below it
          quoteIcon.setAttribute(
            'style',
            'float: left; font-size: 52px; line-height: 1.0; color: #9AA6B2; font-weight: 550; font-family: Georgia, Times, "Times New Roman", sans-serif; margin-right: 12px; margin-top: 0; margin-bottom: 0; padding: 0; display: block; width: 48px; text-align: left; vertical-align: top; clear: left;'
          );
        }
        quoteIcon.textContent = '\u201C'; // Left double quotation mark (Unicode U+201C) - same as editor
        quoteIcon.className = 'quote-icon';

        // Insert quote icon at the very beginning of blockquote (before any content)
        // This ensures quote icon appears first and text flows next to it
        const firstElement = bq.firstElementChild || bq.firstChild;
        if (firstElement) {
          bq.insertBefore(quoteIcon, firstElement);
        } else {
          bq.insertBefore(quoteIcon, bq.firstChild);
        }
      }
    }

    // Ensure blockquote paragraphs flow properly next to floated quote icon
    // First paragraph needs margin-top to align with quote icon baseline (push text down)
    const bqParagraphs = bq.querySelectorAll('p');
    bqParagraphs.forEach((p, index) => {
      const pExistingStyle = p.getAttribute('style') || '';

      // Remove all existing margin and padding-top to start fresh
      let cleanPStyle = pExistingStyle
        .replace(/margin\s*:\s*[^;]+;?/gi, '')
        .replace(/margin-top\s*:\s*[^;]+;?/gi, '')
        .replace(/margin-bottom\s*:\s*[^;]+;?/gi, '')
        .replace(/margin-left\s*:\s*[^;]+;?/gi, '')
        .replace(/margin-right\s*:\s*[^;]+;?/gi, '')
        .replace(/padding-top\s*:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();

      // Clean up any leading/trailing semicolons
      cleanPStyle = cleanPStyle.replace(/^;\s*|\s*;$/g, '').trim();

      // First paragraph needs larger margin-top to push text down BELOW the quote icon
      // Quote icon has font-size: 48px, so text needs significant margin-top to appear clearly below quote icon
      // Increase margin-top to 38px-40px to push text well below the quote icon in Gmail
      // This ensures text appears below the quote icon, not aligned at baseline
      const marginTop = index === 0 ? '38px' : '0.5em';

      // Build final style with margin-top as first property (important for Gmail)
      const newPStyle = `margin-top: ${marginTop} !important; margin-bottom: 0; margin-left: 0; margin-right: 0; padding: 0; overflow: hidden; display: block; line-height: 1.6;`;

      // Merge with existing clean style (but margin-top takes priority)
      const finalPStyle = cleanPStyle ? `${newPStyle} ${cleanPStyle}` : newPStyle;

      // Set the style attribute
      p.setAttribute('style', finalPStyle);
    });

    // If blockquote has no paragraphs, ensure direct text flows properly
    // Wrap text in span with proper styling to flow next to floated quote icon
    // Add margin-top to push text down and align with quote icon
    if (bqParagraphs.length === 0) {
      const quoteIcon = bq.querySelector('.quote-icon');
      if (quoteIcon) {
        // Find text nodes or elements after quote icon
        let node = quoteIcon.nextSibling;
        while (node) {
          // Check if node is a text node (nodeType 3 = TEXT_NODE) or an element
          const TEXT_NODE = 3;
          const nodeTextContent = node.textContent;
          if (node.nodeType === TEXT_NODE && nodeTextContent && nodeTextContent.trim()) {
            // Wrap text node in a span with proper styling
            // Add larger margin-top to push text down BELOW the quote icon
            // Quote icon is 48px, so text needs 38px margin-top to appear clearly below it in Gmail
            // Text should appear below quote icon, not aligned at baseline
            const textSpan = document.createElement('span');
            textSpan.setAttribute(
              'style',
              'display: block; overflow: hidden; margin-top: 38px !important; margin-bottom: 0; margin-left: 0; margin-right: 0; padding: 0; line-height: 1.6;'
            );
            node.textContent = '';
            textSpan.textContent = nodeTextContent;
            bq.replaceChild(textSpan, node);
            break;
          } else if (
            node.nodeType === 1 &&
            node.tagName &&
            node.textContent &&
            node.textContent.trim()
          ) {
            // If it's an element (like div, span), add margin-top to it directly
            const elementStyle = node.getAttribute('style') || '';
            const cleanElementStyle = elementStyle
              .replace(/margin\s*:\s*[^;]+;?/gi, '')
              .replace(/margin-top\s*:\s*[^;]+;?/gi, '')
              .replace(/;\s*;/g, ';')
              .trim()
              .replace(/^;\s*|\s*;$/g, '');
            const newElementStyle =
              `margin-top: 38px !important; margin-bottom: 0; margin-left: 0; margin-right: 0; ${cleanElementStyle}`.trim();
            node.setAttribute('style', newElementStyle);
            break;
          }
          node = node.nextSibling;
        }
      }
    }
  });

  return tempDiv.innerHTML;
};

/**
 * Remove footer from HTML content
 * This is used when loading htmlContent as fallback to ensure footer is not in editor content
 * The footer should never be part of the editor content - it's only added when sending emails
 * @param {string} htmlContent - The HTML content that may contain footer
 * @returns {string} HTML content with footer removed
 */
export const removeFooterFromHTML = (htmlContent) => {
  if (!htmlContent || htmlContent.trim() === '') {
    return htmlContent;
  }

  let cleanedContent = htmlContent;

  // Footer structure: starts with div containing specific styles
  // Outer div: <div style="...border-top: 1px solid #e5e7eb; background-color: #f9fafb;...">
  // Contains nested divs and closes with </div></div>
  // The footer is always appended at the end, so we match it from the end of the content
  
  // Pattern 1: Match footer by the characteristic border-top and background-color styles
  // Match from the end of the content (footer is always appended last)
  // The footer div has both border-top: 1px solid #e5e7eb and background-color: #f9fafb
  // Match the entire footer structure including nested divs
  const footerPattern1 = /<div[^>]*style=["'][^"']*border-top[^"']*1px\s+solid\s+#e5e7eb[^"']*background-color[^"']*#f9fafb[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>\s*$/i;
  cleanedContent = cleanedContent.replace(footerPattern1, '');
  
  // Pattern 2: Match footer with styles in reverse order (background-color first, then border-top)
  const footerPattern2 = /<div[^>]*style=["'][^"']*background-color[^"']*#f9fafb[^"']*border-top[^"']*1px\s+solid\s+#e5e7eb[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>\s*$/i;
  cleanedContent = cleanedContent.replace(footerPattern2, '');
  
  // Pattern 3: Match footer by partial style match (in case styles are formatted differently)
  // Look for div with border-top: 1px solid #e5e7eb OR background-color: #f9fafb at the end
  const footerPattern3 = /<div[^>]*style=["'][^"']*(?:border-top[^"']*1px\s+solid\s+#e5e7eb|background-color[^"']*#f9fafb)[^"']*["'][^>]*>[\s\S]*?(?:footer-company-name|footer-links-container|footer-description|send-with-pabbly)[\s\S]*?<\/div>\s*<\/div>\s*$/i;
  cleanedContent = cleanedContent.replace(footerPattern3, '');
  
  // Pattern 4: Match footer by Pabbly badge image at the end (most reliable indicator)
  // The footer always contains the send-with-pabbly image at the end
  const footerByBadgePattern = /<div[^>]*>[\s\S]*?send-with-pabbly[\s\S]*?<\/div>\s*<\/div>\s*$/i;
  cleanedContent = cleanedContent.replace(footerByBadgePattern, '');
  
  // Pattern 5: Match footer by footer class names at the end
  // Look for divs with footer-related classes (footer-company-name, footer-links-container, etc.)
  const footerByClassPattern = /<div[^>]*>[\s\S]*?class=["'][^"']*footer-(?:company-name|links-container|description|website|address)[^"']*["'][\s\S]*?<\/div>\s*<\/div>\s*$/i;
  cleanedContent = cleanedContent.replace(footerByClassPattern, '');
  
  // Remove any trailing whitespace, newlines, or empty paragraphs that might be left
  cleanedContent = cleanedContent
    .replace(/\s*<p>\s*<\/p>\s*$/i, '') // Remove trailing empty paragraphs
    .replace(/\s+$/g, '') // Remove trailing whitespace
    .trim();
  
  return cleanedContent;
};

/**
 * Convert processed HTML (email-compatible with table-based lists) back to TipTap-compatible HTML
 * This is used when loading htmlContent as fallback to restore native list structure
 * @param {string} htmlContent - The processed HTML content with table-based lists
 * @returns {string} HTML content with native lists restored
 */
export const convertProcessedHTMLToTipTap = (htmlContent) => {
  if (!htmlContent || htmlContent.trim() === '') {
    return htmlContent;
  }

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Process ordered lists - convert table-based list items back to native lists
  const orderedLists = tempDiv.querySelectorAll('ol');
  orderedLists.forEach((ol) => {
    const listItems = ol.querySelectorAll('li');
    listItems.forEach((li) => {
      // Check if this list item contains a table (from email processing)
      const table = li.querySelector('table');
      if (table) {
        const rows = table.querySelectorAll('tr');
        if (rows.length > 0) {
          const firstRow = rows[0];
          const cells = firstRow.querySelectorAll('td');
          
          // If table has 2 cells (marker + content), extract content
          if (cells.length >= 2) {
            const contentCell = cells[1]; // Second cell contains the actual content
            // Move all content from the content cell back to the list item
            li.innerHTML = '';
            if (contentCell) {
              while (contentCell.firstChild) {
                li.appendChild(contentCell.firstChild);
              }
            }
            
            // If li is now empty, add a paragraph to maintain structure
            if (!li.hasChildNodes() || (li.textContent && li.textContent.trim() === '')) {
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              li.appendChild(p);
            }
          } else if (cells.length === 1) {
            // If only one cell, it might be content (edge case)
            const contentCell = cells[0];
            li.innerHTML = '';
            if (contentCell) {
              while (contentCell.firstChild) {
                li.appendChild(contentCell.firstChild);
              }
            }
          }
        }
      }
      
      // Clean up list item styles - remove email-specific styles
      const liStyle = li.getAttribute('style') || '';
      let cleanLiStyle = liStyle
        .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
        .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
        .replace(/min-height\s*:\s*[^;]+;?/gi, '')
        .replace(/display\s*:\s*list-item\s*!important;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanLiStyle = cleanLiStyle.replace(/^;\s*|\s*;$/g, '').trim();
      
      if (cleanLiStyle) {
        li.setAttribute('style', cleanLiStyle);
      } else {
        li.removeAttribute('style');
      }
    });
    
    // Clean up ordered list styles - remove email-specific styles
    const olStyle = ol.getAttribute('style') || '';
    let cleanOlStyle = olStyle
      .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
      .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
      .replace(/margin\s*:\s*[^;]+;?/gi, '')
      .replace(/;\s*;/g, ';')
      .trim();
    cleanOlStyle = cleanOlStyle.replace(/^;\s*|\s*;$/g, '').trim();
    
    if (cleanOlStyle) {
      ol.setAttribute('style', cleanOlStyle);
    } else {
      ol.removeAttribute('style');
    }
  });

  // Process unordered lists - convert table-based list items back to native lists
  const unorderedLists = tempDiv.querySelectorAll('ul');
  unorderedLists.forEach((ul) => {
    const listItems = ul.querySelectorAll('li');
    listItems.forEach((li) => {
      // Check if this list item contains a table (from email processing)
      const table = li.querySelector('table');
      if (table) {
        const rows = table.querySelectorAll('tr');
        if (rows.length > 0) {
          const firstRow = rows[0];
          const cells = firstRow.querySelectorAll('td');
          
          // If table has 2 cells (marker + content), extract content
          if (cells.length >= 2) {
            const contentCell = cells[1]; // Second cell contains the actual content
            // Move all content from the content cell back to the list item
            li.innerHTML = '';
            if (contentCell) {
              while (contentCell.firstChild) {
                li.appendChild(contentCell.firstChild);
              }
            }
            
            // If li is now empty, add a paragraph to maintain structure
            if (!li.hasChildNodes() || (li.textContent && li.textContent.trim() === '')) {
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              li.appendChild(p);
            }
          } else if (cells.length === 1) {
            // If only one cell, it might be content (edge case)
            const contentCell = cells[0];
            li.innerHTML = '';
            if (contentCell) {
              while (contentCell.firstChild) {
                li.appendChild(contentCell.firstChild);
              }
            }
          }
        }
      }
      
      // Clean up list item styles - remove email-specific styles
      const liStyle = li.getAttribute('style') || '';
      let cleanLiStyle = liStyle
        .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
        .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
        .replace(/min-height\s*:\s*[^;]+;?/gi, '')
        .replace(/display\s*:\s*list-item\s*!important;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanLiStyle = cleanLiStyle.replace(/^;\s*|\s*;$/g, '').trim();
      
      if (cleanLiStyle) {
        li.setAttribute('style', cleanLiStyle);
      } else {
        li.removeAttribute('style');
      }
    });
    
    // Clean up unordered list styles - remove email-specific styles
    const ulStyle = ul.getAttribute('style') || '';
    let cleanUlStyle = ulStyle
      .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
      .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
      .replace(/margin\s*:\s*[^;]+;?/gi, '')
      .replace(/;\s*;/g, ';')
      .trim();
    cleanUlStyle = cleanUlStyle.replace(/^;\s*|\s*;$/g, '').trim();
    
    if (cleanUlStyle) {
      ul.setAttribute('style', cleanUlStyle);
    } else {
      ul.removeAttribute('style');
    }
  });

  // Remove any remaining tables inside list items (should have been handled above, but clean up)
  const remainingTablesInLists = tempDiv.querySelectorAll('li table');
  remainingTablesInLists.forEach((table) => {
    const parentLi = table.closest('li');
    if (parentLi) {
      // Extract content from table's second cell (content cell)
      const contentCell = table.querySelector('td:nth-child(2)');
      if (contentCell) {
        const liContent = contentCell.innerHTML;
        parentLi.innerHTML = liContent || '<p><br></p>';
      } else {
        // If no content cell, try to extract all content from table
        parentLi.innerHTML = table.innerHTML || '<p><br></p>';
      }
    }
  });

  // Process lists inside table cells - they also get converted to table-based lists during email processing
  const tableCells = tempDiv.querySelectorAll('td, th');
  tableCells.forEach((cell) => {
    // Process ordered lists inside cells
    const cellOrderedLists = cell.querySelectorAll('ol');
    cellOrderedLists.forEach((ol) => {
      const listItems = ol.querySelectorAll('li');
      listItems.forEach((li) => {
        const table = li.querySelector('table');
        if (table) {
          const rows = table.querySelectorAll('tr');
          if (rows.length > 0) {
            const firstRow = rows[0];
            const cells = firstRow.querySelectorAll('td');
            if (cells.length >= 2) {
              const contentCell = cells[1];
              li.innerHTML = '';
              if (contentCell) {
                while (contentCell.firstChild) {
                  li.appendChild(contentCell.firstChild);
                }
              }
            }
          }
        }
        // Clean up list item styles
        const liStyle = li.getAttribute('style') || '';
        let cleanLiStyle = liStyle
          .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
          .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
          .replace(/min-height\s*:\s*[^;]+;?/gi, '')
          .replace(/display\s*:\s*list-item\s*!important;?/gi, '')
          .replace(/;\s*;/g, ';')
          .trim();
        cleanLiStyle = cleanLiStyle.replace(/^;\s*|\s*;$/g, '').trim();
        if (cleanLiStyle) {
          li.setAttribute('style', cleanLiStyle);
        } else {
          li.removeAttribute('style');
        }
      });
      // Clean up ordered list styles
      const olStyle = ol.getAttribute('style') || '';
      let cleanOlStyle = olStyle
        .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
        .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
        .replace(/margin\s*:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanOlStyle = cleanOlStyle.replace(/^;\s*|\s*;$/g, '').trim();
      if (cleanOlStyle) {
        ol.setAttribute('style', cleanOlStyle);
      } else {
        ol.removeAttribute('style');
      }
    });
    
    // Process unordered lists inside cells
    const cellUnorderedLists = cell.querySelectorAll('ul');
    cellUnorderedLists.forEach((ul) => {
      const listItems = ul.querySelectorAll('li');
      listItems.forEach((li) => {
        const table = li.querySelector('table');
        if (table) {
          const rows = table.querySelectorAll('tr');
          if (rows.length > 0) {
            const firstRow = rows[0];
            const cells = firstRow.querySelectorAll('td');
            if (cells.length >= 2) {
              const contentCell = cells[1];
              li.innerHTML = '';
              if (contentCell) {
                while (contentCell.firstChild) {
                  li.appendChild(contentCell.firstChild);
                }
              }
            }
          }
        }
        // Clean up list item styles
        const liStyle = li.getAttribute('style') || '';
        let cleanLiStyle = liStyle
          .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
          .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
          .replace(/min-height\s*:\s*[^;]+;?/gi, '')
          .replace(/display\s*:\s*list-item\s*!important;?/gi, '')
          .replace(/;\s*;/g, ';')
          .trim();
        cleanLiStyle = cleanLiStyle.replace(/^;\s*|\s*;$/g, '').trim();
        if (cleanLiStyle) {
          li.setAttribute('style', cleanLiStyle);
        } else {
          li.removeAttribute('style');
        }
      });
      // Clean up unordered list styles
      const ulStyle = ul.getAttribute('style') || '';
      let cleanUlStyle = ulStyle
        .replace(/list-style\s*:\s*none\s*!important;?/gi, '')
        .replace(/padding-left\s*:\s*0\s*!important;?/gi, '')
        .replace(/margin\s*:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanUlStyle = cleanUlStyle.replace(/^;\s*|\s*;$/g, '').trim();
      if (cleanUlStyle) {
        ul.setAttribute('style', cleanUlStyle);
      } else {
        ul.removeAttribute('style');
      }
    });
  });

  // Process blockquotes - remove ALL quote icons and restore original TipTap styling
  // Add quote icon as HTML content so it appears in HTML output (TipTap CSS ::before only works in editor)
  const blockquotes = tempDiv.querySelectorAll('blockquote');
  blockquotes.forEach((bq) => {
    // Remove ALL existing quote icon elements to prevent duplication
    // This includes both email-specific (.quote-icon) and TipTap-converted (span[data-tiptap-quote]) icons
    const allQuoteIcons = bq.querySelectorAll('.quote-icon, span[data-tiptap-quote]');
    allQuoteIcons.forEach((icon) => icon.remove());
    
    // Extract original color if it exists
    const bqStyle = bq.getAttribute('style') || '';
    const colorMatch = bqStyle.match(/color\s*:\s*([^;!]+)/i);
    const originalColor = colorMatch ? colorMatch[1].trim() : '#6F7B88';
    
    // Restore full TipTap blockquote styling (matching styles.jsx)
    // This ensures proper positioning and appearance, including position: relative for absolute quote icon
    const tipTapBqStyle = `margin: 0.9em 0; padding: 36px 24px; padding-left: 48px; display: block; width: 100%; border-left: 4px solid #E6EBF1; background-color: #F4F7FA; position: relative; color: ${originalColor} !important; line-height: 1.6; font-weight: 500;`;
    
    bq.setAttribute('style', tipTapBqStyle);

    // DO NOT add HTML quote icon here - this function is for converting HTML back to TipTap format for editing
    // TipTap editor will use CSS ::before to show the quote icon
    // HTML quote icon will be added by prepareHTMLForEmailSending when preparing HTML for email sending
    
    // Restore TipTap paragraph styles inside blockquotes
    // TipTap blockquote paragraphs have: margin: 0, fontStyle: normal, backgroundColor: transparent
    const bqParagraphs = bq.querySelectorAll('p');
    bqParagraphs.forEach((p) => {
      // Remove all email-specific styles and restore TipTap paragraph styling
      const tipTapPStyle = 'margin: 0; font-style: normal; background-color: transparent !important;';
      p.setAttribute('style', tipTapPStyle);
    });
    
    // Clean up span elements that were added for email compatibility
    const bqSpans = bq.querySelectorAll('span[style*="margin-top"]');
    bqSpans.forEach((span) => {
      const spanStyle = span.getAttribute('style') || '';
      let cleanSpanStyle = spanStyle
        .replace(/margin-top\s*:\s*[^;]+!important;?/gi, '')
        .replace(/margin-top\s*:\s*[^;]+;?/gi, '')
        .replace(/margin\s*:\s*[^;]+;?/gi, '')
        .replace(/overflow\s*:\s*[^;]+;?/gi, '')
        .replace(/display\s*:\s*block;?/gi, '')
        .replace(/line-height\s*:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanSpanStyle = cleanSpanStyle.replace(/^;\s*|\s*;$/g, '').trim();
      
      if (cleanSpanStyle) {
        span.setAttribute('style', cleanSpanStyle);
      } else {
        span.removeAttribute('style');
      }
    });
  });

  // Remove email-specific attributes (cellpadding/cellspacing) from tables that might trigger raw mode
  // Also remove background-color from table styles (triggers raw mode detection)
  const allTables = tempDiv.querySelectorAll('table');
  allTables.forEach((table) => {
    // Remove cellpadding and cellspacing attributes (these trigger raw mode detection)
    // TipTap tables don't have these attributes, so if they exist, they're from email processing
    if (table.hasAttribute('cellpadding')) {
      table.removeAttribute('cellpadding');
    }
    if (table.hasAttribute('cellspacing')) {
      table.removeAttribute('cellspacing');
    }
    
    // Also remove width="600" attribute if present (another raw mode trigger)
    // But only if it's exactly 600 (email template pattern)
    const widthAttr = table.getAttribute('width');
    if (widthAttr === '600' || widthAttr === '600px') {
      table.removeAttribute('width');
    }
    
    // Remove background-color from table style (triggers raw mode detection)
    const tableStyle = table.getAttribute('style') || '';
    if (tableStyle) {
      let cleanTableStyle = tableStyle
        .replace(/background-color\s*:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      cleanTableStyle = cleanTableStyle.replace(/^;\s*|\s*;$/g, '').trim();
      
      if (cleanTableStyle) {
        table.setAttribute('style', cleanTableStyle);
      } else {
        table.removeAttribute('style');
      }
    }
  });

  return tempDiv.innerHTML;
};

/**
 * Prepare HTML content for email sending (inlines all styles)
 * This should be used when saving templates to ensure email compatibility
 * @param {string} htmlContent - The HTML content from TipTap editor
 * @param {Object} footerData - Footer data to append to HTML
 * @returns {string} HTML with all styles inlined and email-compatible
 */
export const prepareHTMLForEmailSending = (htmlContent, footerData = null, showSendWithPabblyBadge = true, businessDetails = null) => {
  // Sanitize HTML content
  let sanitizedContent = '';
  if (htmlContent && htmlContent.trim() !== '' && htmlContent !== '<p></p>') {
    sanitizedContent = sanitizeHTMLForEmail(htmlContent);

    // Inline all styles to make it email-compatible
    const defaultStyles = getDefaultInlineStyles();
    sanitizedContent = inlineStyles(sanitizedContent, defaultStyles);
  }

  // Generate and append footer HTML
  const footerHTML = footerData ? generateFooterHTML(footerData, showSendWithPabblyBadge, businessDetails) : '';

  // Combine content and footer
  if (sanitizedContent && footerHTML) {
    return sanitizedContent + footerHTML;
  }
  if (sanitizedContent) {
    return sanitizedContent;
  }
  if (footerHTML) {
    return footerHTML;
  }

  return '';
};

/**
 * Main export function for Rich Text Email Builder
 * @param {string} htmlContent - The HTML content from the rich text editor
 * @param {string} emailTitle - The title of the email
 * @param {Object} globalBackground - Global background configuration (optional)
 * @param {Object} contentBackground - Content background configuration (optional)
 * @param {Object} footerData - Footer data to append to HTML (optional)
 * @param {boolean} showSendWithPabblyBadge - Whether to show Pabbly badge in footer (default: true)
 * @param {Object} businessDetails - Business details to use as defaults for empty footer fields (optional)
 * @returns {string} Complete HTML email string
 */
export const exportRichTextEmailToHTML = (
  htmlContent,
  emailTitle = 'Email',
  globalBackground = null,
  contentBackground = null,
  footerData = null,
  showSendWithPabblyBadge = true,
  businessDetails = null
) => {
  // Sanitize HTML content
  let sanitizedContent = sanitizeHTMLForEmail(htmlContent);
  
  // Process content through inlineStyles to add quote icons and email-compatible formatting
  // This ensures blockquotes have quote icons in HTML output
  if (sanitizedContent && sanitizedContent.trim() !== '' && sanitizedContent !== '<p></p>') {
    const defaultStyles = getDefaultInlineStyles();
    sanitizedContent = inlineStyles(sanitizedContent, defaultStyles);
  }

  // Generate global background styles
  const globalBackgroundType = globalBackground?.backgroundType || 'solid';
  const isGlobalGradient = globalBackgroundType === 'gradient';
  const globalBackgroundColorEnabled = globalBackground?.backgroundColorEnabled !== false;

  const globalBackgroundStyle = {};
  if (globalBackgroundColorEnabled) {
    if (isGlobalGradient && globalBackground?.gradient) {
      const { stops, angle } = globalBackground.gradient;
      const stopsCSS = stops.map((stop) => `${stop.color} ${stop.position}%`).join(', ');
      globalBackgroundStyle.background = `linear-gradient(${angle}deg, ${stopsCSS})`;
    } else {
      globalBackgroundStyle.backgroundColor = globalBackground?.backgroundColor || 'transparent';
    }
  }

  if (
    globalBackground?.backgroundImageEnabled &&
    (globalBackground?.backgroundImage || globalBackground?.backgroundImageUrl)
  ) {
    globalBackgroundStyle.backgroundImage = `url(${globalBackground?.backgroundImage || globalBackground?.backgroundImageUrl})`;
    globalBackgroundStyle.backgroundSize = 'cover';
    globalBackgroundStyle.backgroundPosition = 'center';
    globalBackgroundStyle.backgroundRepeat = 'no-repeat';
  }

  // Generate content background styles
  const contentBackgroundType = contentBackground?.backgroundType || 'solid';
  const isContentGradient = contentBackgroundType === 'gradient';
  const contentBackgroundColorEnabled = contentBackground?.backgroundColorEnabled !== false;

  const contentBackgroundStyle = {};
  if (contentBackgroundColorEnabled) {
    if (isContentGradient && contentBackground?.gradient) {
      const { stops, angle } = contentBackground.gradient;
      const stopsCSS = stops.map((stop) => `${stop.color} ${stop.position}%`).join(', ');
      contentBackgroundStyle.background = `linear-gradient(${angle}deg, ${stopsCSS})`;
    } else {
      contentBackgroundStyle.backgroundColor = contentBackground?.backgroundColor || '#ffffff';
    }
  }

  if (
    contentBackground?.backgroundImageEnabled &&
    (contentBackground?.backgroundImage || contentBackground?.backgroundImageUrl)
  ) {
    contentBackgroundStyle.backgroundImage = `url(${contentBackground?.backgroundImage || contentBackground?.backgroundImageUrl})`;
    contentBackgroundStyle.backgroundSize = 'cover';
    contentBackgroundStyle.backgroundPosition = 'center';
    contentBackgroundStyle.backgroundRepeat = 'no-repeat';
  }

  // Convert background styles to CSS
  const globalBackgroundCSS = stylesToCSS(globalBackgroundStyle);
  const contentBackgroundCSS = stylesToCSS(contentBackgroundStyle);

  // Generate footer HTML
  const footerHTML = footerData ? generateFooterHTML(footerData, showSendWithPabblyBadge, businessDetails) : '';

  // Generate complete HTML email
  return generateCompleteEmailHTML(
    emailTitle,
    sanitizedContent,
    globalBackgroundCSS,
    contentBackgroundCSS,
    footerHTML
  );
};

/**
 * Copy HTML to clipboard
 * @param {string} html - The HTML string to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyHTMLToClipboard = async (html) => {
  try {
    await navigator.clipboard.writeText(html);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = html;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

export default {
  exportRichTextEmailToHTML,
  copyHTMLToClipboard,
  prepareHTMLForEmailSending,
};
