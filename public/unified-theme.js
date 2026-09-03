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
@media(max-width:900px){main{padding-left:10px!important;padding-right:10px!important}main table{min-width:980px!important}}
`;
document.head.appendChild(s);
})();
