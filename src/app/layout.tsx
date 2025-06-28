
import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { Head } from 'next/document';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';

const cairo = Cairo({
  subsets: ['arabic'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'تطبيق شركة الهمشري',
  description: 'تطبيق إدارة الخدمات',
  keywords: 'الهمشري, إدارة, خدمات, تطبيق',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <Head>
        <title>تطبيق شركة الهمشري</title>
        <meta name="description" content="تطبيق إدارة الخدمات" />
      </Head>
      <body className={`${cairo.variable} font-body antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
