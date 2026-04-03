import { Node, mergeAttributes } from '@tiptap/core';

export const BulletListCustom = Node.create({
  name: 'bulletList',

  addOptions() {
    return {
      HTMLAttributes: {},
      itemTypeName: 'listItem',
      keepMarks: false,
      keepAttributes: false,
    };
  },

  group: 'block list',

  content: 'listItem+',

  parseHTML() {
    return [{ tag: 'ul' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    // Always add data-list-style attribute
    if (node.attrs && node.attrs['data-list-style']) {
      attrs['data-list-style'] = node.attrs['data-list-style'];
    }
    return ['ul', attrs, 0];
  },

  addAttributes() {
    return {
      'data-list-style': {
        default: 'disc',
        parseHTML: (element) => element.getAttribute('data-list-style') || 'disc',
        renderHTML: (attributes) => {
          if (!attributes['data-list-style'] || attributes['data-list-style'] === 'disc') {
            return {};
          }
          return {
            'data-list-style': attributes['data-list-style'],
          };
        },
      },
    };
  },

  addCommands() {
    return {
      toggleBulletList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks, this.options.keepAttributes),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
    };
  },
});

