(function(){
  'use strict';

  // Compatibility layer for the existing React rate controls.
  // It only persists the three global cargo parameters and reloads the app
  // so the server-rendered UI starts from the saved values. It deliberately
  // does not touch table rows, inputs, or save orders to the API.
  const CNY_KEY = 'cargo_cny_byn_rate';
  const USDKG_KEY = 'cargo_shipping_usd_per_kg';
  const USD_BYN_KEY = 'cargo_usd_byn_rate';
  let reloadTimer = 0;

  const toPositiveNumber = (value) => {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const persist = ({ cny, usdPerKg, usdByn }) => {
    const cnyValue = toPositiveNumber(cny);
    const usdPerKgValue = toPositiveNumber(usdPerKg);
    const usdBynValue = toPositiveNumber(usdByn);

    if (cnyValue !== null) localStorage.setItem(CNY_KEY, String(cnyValue));
    if (usdPerKgValue !== null) localStorage.setItem(USDKG_KEY, String(usdPerKgValue));
    if (usdBynValue !== null) localStorage.setItem(USD_BYN_KEY, String(usdBynValue));

    window.dispatchEvent(new CustomEvent('cargo-rates-changed', {
      detail: { cny: cnyValue, usdPerKg: usdPerKgValue, usdByn: usdBynValue }
    }));

    clearTimeout(reloadTimer);
    reloadTimer = window.setTimeout(() => window.location.reload(), 650);
  };

  window.applyCnyRateLive = function(value){
    persist({ cny: value });
  };

  window.persistCnyRate = function(value){
    persist({ cny: value });
  };

  window.saveCargoRates = function(usdPerKg, usdByn){
    persist({ usdPerKg, usdByn });
  };
})();
