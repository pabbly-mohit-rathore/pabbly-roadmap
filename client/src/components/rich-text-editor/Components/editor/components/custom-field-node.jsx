import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';

export function CustomFieldNode({ node, deleteNode }) {
  const { fieldId, fieldLabel, fieldColor } = node.attrs;
  const tagText = `{${fieldLabel || ''}}`;

  return (
    <NodeViewWrapper 
      className="custom-field-node" 
      contentEditable={false}
      data-type="custom-field"
      data-field-id={fieldId}
      data-field-label={fieldLabel}
      style={{
        display: 'inline',
        verticalAlign: 'baseline',
        margin: '0 2px',
        whiteSpace: 'nowrap',
        wordBreak: 'keep-all',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        color: 'inherit',
      }}
    >
      <span>{tagText}</span>
    </NodeViewWrapper>
  );
} 