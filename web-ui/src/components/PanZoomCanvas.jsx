import React, { useCallback, useEffect, useRef, useState } from 'react';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const DEFAULT_TRANSFORM = { x: 40, y: 40, scale: 1 };

// A Figma/Fusion-360-trackpad-style pan/zoom viewport: plain two-finger
// trackpad scroll (or a plain mouse wheel) pans; a pinch gesture or
// ctrl/cmd+scroll zooms, centered on the cursor; middle-mouse-button drag
// also pans, for mouse users who prefer a drag gesture over ctrl+scroll.
//
// The wheel listener is attached manually (not via React's onWheel) because
// React registers wheel handlers as passive by default, which silently
// ignores preventDefault() and lets the whole page scroll instead of just
// panning the canvas.
export default function PanZoomCanvas({ children }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const dragRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setTransform((t) => {
        if (e.ctrlKey) {
          // Pinch-to-zoom (browsers report this as wheel+ctrlKey) or an
          // explicit ctrl/cmd+scroll - zoom in/out, keeping the point
          // under the cursor fixed on screen.
          const zoomFactor = Math.exp(-e.deltaY * 0.01);
          const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.scale * zoomFactor));
          const ratio = newScale / t.scale;
          return {
            scale: newScale,
            x: cursorX - (cursorX - t.x) * ratio,
            y: cursorY - (cursorY - t.y) * ratio,
          };
        }
        // Plain scroll (trackpad two-finger pan, or a mouse wheel) - pan.
        return { ...t, x: t.x - e.deltaX, y: t.y - e.deltaY };
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 1) return; // middle mouse button only
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: transform };
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const { startX, startY, origin } = dragRef.current;
    setTransform({ ...origin, x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
  }, []);

  const stopDragging = useCallback(() => {
    dragRef.current = null;
  }, []);

  const resetView = useCallback(() => setTransform(DEFAULT_TRANSFORM), []);

  // The cutting-mat grid lives on this outer container as a CSS background
  // (a real DOM element can't be "infinite"), with its position/size kept in
  // sync with the content transform below so it reads as one pannable,
  // zoomable surface rather than two independently-moving layers.
  const gridSize = 20 * transform.scale;
  const majorGridSize = gridSize * 5;

  return (
    <div
      ref={containerRef}
      className="pan-zoom-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px, ${transform.x}px ${transform.y}px, ${transform.x}px ${transform.y}px, ${transform.x}px ${transform.y}px`,
        backgroundSize: `${majorGridSize}px ${majorGridSize}px, ${majorGridSize}px ${majorGridSize}px, ${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px`,
      }}
    >
      <div
        className="pan-zoom-content"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        {children}
      </div>
      <button className="pan-zoom-reset" onClick={resetView} title="Reset pan/zoom">
        Reset View
      </button>
    </div>
  );
}
