import React from 'react';
import { cn } from '@/lib/utils';

interface BurgerIconProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  // onClick will be inherited from HTMLAttributes<HTMLDivElement>
}

export const BurgerIcon: React.FC<BurgerIconProps> = ({ isOpen, className, ...props }) => {
  const lineCommonStyle = 'h-[2px] w-4 bg-slate-700 rounded-full transition-[transform,opacity] duration-300 ease-in-out origin-center'; // w-5 to w-4, explicit transitions

  // When isOpen is true:
  // Top line rotates -45 degrees and moves down by 4px.
  // Middle line fades out.
  // Bottom line rotates 45 degrees and moves up by 4px.
  const topPartClass = isOpen ? 'rotate-45 translate-y-[4px]' : ''; // translate-y-[8px] to translate-y-[4px]
  const middlePartClass = isOpen ? 'opacity-0' : 'opacity-100';
  const bottomPartClass = isOpen ? '-rotate-45 -translate-y-[4px]' : ''; // -translate-y-[8px] to -translate-y-[4px]

  return (
    <div
      className={cn(
        'cursor-pointer space-y-1 group flex flex-col items-center justify-center', // space-y-1.5 to space-y-1
        className
      )}
      {...props} // Spreads onClick, etc.
    >
      <span className={cn(lineCommonStyle, topPartClass)} />
      <span className={cn(lineCommonStyle, middlePartClass)} />
      <span className={cn(lineCommonStyle, bottomPartClass)} />
    </div>
  );
};
