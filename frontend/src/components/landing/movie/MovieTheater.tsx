// src/components/landing/movie/MovieTheater.tsx
// Master scroll-driven movie theater container orchestrating Scenes 1 through 5 inside a unified sticky viewport.

import React from 'react';
import Scene1Packing from './Scene1Packing';

export const MovieTheater: React.FC = () => {
  return (
    <section
      id="movie-theater"
      className="relative w-full bg-[#0b0b0b] text-[#f4efe8]"
      aria-label="The Story of a Saved Delivery"
    >
      <Scene1Packing />
    </section>
  );
};

export default MovieTheater;
