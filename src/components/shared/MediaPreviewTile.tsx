import React from "react";
import { cn } from "../../utils/cn";

interface MediaPreviewTileProps {
  src: string | null;
  alt: string;
  emptyLabel: React.ReactNode;
  className?: string;
  imageClassName?: string;
}

export const MediaPreviewTile: React.FC<MediaPreviewTileProps> = ({
  src,
  alt,
  emptyLabel,
  className,
  imageClassName,
}) => {
  return (
    <div
      className={cn(
        "flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border-strong bg-bg",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-contain p-2", imageClassName)}
        />
      ) : (
        <span className="px-1 text-center text-xs font-medium text-muted">
          {emptyLabel}
        </span>
      )}
    </div>
  );
};