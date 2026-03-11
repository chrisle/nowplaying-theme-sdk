import { useState } from "react";

interface AlbumArtProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-[170px] h-[170px]",
};

function ArtworkPlaceholder({ size }: { size: "sm" | "md" | "lg" | "xl" }) {
  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-20 h-20",
  };

  return (
    <div className={`${sizes[size]} rounded bg-black flex items-center justify-center flex-shrink-0`}>
      <svg
        className={`${iconSizes[size]} text-white/80`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    </div>
  );
}

/**
 * AlbumArt component displays album artwork with loading states and error handling.
 * Uses a black background with music note icon as fallback.
 */
export function AlbumArt({
  src,
  alt = "Album artwork",
  size = "md",
  className = "",
}: AlbumArtProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return <ArtworkPlaceholder size={size} />;
  }

  return (
    <div className={`relative ${sizes[size]} rounded overflow-hidden flex-shrink-0 ${className}`}>
      <img
        key={src}
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          imageLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <ArtworkPlaceholder size={size} />
      </div>
    </div>
  );
}
