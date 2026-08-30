(function () {
  "use strict";

  if (document.getElementById("cargo-unified-theme")) return;

  const style = document.createElement("style");
  style.id = "cargo-unified-theme";
  style.textContent = `
    :root {
      --cargo-bg: #073b82;
      --cargo-bg-deep: #062f6b;
      --cargo-panel: #0b478f;
      --cargo-panel-2: #0e4f9d;
      --cargo-border: rgba(255,255,255,.16);
      --cargo-border-soft: rgba(255,255,255,.10);
      --cargo-text: #f7fbff;
      --cargo-muted: #b9d1ed;
      --cargo-input: rgba(3,25,65,.34);
    }

    html, body { background: var(--cargo-bg) !important; color: var(--cargo-text) !important; }
    body { min-height: 100vh; }

    /* Единая синяя поверхность для всех основных блоков */
    body [class~="bg-white"],
    body [class*="bg-white/"],
    body [class~="bg-slate-50"],
    body [class~="bg-slate-100"],
    body [class~="bg-gray-50"],
    body [class~="bg-gray-100"] {
      background: var(--cargo-panel) !important;
    }

    body [class~="bg-slate-800"],
    body [class*="bg-slate-800/"],
    body [class~="bg-slate-900"],
    body [class*="bg-slate-900/"] {
      background: var(--cargo-bg-deep) !important;
    }

    body [class~="text-slate-900"], body [class~="text-slate-800"],
    body [class~="text-slate-700"], body [class~="text-gray-900"],
    body [class~="text-gray-800"], body [class~="text-gray-700"] {
      color: var(--cargo-text) !important;
    }

    body [class~="text-slate-600"], body [class~="text-slate-500"],
    body [class~="text-gray-600"], body [class~="text-gray-500"] {
      color: var(--cargo-muted) !important;
    }

    body [class*="border-slate-200"], body [class*="border-slate-300"],
    body [class*="border-gray-200"], body [class*="border-gray-300"] {
      border-color: var(--cargo-border) !important;
    }

    /* Поля и селекты в одном стиле */
    body input:not([type="checkbox"]):not([type="radio"]),
    body select,
    body textarea {
      background: var(--cargo-input) !important;
      color: var(--cargo-text) !important;
      border-color: var(--cargo-border) !important;
      border-radius: 8px !important;
    }

    body input::placeholder, body textarea::placeholder { color: #9db9da !important; }
    body select option { background: #082f6c !important; color: #fff !important; }

    /* Карточки */
    body .rounded-xl, body .rounded-2xl, body .rounded-3xl {
      border-color: var(--cargo-border-soft);
    }

    /* Таблица: без отдельной белой темы */
    table, table tbody, table tfoot, table tr, table td, table th {
      background-color: transparent !important;
      color: var(--cargo-text) !important;
      border-color: var(--cargo-border) !important;
    }
    table thead th { background: rgba(2,25,65,.38) !important; color: #dcecff !important; }
    table tbody tr:hover { background: rgba(255,255,255,.055) !important; }

    /* Блок расчётов / центр управления */
    #cargo-reference-center, #cargo-shipping-rate-control, #cargo-usd-settings,
    #cargo-shipping-center-control {
      background: var(--cargo-panel-2) !important;
      color: var(--cargo-text) !important;
      border-color: var(--cargo-border) !important;
      box-shadow: 0 10px 28px rgba(1,20,55,.16);
    }

    /* Кнопки */
    body button {
      border-radius: 9px;
    }

    /* Ссылки оставляем заметными */
    body a { color: #b9ddff; }
  `;
  document.head.appendChild(style);
})();
