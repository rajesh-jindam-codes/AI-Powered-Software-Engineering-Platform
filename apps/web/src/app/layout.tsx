import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DEVFLOW AI — AI-Powered Collaborative Software Engineering Platform',
  description:
    'Unifying GitHub integration, codebase RAG, autonomous coding agents, AI code reviews, and real-time multiplayer editing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <WorkspaceProvider>
              <div className="flex min-h-screen bg-background text-foreground">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                  <TopNav />
                  <main className="flex-1 p-8 overflow-y-auto">{children}</main>
                </div>
              </div>
            </WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
