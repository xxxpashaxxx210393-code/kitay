(function(){
  'use strict';
  const CNY_KEY='cargo_cny_byn_rate';
  const USDKG_KEY='cargo_shipping_usd_per_kg';
  const USD_BYN_KEY='cargo_usd_byn_rate';
  let timer=0;
  const n=(v,d=0)=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:d};
  const reloadSoon=()=>{clearTimeout(timer);timer=setTimeout(()=>window.location.reload(),650)};
  const setRates=(cny,usdk,usdb)=>{
    if(Number.isFinite(cny)&&cny>0)localStorage.setItem(CNY_KEY,String(cny));
    if(Number.isFinite(usdk)&&usdk>0)localStorage.setItem(USDKG_KEY,String(usdk));
    if(Number.isFinite(usdb)&&usdb>0)localStorage.setItem(USD_BYN_KEY,String(usdb));
    window.dispatchEvent(new CustomEvent('cargo-rates-changed',{detail:{cny,usdk,usdb}}));
  };
  window.applyCnyRateLive=function(value){const v=n(value,NaN);if(Number.isFinite(v)&&v>0){setRates(v,undefined,undefined);reloadSoon();}};
  window.persistCnyRate=function(value){const v=n(value,NaN);if(Number.isFinite(v)&&v>0){setRates(v,undefined,undefined);reloadSoon();}};
  window.saveCargoRates=function(usdPerKg,usdByn){const a=n(usdPerKg,NaN),b=n(usdByn,NaN);if(Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>0){setRates(undefined,a,b);reloadSoon();}};
  window.addEventListener('cargo-rates-changed',function(){
    document.querySelectorAll('table tbody tr[data-cargo-enhanced="1"]').forEach(row=>{
      const w=n(row.querySelector('input[data-field="weight"]')?.value);
      const rate=n(localStorage.getItem(USDKG_KEY),5.5);
      const inp=row.querySelector('input[data-field="shippingChinaUsd"]');
      if(inp&&inp.dataset.manual!=='1') inp.value=(w*rate).toFixed(2);
    });
  });
})();
