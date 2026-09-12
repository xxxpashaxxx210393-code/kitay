"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Bell, Boxes, ClipboardList, Package, Search, Settings2, Truck, Users } from "lucide-react";

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function ChinaDesignShell({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [rates, setRates] = useState(["0.4800", "5.5"]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const sync = () => {
      const searchInput = document.querySelector<HTMLInputElement>('main input[placeholder*="Поиск"]');
      if (searchInput && searchInput.value !== search) setSearch(searchInput.value);
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-cargo-center] input[type="number"]'));
      if (inputs.length >= 2) setRates(inputs.slice(0, 2).map(i => i.value));
    };
    sync();
    const timer = window.setInterval(() => { sync(); setNow(new Date()); }, 1000);
    return () => window.clearInterval(timer);
  }, [search]);

  const focusSearch = (value: string) => {
    const input = document.querySelector<HTMLInputElement>('main input[placeholder*="Поиск"]');
    if (!input) return;
    setSearch(value);
    setNativeInputValue(input, value);
    input.focus();
  };

  const updateRate = (index: number, value: string) => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-cargo-center] input[type="number"]'));
    const input = inputs[index];
    if (!input) return;
    setRates(prev => prev.map((v, i) => i === index ? value : v));
    setNativeInputValue(input, value);
  };

  const scrollTo = (selector: string) => document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const formattedDate = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedTime = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="cx-shell">
      <aside className="cx-sidebar">
        <div className="cx-brand-small"><div className="cx-brand-mark">🇨🇳</div><div><b>Китай → Беларусь</b><span>Мои покупки и заказы</span></div></div>
        <nav>
          <button className="cx-nav active" onClick={() => scrollTo("main table")}><Package />Товары</button>
          <button className="cx-nav" onClick={() => scrollTo("main .space-y-6 > div:nth-child(2)")}><BarChart3 />Статистика</button>
          <button className="cx-nav" onClick={() => scrollTo("main table")}><ClipboardList />Заказы</button>
          <button className="cx-nav" onClick={() => scrollTo("main [data-cargo-center]")}><Truck />В пути</button>
          <button className="cx-nav" onClick={() => scrollTo("main [data-cargo-center]")}><Boxes />Склад (Китай)</button>
          <button className="cx-nav" onClick={() => scrollTo("main [data-cargo-center]")}><Users />Получатели</button>
          <button className="cx-nav" onClick={() => scrollTo("main [data-cargo-center]")}><Settings2 />Настройки</button>
        </nav>
        <div className="cx-sidebar-bottom"><div className="cx-tip">📦<br/><b>Покупай проще</b><span>Доставляем больше</span></div><small>v1.0.0</small></div>
      </aside>

      <div className="cx-content">
        <div className="cx-topbar">
          <div className="cx-top-brand"><div className="cx-flag">🇨🇳</div><div><h1>Китай → Беларусь</h1><span>Мои покупки и заказы</span></div></div>
          <div className="cx-search"><Search size={18}/><input value={search} onChange={e => focusSearch(e.currentTarget.value)} placeholder="Поиск по товарам, ссылкам, трек-номерам..."/><kbd>⌘ K</kbd></div>
          <label className="cx-rate"><span>Курс CNY → BYN</span><strong><input value={rates[0]} onChange={e => updateRate(0, e.currentTarget.value)} /></strong></label>
          <label className="cx-rate"><span>Карго, $/кг</span><strong><input value={rates[1]} onChange={e => updateRate(1, e.currentTarget.value)} /></strong></label>
          <div className="cx-clock"><span>{formattedDate}</span><b>{formattedTime}</b></div><button className="cx-icon-btn" aria-label="Уведомления"><Bell size={19}/><i>3</i></button><button className="cx-avatar">П</button>
        </div>
        {children}
      </div>
    </div>
  );
}
