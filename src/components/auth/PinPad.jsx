/**
 * Module 8: PIN Pad Component
 * A reusable 4-6 digit PIN entry with number pad and dot indicators.
 * Auto-submits when the final digit is entered.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PinPad({ pinLength = 4, onSubmit, error, disabled, className }) {
  const [pin, setPin] = useState('');

  // Reset pin when error changes
  useEffect(() => {
    if (error) setPin('');
  }, [error]);

  const handleDigit = useCallback((digit) => {
    if (disabled) return;
    setPin((prev) => {
      if (prev.length >= pinLength) return prev;
      const next = prev + digit;
      if (next.length === pinLength) {
        // Auto-submit on last digit
        setTimeout(() => onSubmit?.(next), 80);
      }
      return next;
    });
  }, [pinLength, onSubmit, disabled]);

  const handleBackspace = useCallback(() => {
    if (disabled) return;
    setPin((prev) => prev.slice(0, -1));
  }, [disabled]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    setPin('');
  }, [disabled]);

  // Keyboard support: listen for digit keys, backspace, escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleDigit, handleBackspace, handleClear]);

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* Dot indicators */}
      <div className="flex items-center gap-3">
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all duration-150',
              i < pin.length
                ? 'bg-indigo-500 border-indigo-500 scale-110'
                : 'border-slate-500 bg-transparent',
              error && i < pin.length && 'bg-red-500 border-red-500'
            )}
          />
        ))}
      </div>

      {/* Error text */}
      {error && (
        <p className="text-sm text-red-400 animate-pulse">{error}</p>
      )}

      {/* Number grid */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            className="w-16 h-16 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 
                       text-white text-2xl font-semibold transition-all duration-100
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center"
            onClick={() => handleDigit(String(n))}
          >
            {n}
          </button>
        ))}

        {/* Bottom row: Clear, 0, Backspace */}
        <button
          type="button"
          disabled={disabled}
          className="w-16 h-16 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium
                     transition-all disabled:opacity-40 flex items-center justify-center"
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled}
          className="w-16 h-16 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 
                     text-white text-2xl font-semibold transition-all duration-100
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center"
          onClick={() => handleDigit('0')}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          className="w-16 h-16 rounded-xl bg-white/5 hover:bg-white/10 text-white/60
                     transition-all disabled:opacity-40 flex items-center justify-center"
          onClick={handleBackspace}
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
