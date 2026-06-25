import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertNotifications } from '@/components/alerts/AlertNotifications';

export const metadata: Metadata = {
  title: 'PaperXent',
  description: 'Paper trading and portfolio analytics platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <AlertNotifications />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
