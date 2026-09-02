(function () {
  const USD_PER_KG_KEY = "cargo_shipping_usd_per_kg";
  const USD_BYN_KEY = "cargo_usd_byn_rate";
  const DEFAULT_USD_PER_KG = 5.5;
  const STYLE_ID = "cargo-polish-v3";
  let modal;
  let observerTimer;

  const getNum = (key, fallback) => {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const usdPerKg = () => getNum(USD_PER_KG_KEY, DEFAULT_USD_PER_KG);

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body { background:#f5f7fb !important; color:#172033 !important; overflow-x:hidden !important; }
      main { max-width:1600px !important; min-width:0 !important; }
      #cargo-usd-settings { display:none !important; }
      table { width:100% !important; max-width:100% !important; min-width:0 !important; table-layout:fixed !important; border-collapse:separate !important; border-spacing:0 !important; }
      table thead th { height:38px !important; padding:7px 6px !important; background:#eef3fa !important; color:#53627a !important; border-bottom:1px solid #dbe3ef !important; font-size:10px !important; font-weight:800 !important; white-space:nowrap !important; }
      table tbody tr { height:62px !important; }
      table tbody td { height:62px !important; padding:6px !important; background:#fff !important; color:#253149 !important; border-bottom:1px solid #edf1f6 !important; vertical-align:middle !important; overflow:hidden !important; box-sizing:border-box !important; }
      table tbody tr:hover td { background:#f8fbff !important; }
      table tbody td input, table tbody td select { width:100% !important; max-width:100% !important; box-sizing:border-box !important; height:31px !important; min-height:31px !important; border:1px solid #d6deea !important; border-radius:7px !important; background:#fff !important; color:#172033 !important; box-shadow:none !important; font-size:10px !important; font-weight:600 !important; }
      table tbody td input:focus, table tbody td select:focus { outline:none !important; border-color:#6b8cff !important; box-shadow:0 0 0 2px rgba(107,140,255,.12) !important; }
      table tbody td:nth-child(1), table thead th:nth-child(1) { width:28px !important; text-align:center !important; }
      table tbody td:nth-child(2), table thead th:nth-child(2) { width:62px !important; text-align:center !important; }
      table tbody td:nth-child(3), table thead th:nth-child(3) { width:auto !important; }
      table tbody td:nth-child(4), table thead th:nth-child(4) { width:100px !important; }
      table tbody td:nth-child(5), table thead th:nth-child(5) { width:120px !important; }
      table tbody td:nth-child(6), table thead th:nth-child(6) { width:130px !important; }
      table tbody td:nth-child(7), table thead th:nth-child(7) { width:58px !important; }
      table tbody td:nth-child(8), table thead th:nth-child(8) { width:82px !important; }
      table tbody td:nth-child(9), table thead th:nth-child(9) { width:78px !important; }
      table tbody td:nth-child(10), table thead th:nth-child(10) { width:108px !important; }
      table tbody td:nth-child(11), table thead th:nth-child(11) { width:65px !important; }
      table tbody td:nth-child(12), table thead th:nth-child(12) { width:62px !important; }
      table tbody td:nth-child(3) { overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; }
      table tbody td:nth-child(3) a { max-width:100% !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; }
      table tbody td:nth-child(12) { white-space:nowrap !important; }
      table tbody td:nth-child(12) button { margin:0 1px !important; padding:3px !important; }
      table tbody td img { display:block !important; width:48px !important; height:48px !important; max-width:48px !important; object-fit:contain !important; margin:auto !important; border-radius:9px !important; border:1px solid #e1e7f0 !important; background:#fff !important; cursor:zoom-in !important; }
      #cargo-photo-modal { position:fixed; inset:0; z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(15,23,42,.60); backdrop-filter:blur(4px); }
      #cargo-photo-modal[hidden] { display:none !important; }
      #cargo-photo-modal .cargo-photo-card { position:relative; width:min(620px,94vw); height:min(680px,88vh); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:14px; background:#fff; border:1px solid #e1e7f0; border-radius:18px; box-shadow:0 25px 80px rgba(15,23,42,.28); box-sizing:border-box; }
      #cargo-photo-modal img { display:block; max-width:100%; max-height:calc(100% - 34px); object-fit:contain; border-radius:11px; }
      #cargo-photo-modal button { position:absolute; top:9px; right:9px; width:34px; height:34px; border:0; border-radius:50%; background:#f1f5f9; color:#334155; font-size:22px; line-height:1; cursor:pointer; z-index:2; }
      #cargo-photo-title { width:100%; box-sizing:border-box; padding:8px 4px 0; font:700 12px sans-serif; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      @media (max-width:900px) {
        main { padding-left:10px !important; padding-right:10px !important; }
        table thead th { font-size:9px !important; padding:6px 4px !important; }
        table tbody td { padding:5px 4px !important; }
        table tbody td:nth-child(5), table thead th:nth-child(5), table tbody td:nth-child(8), table thead th:nth-child(8), table tbody td:nth-child(9), table thead th:nth-child(9), table tbody td:nth-child(10), table thead th:nth-child(10), table tbody td:nth-child(11), table thead th:nth-child(11) { display:none !important; }
        table tbody td:nth-child(1), table thead th:nth-child(1) { width:26px !important; }
        table tbody td:nth-child(2), table thead th:nth-child(2) { width:52px !important; }
        table tbody td:nth-child(3), table thead th:nth-child(3) { width:auto !important; }
        table tbody td:nth-child(4), table thead th:nth-child(4) { width:82px !important; }
        table tbody td:nth-child(6), table thead th:nth-child(6) { width:108px !important; }
        table tbody td:nth-child(7), table thead th:nth-child(7) { width:46px !important; }
        table tbody td:nth-child(12), table thead th:nth-child(12) { width:54px !important; }
        table tbody tr, table tbody td { height:58px !important; }
        table tbody td img { width:42px !important; height:42px !important; max-width:42px !important; }
        table tbody td input, table tbody td select { height:29px !important; min-height:29px !important; font-size:9px !important; padding:3px 4px !important; }
      }
      @media (max-width:560px) {
        main { width:100% !important; padding:7px !important; }
        table tbody td:nth-child(1), table thead th:nth-child(1) { display:none !important; }
        table tbody td:nth-child(2), table thead th:nth-child(2) { width:46px !important; }
        table tbody td:nth-child(4), table thead th:nth-child(4) { width:72px !important; }
        table tbody td:nth-child(6), table thead th:nth-child(6) { width:88px !important; }
        table tbody td:nth-child(7), table thead th:nth-child(7) { width:40px !important; }
        table tbody td:nth-child(12), table thead th:nth-child(12) { width:42px !important; }
        table tbody tr, table tbody td { height:54px !important; }
        table tbody td img { width:38px !important; height:38px !important; }
        table tbody td:nth-child(3) { font-size:9px !important; }
        table tbody td:nth-child(12) button { padding:2px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePhotoModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "cargo-photo-modal";
    modal.hidden = true;
    modal.innerHTML = '<div class="cargo-photo-card"><button type="button" aria-label="Закрыть">×</button><img alt="Фото товара"><div id="cargo-photo-title"></div></div>';
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; };
    modal.querySelector("button").addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return modal;
  }

  function bindPhotoZoom() {
    ensurePhotoModal();
    document.querySelectorAll("table tbody img").forEach(img => {
      if (img.dataset.cargoZoom === "1") return;
      if (!img.src) return;
      img.dataset.cargoZoom = "1";
      img.title = "Нажмите, чтобы увеличить";
      img.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        const big = modal.querySelector("img");
        big.src = img.currentSrc || img.src;
        modal.querySelector("#cargo-photo-title").textContent = img.alt || "Фото товара";
        modal.hidden = false;
      });
    });
  }

  function hideDuplicateSettings() {
    const box = document.getElementById("cargo-usd-settings");
    if (box) box.remove();
  }

  function patchFetch() {
    if (window.__cargoUsdFetchPatchedV3) return;
    window.__cargoUsdFetchPatchedV3 = true;
    const original = window.fetch.bind(window);
    window.fetch = function(input, init) {
      try {
        const url = typeof input === "string" ? input : input.url;
        const method = (init?.method || (typeof input !== "string" ? input.method : "GET") || "GET").toUpperCase();
        if (url.includes("/api/orders") && (method === "POST" || method === "PUT") && init?.body) {
          const payload = JSON.parse(init.body);
          if (payload && payload.weight !== undefined && payload.shippingChinaUsd === undefined) {
            payload.shippingChinaUsd = Number((Number(payload.weight || 0) * usdPerKg()).toFixed(2));
            init = { ...init, body: JSON.stringify(payload) };
          }
        }
      } catch {}
      return original(input, init);
    };
  }

  function refresh() {
    injectStyle();
    hideDuplicateSettings();
    patchFetch();
    bindPhotoZoom();
    const table = Array.from(document.querySelectorAll("table")).find(t => {
      const text = (t.textContent || "").toLowerCase();
      return text.includes("трек-номер китая") && text.includes("статус");
    });
    if (table) {
      table.style.width = "100%";
      table.style.maxWidth = "100%";
      table.style.minWidth = "0";
      table.style.tableLayout = "fixed";
    }
  }

  function start() {
    refresh();
    if (!window.__cargoPolishObserverV3 && document.body) {
      window.__cargoPolishObserverV3 = new MutationObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(refresh, 300);
      });
      window.__cargoPolishObserverV3.observe(document.body, { childList:true, subtree:true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
