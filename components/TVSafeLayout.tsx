import React from 'react';

interface TVSafeLayoutProps {
  children: React.ReactNode;
  className?: string;
  isTV?: boolean;
}

/**
 * TVSafeLayout añade márgenes de seguridad (overscan safe area)
 * para evitar que elementos de la interfaz queden recortados en bordes de televisores.
 */
export function TVSafeLayout({ children, className = '', isTV = false }: TVSafeLayoutProps) {
  return (
    <div
      className={`min-h-screen w-full bg-xbox-dark text-white overflow-x-clip ${
        isTV ? 'p-8 md:p-14 lg:p-20 select-none' : 'p-4 md:p-8'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto min-h-full flex-1 flex flex-col w-full">{children}</div>
    </div>
  );
}
