'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  active?: boolean;
  rippleColor?: string;
  hoverScale?: number;
  tapScale?: number;
  hoverY?: number;
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      children,
      className,
      disabled,
      active,
      rippleColor,
      hoverScale = 1.08,
      tapScale = 0.92,
      hoverY = -1,
      onClick,
      onPointerDown,
      style,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const createRipple = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.2;
      const newRipple: Ripple = {
        id: Date.now() + Math.random(),
        x,
        y,
        size,
      };

      setRipples((prev) => [...prev.slice(-3), newRipple]);
    };

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: hoverScale, y: hoverY }}
        whileTap={disabled ? undefined : { scale: tapScale }}
        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
        onPointerDown={(e) => {
          createRipple(e);
          onPointerDown?.(e);
        }}
        onClick={onClick}
        className={cn(
          'relative overflow-hidden cursor-pointer select-none inline-flex items-center justify-center transition-colors',
          disabled && 'cursor-not-allowed opacity-40',
          className
        )}
        style={style}
        {...(props as any)}
      >
        <span className="relative z-10 flex items-center justify-center gap-1.5 w-full h-full pointer-events-none">
          {children}
        </span>

        {/* Framer Motion Tactile Click Ripple */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              initial={{ scale: 0, opacity: 0.38 }}
              animate={{ scale: 2.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              onAnimationComplete={() => {
                setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
              }}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: ripple.x - ripple.size / 2,
                top: ripple.y - ripple.size / 2,
                width: ripple.size,
                height: ripple.size,
                backgroundColor: rippleColor || 'currentColor',
              }}
            />
          ))}
        </AnimatePresence>
      </motion.button>
    );
  }
);

ToolbarButton.displayName = 'ToolbarButton';

export default ToolbarButton;
