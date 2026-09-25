'use client';

import React, { useRef, useEffect } from 'react';
import { Delete, ArrowRight } from 'lucide-react';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  onComplete?: (pin: string) => void;
  autoFocus?: boolean;
}

export function PinInput({
  value,
  onChange,
  length = 4,
  onComplete,
  autoFocus = true,
}: PinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const handleDigitChange = (index: number, digit: string) => {
    // Tomar solo el último caracter numérico o alfanumérico
    const char = digit.slice(-1).toUpperCase();
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = char || ' ';
    const newValue = chars.join('').trimEnd();
    onChange(newValue);

    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newValue.replace(/\s/g, '').length === length && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  // Botón virtual del teclado en pantalla para mando de Xbox
  const handleVirtualKey = (key: string) => {
    if (key === 'BACK') {
      onChange(value.slice(0, -1));
      const targetIndex = Math.max(0, value.length - 1);
      inputsRef.current[targetIndex]?.focus();
      return;
    }

    if (value.length < length) {
      const nextVal = value + key;
      onChange(nextVal);
      const nextIndex = Math.min(length - 1, nextVal.length);
      inputsRef.current[nextIndex]?.focus();

      if (nextVal.length === length && onComplete) {
        onComplete(nextVal);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Casillas del PIN */}
      <div className="flex items-center gap-3 sm:gap-4">
        {Array.from({ length }).map((_, index) => {
          const char = value[index] || '';
          return (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={char}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28 text-center text-3xl sm:text-4xl md:text-5xl font-mono font-bold bg-zinc-900 border-2 border-zinc-700 rounded-2xl text-white focus:border-xbox-green focus:outline-none focus:ring-4 focus:ring-xbox-green/30 transition-all shadow-lg"
              placeholder="•"
            />
          );
        })}
      </div>

      {/* Teclado en pantalla optimizado para D-Pad / mando de Xbox */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-xs w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BACK'].map((btn) => (
          <button
            key={btn}
            type="button"
            onClick={() => (btn === 'C' ? onChange('') : handleVirtualKey(btn))}
            tabIndex={0}
            className="h-12 sm:h-14 bg-zinc-900/90 hover:bg-zinc-800 active:bg-xbox-green focus:bg-xbox-green focus:text-white border border-zinc-800 focus:border-xbox-green rounded-xl text-lg sm:text-xl font-mono font-semibold transition-colors flex items-center justify-center shadow"
          >
            {btn === 'BACK' ? (
              <Delete className="w-5 h-5" />
            ) : btn === 'C' ? (
              <span className="text-zinc-500 font-sans text-sm">Borrar</span>
            ) : (
              btn
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
