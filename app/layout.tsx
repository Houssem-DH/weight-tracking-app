// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WeightWise Pro",
  description: "Ultra-modern weight tracking application with cloud sync",
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
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Ultra modern background */}
          <div className="relative min-h-screen bg-[#070A12] overflow-hidden">
            {/* Ambient gradient glows */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-purple-500/15 blur-[120px]" />
              <div className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-blue-500/15 blur-[140px]" />
              <div className="absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[150px]" />
            </div>

            {/* Subtle grid overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:60px_60px] opacity-[0.35]" />

            {/* Content */}
            <div className="relative z-10 flex min-h-screen flex-col">
              {children}

              <Toaster
                theme="dark"
                className="toaster group"
                toastOptions={{
                  classNames: {
                    toast:
                      "group toast group-[.toaster]:bg-gray-950/90 group-[.toaster]:text-gray-50 group-[.toaster]:border-white/10 group-[.toaster]:shadow-xl backdrop-blur-xl",
                    description: "group-[.toast]:text-gray-300",
                    actionButton:
                      "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                      "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                  },
                }}
              />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
