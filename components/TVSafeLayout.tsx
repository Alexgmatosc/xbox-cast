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
      className={`min-h-screen w-full bg-xbox-dark text-white select-none overflow-x-hidden ${
        isTV ? 'p-8 md:p-14 lg:p-20' : 'p-4 md:p-8'
      } ${className}`}
      style={{
        overscrollBehavior: 'none',
      }}
    >
      <div className="max-w-7xl mx-auto h-full flex flex-col">{children}</div>
    </div>
  );
}
