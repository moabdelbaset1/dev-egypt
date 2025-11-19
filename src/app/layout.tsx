import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import "../styles/product-card-animations.css";
import { CartProvider } from "../context/CartContext";
import { CurrencyProvider } from "../context/CurrencyContext";
import { LocationProvider } from "../contexts/LocationContext";
import MarketingPopupProvider from "../components/marketing/marketing-popup-provider";

const roboto = Roboto({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Dav Egypt",
  description: "Dav Egypt WhisperLite page",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} antialiased`}>
        <CurrencyProvider>
          <LocationProvider>
            <CartProvider>
              <MarketingPopupProvider>
                {children}
              </MarketingPopupProvider>
            </CartProvider>
          </LocationProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
