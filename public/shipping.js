(function () {
  'use strict';

  const USD_PER_KG_KEY = 'cargo_shipping_usd_per_kg';
  const USD_PER_KG_OLD_KEY = 'cargo_ship_usdkg';
  const USD_BYN_KEY = 'cargo_usd_byn_rate';
  const USD_BYN_OLD_KEY = 'cargo_usdbyn';
  const DEFAULT_USD_PER_KG = 5.5;
  const DEFAULT_USD_BYN = 3.25;
  const API = '/api/orders/inline';
  const STYLE_ID = 'cargo-control-v6';
  let observerTimer = null;
  let photoModal = null;
  let busy = false;

  const num = (value, fallback = 0) => {
    const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : fallback;
  };
  const usdPerKg = () => {
    const v = localStorage.getItem(USD_PER_KG_KEY) ?? localStorage.getItem(USD_PER_KG_OLD_KEY);
    const n = num(v, DEFAULT_USD_PER_KG);
    return n >= 0 ? n : DEFAULT_USD_PER_KG;
  };
  const usdByn = () => {
    const v = localStorage.getItem(USD_BYN_KEY) ?? localStorage.getItem(USD_BYN_OLD_KEY);
    const n = num(v, DEFAULT_USD_BYN);
    return n >= 0 ? n : DEFAULT_USD_BYN;
  };

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html, body { background:#071126 !important; color:#e8eef8 !important; overflow-x:hidden !important; }
      main { width:100% !important; max-width:1680px !important; min-width:0 !important; box-sizing:border-box !important; }
      table { width:100% !important; max-width:none !important; min-width:0 !important; table-layout:fixed !important; border-collapse:separate !important; border-spacing:0 !important; }
      table thead th { height:38px !important; padding:7px 6px !important; background:#101d35 !important; color:#aebdd4 !important; border-bottom:1px solid #263754 !important; font-size:10px !important; font-weight:900 !important; white-space:nowrap !important; }
      table tbody tr { height:62px !important; }
      table tbody td { height:62px !important; padding:6px !important; background:#0b1730 !important; color:#e1e8f4 !important; border-bottom:1px solid #1b2b45 !important; vertical-align:middle !important; overflow:hidden !important; box-sizing:border-box !important; }
      table tbody tr:hover td { background:#11213c !important; }
      table tfoot td { background:#101e37 !important; color:#dce6f3 !important; border-top:1px solid #2a3b59 !important; }
      table tbody td input, table tbody td select { width:100% !important; max-width:100% !important; box-sizing:border-box !important; height:30px !important; min-height:30px !important; padding:4px 7px !important; border:1px solid #2b3c5b !important; border-radius:8px !important; background:#08152b !important; color:#f1f5fb !important; font-size:10px !important; font-weight:800 !important; outline:none !important; }
      table tbody td input:focus, table tbody td select:focus { border-color:#3d82ff !important; box-shadow:0 0 0 2px rgba(61,130,255,.15) !important; }
      table tbody td img { display:block !important; width:48px !important; height:48px !important; max-width:48px !important; object-fit:contain !important; margin:auto !important; border-radius:10px !important; border:1px solid #2a3a56 !important; background:#071126 !important; cursor:zoom-in !important; }
      table tbody td:nth-child(1), table thead th:nth-child(1) { width:32px !important; }
      table tbody td:nth-child(2), table thead th:nth-child(2) { width:62px !important; }
      table tbody td:nth-child(3), table thead th:nth-child(3) { width:auto !important; min-width:150px !important; }
      table tbody td:nth-child(4), table thead th:nth-child(4) { width:90px !important; }
      table tbody td:nth-child(5), table thead th:nth-child(5) { width:118px !important; }
      table tbody td:nth-child(6), table thead th:nth-child(6) { width:125px !important; }
      table tbody td:nth-child(7), table thead th:nth-child(7) { width:55px !important; }
      table tbody td:nth-child(8), table thead th:nth-child(8) { width:82px !important; }
      table tbody td:nth-child(9), table thead th:nth-child(9) { width:82px !important; }
      table tbody td:nth-child(10), table thead th:nth-child(10) { width:70px !important; }
      table tbody td:nth-child(11), table thead th:nth-child(11) { width:82px !important; }
      table tbody td:nth-child(12), table thead th:nth-child(12) { width:82px !important; }
      table tbody td:nth-child(13), table thead th:nth-child(13) { width:98px !important; }
      table tbody td:nth-child(14), table thead th:nth-child(14) { width:98px !important; }
      table tbody td:nth-child(15), table thead th:nth-child(15) { width:112px !important; }
      table tbody td:nth-child(16), table thead th:nth-child(16) { width:100px !important; }
      table tbody td:nth-child(17), table thead th:nth-child(17) { width:70px !important; }
      table tbody td:nth-child(18), table thead th:nth-child(18) { width:104px !important; }
      table tbody td:nth-child(19), table thead th:nth-child(19) { width:64px !important; }
      .cargo-inline-input { font-variant-numeric:tabular-nums !important; }
      .cargo-rate-panel { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 12px; padding:9px 12px; border:1px solid #263754; border-radius:14px; background:#0b1730; box-shadow:0 8px 28px rgba(0,0,0,.16); }
      .cargo-rate-title { font-size:11px; font-weight:900; color:#dce7f6; }
      .cargo-rate-card { display:flex; align-items:center; gap:6px; padding:5px 8px; border:1px solid #2b3d5b; border-radius:9px; background:#0f1e38; }
      .cargo-rate-card span { font-size:9px; color:#91a3c0; font-weight:900; white-space:nowrap; }
      .cargo-rate-card input { width:68px; height:27px; border:1px solid #354969; border-radius:7px; background:#071126; color:#fff; text-align:center; font-size:11px; font-weight:900; outline:none; }
      .cargo-rate-save { height:27px; border:0; border-radius:7px; padding:0 10px; background:#1769e8; color:#fff; font-size:10px; font-weight:900; cursor:pointer; }
      .cargo-rate-save:hover { background:#2d7cff; }
      .cargo-export-extra { display:grid; gap:6px; margin-top:7px; padding-top:7px; border-top:1px solid #243451; }
      .cargo-export-extra button { width:100%; padding:8px 9px; border:1px solid #2b3d5b; border-radius:9px; background:#0e1b33; color:#e7eef8; font-size:11px; font-weight:800; text-align:left; cursor:pointer; }
      .cargo-export-extra button:hover { background:#162744; border-color:#3c5277; }
      .cargo-photo-modal { position:fixed; inset:0; z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:18px; background:rgba(2,8,23,.78); backdrop-filter:blur(5px); }
      .cargo-photo-modal[hidden] { display:none !important; }
      .cargo-photo-card { position:relative; width:min(760px,94vw); height:min(760px,90vh); display:flex; align-items:center; justify-content:center; padding:22px; box-sizing:border-box; border:1px solid #344969; border-radius:18px; background:#0c1830; box-shadow:0 30px 100px rgba(0,0,0,.45); }
      .cargo-photo-card img { max-width:100%; max-height:100%; object-fit:contain; border-radius:12px; }
      .cargo-photo-card button { position:absolute; right:10px; top:10px; width:34px; height:34px; border:0; border-radius:50%; background:#182742; color:#fff; font-size:22px; cursor:pointer; }
      @media (max-width:1100px) { main { padding-left:10px !important; padding-right:10px !important; } table tbody td:nth-child(10), table thead th:nth-child(10), table tbody td:nth-child(11), table thead th:nth-child(11) { display:none !important; } }
      @media (max-width:760px) { table tbody td:nth-child(5), table thead th:nth-child(5), table tbody td:nth-child(8), table thead th:nth-child(8), table tbody td:nth-child(9), table thead th:nth-child(9), table tbody td:nth-child(13), table thead th:nth-child(13), table tbody td:nth-child(14), table thead th:nth-child(14), table tbody td:nth-child(16), table thead th:nth-child(16), table tbody td:nth-child(18), table thead th:nth-child(18) { display:none !important; } table tbody td:nth-child(2), table thead th:nth-child(2) { width:52px !important; } table tbody td:nth-child(3), table thead th:nth-child(3) { min-width:130px !important; } table tbody td:nth-child(6), table thead th:nth-child(6) { width:100px !important; } }
    `;
    document.head.appendChild(style);
  }

  function findOrdersTable() {
    return Array.from(document.querySelectorAll('table')).find(t => {
      const text = (t.textContent || '').toLowerCase();
      return text.includes('трек-номер китая') && text.includes('статус');
    });
  }
  function headerMap(table) {
    const heads = Array.from(table.querySelectorAll('thead th'));
    const map = {}; heads.forEach((th,i) => { map[(th.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()] = i; });
    return { heads, map };
  }
  function indexFor(map, variants) { for (const v of variants) if (map[v.toLowerCase()] !== undefined) return map[v.toLowerCase()]; return -1; }

  async function fetchOrders() {
    try {
      const projectId = localStorage.getItem('cargo_current_project') || '1';
      const r = await fetch(`/api/orders?projectId=${encodeURIComponent(projectId)}&includeImages=0`, { cache:'no-store' });
      const j = await r.json(); return j.success ? (j.data || []) : [];
    } catch { return []; }
  }

  function setReactInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    if (setter) setter.call(input,String(value)); else input.value=String(value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function saveField(id, field, value, input) {
    const numericFields = ['quantity','priceCny','weight','shippingBelarusByn','shippingChinaUsd','shippingUsdByn','rateCnyByn'];
    const normalized = numericFields.includes(field) ? num(value,0) : String(value ?? '');
    return fetch(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Number(id),field,value:normalized})})
      .then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok||!j.success)throw new Error(j.error||`HTTP ${r.status}`);if(input){input.style.borderColor='#18b981';setTimeout(()=>input.style.borderColor='',700);}return j;})
      .catch(err=>{console.error('Inline save error',{id,field,value,err});if(input)input.style.borderColor='#ef4444';throw err;});
  }

  function makeInput(cell,id,field,value,type,extra) {
    cell.innerHTML=''; const input=document.createElement('input'); input.type=type||'text'; input.value=value??''; input.dataset.field=field;
    if(type==='number'){input.step=extra?.step||'0.01';input.min=extra?.min||'0';}
    input.className='cargo-inline-input'; input.title='Сохраняется после выхода из поля';
    input.addEventListener('keydown',e=>{if(e.key==='Enter')input.blur();});
    const save=async()=>{const raw=input.value;if(type==='number'){const n=num(raw,NaN);if(!Number.isFinite(n)){input.value='0';return;}await saveField(id,field,n,input);if(field==='weight'){const shippingUsd=Number((n*usdPerKg()).toFixed(2));const shippingInput=input.closest('tr')?.querySelector('input[data-field="shippingChinaUsd"]');if(shippingInput&&shippingInput.dataset.manual!=='1')shippingInput.value=shippingUsd.toFixed(2);try{await saveField(id,'shippingChinaUsd',shippingUsd,shippingInput||input);}catch(err){console.warn('Автоматическое сохранение доставки пропущено',err);}}}else await saveField(id,field,raw,input);};
    input.addEventListener('blur',()=>save().catch(()=>{})); cell.appendChild(input); return input;
  }

  function makePersonInput(cell,id,value,people) {
    cell.innerHTML=''; const input=document.createElement('input'); input.setAttribute('list','cargo-people-list'); input.value=value||''; input.dataset.field='forWhom'; input.className='cargo-inline-input';
    input.addEventListener('keydown',e=>{if(e.key==='Enter')input.blur();}); input.addEventListener('blur',()=>saveField(id,'forWhom',input.value.trim(),input).catch(()=>{})); cell.appendChild(input);
    let dl=document.getElementById('cargo-people-list'); if(!dl){dl=document.createElement('datalist');dl.id='cargo-people-list';document.body.appendChild(dl);} dl.innerHTML=''; people.forEach(p=>{const o=document.createElement('option');o.value=p;dl.appendChild(o);});
  }

  function makeStatus(cell,id,value) {
    cell.innerHTML=''; const select=document.createElement('select');
    ['В пути на склад Китая','На складе в Китае','Едет в РБ','Прибыло в РБ','Выдано / Получено'].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;o.selected=s===value;select.appendChild(o);});
    select.className='cargo-inline-input'; select.dataset.field='status'; select.addEventListener('change',()=>saveField(id,'status',select.value,select).catch(()=>{})); cell.appendChild(select);
  }

  function updateRowCalculation(row,indexes) {
    const cells=Array.from(row.children);
    const weight=num(cells[indexes.weightIdx]?.querySelector('input')?.value,num(cells[indexes.weightIdx]?.textContent));
    const qty=Math.max(1,num(cells[indexes.qtyIdx]?.querySelector('input')?.value,num(cells[indexes.qtyIdx]?.textContent)));
    const price=num(cells[indexes.priceIdx]?.querySelector('input')?.value,num(cells[indexes.priceIdx]?.textContent));
    const rb=num(cells[indexes.rbIdx]?.querySelector('input')?.value,num(cells[indexes.rbIdx]?.textContent));
    const rate=num(cells[indexes.rateIdx]?.textContent,0.48); const usd=weight*usdPerKg(); const chinaByn=usd*usdByn(); const goodsByn=qty*price*rate; const total=goodsByn+chinaByn+rb;
    if(indexes.chinaIdx>=0&&!cells[indexes.chinaIdx].querySelector('input'))cells[indexes.chinaIdx].textContent=usd.toFixed(2)+' $';
    if(indexes.totalIdx>=0)cells[indexes.totalIdx].innerHTML=`<strong>${total.toFixed(2)}</strong> <span style="font-size:9px;color:#7f91ad">BYN</span>`;
    if(indexes.unitIdx>=0)cells[indexes.unitIdx].innerHTML=`<strong>${(total/qty).toFixed(2)}</strong> <span style="font-size:9px;color:#7f91ad">BYN</span>`;
  }

  async function installInlineTable() {
    const table=findOrdersTable(); if(!table)return;
    const {heads,map}=headerMap(table);
    const nameIdx=indexFor(map,['название товара','товар']); const trackIdx=indexFor(map,['трек-номер китая','трек']); const whomIdx=indexFor(map,['для кого']); const statusIdx=indexFor(map,['статус доставки (клик для смены)','статус']); const qtyIdx=indexFor(map,['кол-во']); const priceIdx=indexFor(map,['цена за ед., cny','цена cny']); const rateIdx=indexFor(map,['курс byn']); const chinaIdx=indexFor(map,['дост. с (cny)','дост. с']); const rbIdx=indexFor(map,['дост. в (byn)','дост. рб']); const totalIdx=indexFor(map,['итого с доставкой, byn']); const unitIdx=indexFor(map,['себест. 1 ед., byn']); const weightIdx=indexFor(map,['вес (кг)','вес']); const dateIdx=indexFor(map,['срок / дата']);
    if(chinaIdx>=0){heads[chinaIdx].textContent='Дост. $';heads[chinaIdx].title='$ / кг × вес';}
    if(dateIdx>=0){heads[dateIdx].style.display='none';table.querySelectorAll(`tbody tr > td:nth-child(${dateIdx+1}),tfoot tr > td:nth-child(${dateIdx+1})`).forEach(c=>c.style.display='none');}
    table.style.width='100%';table.style.minWidth='0';table.style.tableLayout='fixed';
    const orders=await fetchOrders(); const people=Array.from(new Set(orders.map(o=>o.forWhom).filter(Boolean))); const byTrack=new Map(orders.filter(o=>o.trackNumber).map(o=>[String(o.trackNumber).trim(),o])); const byName=new Map(orders.map(o=>[String(o.name||'').replace(/\s+/g,' ').trim(),o]));
    Array.from(table.tBodies[0]?.rows||[]).forEach(row=>{
      if(row.dataset.cargoEnhanced==='1')return;
      const cells=Array.from(row.children); const track=trackIdx>=0?(cells[trackIdx]?.textContent||'').replace(/\s+/g,' ').trim():''; const name=nameIdx>=0?(cells[nameIdx]?.textContent||'').replace(/ссылка.*$/i,'').replace(/\s+/g,' ').trim():''; const o=byTrack.get(track)||byName.get(name); if(!o)return;
      row.dataset.cargoEnhanced='1';row.dataset.cargoOrderId=String(o.id);
      if(trackIdx>=0)makeInput(cells[trackIdx],o.id,'trackNumber',o.trackNumber||'','text'); if(whomIdx>=0)makePersonInput(cells[whomIdx],o.id,o.forWhom||'',people); if(statusIdx>=0)makeStatus(cells[statusIdx],o.id,o.status); if(qtyIdx>=0)makeInput(cells[qtyIdx],o.id,'quantity',o.quantity||1,'number',{min:'1',step:'1'}); if(priceIdx>=0)makeInput(cells[priceIdx],o.id,'priceCny',o.priceCny||0,'number',{min:'0',step:'0.01'}); if(weightIdx>=0)makeInput(cells[weightIdx],o.id,'weight',o.weight||0,'number',{min:'0',step:'0.01'});
      if(chinaIdx>=0){const auto=!o.shippingChinaUsd||Number(o.shippingChinaUsd)===0;const usd=auto?(Number(o.weight||0)*usdPerKg()):Number(o.shippingChinaUsd);const inp=makeInput(cells[chinaIdx],o.id,'shippingChinaUsd',usd.toFixed(2),'number',{min:'0',step:'0.01'});inp.dataset.manual=auto?'0':'1';inp.addEventListener('input',()=>inp.dataset.manual='1');}
      if(rbIdx>=0)makeInput(cells[rbIdx],o.id,'shippingBelarusByn',o.shippingBelarusByn||0,'number',{min:'0',step:'0.01'});
      updateRowCalculation(row,{weightIdx,qtyIdx,priceIdx,rateIdx,chinaIdx,rbIdx,totalIdx,unitIdx});
    });
  }

  function addRatePanel(){
    if(document.querySelector('.cargo-rate-panel'))return; const table=findOrdersTable();if(!table)return; const panel=document.createElement('div');panel.className='cargo-rate-panel';
    panel.innerHTML=`<span class="cargo-rate-title">🚚 Доставка</span><label class="cargo-rate-card"><span>Китай → РБ $/кг</span><input id="cargo-usdkg" type="number" min="0" step="0.01" value="${usdPerKg()}"></label><label class="cargo-rate-card"><span>USD → BYN</span><input id="cargo-usdbyn" type="number" min="0" step="0.0001" value="${usdByn()}"></label><button class="cargo-rate-save" type="button">Сохранить</button>`;
    const wrapper=table.parentElement;wrapper?.parentElement?.insertBefore(panel,wrapper);
    panel.querySelector('.cargo-rate-save').addEventListener('click',()=>{const a=num(panel.querySelector('#cargo-usdkg').value,DEFAULT_USD_PER_KG);const b=num(panel.querySelector('#cargo-usdbyn').value,DEFAULT_USD_BYN);localStorage.setItem(USD_PER_KG_KEY,String(a));localStorage.setItem(USD_PER_KG_OLD_KEY,String(a));localStorage.setItem(USD_BYN_KEY,String(b));localStorage.setItem(USD_BYN_OLD_KEY,String(b));document.querySelectorAll('table tbody tr[data-cargo-enhanced="1"]').forEach(row=>{const inp=row.querySelector('input[data-field="shippingChinaUsd"]');if(inp&&inp.dataset.manual!=='1'){const w=num(row.querySelector('input[data-field="weight"]')?.value);inp.value=(w*a).toFixed(2);}});alert(`Сохранено: ${a.toFixed(2)} $/кг · ${b.toFixed(4)} BYN/$`);});
  }

  function addExportButtons(){
    const exportBtn=Array.from(document.querySelectorAll('button')).find(b=>/Экспорт/.test(b.textContent||''));if(!exportBtn)return;const menu=exportBtn.parentElement?.querySelector('div.absolute');if(!menu||menu.querySelector('.cargo-export-extra'))return;const box=document.createElement('div');box.className='cargo-export-extra';box.innerHTML='<button type="button" data-cargo="backup">💾 Полная база JSON + фото</button><button type="button" data-cargo="excel">📊 Excel всей базы + фото</button>';menu.appendChild(box);
    box.querySelector('[data-cargo="backup"]').addEventListener('click',()=>{window.location.href='/api/backup';});
    box.querySelector('[data-cargo="excel"]').addEventListener('click',()=>{if(busy)return;busy=true;window.location.href=`/api/export/excel?projectId=${encodeURIComponent(localStorage.getItem('cargo_current_project')||'1')}&images=1&usdByn=${encodeURIComponent(usdByn())}`;setTimeout(()=>busy=false,1200);});
  }

  function bindPhotoZoom(){
    if(!photoModal){photoModal=document.createElement('div');photoModal.className='cargo-photo-modal';photoModal.hidden=true;photoModal.innerHTML='<div class="cargo-photo-card"><button type="button">×</button><img alt="Фото товара"></div>';document.body.appendChild(photoModal);const close=()=>photoModal.hidden=true;photoModal.querySelector('button').addEventListener('click',close);photoModal.addEventListener('click',e=>{if(e.target===photoModal)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});}
    document.querySelectorAll('table tbody img').forEach(img=>{if(img.dataset.cargoZoom==='1'||!img.src)return;img.dataset.cargoZoom='1';img.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();photoModal.querySelector('img').src=img.currentSrc||img.src;photoModal.hidden=false;});});
  }

  function patchFetch(){
    if(window.__cargoFetchV6)return;window.__cargoFetchV6=true;const original=window.fetch.bind(window);window.fetch=function(input,init){try{const url=typeof input==='string'?input:(input?.url||'');const method=String(init?.method||(typeof input!=='string'?input?.method:'GET')||'GET').toUpperCase();if(method==='PUT'&&/\/api\/orders(?:\/\d+)?$/.test(url)&&init?.body&&typeof init.body==='string'){const payload=JSON.parse(init.body);if(payload&&payload.weight!==undefined){const weight=num(payload.weight,0);payload.weight=weight;payload.shippingChinaUsd=Number.isFinite(Number(payload.shippingChinaUsd))?Number(payload.shippingChinaUsd):Number((weight*usdPerKg()).toFixed(2));payload.shippingUsdByn=Number((payload.shippingChinaUsd*usdByn()).toFixed(2));init={...init,body:JSON.stringify(payload)}}}}catch(e){console.warn('cargo request normalization skipped',e)}return original(input,init)};
  }

  async function refresh(){injectStyle();patchFetch();bindPhotoZoom();addRatePanel();addExportButtons();await installInlineTable();}
  function start(){refresh();if(!window.__cargoObserverV6&&document.body){window.__cargoObserverV6=new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(refresh,450)});window.__cargoObserverV6.observe(document.body,{childList:true,subtree:true});}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
