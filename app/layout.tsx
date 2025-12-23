// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weight Tracking App", // Changed app name
  description: "Ultra-modern weight tracking application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            {children}
            <Toaster
              theme="dark"
              className="toaster group"
              toastOptions={{
                classNames: {
                  toast:
                    "group toast group-[.toaster]:bg-gray-900 group-[.toaster]:text-gray-50 group-[.toaster]:border-gray-800 group-[.toaster]:shadow-lg",
                  description: "group-[.toast]:text-gray-300",
                  actionButton:
                    "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                  cancelButton:
                    "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
              }}
            />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
