import type { Metadata } from "next";
import type { ReactNode } from "react";
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
        <script src="/shipping.js?v=20260903-3" />
        <script src="/unified-theme.js?v=20260903-3" />
        <script src="/mobile-fixes.js?v=20260903-3" />
        <script src="/cargo-fix.js?v=20260903-3" />
        <script src="/cargo-fix2.js?v=20260903-3" />
        <script src="/cargo-excel.js?v=20260903-1" />
      </body>
    </html>
  );
}
