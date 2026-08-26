(function () {
  const STORAGE_KEY = "cargo_rate_cny_per_kg";
  const DEFAULT_RATE = 4;

  function getRate() {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(saved) && saved >= 0 ? saved : DEFAULT_RATE;
  }

  function setRate(value) {
    const rate = Number.isFinite(value) && value >= 0 ? value : 0;
    localStorage.setItem(STORAGE_KEY, String(rate));
    return rate;
  }

  function findInputByLabel(text) {
    const labels = Array.from(document.querySelectorAll("label"));
    const label = labels.find((el) => (el.textContent || "").trim().includes(text));
    if (!label) return null;
    const wrapper = label.parentElement;
    return wrapper ? wrapper.querySelector("input") : null;
  }

  function setReactInputValue(input, value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, String(value));
    else input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function updateShippingField() {
    const weightInput = findInputByLabel("Вес товара (кг)");
    const shippingInput = findInputByLabel("Доставка по Китаю (CNY)") || findInputByLabel("Доставка Китай → РБ (CNY)");
    if (!weightInput || !shippingInput) return;
    const weight = Number(weightInput.value) || 0;
    const shipping = Number((weight * getRate()).toFixed(2));
    if (Number(shippingInput.value) !== shipping) setReactInputValue(shippingInput, shipping);
    shippingInput.readOnly = true;
    shippingInput.title = "Рассчитывается автоматически: вес × тариф Китай → РБ";
    shippingInput.style.borderColor = "rgba(16,185,129,.45)";
    shippingInput.style.color = "rgb(110,231,183)";
  }

  function installFormHooks() {
    const weightInput = findInputByLabel("Вес товара (кг)");
    const shippingInput = findInputByLabel("Доставка по Китаю (CNY)") || findInputByLabel("Доставка Китай → РБ (CNY)");
    if (!weightInput || !shippingInput) return;

    const label = shippingInput.parentElement?.querySelector("label");
    if (label && label.textContent?.includes("Доставка по Китаю")) label.textContent = "Доставка Китай → РБ (CNY)";

    if (!weightInput.dataset.shippingHooked) {
      weightInput.dataset.shippingHooked = "1";
      weightInput.addEventListener("input", updateShippingField);
      weightInput.addEventListener("change", updateShippingField);
    }
    updateShippingField();
  }

  function installRateControl() {
    if (document.getElementById("cargo-shipping-rate-control")) return;
    const buttons = Array.from(document.querySelectorAll("button"));
    const rateButton = buttons.find((b) => (b.textContent || "").includes("Изменить курс"));
    if (!rateButton || !rateButton.parentElement) return;

    const box = document.createElement("div");
    box.id = "cargo-shipping-rate-control";
    box.style.cssText = "display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:9px;background:#0f172a;border:1px solid #334155";
    box.innerHTML = '<span style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase">🇨🇳→🇧🇾</span>' +
      '<input id="cargo-shipping-rate" type="number" min="0" step="0.01" style="width:58px;background:transparent;color:#6ee7b7;font:700 12px ui-monospace,monospace;text-align:center;outline:none" />' +
      '<span style="font-size:10px;color:#64748b">CNY/кг</span>';

    rateButton.parentElement.insertBefore(box, rateButton.nextSibling);
    const input = box.querySelector("#cargo-shipping-rate");
    input.value = String(getRate());
    input.addEventListener("change", function () {
      setRate(Number(input.value) || 0);
      updateShippingField();
    });
    input.addEventListener("input", function () {
      setRate(Number(input.value) || 0);
      updateShippingField();
    });
  }

  function patchFetch() {
    if (window.__cargoShippingFetchPatched) return;
    window.__cargoShippingFetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : input.url;
        const method = (init?.method || (typeof input !== "string" ? input.method : "GET") || "GET").toUpperCase();
        if (url.includes("/api/orders") && (method === "POST" || method === "PUT") && init?.body) {
          const payload = JSON.parse(init.body);
          if (payload && payload.weight !== undefined) {
            const weight = Number(payload.weight) || 0;
            payload.shippingChinaCny = Number((weight * getRate()).toFixed(2));
            init = { ...init, body: JSON.stringify(payload) };
          }
        }
      } catch (e) {
        console.warn("Cargo shipping calculation skipped", e);
      }
      return originalFetch(input, init);
    };
  }

  function init() {
    patchFetch();
    installRateControl();
    installFormHooks();
  }

  const observer = new MutationObserver(init);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
