import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'SynapseSketch',
  description: 'SynapseSketch AI Canvas',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="overflow-hidden no-scrollbar bg-white dark:bg-[#0f1115]">{children}</body>
    </html>
  );
}
