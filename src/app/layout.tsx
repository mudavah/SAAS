import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastContextProvider } from "@/components/ui/use-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KaziFlow — Run Your Kenyan Business Smarter",
    template: "%s | KaziFlow",
  },
  description:
    "Affordable invoicing, client management, M-Pesa payments, and AI assistance for freelancers and small businesses in Kenya and Africa.",
  keywords: [
    "invoicing Kenya",
    "M-Pesa business",
    "freelancer tools",
    "small business Kenya",
    "invoice app Africa",
  ],
  authors: [{ name: "KaziFlow" }],
  openGraph: {
    title: "KaziFlow — Business Management for Kenya",
    description:
      "Invoices, clients, payments & AI tools in one affordable platform.",
    url: "https://kaziflow.co.ke",
    siteName: "KaziFlow",
    locale: "en_KE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <QueryProvider>
              <ToastContextProvider>{children}</ToastContextProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
