import { useEffect } from 'react';

/**
 * Attaches an always-visible custom horizontal scrollbar below every
 * `.overflow-x-auto` element that overflows. iOS Safari hides native
 * overlay scrollbars even with -webkit-appearance: none, so we render
 * our own thumb+track and sync it with the container's scrollLeft.
 */
export default function useGlobalScrollbars() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const setupContainer = (container: HTMLElement) => {
      if (container.dataset.gsbInit === '1') return;
      container.dataset.gsbInit = '1';

      const rail = document.createElement('div');
      rail.className = 'gsb-rail';
      const thumb = document.createElement('div');
      thumb.className = 'gsb-thumb';
      rail.appendChild(thumb);
      container.insertAdjacentElement('afterend', rail);

      const updateThumb = () => {
        const cw = container.clientWidth;
        const sw = container.scrollWidth;
        if (sw <= cw + 1) {
          rail.style.display = 'none';
          return;
        }
        rail.style.display = '';
        const railWidth = rail.clientWidth;
        const natural = (cw / sw) * railWidth;
        const thumbWidth = Math.min(railWidth * 0.3, Math.max(32, natural));
        const maxScroll = sw - cw;
        const ratio = maxScroll ? container.scrollLeft / maxScroll : 0;
        const maxThumbX = Math.max(0, railWidth - thumbWidth);
        thumb.style.width = `${thumbWidth}px`;
        thumb.style.transform = `translateX(${ratio * maxThumbX}px)`;
      };

      updateThumb();
      // Re-check after layout settles (data-driven tables size async)
      setTimeout(updateThumb, 100);
      setTimeout(updateThumb, 500);

      const onScroll = () => updateThumb();
      container.addEventListener('scroll', onScroll, { passive: true });

      const ro = new ResizeObserver(updateThumb);
      ro.observe(container);

      let dragging = false;
      let startX = 0;
      let startScroll = 0;
      const startDrag = (clientX: number) => {
        dragging = true;
        startX = clientX;
        startScroll = container.scrollLeft;
        document.body.style.userSelect = 'none';
        thumb.classList.add('gsb-thumb-active');
      };
      const moveDrag = (clientX: number) => {
        if (!dragging) return;
        const railWidth = rail.clientWidth;
        const thumbWidth = thumb.clientWidth;
        const maxThumbX = Math.max(1, railWidth - thumbWidth);
        const maxScroll = container.scrollWidth - container.clientWidth;
        const r = maxScroll / maxThumbX;
        container.scrollLeft = startScroll + (clientX - startX) * r;
      };
      const endDrag = () => {
        dragging = false;
        document.body.style.userSelect = '';
        thumb.classList.remove('gsb-thumb-active');
      };

      const onMouseDown = (e: MouseEvent) => { e.preventDefault(); startDrag(e.clientX); };
      const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX);
      const onMouseUp = () => endDrag();
      const onTouchStart = (e: TouchEvent) => startDrag(e.touches[0].clientX);
      const onTouchMove = (e: TouchEvent) => moveDrag(e.touches[0].clientX);
      const onTouchEnd = () => endDrag();

      thumb.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      thumb.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: true });
      document.addEventListener('touchend', onTouchEnd);

      cleanups.push(() => {
        container.removeEventListener('scroll', onScroll);
        thumb.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        thumb.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        ro.disconnect();
        rail.remove();
        delete container.dataset.gsbInit;
      });
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>('.overflow-x-auto').forEach(setupContainer);
    };

    scan();
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach(fn => fn());
    };
  }, []);
}
