(function () {
  "use strict";
  if (document.getElementById("cargo-unified-theme")) return;

  const style = document.createElement("style");
  style.id = "cargo-unified-theme";
  style.textContent = `
    :root{--cargo-bg:#0b1428;--cargo-bg-deep:#0b1428;--cargo-panel:#111d34;--cargo-panel-2:#15233d;--cargo-border:rgba(92,118,158,.38);--cargo-border-soft:rgba(92,118,158,.24);--cargo-text:#eef4ff;--cargo-muted:#8fa0bd;--cargo-input:#0b1629}
    html,body{background:var(--cargo-bg)!important;color:var(--cargo-text)!important}body{min-height:100vh;overflow-x:hidden}
    body [class~="bg-white"],body [class*="bg-white/"],body [class~="bg-slate-50"],body [class~="bg-slate-100"],body [class~="bg-gray-50"],body [class~="bg-gray-100"]{background:var(--cargo-panel)!important}
    body [class~="bg-slate-800"],body [class*="bg-slate-800/"],body [class~="bg-slate-900"],body [class*="bg-slate-900/"]{background:var(--cargo-bg-deep)!important}
    body [class~="text-slate-900"],body [class~="text-slate-800"],body [class~="text-slate-700"],body [class~="text-gray-900"],body [class~="text-gray-800"],body [class~="text-gray-700"]{color:var(--cargo-text)!important}
    body [class~="text-slate-600"],body [class~="text-slate-500"],body [class~="text-gray-600"],body [class~="text-gray-500"]{color:var(--cargo-muted)!important}
    body [class*="border-slate-200"],body [class*="border-slate-300"],body [class*="border-gray-200"],body [class*="border-gray-300"]{border-color:var(--cargo-border)!important}
    body input:not([type="checkbox"]):not([type="radio"]),body select,body textarea{background:var(--cargo-input)!important;color:var(--cargo-text)!important;border-color:var(--cargo-border)!important;border-radius:8px!important}
    body input::placeholder,body textarea::placeholder{color:#8fa0bd!important}body select option{background:#0d1930!important;color:#fff!important}
    body .rounded-xl,body .rounded-2xl,body .rounded-3xl{border-color:var(--cargo-border-soft)}
    table,table tbody,table tfoot,table tr,table td,table th{color:var(--cargo-text)!important;border-color:var(--cargo-border)!important}
    table thead th{background:#172642!important;color:#c4d2e8!important}
    table tbody tr:hover{background:#172946!important}
    #cargo-reference-center,#cargo-shipping-rate-control,#cargo-usd-settings,#cargo-shipping-center-control{background:linear-gradient(180deg,#14233e,#101c32)!important;color:var(--cargo-text)!important;border-color:#2b3e5f!important;box-shadow:0 10px 28px rgba(0,0,0,.18)!important}
    body button{border-radius:9px}body a{color:#4db5ff}
    /* Wide desktop workspace */
    main{width:100%!important;max-width:none!important;padding-left:34px!important;padding-right:34px!important}
    main>.space-y-6{width:100%!important;max-width:none!important}
    /* Quiet top bar: all rate controls live in Center Management */
    header .cargo-top-rate-hide{display:none!important}
    /* Table is the primary workspace */
    main table{width:100%!important;max-width:none!important;min-width:0!important;table-layout:fixed!important;background:#0f1b31!important;border:1px solid #263754!important;border-radius:16px!important;overflow:hidden!important}
    main table thead th{position:sticky!important;top:0!important;z-index:5!important;background:#172642!important;padding:11px 8px!important;font-size:10px!important;line-height:1.15!important;letter-spacing:.04em!important;text-transform:uppercase!important;white-space:normal!important}
    main table tbody tr{background:#101d34!important}main table tbody tr:nth-child(even){background:#0e1a30!important}main table tbody tr:hover{background:#172946!important;box-shadow:inset 3px 0 #2f7df6!important}
    main table td{padding:9px 8px!important;font-size:12px!important;vertical-align:middle!important;border-bottom:1px solid rgba(49,67,99,.55)!important;overflow:hidden!important;font-variant-numeric:tabular-nums}
    main table input{background:transparent!important;border-color:transparent!important;color:#eef4ff!important}main table input:hover{background:#12213a!important;border-color:#304665!important}main table input:focus{background:#0b1629!important;border-color:#4b8df8!important;box-shadow:0 0 0 3px rgba(47,125,246,.12)!important}
    main table select{background:#12213a!important;color:#eef4ff!important;border:1px solid #304665!important}
    #cargo-usd-settings{margin-top:10px!important;width:100%!important;box-sizing:border-box!important}
    @media(max-width:900px){main{padding-left:14px!important;padding-right:14px!important}main table{min-width:1040px!important}}
  `;
  document.head.appendChild(style);

  function findExactText(text){
    return Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span")).find(el=>el.children.length===0 && (el.textContent||"").trim()===text);
  }
  function moveRatePanel(){
    const panel=document.getElementById("cargo-usd-settings");
    if(!panel)return;
    const title=findExactText("Центр управления");
    if(!title)return;
    let target=title.parentElement;
    for(let i=0;i<6 && target;i++,target=target.parentElement){
      const text=(target.textContent||"");
      if(text.includes("Центр управления") && text.length<1800){break;}
    }
    if(target && panel.parentElement!==target){
      panel.style.marginTop="10px";
      panel.style.marginLeft="0";
      target.appendChild(panel);
    }
    const topLabel=Array.from(document.querySelectorAll("div,span")).find(el=>(el.textContent||"").trim()==="Курс по умолчанию:");
    if(topLabel){
      let box=topLabel.parentElement;
      if(box && !box.closest("#cargo-usd-settings")) box.classList.add("cargo-top-rate-hide");
    }
  }
  let timer;
  const run=()=>{clearTimeout(timer);timer=setTimeout(moveRatePanel,120)};
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
