import { Node } from '@tiptap/core';
import { useRef, useState, useEffect, useCallback } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

// React component for resizable image
const ResizableImageComponent = ({ node, updateAttributes, selected }) => {
  const MAX_WIDTH = 1900;
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: node.attrs.width || '400px',
    height: node.attrs.height || '400px',
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const imgRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const activeHandle = useRef(null);

  // Calculate aspect ratio from natural dimensions
  const [aspectRatio, setAspectRatio] = useState(null);

  // Responsive behavior: ensure image never overflows container on resize
  useEffect(() => {
    if (!imgRef.current) return undefined;
    const imgEl = imgRef.current;
    let lastContainerWidth = null;
    let ro = null;
    let onResize;
    const updateToMax = () => {
      const parent = imgEl.parentElement;
      if (!parent || !aspectRatio) return;
      const responsiveMax = Math.min(parent.clientWidth || MAX_WIDTH, MAX_WIDTH);
      const currentWidth = parseInt(node.attrs.width, 10) || imgEl.offsetWidth || responsiveMax;
      if (currentWidth > responsiveMax) {
        const newHeight = responsiveMax / aspectRatio;
        setDimensions({ width: responsiveMax, height: newHeight });
        updateAttributes({ width: responsiveMax, height: newHeight });
      }
    };
    // Try ResizeObserver first
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        updateToMax();
      });
      ro.observe(imgEl.parentElement);
    } else {
      // fallback to window resize
      onResize = () => {
        if (imgEl.parentElement) {
          if (lastContainerWidth !== imgEl.parentElement.clientWidth) {
            updateToMax();
            lastContainerWidth = imgEl.parentElement.clientWidth;
          }
        }
      };
      window.addEventListener('resize', onResize);
    }
    return () => {
      if (ro) {
        ro.disconnect();
      } else if (onResize) {
        window.removeEventListener('resize', onResize);
      }
    };
  }, [aspectRatio, node.attrs.width, updateAttributes]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setAspectRatio(imgRef.current.naturalWidth / imgRef.current.naturalHeight);
    }
  }, [node.attrs.src]);

  const handleImageLoad = (e) => {
    const img = e.target;
    const { naturalWidth, naturalHeight, parentElement } = img;
    setAspectRatio(naturalWidth / naturalHeight);

    // If no width/height set, use natural dimensions (limited by MAX_WIDTH, but use responsive parent for future)
    if (!node.attrs.width && !node.attrs.height) {
      const width = Math.min(naturalWidth, MAX_WIDTH);
      const height = width / (naturalWidth / naturalHeight);
      setDimensions({ width, height });
      updateAttributes({ width, height });
    }
  };

  const handleMouseDown = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    
    activeHandle.current = handle;
    setIsResizing(true);
    setShowTooltip(true);
    
    const currentWidth = imgRef.current?.offsetWidth || parseInt(dimensions.width, 10) || 0;
    const currentHeight = imgRef.current?.offsetHeight || parseInt(dimensions.height, 10) || 0;
    
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: currentWidth,
      height: currentHeight,
    };
  }, [dimensions]);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !aspectRatio) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    const handle = activeHandle.current;
    
    let newWidth = startPos.current.width;
    let newHeight = startPos.current.height;
    const maintainAspectRatio = !e.shiftKey; // Shift key disables aspect ratio

    // Calculate based on handle position
    switch (handle) {
      case 'se': // Southeast (bottom-right)
        newWidth = startPos.current.width + deltaX;
        break;
      case 'sw': // Southwest (bottom-left)
        newWidth = startPos.current.width - deltaX;
        break;
      case 'ne': // Northeast (top-right)
        newWidth = startPos.current.width + deltaX;
        break;
      case 'nw': // Northwest (top-left)
        newWidth = startPos.current.width - deltaX;
        break;
      default:
        break;
    }

    // Enforce minimum size
    newWidth = Math.max(50, newWidth);

    if (maintainAspectRatio) {
      newHeight = newWidth / aspectRatio;
    } else {
      // Free resize with shift key
      switch (handle) {
        case 'se':
        case 'sw':
          newHeight = startPos.current.height + deltaY;
          break;
        case 'ne':
        case 'nw':
          newHeight = startPos.current.height - deltaY;
          break;
        default:
          break;
      }
      newHeight = Math.max(50, newHeight);
    }

    setDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) });
  }, [isResizing, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setShowTooltip(false);
      updateAttributes({
        width: dimensions.width,
        height: dimensions.height,
      });
      activeHandle.current = null;
    }
  }, [isResizing, dimensions, updateAttributes]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleImageClick = useCallback((e) => {
    // If image has a link and we're not in edit mode (selected), open the link
    if (node.attrs.href && !selected) {
      e.preventDefault();
      e.stopPropagation();
      try {
        window.open(node.attrs.href, node.attrs.target || '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Failed to open link:', err);
      }
    }
  }, [node.attrs.href, node.attrs.target, selected]);

  const handleStyle = {
    position: 'absolute',
    width: '12px',
    height: '12px',
    background: '#4A90E2',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'pointer',
    opacity: selected ? 1 : 0,
    transition: 'opacity 0.2s',
    zIndex: 10,
    padding: 0,
    boxSizing: 'border-box',
  };

  const align = node.attrs.align || 'left';
  const wrapperStyle = {
    position: 'relative',
    display: 'block',
    width: '100%',
    textAlign: align === 'left' ? 'left' : align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
    margin: 0,  // Remove all margins
    padding: 0, // Remove all padding
    lineHeight: 0, // Collapse line height to prevent extra space
  };

  return (
    <NodeViewWrapper style={wrapperStyle} >
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          maxWidth: '100%',
          marginBottom: 8 ,
        }}
      >
        {node.attrs.href && !selected ? (
          // Wrap in clickable div when image has link and is not selected
          <div
            role="button"
            tabIndex={0}
            onClick={handleImageClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleImageClick(e);
              }
            }}
            style={{
              cursor: 'pointer',
              display: 'inline-block',
            }}
          >
            <img
              ref={imgRef}
              src={node.attrs.src}
              alt={node.attrs.alt || ''}
              title={node.attrs.title || ''}
              onLoad={handleImageLoad}
              style={{
                width: typeof dimensions.width === 'number' ? `${dimensions.width}px` : dimensions.width,
                height: typeof dimensions.height === 'number' ? `${dimensions.height}px` : dimensions.height,
                maxWidth: '100%',
                display: 'block',
                border: 'none',
                pointerEvents: 'none', // Prevent direct image clicks
                margin: 0, // Remove margin
                padding: 0, // Remove padding
              }}
              draggable={false}
            />
          </div>
        ) : (
          // Regular image when no link or in edit mode
          <img
            ref={imgRef}
            src={node.attrs.src}
            alt={node.attrs.alt || ''}
            title={node.attrs.title || ''}
            onLoad={handleImageLoad}
            style={{
              width: typeof dimensions.width === 'number' ? `${dimensions.width}px` : dimensions.width,
              height: typeof dimensions.height === 'number' ? `${dimensions.height}px` : dimensions.height,
              maxWidth: '100%',
              display: 'block',
              border: selected ? '2px solid #4A90E2' : 'none',
              cursor: selected ? 'default' : 'pointer',
              margin: 0, // Remove margin
              padding: 0, // Remove padding
            }}
            draggable={false}
          />
        )}
        
        {/* Resize handles - only visible when selected */}
        {selected && (
          <>
            {/* Northwest handle */}
            <button
              style={{
                ...handleStyle,
                top: '-5px',
                left: '-5px',
                cursor: 'nw-resize',
              }}
              type="button"
              aria-label="Resize image from top-left"
              tabIndex={0}
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
            />
            
            {/* Northeast handle */}
            <button
              style={{
                ...handleStyle,
                top: '-5px',
                right: '-5px',
                cursor: 'ne-resize',
              }}
              type="button"
              aria-label="Resize image from top-right"
              tabIndex={0}
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
            />
            
            {/* Southwest handle */}
            <button
              style={{
                ...handleStyle,
                bottom: '-5px',
                left: '-5px',
                cursor: 'sw-resize',
              }}
              type="button"
              aria-label="Resize image from bottom-left"
              tabIndex={0}
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
            />
            
            {/* Southeast handle */}
            <button
              style={{
                ...handleStyle,
                bottom: '-5px',
                right: '-5px',
                cursor: 'se-resize',
              }}
              type="button"
              aria-label="Resize image from bottom-right"
              tabIndex={0}
              onMouseDown={(e) => handleMouseDown(e, 'se')}
            />
          </>
        )}
        
        {/* Dimension tooltip */}
        {showTooltip && isResizing && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 255, 255, 0.8)',
              color: 'black',
              padding: '10px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          >
            {Math.round(dimensions.width)} × {Math.round(dimensions.height)} px
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Custom Image extension with resize support
export const ResizableImage = Node.create({
  name: 'image',
  
  group: 'block',
  
  draggable: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      align: {
        default: 'left',
      },
      href: {
        default: null,
      },
      target: {
        default: '_blank',
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const element = dom;
          
          // Get alignment from parent element's text-align style
          let align = 'left';
          let href = null;
          let target = '_blank';
          
          // Check if image is inside an anchor tag
          let parent = element.parentElement;
          while (parent && parent.tagName !== 'BODY') {
            if (parent.tagName === 'A') {
              href = parent.getAttribute('href');
              target = parent.getAttribute('target') || '_blank';
              break;
            }
            parent = parent.parentElement;
          }
          
          // If not in anchor, check parent's text-align for alignment
          if (!href && element.parentElement) {
            const { textAlign } = window.getComputedStyle(element.parentElement);
            if (textAlign === 'center' || textAlign === 'right' || textAlign === 'left') {
              align = textAlign;
            }
          }
          
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: element.getAttribute('width') || element.style.width || null,
            height: element.getAttribute('height') || element.style.height || null,
            align: element.getAttribute('data-align') || align,
            href,
            target,
          };
        },
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    const { align: alignAttr, href, target: targetAttr, ...otherAttrs } = HTMLAttributes;
    const align = alignAttr || 'left';
    const target = targetAttr || '_blank';
    const attrs = { ...otherAttrs };
    
    // Store align in data attribute for parsing
    attrs['data-align'] = align;
    
    // Build image element
    const imgElement = ['img', attrs];
    
    // If image has a link, wrap in anchor tag
    if (href) {
      const anchorElement = ['a', { href, target, rel: 'noopener noreferrer', style: 'cursor: pointer;' }, imgElement];
      // Wrap anchor in div with text-align for email compatibility
      return ['div', { style: `text-align: ${align}; width: 100%;` }, anchorElement];
    }
    
    // No link, wrap in div with text-align for email compatibility
    return ['div', { style: `text-align: ${align}; width: 100%;` }, imgElement];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
  
  addCommands() {
    return {
      setImage: (options) => ({ commands }) =>
        commands.insertContent({
          type: this.name,
          attrs: options,
        }),
    };
  },
});