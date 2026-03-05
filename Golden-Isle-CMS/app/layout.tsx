import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ClientToaster } from "@/components/providers/ClientToaster";
import { FloatingWhatsApp } from '@/components/ui/FloatingWhatsApp';

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Golden Isle Wholesale | Premium Duty-Free Alcohol Supplier",
  description: "Premium wholesale supplier of whisky, wine, and craft beer. Duty-free prices for businesses in Malaysia. Get your catalog today.",
  keywords: "wholesale alcohol, duty-free, whisky supplier, wine wholesale, craft beer, Malaysia, B2B",
  openGraph: {
    title: "Golden Isle Wholesale | Premium Duty-Free Alcohol Supplier",
    description: "Premium wholesale supplier of whisky, wine, and craft beer. Duty-free prices for businesses in Malaysia. Get your catalog today.",
    type: "website",
    url: "https://goldenislewholesale.com",
    images: [{ url: "https://images.unsplash.com/photo-1569919659476-f0852f682859?q=80&w=1200" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Golden Isle Wholesale | Premium Duty-Free Alcohol Supplier",
    description: "Premium wholesale supplier of whisky, wine, and craft beer. Duty-free prices for businesses in Malaysia. Get your catalog today.",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥃</text></svg>"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.co'} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Golden Isle Wholesale",
              "description": "Premium duty-free alcohol wholesale supplier",
              "url": "https://goldenislewholesale.com"
            })
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${dmSans.variable} ${cormorant.variable} font-body antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
          <ClientToaster />
          <FloatingWhatsApp />
        </ThemeProvider>
      </body>
    </html>
  );
}
