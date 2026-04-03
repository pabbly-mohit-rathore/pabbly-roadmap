import { varAlpha } from 'minimal-shared/utils';

import { Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

import { editorClasses } from './classes';

// ----------------------------------------------------------------------

const MARGIN = '0.75em';

// ----------------------------------------------------------------------

export const EditorRoot = styled(Stack , {
   shouldForwardProp: (prop) => prop !== 'error' && prop !== 'disabled' && prop !== 'fullScreen',
})(({ error, disabled, fullScreen, theme }) => ({
  minHeight: 240,
  borderRadius: theme.shape.borderRadius,
  border: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
  scrollbarWidth: 'thin',
  scrollbarColor: `${varAlpha(theme.vars.palette.text.disabledChannel, 0.4)} ${varAlpha(theme.vars.palette.text.disabledChannel, 0.08)}`,
  '[data-mui-color-scheme="light"] &': { backgroundColor: 'transparent' },
  '[data-mui-color-scheme="dark"] &': { backgroundColor: '#1c252e' },
  /**
   * State: error
   */
  ...(error && {
    border: `solid 1px ${theme.vars.palette.error.main}`,
  }),
  /**
   * State: disabled
   */
  ...(disabled && {
    opacity: 0.48,
    pointerEvents: 'none',
  }),
  /**
   * State: fullScreen
   */
  ...(fullScreen && {
    top: 16,
    left: 16,
    position: 'fixed',
    zIndex: theme.zIndex.modal,
    maxHeight: 'unset !important',
    width: `98.5% !important`,
    height: `96.7% !important`,
    backgroundColor: theme.vars.palette.background.default,
  }),
  /**
   * Placeholder
   */
  [`& .${editorClasses.content.placeholder}`]: {
    '&:first-of-type::before': {
      ...theme.typography.body2,
      height: 0,
      float: 'left',
      pointerEvents: 'none',
      content: 'attr(data-placeholder)',
      color: theme.vars.palette.text.disabled,
    },
  },
  // TipTap placeholder styles
  '& .tiptap p.is-editor-empty:first-child::before': {
    content: 'attr(data-placeholder)',
    float: 'left',
    color: theme.vars.palette.text.disabled,
    pointerEvents: 'none',
    height: 0,
  },
  /**
   * Content
   */
  [`& .${editorClasses.content.root}`]: {
    display: 'flex',
    flex: '1 1 auto',
    overflowY: 'auto',
    flexDirection: 'column',
    borderBottomLeftRadius: 'inherit',
    borderBottomRightRadius: 'inherit',
    // Keep editor surface transparent so email template backgrounds show through
    backgroundColor: 'transparent',
    ...(error && { backgroundColor: varAlpha(theme.vars.palette.error.mainChannel, 0.08) }),
      '& .tiptap': {
      '> * + *': { marginTop: 0, marginBottom: MARGIN },
      '&.ProseMirror': {
        flex: '1 1 auto',
        outline: 'none',
        padding: 0,
        caretColor: 'auto',
        minHeight: 400,
        maxHeight: 700,
        overflowY: 'auto',
        overflowX: 'hidden',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        wordWrap: 'break-word',
        wordBreak: 'break-word',
        maxWidth: '100%',
        boxSizing: 'border-box',
        '[data-mui-color-scheme="light"] &': { backgroundColor: 'transparent' },
        '[data-mui-color-scheme="dark"] &': { backgroundColor: '#1c252e' },
        // Make sure inline spans don't block selection highlighting
        '::selection': { backgroundColor: 'rgba(0, 120, 215, 0.25)' },
        '*::selection': { backgroundColor: 'rgba(0, 120, 215, 0.25)' },
        // Prevent any child elements from causing horizontal overflow
        '& *': {
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowWrap: 'break-word',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
        },
      },
      /**
       * Heading & Paragraph: keep only spacing so template fonts/styles stay intact
       */
      h1: { marginTop: 40, marginBottom: 8 },
      h2: { marginTop: 40, marginBottom: 8 },
      h3: { marginTop: 24, marginBottom: 8 },
      h4: { marginTop: 24, marginBottom: 8 },
      h5: { marginTop: 24, marginBottom: 8 },
      h6: { marginTop: 24, marginBottom: 8 },
      p: { marginBottom: '1.25rem' },
      [`& .${editorClasses.content.heading}`]: {},
      /**
       * Link
       */
      [`& .${editorClasses.content.link}`]: { color: theme.vars.palette.primary.main },
      // Make links show pointer cursor while editing (TipTap surface)
      '& .tiptap a[href]': { cursor: 'pointer !important' },
      '& .tiptap a[href] *': { cursor: 'pointer !important' },
      /**
       * Hr Divider
       */
      [`& .${editorClasses.content.hr}`]: {
        flexShrink: 0,
        borderWidth: 0,
        margin: '2em 0',
        msFlexNegative: 0,
        WebkitFlexShrink: 0,
        borderStyle: 'solid',
        borderBottomWidth: 'thin',
        borderColor: theme.vars.palette.divider,
      },
      /**
       * Image - Allow inline styles to override
       */
      [`& .${editorClasses.content.image}`]: {
        display: 'block',
        maxWidth: '100%',
        height: 'auto',
      },
      /**
       * List
       */
      [`& .${editorClasses.content.bulletList}`]: {
        paddingLeft: 0,
        listStyle: 'none !important',
        margin: '0.5em 0',
        '& li': {
          position: 'relative !important',
          paddingLeft: '24px !important',
          listStyle: 'none !important',
          textAlign: 'inherit',
          minHeight: '1.5em',         // YE ADD KARO
          lineHeight: 1.5,             // YE ADD KARO
        },
        '& li::before': {
          content: '"•"',
          position: 'absolute !important',
          left: 0,
          top: '0.13em',
          fontWeight: 'bold',
          fontSize: '1.2em',
          lineHeight: 1.5,             // YE ADD KARO
        },
      },
      [`& .${editorClasses.content.orderedList}`]: {
        paddingLeft: 0,
        listStyle: 'none !important',
        margin: '0.5em 0',
        counterReset: 'item',
        '& li': {
          position: 'relative !important',
          paddingLeft: '30px !important',
          listStyle: 'none !important',
          textAlign: 'inherit',
          counterIncrement: 'item',
          minHeight: '1.5em',         // YE ADD KARO
          lineHeight: 1.5,             // YE ADD KARO
        },
        '& li::before': {
          content: 'counter(item) "."',
          position: 'absolute !important',
          left: 0,
          top: '0.13em',
          fontWeight: 'bold',
          lineHeight: 1.5,             // YE ADD KARO
        },
      },
      [`& .${editorClasses.content.listItem}`]: { lineHeight: 2, '& > p': { margin: 0, backgroundColor: 'transparent !important' } },
      /**
       * Blockquote
       */
      [`& .${editorClasses.content.blockquote}`]: {
        margin: '0.9em 0',
        padding: theme.spacing(2.25, 3),
        paddingLeft: 48,
        display: 'block',
        width: '100%',
        // Colors matched to requested design
        borderLeft: '4px solid #E6EBF1',
        backgroundColor: '#F4F7FA',
        position: 'relative',
        color: '#6F7B88',
        lineHeight: 1.6,
        fontWeight: theme.typography.fontWeightMedium,
        '&::before': {
          content: '"\\201C"',
          position: 'absolute',
          left: 16,
          top: 10,
          fontSize: 40,
          lineHeight: 1,
          color: '#9AA6B2',
          fontWeight: 700,
          fontFamily: 'Georgia, Times, "Times New Roman", serif',
          pointerEvents: 'none',
        },
        // Hide HTML quote icon in editor (CSS ::before handles it)
        // HTML quote icon will still be present for standalone HTML rendering
        '& span[data-tiptap-quote]': {
          display: 'none !important',
          visibility: 'hidden !important',
          opacity: '0 !important',
          width: '0 !important',
          height: '0 !important',
          overflow: 'hidden !important',
        },
        '& p': { margin: 0, fontStyle: 'normal', backgroundColor: 'transparent !important' },
        '& h1, & h2, & h3, & h4, & h5, & h6': { margin: 0, color: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit' },
        // Let children inherit the color from the blockquote
      },
      /**
       * Code inline
       */
      [`& .${editorClasses.content.codeInline}`]: {
        padding: theme.spacing(0.25, 0.5),
        color: theme.vars.palette.text.secondary,
        fontSize: theme.typography.body2.fontSize,
        borderRadius: theme.shape.borderRadius / 2,
        backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.2),
      },
      /**
       * Code block
       */
      [`& .${editorClasses.content.codeBlock}`]: {
        position: 'relative',
        '& pre': {
          overflowX: 'auto',
          color: theme.vars.palette.common.white,
          padding: theme.spacing(5, 3, 3, 3),
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.vars.palette.grey[900],
          fontFamily: "'JetBrainsMono', monospace",
          '& code': { fontSize: theme.typography.body2.fontSize },
        },
        [`& .${editorClasses.content.langSelect}`]: {
          top: 8,
          right: 8,
          zIndex: 1,
          padding: 4,
          outline: 'none',
          borderRadius: 4,
          position: 'absolute',
          color: theme.vars.palette.common.white,
          fontWeight: theme.typography.fontWeightMedium,
          borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
          backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
        },
      },
      /**
       * Table
       */
      [`& .${editorClasses.content.table}`]: {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '1rem 0',
        tableLayout: 'fixed',
        border: `2px solid ${theme.vars.palette.divider}`,
        display: 'table',
        backgroundColor: theme.vars.palette.background.paper,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        
        '& td, & th': {
          border: `1px solid ${theme.vars.palette.divider}`,
          padding: '12px 12px',
          verticalAlign: 'middle',
          minWidth: '100px',
          minHeight: '60px',
          backgroundColor: theme.vars.palette.background.paper,
          display: 'table-cell',
          boxSizing: 'border-box',
          position: 'relative',
        },
        
        '& th': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.vars.palette.grey[800] 
            : theme.vars.palette.grey[100],
          fontWeight: theme.typography.fontWeightSemiBold,
          color: theme.vars.palette.text.primary,
        },
        
        '& tr': {
          display: 'table-row',
        },
        
        '& tbody': {
          display: 'table-row-group',
        },
        
        '& thead': {
          display: 'table-header-group',
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.vars.palette.grey[800] 
            : theme.vars.palette.grey[100],
        },
        
        '& td p, & th p': {
          margin: 0,
          minHeight: '1.5em',
          display: 'block',
          width: '100%',
          verticalAlign: 'middle',
          '& + p': {
            marginTop: '0.5em',
          },
          '&:empty::before': {
            content: '"\\200b"',
            display: 'inline-block',
            minHeight: '1.5em',
          },
        },
        
        '& td:empty::after, & th:empty::after': {
          content: '""',
          display: 'block',
          minHeight: '1.5em',
        },
        
        '& table, & tr, & td, & th': {
          visibility: 'visible',
          opacity: 1,
        },
        
        '& tr:hover td': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.vars.palette.action.hover 
            : theme.vars.palette.grey[50],
        },
      },
      [`& .${editorClasses.content.tableRow}`]: {
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.vars.palette.action.hover 
            : theme.vars.palette.action.hover,
        },
      },
      [`& .${editorClasses.content.tableCell}`]: {
        border: `1px solid ${theme.vars.palette.divider}`,
        padding: '12px 12px',
        verticalAlign: 'middle',
        minWidth: '100px',
        minHeight: '60px',
        backgroundColor: theme.vars.palette.background.paper,
        color: theme.vars.palette.text.primary,
        display: 'table-cell',
        boxSizing: 'border-box',
        position: 'relative',
        visibility: 'visible',
        opacity: 1,
        '& p': {
          margin: 0,
          minHeight: '1.5em',
          display: 'block',
          width: '100%',
          verticalAlign: 'middle',
          '& + p': {
            marginTop: '0.5em',
          },
          '&:empty::before': {
            content: '"\\200b"',
            display: 'inline-block',
            minHeight: '1.5em',
          },
        },
        '&:empty::after': {
          content: '""',
          display: 'block',
          minHeight: '1.5em',
        },
      },
      [`& .${editorClasses.content.tableHeader}`]: {
        border: `1px solid ${theme.vars.palette.divider}`,
        padding: '12px 12px',
        verticalAlign: 'middle',
        minWidth: '100px',
        minHeight: '60px',
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.vars.palette.grey[800] 
          : theme.vars.palette.grey[100],
        fontWeight: theme.typography.fontWeightMedium,
        color: theme.vars.palette.text.primary,
        display: 'table-cell',
        boxSizing: 'border-box',
        position: 'relative',
        visibility: 'visible',
        opacity: 1,
        '& p': {
          margin: 0,
          minHeight: '1.5em',
          display: 'block',
          width: '100%',
          verticalAlign: 'middle',
          '& + p': {
            marginTop: '0.5em',
          },
          '&:empty::before': {
            content: '"\\200b"',
            display: 'inline-block',
            minHeight: '1.5em',
          },
        },
        '&:empty::after': {
          content: '""',
          display: 'block',
          minHeight: '1.5em',
        },
      },
      /**
       * Email canvas wrapper: constrain to 600px center without affecting normal content
       */
      // Center the actual email root if it has an explicit width, without forcing width
      '& [data-email-canvas-root="true"]': {
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'block',
      },
      // Ensure text after the canvas flows full-width as usual
      '& [data-after-canvas="true"]': {
        width: '100%',
      },
    },
    // Raw HTML mode element (contentEditable div). Keep it borderless and full bleed
    '& .raw-html-editor': {
      outline: 'none',  
      minHeight: 400,
    },
    '& .raw-html-editor a[href]': { cursor: 'pointer !important' },
    '& .raw-html-editor a[href] *': { cursor: 'pointer !important' },
  },
}));