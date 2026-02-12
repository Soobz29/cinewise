import React, { useState } from 'react';
import { RPDB_BASE_URL, RPDB_API_KEY, TMDB_IMAGE_BASE } from '../constants';

interface PosterImageProps {
  tmdbId: number;
  type: 'movie' | 'tv';
  tmdbPath: string | null;
  alt: string;
  className?: string;
}

const PosterImage: React.FC<PosterImageProps> = ({ tmdbId, type, tmdbPath, alt, className }) => {
  const [error, setError] = useState(false);
  
  // Construct RPDB URL
  // We use fallback=true in the URL parameters, but RPDB behavior can sometimes be tricky
  // so we handle client-side fallback as well.
  const rpdbUrl = `${RPDB_BASE_URL}/${RPDB_API_KEY}/tmdb/poster/${type}/${tmdbId}.jpg?fallback=true`;
  
  // TMDB URL
  const tmdbUrl = tmdbPath ? `${TMDB_IMAGE_BASE}${tmdbPath}` : null;

  // Placeholder URL if both fail
  const placeholderUrl = `https://picsum.photos/300/450?grayscale&blur=2`;

  const handleError = () => {
    if (!error) {
      setError(true);
    }
  };

  // Logic: Try RPDB first. If error, try TMDB. If TMDB is null or error, show placeholder.
  const src = error ? (tmdbUrl || placeholderUrl) : rpdbUrl;

  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover transition-opacity duration-500 ${className}`}
      loading="lazy"
      onError={handleError}
    />
  );
};

export default PosterImage;