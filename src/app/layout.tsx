import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";
import "./cargo-ui.css";

export const metadata: Metadata = {
  title: "КАРГО-КОНТРОЛЬ 🇨🇳 ➔ 🇧🇾 Трекер заказов из Китая",
  description: "Простое и быстрое управление заказами, трек-номеров и авторасчет себестоимости в РБ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
        <Script src="/shipping.js" strategy="afterInteractive" />
        <Script src="/cargo-inline-fallback.js" strategy="afterInteractive" />
        <Script src="/cargo-excel.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
