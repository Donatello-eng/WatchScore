// src/app/components/PhotoWithPreview.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

type PhotoWithPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
};

export function PhotoWithPreview({ src, alt, className, style }: PhotoWithPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.right + 20,
      });
      setIsHovered(true);
    }
  };

  return (
    <>
      <div 
        ref={anchorRef}
        className={cls("relative cursor-zoom-in group", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        style={style}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-lg border border-slate-700 transition-all duration-300 group-hover:border-blue-400/50"
        />
        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors rounded-lg" />
      </div>

      <Portal>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{ 
                position: 'fixed', 
                top: position.top - 100,
                left: position.left,
                zIndex: 9999 
              }}
              className="pointer-events-none"
            >
              {/* Wrapper Card */}
              <div className="relative flex flex-col gap-2 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
                
                {/* IMAGE CONTAINER FIX:
                    1. w-fit: Wraps the container tightly around the image (no empty square space).
                    2. No fixed height/width: Allows the image to define the shape.
                */}
                <div className="relative w-fit h-fit rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                  <img
                    src={src}
                    alt={`Preview of ${alt}`}
                    // max-h-[60vh]: Allows tall images to grow up to 60% of screen height
                    // w-auto h-auto: Preserves the natural aspect ratio exactly
                    className="block w-auto h-auto max-h-[60vh] max-w-[400px] min-w-[200px]" 
                  />
                  {/* Glossy shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

function cls(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}