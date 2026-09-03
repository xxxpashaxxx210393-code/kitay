(function(){
"use strict";
if(document.getElementById("cargo-unified-theme"))return;
const s=document.createElement("style");s.id="cargo-unified-theme";s.textContent=`
:root{--cargo-bg:#0b1428;--cargo-panel:#111d34;--cargo-border:rgba(92,118,158,.38);--cargo-border-soft:rgba(92,118,158,.24);--cargo-text:#eef4ff;--cargo-muted:#8fa0bd;--cargo-input:#0b1629}
html,body{background:var(--cargo-bg)!important;color:var(--cargo-text)!important}body{min-height:100vh;overflow-x:hidden}
body [class~="bg-white"],body [class*="bg-white/"],body [class~="bg-slate-50"],body [class~="bg-slate-100"],body [class~="bg-gray-50"],body [class~="bg-gray-100"]{background:var(--cargo-panel)!important}
body [class~="text-slate-900"],body [class~="text-slate-800"],body [class~="text-slate-700"],body [class~="text-gray-900"],body [class~="text-gray-800"],body [class~="text-gray-700"]{color:var(--cargo-text)!important}
body [class~="text-slate-600"],body [class~="text-slate-500"],body [class~="text-gray-600"],body [class~="text-gray-500"]{color:var(--cargo-muted)!important}
body [class*="border-slate-200"],body [class*="border-slate-300"],body [class*="border-gray-200"],body [class*="border-gray-300"]{border-color:var(--cargo-border)!important}
body input:not([type="checkbox"]):not([type="radio"]),body select,body textarea{background:var(--cargo-input)!important;color:var(--cargo-text)!important;border-color:var(--cargo-border)!important;border-radius:8px!important}
body input::placeholder,body textarea::placeholder{color:#8fa0bd!important}body select option{background:#0d1930!important;color:#fff!important}
body .rounded-xl,body .rounded-2xl,body .rounded-3xl{border-color:var(--cargo-border-soft)}
table,table tbody,table tfoot,table tr,table td,table th{color:var(--cargo-text)!important;border-color:var(--cargo-border)!important}
table thead th{background:#172642!important;color:#c4d2e8!important}
main{width:100%!important;max-width:none!important;padding-left:28px!important;padding-right:28px!important}
main>.space-y-6,main>.space-y-6>*{width:100%!important;max-width:none!important;min-width:0!important}
main table{width:100%!important;max-width:none!important;min-width:0!important;table-layout:fixed!important;background:#0f1b31!important;border:1px solid #263754!important;border-radius:16px!important;overflow:hidden!important}
main table thead th{position:sticky!important;top:0!important;z-index:5!important;background:#172642!important;padding:9px 6px!important;font-size:10px!important;line-height:1.15!important;letter-spacing:.04em!important;text-transform:uppercase!important;white-space:normal!important}
main table tbody tr{background:#101d34!important}main table tbody tr:nth-child(even){background:#0e1a30!important}main table tbody tr:hover{background:#172946!important;box-shadow:inset 3px 0 #2f7df6!important}
main table td{padding:7px 6px!important;font-size:11px!important;vertical-align:middle!important;border-bottom:1px solid rgba(49,67,99,.55)!important;font-variant-numeric:tabular-nums}
main table a{color:#52baff!important}
/* Cargo financial columns: visually separated like a compact control table. */
main table th.cargo-col-cny,main table td.cargo-col-cny{background:rgba(245,158,11,.075)!important}
main table th.cargo-col-cny{color:#fbbf24!important;border-bottom-color:rgba(245,158,11,.35)!important}
main table th.cargo-col-total,main table td.cargo-col-total{background:rgba(16,185,129,.09)!important}
main table th.cargo-col-total{color:#34d399!important;border-bottom-color:rgba(16,185,129,.35)!important}
main table th.cargo-col-usd,main table td.cargo-col-usd{background:rgba(245,158,11,.10)!important}
main table th.cargo-col-usd{color:#f59e0b!important;border-bottom-color:rgba(245,158,11,.4)!important}
main table th.cargo-col-rb,main table td.cargo-col-rb{background:rgba(59,130,246,.055)!important}
main table th.cargo-col-rb{color:#93c5fd!important}
main table td.cargo-col-cny b,main table td.cargo-col-cny strong{color:#fbbf24!important}
main table td.cargo-col-total b,main table td.cargo-col-total strong{color:#34d399!important}
main table td.cargo-col-usd b,main table td.cargo-col-usd strong{color:#f59e0b!important}
main table td.cargo-col-rb b,main table td.cargo-col-rb strong{color:#93c5fd!important}
main table td.cargo-col-cny,main table td.cargo-col-total,main table td.cargo-col-usd,main table td.cargo-col-rb{box-shadow:inset 1px 0 rgba(255,255,255,.025),inset -1px 0 rgba(255,255,255,.025)}
main table tbody tr:hover td.cargo-col-cny{background:rgba(245,158,11,.13)!important}
main table tbody tr:hover td.cargo-col-total{background:rgba(16,185,129,.14)!important}
main table tbody tr:hover td.cargo-col-usd{background:rgba(245,158,11,.15)!important}
main table tbody tr:hover td.cargo-col-rb{background:rgba(59,130,246,.10)!important}
@media(max-width:900px){main{padding-left:10px!important;padding-right:10px!important}main table{min-width:980px!important}}
`;
document.head.appendChild(s);
function norm(v){return String(v||"").replace(/\s+/g," ").trim().toLowerCase()}
function paint(){
 document.querySelectorAll("main table").forEach(t=>{
  const hs=[...t.querySelectorAll("thead th")];
  hs.forEach((h,i)=>{
   const x=norm(h.textContent);
   let cls="";
   if(x.includes("стоимость, cny")||x.includes("цена cny")||x.includes("итого cny"))cls="cargo-col-cny";
   else if(x.includes("итого")&&x.includes("byn"))cls="cargo-col-total";
   else if(x.includes("доставка")&&(x.includes("$")||x.includes("к→р")))cls="cargo-col-usd";
   else if(x.includes("дост. рб")||x.includes("доставка рб")||x.includes("дост. в")||x.includes("рб, byn"))cls="cargo-col-rb";
   if(cls){h.classList.add(cls);t.querySelectorAll("tbody tr,tfoot tr").forEach(r=>{if(r.children[i])r.children[i].classList.add(cls)})}
  });
 });
}
paint();
new MutationObserver(()=>{clearTimeout(window.__cargoThemePaint);window.__cargoThemePaint=setTimeout(paint,120)}).observe(document.body,{childList:true,subtree:true});
})();
