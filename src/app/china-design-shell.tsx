"use client";

import React, { useState } from "react";
import { BarChart3, Boxes, ClipboardList, Menu, Package, Search, Settings2, Truck, Users, X } from "lucide-react";

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function ChinaDesignShell({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const focusSearch = (value: string) => {
    const input = document.querySelector<HTMLInputElement>('main input[placeholder*="Поиск"]');
    setSearch(value);
    if (!input) return;
    setNativeInputValue(input, value);
  };

  const scrollTo = (selector: string) => {
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNavOpen(false);
  };

  const nav = (
    <nav>
      <button className="cx-nav active" onClick={() => scrollTo("main table")}><Package />Товары</button>
      <button className="cx-nav" onClick={() => scrollTo("main .space-y-6 > div:nth-child(2)")}><BarChart3 />Статистика</button>
      <button className="cx-nav" onClick={() => scrollTo("main table")}><ClipboardList />Заказы</button>
      <button className="cx-nav" onClick={() => scrollTo("#status-counters-widget")}><Truck />Статусы доставки</button>
      <button className="cx-nav" onClick={() => scrollTo("#status-counters-widget")}><Boxes />Склад (Китай)</button>
      <button className="cx-nav" onClick={() => scrollTo("#people-stats-widget")}><Users />Получатели</button>
      <button className="cx-nav" onClick={() => scrollTo("#control-center")}><Settings2 />Настройки</button>
    </nav>
  );

  return (
    <div className="cx-shell">
      <aside className="cx-sidebar">
        <div className="cx-brand-small"><div className="cx-brand-mark">🇨🇳</div><div><b>Китай → Беларусь</b><span>Мои покупки и заказы</span></div></div>
        {nav}
        <div className="cx-sidebar-bottom"><div className="cx-tip">📦<br/><b>Покупай проще</b><span>Всё по заказам в одном месте</span></div><small>v1.1.0</small></div>
      </aside>

      {mobileNavOpen && <button className="cx-mobile-backdrop" aria-label="Закрыть меню" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`cx-mobile-drawer ${mobileNavOpen ? "open" : ""}`}>
        <div className="cx-mobile-drawer-head"><div className="cx-brand-mark">🇨🇳</div><b>Китай → Беларусь</b><button onClick={() => setMobileNavOpen(false)}><X size={20}/></button></div>
        {nav}
      </aside>

      <div className="cx-content">
        <div className="cx-topbar">
          <button className="cx-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Открыть меню"><Menu size={21}/></button>
          <div className="cx-top-brand"><div className="cx-flag">🇨🇳</div><div><h1>Китай → Беларусь</h1><span>Мои покупки и заказы</span></div></div>
          <div className="cx-search"><Search size={18}/><input value={search} onChange={e => focusSearch(e.currentTarget.value)} placeholder="Поиск по товарам, получателям, трек-номерам..."/><kbd>⌘ K</kbd></div>
        </div>
        {children}
      </div>
    </div>
  );
}
