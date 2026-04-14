import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  title: string;
  children: React.ReactElement;
}

export default function Tooltip({ title, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (show && triggerRef.current && tipRef.current) {
      const tr = triggerRef.current.getBoundingClientRect();
      const tip = tipRef.current.getBoundingClientRect();
      let left = tr.left + tr.width / 2 - tip.width / 2;
      let top = tr.top - tip.height - 8;
      // Keep within viewport
      if (top < 4) top = tr.bottom + 8;
      if (left < 4) left = 4;
      if (left + tip.width > window.innerWidth - 4) left = window.innerWidth - tip.width - 4;
      setPos({ left, top });
      timerRef.current = setTimeout(() => setVisible(true), 10);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show]);

  const handleEnter = () => { setShow(true); };
  const handleLeave = () => { setVisible(false); setTimeout(() => setShow(false), 150); };

  if (!title) return children;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{ display: 'inline-flex', maxWidth: '100%', overflow: 'hidden' }}
      >
        {children}
      </div>
      {show && (
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
          {/* Arrow */}
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
        </div>
      )}
    </>
  );
}
