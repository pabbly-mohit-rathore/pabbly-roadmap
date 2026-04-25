import { useState, useRef, useEffect, cloneElement, Children } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  title: string;
  children: React.ReactElement;
}

export default function Tooltip({ title, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const autoHideRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (show && triggerRef.current && tipRef.current) {
      const tr = triggerRef.current.getBoundingClientRect();
      const tip = tipRef.current.getBoundingClientRect();
      let left = tr.left + tr.width / 2 - tip.width / 2;
      let top = tr.top - tip.height - 8;
      if (top < 4) top = tr.bottom + 8;
      if (left < 4) left = 4;
      if (left + tip.width > window.innerWidth - 4) left = window.innerWidth - tip.width - 4;
      setPos({ left, top });
      timerRef.current = setTimeout(() => setVisible(true), 10);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show]);

  // Dismiss tooltip on outside tap / scroll on touch devices
  useEffect(() => {
    if (!show) return;
    const dismiss = () => { setVisible(false); setTimeout(() => setShow(false), 150); };
    const onTouchOutside = (e: TouchEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('touchstart', onTouchOutside, { passive: true });
    document.addEventListener('scroll', dismiss, { passive: true, capture: true });
    return () => {
      document.removeEventListener('touchstart', onTouchOutside);
      document.removeEventListener('scroll', dismiss, true);
    };
  }, [show]);

  const handleEnter = () => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    setShow(true);
  };
  const handleLeave = () => { setVisible(false); setTimeout(() => setShow(false), 150); };
  const handleTouchStart = () => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    setShow(true);
    // Auto-dismiss after 2.5s on touch so it doesn't linger
    autoHideRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setShow(false), 150);
    }, 2500);
  };

  useEffect(() => () => { if (autoHideRef.current) clearTimeout(autoHideRef.current); }, []);

  if (!title) return children;

  // Clone the child and attach ref + hover/touch handlers directly to it.
  // This way the Tooltip adds NO extra DOM wrapper — layout stays exactly as the child.
  const child = Children.only(children) as React.ReactElement<any>;
  const enhanced = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      // Preserve existing ref if any
      const origRef = (child as { ref?: unknown }).ref;
      if (typeof origRef === 'function') origRef(node);
      else if (origRef && typeof origRef === 'object') (origRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleEnter();
      if (child.props.onMouseEnter) child.props.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleLeave();
      if (child.props.onMouseLeave) child.props.onMouseLeave(e);
    },
    onTouchStart: (e: React.TouchEvent) => {
      handleTouchStart();
      if (child.props.onTouchStart) child.props.onTouchStart(e);
    },
  });

  return (
    <>
      {enhanced}
      {show && createPortal(
        <div
          ref={tipRef}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            zIndex: 9999,
            pointerEvents: 'none',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
          }}
        >
          <div
            style={{
              background: '#1C252E',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: '6px',
              whiteSpace: 'normal',
              maxWidth: '280px',
              wordBreak: 'break-word',
              lineHeight: '1.6',
            }}
          >
            {title}
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1C252E',
              margin: '0 auto',
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
