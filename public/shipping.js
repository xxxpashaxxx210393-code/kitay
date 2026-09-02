(function () {
  const USD_PER_KG_KEY = "cargo_shipping_usd_per_kg";
  const USD_BYN_KEY = "cargo_usd_byn_rate";
  const DEFAULT_USD_PER_KG = 5.5;
  const DEFAULT_USD_BYN = 3.25;
  const API = "/api/orders/inline";

  const getNum = (key, fallback) => { const n = Number(localStorage.getItem(key)); return Number.isFinite(n) && n >= 0 ? n : fallback; };
  const setNum = (key, value) => localStorage.setItem(key, String(Number(value) || 0));
  const usdPerKg = () => getNum(USD_PER_KG_KEY, DEFAULT_USD_PER_KG);
  const usdByn = () => getNum(USD_BYN_KEY, DEFAULT_USD_BYN);

  function setReactInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, String(value)); else input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function saveField(id, field, value, input) {
    const numberFields = ["quantity","priceCny","weight","shippingBelarusByn","shippingChinaUsd"];
    const normalized = numberFields.includes(field) ? (Number(value) || 0) : String(value ?? "");
    fetch(API, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,field,value:normalized}) })
      .then(r=>r.json()).then(j=>{ if(!j.success) throw new Error(j.error||"Ошибка сохранения"); if(input?.style){input.style.borderColor="rgba(16,185,129,.7)";setTimeout(()=>input.style.borderColor="",900);} })
      .catch(err=>{ console.error("Inline save error",err); if(input?.style) input.style.borderColor="rgba(239,68,68,.9)"; });
  }

  function makeInput(cell,id,field,value,type,extra) {
    cell.innerHTML=""; const input=document.createElement("input"); input.type=type||"text"; input.value=value??"";
    if(type==="number"){input.step=extra?.step||"0.01";input.min=extra?.min||"0";}
    input.style.cssText="width:100%;box-sizing:border-box;background:#fff;border:1px solid #d1d5db;border-radius:7px;color:#111827;padding:4px 5px;font:600 10px ui-monospace,monospace;outline:none;";
    input.title="Изменение сохраняется после выхода из поля"; input.addEventListener("keydown",e=>{if(e.key==="Enter")input.blur();}); input.addEventListener("blur",()=>saveField(id,field,input.value,input)); cell.appendChild(input); return input;
  }

  function makePersonInput(cell,id,value,people) {
    cell.innerHTML=""; const input=document.createElement("input"); input.setAttribute("list","cargo-people-list"); input.value=value||"";
    input.style.cssText="width:100%;box-sizing:border-box;background:#fff;border:1px solid #d1d5db;border-radius:7px;color:#111827;padding:4px 5px;font:600 10px sans-serif;outline:none;";
    input.addEventListener("keydown",e=>{if(e.key==="Enter")input.blur();}); input.addEventListener("blur",()=>saveField(id,"forWhom",input.value.trim(),input)); cell.appendChild(input);
    if(!document.getElementById("cargo-people-list")){const dl=document.createElement("datalist");dl.id="cargo-people-list";people.forEach(p=>{const o=document.createElement("option");o.value=p;dl.appendChild(o);});document.body.appendChild(dl);}
  }

  function makeStatus(cell,id,value){
    cell.innerHTML="";const select=document.createElement("select");
    ["В пути на склад Китая","На складе в Китае","Едет в РБ","Прибыло в РБ","Выдано / Получено"].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;if(s===value)o.selected=true;select.appendChild(o);});
    select.style.cssText="width:100%;box-sizing:border-box;background:#fff;border:1px solid #d1d5db;border-radius:7px;color:#111827;padding:4px 5px;font:600 10px sans-serif;outline:none;";select.addEventListener("change",()=>saveField(id,"status",select.value,select));cell.appendChild(select);
  }

  async function fetchOrders(){try{const ps=Array.from(document.querySelectorAll("select")).find(s=>Array.from(s.options).some(o=>(o.textContent||"").includes("Китай")));const projectId=ps?.value||localStorage.getItem("cargo_current_project")||"1";const r=await fetch(`/api/orders?projectId=${projectId}`);const j=await r.json();return j.success?(j.data||[]):[];}catch{return[];}}
  function findOrdersTable(){return Array.from(document.querySelectorAll("table")).find(t=>(t.textContent||"").includes("Трек-номер Китая")&&(t.textContent||"").includes("Статус"));}
  function headerMap(table){const heads=Array.from(table.querySelectorAll("thead th"));const map={};heads.forEach((th,i)=>{map[(th.textContent||"").replace(/\s+/g," ").trim().toLowerCase()]=i;});return{heads,map};}
  function indexFor(map,variants){for(const v of variants)if(map[v.toLowerCase()]!==undefined)return map[v.toLowerCase()];return-1;}

  function refreshAutoShippingInputs(){
    const rate=usdPerKg();
    document.querySelectorAll('table tbody tr[data-cargo-enhanced="1"]').forEach(row=>{
      const weight=row.querySelector('input[data-cargo-field="weight"]');
      const usd=row.querySelector('input[data-cargo-field="shippingChinaUsd"]');
      if(weight&&usd&&usd.dataset.manual!=="1") setReactInputValue(usd,(Number(weight.value||0)*rate).toFixed(2));
    });
  }

  async function installInlineTable(){
    const table=findOrdersTable();if(!table)return;
    const ps=Array.from(document.querySelectorAll("select")).find(s=>Array.from(s.options).some(o=>(o.textContent||"").includes("Китай")));
    const projectId=ps?.value||localStorage.getItem("cargo_current_project")||"1";
    if(table.dataset.cargoInstalled==="1" && table.dataset.cargoProjectId===String(projectId)) return;

    const {heads,map}=headerMap(table);
    const nameIdx=indexFor(map,["название товара","товар"]),trackIdx=indexFor(map,["трек-номер китая","трек"]),whomIdx=indexFor(map,["для кого"]),statusIdx=indexFor(map,["статус доставки (клик для смены)","статус"]),qtyIdx=indexFor(map,["кол-во"]),weightIdx=indexFor(map,["вес (кг)","вес"]),priceIdx=indexFor(map,["цена за ед., cny","цена cny"]),chinaIdx=indexFor(map,["дост. с (cny)","дост. с"]),rbIdx=indexFor(map,["дост. в (byn)","дост. рб"]),dateIdx=indexFor(map,["срок / дата"]);
    if(dateIdx>=0){heads[dateIdx].style.display="none";table.querySelectorAll(`tbody tr > td:nth-child(${dateIdx+1}),tfoot tr > td:nth-child(${dateIdx+1})`).forEach(c=>c.style.display="none");}
    ["Общая стоимость, CNY","Курс BYN","Цена за ед., BYN","Общая стоимость, BYN","Себест. 1 ед., BYN"].forEach(label=>{const idx=indexFor(map,[label]);if(idx>=0){heads[idx].style.display="none";table.querySelectorAll(`tbody tr > td:nth-child(${idx+1}),tfoot tr > td:nth-child(${idx+1})`).forEach(c=>c.style.display="none");}});
    table.style.width="100%";table.style.minWidth="0";table.style.tableLayout="fixed";table.querySelectorAll("th,td").forEach(c=>{c.style.overflow="hidden";});
    if(chinaIdx>=0){heads[chinaIdx].textContent="Дост. $";heads[chinaIdx].title="$ / кг × вес. Можно изменить вручную.";}

    const orders=await fetchOrders();const byId=new Map(orders.map(o=>[String(o.id),o]));const people=Array.from(new Set(orders.map(o=>o.forWhom).filter(Boolean)));
    Array.from(table.tBodies[0]?.rows||[]).forEach(row=>{
      if(row.dataset.cargoEnhanced==="1")return;
      const cells=Array.from(row.children);const trackText=trackIdx>=0?(cells[trackIdx]?.textContent||"").trim():"";const nameText=nameIdx>=0?(cells[nameIdx]?.textContent||"").replace(/ссылка.*$/i,"").replace(/\s+/g," ").trim():"";
      const o=orders.find(x=>trackText&&x.trackNumber===trackText)||orders.find(x=>nameText&&x.name.replace(/\s+/g," ").trim()===nameText);if(!o||!byId.has(String(o.id)))return;
      row.dataset.cargoEnhanced="1";row.dataset.cargoOrderId=String(o.id);
      if(trackIdx>=0)makeInput(cells[trackIdx],o.id,"trackNumber",o.trackNumber||"","text");
      if(whomIdx>=0)makePersonInput(cells[whomIdx],o.id,o.forWhom||"",people);
      if(statusIdx>=0)makeStatus(cells[statusIdx],o.id,o.status);
      if(qtyIdx>=0)makeInput(cells[qtyIdx],o.id,"quantity",o.quantity||1,"number",{min:"1",step:"1"});
      let weightInput=null,usdInput=null;
      if(weightIdx>=0){weightInput=makeInput(cells[weightIdx],o.id,"weight",o.weight||0,"number",{min:"0",step:"0.01"});weightInput.dataset.cargoField="weight";}
      if(priceIdx>=0){const p=makeInput(cells[priceIdx],o.id,"priceCny",o.priceCny||0,"number",{min:"0",step:"0.01"});p.dataset.cargoField="priceCny";}
      if(chinaIdx>=0){const auto=o.shippingChinaUsd==null||Number(o.shippingChinaUsd)===0;usdInput=makeInput(cells[chinaIdx],o.id,"shippingChinaUsd",auto?((o.weight||0)*usdPerKg()):o.shippingChinaUsd,"number",{min:"0",step:"0.01"});usdInput.dataset.cargoField="shippingChinaUsd";if(!auto)usdInput.dataset.manual="1";usdInput.addEventListener("input",()=>usdInput.dataset.manual="1");if(weightInput)weightInput.addEventListener("input",()=>{if(usdInput.dataset.manual!=="1")setReactInputValue(usdInput,(Number(weightInput.value||0)*usdPerKg()).toFixed(2));});}
      if(rbIdx>=0){const rb=makeInput(cells[rbIdx],o.id,"shippingBelarusByn",o.shippingBelarusByn||0,"number",{min:"0",step:"0.01"});rb.dataset.cargoField="shippingBelarusByn";}
    });
    table.dataset.cargoInstalled="1";table.dataset.cargoProjectId=String(projectId);
  }

  function installSettings(){
    if(document.getElementById("cargo-usd-settings"))return;
    const buttons=Array.from(document.querySelectorAll("button"));const anchor=buttons.find(b=>(b.textContent||"").includes("Изменить курс"))||buttons.find(b=>(b.textContent||"").includes("Экспорт"));if(!anchor?.parentElement)return;
    const box=document.createElement("div");box.id="cargo-usd-settings";box.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:5px 8px;margin-left:6px;border-radius:10px;background:#fff;border:1px solid #e5e7eb;color:#64748b;font:700 10px sans-serif";
    box.innerHTML='<span style="color:#b45309">🚚 Китай → РБ</span><label>$ / кг <input id="cargo-usd-kg" type="number" min="0" step="0.01" style="width:55px;background:#fff;color:#111827;border:1px solid #d1d5db;border-radius:6px;padding:3px;text-align:center"></label><label>USD→BYN <input id="cargo-usd-byn" type="number" min="0" step="0.0001" style="width:62px;background:#fff;color:#111827;border:1px solid #d1d5db;border-radius:6px;padding:3px;text-align:center"></label>';
    anchor.parentElement.appendChild(box);const a=box.querySelector("#cargo-usd-kg"),b=box.querySelector("#cargo-usd-byn");a.value=usdPerKg();b.value=usdByn();
    a.addEventListener("input",()=>{setNum(USD_PER_KG_KEY,a.value);refreshAutoShippingInputs();});
    b.addEventListener("input",()=>setNum(USD_BYN_KEY,b.value));
  }

  function patchFetch(){if(window.__cargoUsdFetchPatched)return;window.__cargoUsdFetchPatched=true;const original=window.fetch.bind(window);window.fetch=function(input,init){try{const url=typeof input==="string"?input:input.url;const method=(init?.method||(typeof input!=="string"?input.method:"GET")||"GET").toUpperCase();if(url.includes("/api/orders")&&(method==="POST"||method==="PUT")&&init?.body){const payload=JSON.parse(init.body);if(payload&&payload.weight!==undefined){const weight=Number(payload.weight)||0;payload.shippingChinaUsd=payload.shippingChinaUsd!==undefined?Number(payload.shippingChinaUsd):Number((weight*usdPerKg()).toFixed(2));init={...init,body:JSON.stringify(payload)};}}}catch{}return original(input,init);};}

  async function init(){patchFetch();installSettings();await installInlineTable();}

  let timer=null;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(init,500);});
  const start=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true});init();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
