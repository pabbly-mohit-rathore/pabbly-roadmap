import { Node, mergeAttributes } from '@tiptap/core';

export interface ButtonAttributes {
  text: string;
  url: string;
  style: 'primary' | 'outline';
  alignment: 'left' | 'center' | 'right';
  fullWidth: boolean;
  openInNewTab: boolean;
  color: string;
  textColor: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    button: {
      insertButton: (attrs: ButtonAttributes) => ReturnType;
    };
  }
}

function btnCSS(btnStyle: string, color: string, textColor: string, fullWidth: boolean) {
  const base = btnStyle === 'primary'
    ? `background-color:${color};color:${textColor};border:none;`
    : `background-color:transparent;color:${color};border:2px solid ${color};`;
  return `display:inline-block;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;${base}${fullWidth ? 'width:100%;text-align:center;box-sizing:border-box;' : ''}`;
}

export const ButtonExtension = Node.create({
  name: 'button',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      text: {
        default: 'Button title',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-text') || 'Button title',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-text': attrs.text }),
      },
      url: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-url') || '',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-url': attrs.url }),
      },
      // Named "buttonStyle" internally to avoid collision with HTML "style" attribute
      buttonStyle: {
        default: 'primary',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-style') || 'primary',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-style': attrs.buttonStyle }),
      },
      alignment: {
        default: 'left',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-alignment') || 'left',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-alignment': attrs.alignment }),
      },
      fullWidth: {
        default: false,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-full-width') === 'true',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-full-width': String(attrs.fullWidth) }),
      },
      openInNewTab: {
        default: true,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-open-new-tab') !== 'false',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-open-new-tab': String(attrs.openInNewTab) }),
      },
      color: {
        default: '#059669',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-color') || '#059669',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-color': attrs.color }),
      },
      textColor: {
        default: '#ffffff',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-text-color') || '#ffffff',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-text-color': attrs.textColor }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="editor-button"]' }];
  },

  renderHTML({ node }) {
    const { text, url, buttonStyle, alignment, fullWidth, openInNewTab, color, textColor } = node.attrs;
    const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

    return [
      'div',
      mergeAttributes({
        'data-type': 'editor-button',
        style: `display:flex;justify-content:${alignMap[alignment] || 'flex-start'};`,
      }),
      [
        'a',
        {
          href: url,
          target: openInNewTab ? '_blank' : '_self',
          rel: openInNewTab ? 'noopener noreferrer' : undefined,
          style: btnCSS(buttonStyle, color || '#059669', textColor || '#ffffff', fullWidth),
        },
        text,
      ],
    ];
  },

  addCommands() {
    return {
      insertButton:
        (attrs) =>
        ({ commands }) => {
          // Map "style" from the UI to "buttonStyle" for TipTap
          const { style: btnStyle, ...rest } = attrs as ButtonAttributes & { style: string };
          return commands.insertContent({ type: this.name, attrs: { ...rest, buttonStyle: btnStyle } });
        },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      const { text, url, buttonStyle, alignment, fullWidth, openInNewTab, color, textColor } = node.attrs;
      const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

      dom.setAttribute('data-type', 'editor-button');
      dom.style.display = 'flex';
      dom.style.justifyContent = alignMap[alignment] || 'flex-start';
      dom.style.margin = '8px 0';

      const btn = document.createElement('a');
      btn.href = url || '#';
      btn.textContent = text || 'Button title';
      btn.target = openInNewTab ? '_blank' : '_self';
      if (openInNewTab) btn.rel = 'noopener noreferrer';
      btn.style.cssText = btnCSS(buttonStyle, color || '#059669', textColor || '#ffffff', fullWidth);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof getPos === 'function') {
          editor.commands.setNodeSelection(getPos() as number);
        }
      });

      // Track latest attrs so dblclick always reads current values
      let currentAttrs = node.attrs;

      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        // Map "buttonStyle" back to "style" for the UI dialog
        const { buttonStyle: bs, ...rest } = currentAttrs;
        dom.dispatchEvent(new CustomEvent('edit-button-node', {
          detail: { pos: typeof getPos === 'function' ? getPos() : 0, attrs: { ...rest, style: bs } },
          bubbles: true,
        }));
      });

      dom.appendChild(btn);

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'button') return false;
          const a = updatedNode.attrs;
          currentAttrs = a;
          btn.textContent = a.text || 'Button title';
          btn.href = a.url || '#';
          btn.target = a.openInNewTab ? '_blank' : '_self';
          dom.style.justifyContent = alignMap[a.alignment] || 'flex-start';
          btn.style.cssText = btnCSS(a.buttonStyle, a.color || '#059669', a.textColor || '#ffffff', a.fullWidth);
          return true;
        },
      };
    };
  },
});
