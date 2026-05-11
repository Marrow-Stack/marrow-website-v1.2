import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { RefractiveDock } from "@/components/navbar";
import { Background } from "@/components/ui/background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marrow | Engineered UI Blocks",
  description: "A curated collection of high-performance & beautifully engineered blocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body 
        className="font-sans antialiased"
      >
        
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          <Background className="fixed inset-0 z-0 pointer-events-none" />
          <RefractiveDock />
          
          <main className="bg-background text-foreground">
            {children}
          </main>
        </ThemeProvider>
      </body>

    </html>
  );
}
