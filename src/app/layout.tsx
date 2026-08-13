import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "КАРГО-КОНТРОЛЬ 🇨🇳 ➔ 🇧🇾 Трекер заказов из Китая",
  description: "Простое и быстрое управление заказами, трек-номерами и авторасчет себестоимости в РБ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
