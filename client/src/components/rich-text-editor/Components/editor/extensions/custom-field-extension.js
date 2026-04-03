import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { CustomFieldNode } from '../components/custom-field-node';

export const CustomFieldExtension = Node.create({
  name: 'customField',

  group: 'inline',

  inline: true,

  atom: true,

  selectable: false,

  draggable: false,

  addAttributes() {
    return {
      fieldId: {
        default: null,
      },
      fieldLabel: {
        default: null,
      },
      fieldColor: {
        default: 'primary',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="custom-field"]',
        getAttrs: (element) => {
          // Prefer data-field-label attribute, fallback to extracting from text content
          let fieldLabel = element.getAttribute('data-field-label');
          
          if (!fieldLabel) {
            // Extract fieldLabel from text content (e.g., "{first_name}" -> "first_name")
            const textContent = element.textContent || '';
            const match = textContent.match(/^\{([^}]+)\}$/);
            fieldLabel = match ? match[1] : textContent.replace(/[{}]/g, '');
          }
          
          return {
            fieldLabel,
            fieldId: element.getAttribute('data-field-id') || fieldLabel,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const fieldLabel = node.attrs.fieldLabel || '';
    const fieldId = node.attrs.fieldId || fieldLabel;
    const tagText = `{${fieldLabel}}`;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'custom-field',
        'data-field-id': fieldId,
        'data-field-label': fieldLabel,
      }),
      tagText,
    ];
  },

  toDOM(node) {
    const fieldLabel = node.attrs.fieldLabel || '';
    const fieldId = node.attrs.fieldId || fieldLabel;
    const tagText = `{${fieldLabel}}`;
    return [
      'span',
      {
        'data-type': 'custom-field',
        'data-field-id': fieldId,
        'data-field-label': fieldLabel,
      },
      tagText,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CustomFieldNode, {
      // Ensure HTML serialization works properly
      contentDOM: null, // Atom nodes don't have content
    });
  },

  addCommands() {
    return {
      insertCustomField:
        (attributes) =>
        ({ commands, state, dispatch }) => {
          if (!dispatch) return false;

          const { selection, schema } = state;
          const { $from } = selection;
          
          // Create transaction
          // eslint-disable-next-line prefer-destructuring
          const tr = state.tr;
          
          // Create the custom field node
          const node = schema.nodes[this.name].create(attributes);
          
          // Insert the node at current position
          tr.insert($from.pos, node);
          
          // Calculate new cursor position (right after the inserted node)
          const newPos = $from.pos + node.nodeSize;
          
          // Ensure cursor stays in the same paragraph/line
          const $newPos = tr.doc.resolve(newPos);
          
          // If the position is valid and within the same paragraph, set cursor there
          if ($newPos && $newPos.pos <= tr.doc.content.size) {
            // Check if we're still in the same paragraph
            if ($newPos.parent === $from.parent) {
              const newSelection = selection.constructor.create(tr.doc, $newPos.pos);
              tr.setSelection(newSelection);
            } else {
              // If somehow we're in a different paragraph, try to stay at end of current one
              const currentParaEnd = $from.end(-1);
              const safePos = Math.min(currentParaEnd, tr.doc.content.size);
              const $safePos = tr.doc.resolve(safePos);
              const safeSelection = selection.constructor.create(tr.doc, $safePos.pos);
              tr.setSelection(safeSelection);
            }
          }
          
          dispatch(tr);
          return true;
        },
    };
  },
}); 