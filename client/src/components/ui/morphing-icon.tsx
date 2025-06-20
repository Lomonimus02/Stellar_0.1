import React from 'react';
import { cn } from '@/lib/utils';

interface MorphingIconProps {
  isExpanded: boolean;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  ariaLabel?: string; // Optional specific aria-label
}

export const MorphingIcon: React.FC<MorphingIconProps> = ({
  isExpanded,
  onClick,
  className,
  ariaLabel,
}) => {
  const defaultAriaLabel = isExpanded ? "Close menu" : "Open menu";

  return (
    <button
      type="button"
      aria-label={ariaLabel || defaultAriaLabel}
      className={cn("morphing-icon-container", className)}
      onClick={onClick}
    >
      <div className={cn("morphing-icon-line line-1", { 'expanded': isExpanded })} />
      <div className={cn("morphing-icon-line line-2", { 'expanded': isExpanded })} />
      <div className={cn("morphing-icon-line line-3", { 'expanded': isExpanded })} />
    </button>
  );
};
