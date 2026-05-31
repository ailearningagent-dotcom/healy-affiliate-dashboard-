import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MarketAI - AI Marketing Agents",
    template: "%s | MarketAI",
  },
  description:
    "AI-powered marketing agents for content creation, prospect research, and sales outreach automation",
  keywords: [
    "AI marketing",
    "content generation",
    "lead generation",
    "sales outreach",
    "marketing automation",
    "AI agents",
    "wellness marketing",
  ],
  authors: [{ name: "MarketAI" }],
  creator: "MarketAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "MarketAI",
    title: "MarketAI - AI Marketing Agents",
    description:
      "AI-powered marketing agents for content creation, prospect research, and sales outreach automation",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('THEME');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <Navigation />
              <main className="ml-0 min-h-screen p-4 pt-20 transition-colors duration-300 lg:ml-64 lg:p-8 lg:pt-8">
                {children}
              </main>
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
