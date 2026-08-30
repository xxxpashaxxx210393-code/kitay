(function () {
  "use strict";

  const CNY_KEY = "cargo_cny_byn_rate";
  const USD_KG_KEY = "cargo_shipping_usd_per_kg";
  const USD_BYN_KEY = "cargo_usd_byn_rate";
  const PROJECT_KEY = "cargo_current_project";
  const PEOPLE_PREFIX = "cargo_people_";
  const peopleKey = () => PEOPLE_PREFIX + (localStorage.getItem(PROJECT_KEY) || "1");
  const num = (key, fallback) => {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

  function table() {
    return Array.from(document.querySelectorAll("table")).find((t) => {
      const text = t.textContent || "";
      return text.includes("Трек-номер Китая") && text.includes("Статус");
    });
  }

  function headerIndex(table, names) {
    const heads = Array.from(table.querySelectorAll("thead th"));
    const wanted = names.map((x) => clean(x).toLowerCase());
    return heads.findIndex((h) => wanted.includes(clean(h.textContent).toLowerCase()));
  }

  function inputIn(row, index) {
    if (index < 0) return null;
    return row.children[index]?.querySelector("input,select");
  }

  function valueIn(row, index, fallback = 0) {
    const input = inputIn(row, index);
    if (input) return Number(input.value) || 0;
    return Number(String(row.children[index]?.textContent || "").replace(/[^0-9.,-]/g, "").replace(",", ".")) || fallback;
  }

  function textIn(row, index) {
    return clean(row.children[index]?.textContent || "");
  }

  function recalcRow(row, map) {
    if (!row || row.dataset.cargoCalcFix === "1") return;
    const qty = valueIn(row, map.qty, 1) || 1;
    const price = valueIn(row, map.price, 0);
    const weight = valueIn(row, map.weight, 0);
    const rb = valueIn(row, map.rb, 0);
    const shippingUsd = valueIn(row, map.shippingUsd, weight * num(USD_KG_KEY, 5.5));
    const cnyRate = num(CNY_KEY, 0.48);
    const usdRate = num(USD_BYN_KEY, 3.25);
    const total = qty * price * cnyRate + shippingUsd * usdRate + rb;
    const cell = row.children[map.grand];
    if (cell) {
      cell.innerHTML = `<span style="font-weight:800">${total.toFixed(2)}</span> <span style="font-size:9px;color:#64748b">BYN</span>`;
    }
  }

  function updateCalculatedShipping(row, map) {
    const weight = valueIn(row, map.weight, 0);
    const shipping = inputIn(row, map.shippingUsd);
    if (!shipping || shipping.dataset.manual === "1") return;
    const next = (weight * num(USD_KG_KEY, 5.5)).toFixed(2);
    if (Number(shipping.value) !== Number(next)) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(shipping, next); else shipping.value = next;
      shipping.dispatchEvent(new Event("input", { bubbles: true }));
      shipping.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function styleTable(t) {
    t.style.background = "#ffffff";
    t.style.borderCollapse = "separate";
    t.style.borderSpacing = "0";
    t.style.tableLayout = "fixed";
    t.style.width = "100%";
    t.style.minWidth = "0";
    const wrap = t.parentElement;
    if (wrap) {
      wrap.style.overflowX = "hidden";
      wrap.style.maxWidth = "100%";
    }
    t.querySelectorAll("thead th").forEach((h) => {
      h.style.background = "#f8fafc";
      h.style.color = "#475569";
      h.style.borderColor = "#e2e8f0";
    });
    t.querySelectorAll("tbody tr").forEach((row) => {
      row.style.background = "#ffffff";
      row.style.color = "#334155";
      row.querySelectorAll("td").forEach((cell) => {
        cell.style.borderColor = "#e2e8f0";
        cell.style.verticalAlign = "middle";
        cell.style.background = "transparent";
      });
      row.addEventListener("mouseenter", () => { row.style.background = "#f8fafc"; });
      row.addEventListener("mouseleave", () => { row.style.background = "#ffffff"; });
    });

    t.querySelectorAll("input, select").forEach((el) => {
      if (el.closest("#cargo-shipping-center-control")) return;
      el.style.background = "transparent";
      el.style.borderColor = "transparent";
      el.style.color = "#334155";
      el.style.boxShadow = "none";
      el.addEventListener("mouseenter", () => {
        el.style.background = "#111827";
        el.style.borderColor = "#111827";
        el.style.color = "#f8fafc";
      });
      el.addEventListener("focus", () => {
        el.style.background = "#111827";
        el.style.borderColor = "#334155";
        el.style.color = "#f8fafc";
      });
      el.addEventListener("mouseleave", () => {
        if (document.activeElement !== el) {
          el.style.background = "transparent";
          el.style.borderColor = "transparent";
          el.style.color = "#334155";
        }
      });
      el.addEventListener("blur", () => {
        el.style.background = "transparent";
        el.style.borderColor = "transparent";
        el.style.color = "#334155";
      });
    });
  }

  function moveRecipientIntoProduct(t, map) {
    if (map.name < 0 || map.whom < 0 || map.name === map.whom) return;
    t.querySelectorAll("tbody tr").forEach((row) => {
      if (row.dataset.cargoRecipientMoved === "1") return;
      const nameCell = row.children[map.name];
      const whomCell = row.children[map.whom];
      if (!nameCell || !whomCell) return;
      const recipient = whomCell.querySelector("input");
      if (!recipient) return;
      recipient.style.marginTop = "3px";
      recipient.style.fontSize = "10px";
      recipient.style.fontFamily = "sans-serif";
      recipient.style.color = "#64748b";
      recipient.placeholder = "Для кого";
      const holder = document.createElement("div");
      holder.style.cssText = "margin-top:2px;color:#94a3b8;font-size:9px;font-weight:700;";
      holder.textContent = "Для кого";
      const link = nameCell.querySelector("a");
      if (link) link.insertAdjacentElement("afterend", recipient);
      else nameCell.appendChild(recipient);
      row.dataset.cargoRecipientMoved = "1";
      whomCell.style.display = "none";
      const person = clean(recipient.value);
      if (person) addPerson(person);
      recipient.addEventListener("blur", () => addPerson(recipient.value));
    });
  }

  function addPerson(value) {
    const person = clean(value);
    if (!person) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(peopleKey()) || "[]"); } catch {}
    if (!Array.isArray(list)) list = [];
    if (!list.some((x) => clean(x).toLowerCase() === person.toLowerCase())) {
      list.push(person);
      localStorage.setItem(peopleKey(), JSON.stringify(list));
    }
    const dl = document.getElementById("cargo-people-list-inline");
    if (dl && !Array.from(dl.options).some((o) => clean(o.value).toLowerCase() === person.toLowerCase())) {
      const option = document.createElement("option");
      option.value = person;
      dl.appendChild(option);
    }
    document.querySelectorAll("select").forEach((select) => {
      const hasRecipientFilter = Array.from(select.options).some((o) => clean(o.textContent).includes("Все получатели"));
      if (!hasRecipientFilter) return;
      if (!Array.from(select.options).some((o) => clean(o.textContent).toLowerCase() === person.toLowerCase())) {
        const option = document.createElement("option");
        option.value = person;
        option.textContent = person;
        select.appendChild(option);
      }
    });
  }

  function fixPeopleList() {
    const dl = document.getElementById("cargo-people-list-inline");
    if (!dl) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(peopleKey()) || "[]"); } catch {}
    if (!Array.isArray(list)) return;
    list.forEach(addPerson);
  }

  function bindCenter(t, map) {
    const center = document.getElementById("cargo-shipping-center-control");
    if (!center || center.dataset.calcFix === "1") return;
    center.dataset.calcFix = "1";
    ["cargo-cny-byn", "cargo-usd-per-kg", "cargo-usd-byn"].forEach((id) => {
      const input = center.querySelector(`#${id}`);
      if (!input) return;
      input.addEventListener("input", () => {
        setTimeout(() => {
          if (id === "cargo-cny-byn") localStorage.setItem(CNY_KEY, String(Number(input.value) || 0));
          if (id === "cargo-usd-per-kg") localStorage.setItem(USD_KG_KEY, String(Number(input.value) || 0));
          if (id === "cargo-usd-byn") localStorage.setItem(USD_BYN_KEY, String(Number(input.value) || 0));
          t.querySelectorAll("tbody tr").forEach((row) => {
            updateCalculatedShipping(row, map);
            recalcRow(row, map);
          });
        }, 0);
      });
    });
  }

  function run() {
    const t = table();
    if (!t) return;
    const map = {
      name: headerIndex(t, ["Название товара"]),
      whom: headerIndex(t, ["Для кого"]),
      track: headerIndex(t, ["Трек-номер Китая"]),
      status: headerIndex(t, ["Статус доставки (Клик для смены)", "Статус"]),
      qty: headerIndex(t, ["Кол-во"]),
      price: headerIndex(t, ["Цена за ед., CNY"]),
      shippingUsd: headerIndex(t, ["Дост. $", "Доставка $"]),
      rb: headerIndex(t, ["Дост. В (BYN)", "Доставка по РБ"]),
      grand: headerIndex(t, ["Итого с доставкой, BYN"]),
      weight: headerIndex(t, ["Вес (кг)"])
    };
    styleTable(t);
    moveRecipientIntoProduct(t, map);
    fixPeopleList();
    bindCenter(t, map);
    t.querySelectorAll("tbody tr").forEach((row) => {
      const shipping = inputIn(row, map.shippingUsd);
      if (shipping && shipping.dataset.fixManualBound !== "1") {
        shipping.dataset.fixManualBound = "1";
        shipping.addEventListener("input", () => { shipping.dataset.manual = "1"; });
      }
      updateCalculatedShipping(row, map);
      recalcRow(row, map);
    });
  }

  let timer;
  const boot = () => { clearTimeout(timer); timer = setTimeout(run, 100); };
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setInterval(run, 1800);
})();
