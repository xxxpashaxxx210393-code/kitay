import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./cargo-ui.css";
import "./design-experiment.css";
import ChinaDesignShell from "./china-design-shell";

export const metadata: Metadata = {
  title: "Китай → Беларусь | Мои покупки и заказы",
  description: "Учет заказов из Китая, трек-номеров и себестоимости в Беларуси",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <ChinaDesignShell>{children}</ChinaDesignShell>
      </body>
    </html>
  );
}
