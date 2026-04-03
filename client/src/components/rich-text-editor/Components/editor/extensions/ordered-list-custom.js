import { Node, mergeAttributes } from '@tiptap/core';

export const OrderedListCustom = Node.create({
  name: 'orderedList',

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
    return [{ tag: 'ol' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    // Always add data-list-style attribute
    if (node.attrs && node.attrs['data-list-style']) {
      attrs['data-list-style'] = node.attrs['data-list-style'];
    }
    return ['ol', attrs, 0];
  },

  addAttributes() {
    return {
      'data-list-style': {
        default: 'decimal',
        parseHTML: (element) => element.getAttribute('data-list-style') || 'decimal',
        renderHTML: (attributes) => {
          if (!attributes['data-list-style'] || attributes['data-list-style'] === 'decimal') {
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
      toggleOrderedList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks, this.options.keepAttributes),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
    };
  },
});

