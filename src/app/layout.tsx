import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Traffic Assistant - Chatbot Inteligente',
  description: 'Asistente de tráfico con predicción LSTM y lógica difusa. Consulta el estado del tráfico en tiempo real y obtén sugerencias de rutas óptimas.',
  keywords: 'tráfico, chatbot, predicción, rutas, congestión, California',
  authors: [{ name: 'Traffic Assistant' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
