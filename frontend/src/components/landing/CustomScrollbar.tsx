import React, { useState, useEffect, useRef } from 'react';

export const CustomScrollbar: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isInStory, setIsInStory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const dragStartScrollYRef = useRef(0);

  // Check scroll progress and whether the viewport is inside any story scenes
  useEffect(() => {
    const updateScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;
      setScrollProgress(progress);

      // Detect if viewport intersects any story scenes ([data-story-scene="true"] or [id^="movie-scene"])
      const storyScenes = document.querySelectorAll('[data-story-scene="true"], [id^="movie-scene"]');
      let inStory = false;
      const vh = window.innerHeight;

      storyScenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        // Custom scrollbar is hidden if the story scene is in view (occupying more than 15% of viewport)
        if (rect.top < vh * 0.85 && rect.bottom > vh * 0.15) {
          inStory = true;
        }
      });

      setIsInStory(inStory);
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    updateScroll();

    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
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
    const trackRect = trackRef.current.getBoundingClientRect();
    const deltaY = e.clientY - dragStartYRef.current;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollChange = (deltaY / trackRect.height) * maxScroll;
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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute left-0 right-0 rounded-full transition-transform duration-75 cursor-grab active:cursor-grabbing ${
            isDragging ? 'bg-[#fef08a] scale-125' : 'bg-[#c9a47a] hover:bg-[#fef08a]'
          } shadow-[0_0_8px_rgba(201,164,122,0.6)]`}
          style={{
            height: '42px',
            top: `calc(${scrollProgress * 100}% - ${scrollProgress * 42}px)`,
            touchAction: 'none',
          }}
        />
      </div>
    </div>
  );
};

export default CustomScrollbar;
