import { useState } from 'react';
import { getAllCoverUrls } from '../../lib/utils/cover';

interface CoverImageProps {
  comic: any;
  alt: string;
  loading?: 'lazy' | 'eager';
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

export function CoverImage({
  comic,
  alt,
  loading = 'lazy',
  className,
  style,
  onLoad,
  onError,
}: CoverImageProps) {
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [urls] = useState(() => getAllCoverUrls(comic));

  const currentUrl = urls[currentUrlIndex] || null;

  const handleError = () => {
    // Try next URL in the list
    if (currentUrlIndex < urls.length - 1) {
      setCurrentUrlIndex(currentUrlIndex + 1);
    } else {
      // All URLs exhausted
      if (onError) onError();
    }
  };

  if (!currentUrl) {
    return null;
  }

  return (
    <img
      src={currentUrl}
      alt={alt}
      loading={loading}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}
