import React, { useState, useEffect, useRef } from 'react';

const THUMB_HEIGHT = 42;

export const CustomScrollbar: React.FC = () => {
  const [isInStory, setIsInStory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const dragStartScrollYRef = useRef(0);
  const isInStoryRef = useRef(false);

  // Zero-re-render scroll thumb positioning & cached scene bounds check
  useEffect(() => {
    let rafId = 0;
    let ticking = false;
    let maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    let trackHeight = trackRef.current?.clientHeight || window.innerHeight - 128;
    let vh = window.innerHeight;
    let storyRanges: Array<{ top: number; bottom: number }> = [];

    const measureLayout = () => {
      vh = window.innerHeight;
      maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
      if (trackRef.current) {
        trackHeight = trackRef.current.clientHeight;
      }
      const scrollY = window.scrollY;
      const storyScenes = document.querySelectorAll('[data-story-scene="true"], [id^="movie-scene"]');
      const ranges: Array<{ top: number; bottom: number }> = [];
      storyScenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        ranges.push({
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY,
        });
      });
      storyRanges = ranges;
    };

    const updateFrame = () => {
      ticking = false;
      const scrollY = window.scrollY;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;

      if (thumbRef.current) {
        const maxTravel = Math.max(0, trackHeight - THUMB_HEIGHT);
        const y = progress * maxTravel;
        thumbRef.current.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      }

      // Check story intersection against cached document-space ranges (0 layout reads on scroll)
      let inStory = false;
      const viewTop = scrollY + vh * 0.15;
      const viewBottom = scrollY + vh * 0.85;
      for (let i = 0; i < storyRanges.length; i++) {
        const r = storyRanges[i];
        if (r.top < viewBottom && r.bottom > viewTop) {
          inStory = true;
          break;
        }
      }

      if (inStory !== isInStoryRef.current) {
        isInStoryRef.current = inStory;
        setIsInStory(inStory);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(updateFrame);
      }
    };

    const onResize = () => {
      measureLayout();
      onScroll();
    };

    measureLayout();
    updateFrame();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measureLayout();
            updateFrame();
          })
        : null;
    if (resizeObserver) {
      resizeObserver.observe(document.documentElement);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
    };
  }, []);

  // Dragging handling
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollYRef.current = window.scrollY;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    const trackHeight = trackRef.current.clientHeight || 1;
    const deltaY = e.clientY - dragStartYRef.current;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollChange = (deltaY / trackHeight) * maxScroll;
    window.scrollTo({
      top: dragStartScrollYRef.current + scrollChange,
      behavior: 'auto',
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Click on track to jump
  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target !== trackRef.current) return;
    const trackRect = trackRef.current.getBoundingClientRect();
    const clickRatio = (e.clientY - trackRect.top) / trackRect.height;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: clickRatio * maxScroll,
      behavior: 'smooth',
    });
  };

  // Custom scrollbar is only visible when NOT in story scenes
  const isVisible = !isInStory;

  return (
    <div
      aria-hidden="true"
      className={`fixed top-16 bottom-16 right-2 sm:right-3.5 z-40 w-1 sm:w-1.5 flex flex-col items-center pointer-events-none transition-all duration-400 ease-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
      }`}
    >
      {/* Custom Scroll Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative w-full h-full rounded-full bg-white/10 hover:bg-white/20 transition-colors pointer-events-auto cursor-pointer"
      >
        {/* Custom Scroll Thumb */}
        <div
          ref={thumbRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute top-0 left-0 right-0 rounded-full cursor-grab active:cursor-grabbing will-change-transform ${
            isDragging ? 'bg-[#fef08a]' : 'bg-[#c9a47a] hover:bg-[#fef08a]'
          } shadow-[0_0_8px_rgba(201,164,122,0.6)]`}
          style={{
            height: `${THUMB_HEIGHT}px`,
            transform: 'translate3d(0, 0px, 0)',
            touchAction: 'none',
          }}
        />
      </div>
    </div>
  );
};

export default CustomScrollbar;
