import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xbox Cast | WebRTC Screen Mirroring',
  description: 'Transmite la pantalla de tu Mac/PC directamente a tu consola Xbox en red local con baja latencia.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#107C10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-xbox-dark text-white min-h-screen selection:bg-xbox-green selection:text-white">
        {children}
      </body>
    </html>
  );
}
