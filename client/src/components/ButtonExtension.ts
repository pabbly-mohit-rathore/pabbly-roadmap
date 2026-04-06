import { Node, mergeAttributes } from '@tiptap/core';

export interface ButtonAttributes {
  text: string;
  url: string;
  style: 'primary' | 'outline';
  alignment: 'left' | 'center' | 'right';
  fullWidth: boolean;
  openInNewTab: boolean;
  customCSS: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    button: {
      insertButton: (attrs: ButtonAttributes) => ReturnType;
    };
  }
}

export const ButtonExtension = Node.create({
  name: 'button',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: 'Button title' },
      url: { default: '' },
      style: { default: 'primary' },
      alignment: { default: 'left' },
      fullWidth: { default: false },
      openInNewTab: { default: true },
      customCSS: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="editor-button"]' }];
  },

  renderHTML({ node }) {
    const { text, url, style, alignment, fullWidth, openInNewTab, customCSS } = node.attrs;

    const alignMap: Record<string, string> = {
      left: 'flex-start',
      center: 'center',
      right: 'flex-end',
    };

    const baseStyle =
      style === 'primary'
        ? 'background-color:#4f46e5;color:#fff;border:none;'
        : 'background-color:transparent;color:#4f46e5;border:2px solid #4f46e5;';

    const btnStyle =
      `display:inline-block;padding:10px 24px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;${baseStyle}${fullWidth ? 'width:100%;text-align:center;box-sizing:border-box;' : ''}${customCSS}`;

    const wrapperStyle = `display:flex;justify-content:${alignMap[alignment] || 'flex-start'};`;

    return [
      'div',
      mergeAttributes({
        'data-type': 'editor-button',
        'data-text': text,
        'data-url': url,
        'data-style': style,
        'data-alignment': alignment,
        'data-full-width': String(fullWidth),
        'data-open-new-tab': String(openInNewTab),
        'data-custom-css': customCSS,
        style: wrapperStyle,
      }),
      [
        'a',
        {
          href: url,
          target: openInNewTab ? '_blank' : '_self',
          rel: openInNewTab ? 'noopener noreferrer' : undefined,
          style: btnStyle,
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
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      const { text, url, style, alignment, fullWidth, openInNewTab, customCSS } = node.attrs;

      const alignMap: Record<string, string> = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end',
      };

      dom.setAttribute('data-type', 'editor-button');
      dom.style.display = 'flex';
      dom.style.justifyContent = alignMap[alignment] || 'flex-start';
      dom.style.margin = '8px 0';

      const btn = document.createElement('a');
      btn.href = url || '#';
      btn.textContent = text || 'Button title';
      btn.target = openInNewTab ? '_blank' : '_self';
      if (openInNewTab) btn.rel = 'noopener noreferrer';
      btn.style.cssText = `display:inline-block;padding:10px 24px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;${
        style === 'primary'
          ? 'background-color:#4f46e5;color:#fff;border:none;'
          : 'background-color:transparent;color:#4f46e5;border:2px solid #4f46e5;'
      }${fullWidth ? 'width:100%;text-align:center;box-sizing:border-box;' : ''}${customCSS}`;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Select the node on click in editor
        if (typeof getPos === 'function') {
          editor.commands.setNodeSelection(getPos() as number);
        }
      });

      // Double-click to edit
      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const event = new CustomEvent('edit-button-node', {
          detail: { pos: typeof getPos === 'function' ? getPos() : 0, attrs: node.attrs },
          bubbles: true,
        });
        dom.dispatchEvent(event);
      });

      dom.appendChild(btn);

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'button') return false;
          const a = updatedNode.attrs;
          btn.textContent = a.text || 'Button title';
          btn.href = a.url || '#';
          btn.target = a.openInNewTab ? '_blank' : '_self';
          dom.style.justifyContent = alignMap[a.alignment] || 'flex-start';
          btn.style.cssText = `display:inline-block;padding:10px 24px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;${
            a.style === 'primary'
              ? 'background-color:#4f46e5;color:#fff;border:none;'
              : 'background-color:transparent;color:#4f46e5;border:2px solid #4f46e5;'
          }${a.fullWidth ? 'width:100%;text-align:center;box-sizing:border-box;' : ''}${a.customCSS}`;
          return true;
        },
      };
    };
  },
});
