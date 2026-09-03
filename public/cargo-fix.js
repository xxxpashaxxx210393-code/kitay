(function(){
'use strict';
if(window.__cargoInlineV7)return;window.__cargoInlineV7=true;
const API='/api/orders/inline',KG='cargo_shipping_usd_per_kg',USD='cargo_usd_byn_rate';
const num=(k,d)=>{const v=Number(localStorage.getItem(k));return Number.isFinite(v)&&v>=0?v:d};
const kg=()=>num(KG,5.5),usd=()=>num(USD,3.25),f=v=>Number(v||0).toFixed(2),norm=s=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
function table(){return [...document.querySelectorAll('main table,table')].find(t=>{const x=norm(t.textContent);return x.includes('трек')&&x.includes('статус')})}
function indexes(t){
 const hs=[...t.querySelectorAll('thead th')],m=[];
 hs.forEach((h,i)=>m.push([norm(h.textContent),i]));
 const ix=arr=>{for(const wanted of arr.map(norm)){const hit=m.find(([x])=>x===wanted||x.includes(wanted)||wanted.includes(x));if(hit)return hit[1]}return -1};
 return {who:ix(['Для кого']),track:ix(['Трек','Трек-номер Китая']),status:ix(['Статус','Статус доставки']),qty:ix(['Кол-во','Количество']),price:ix(['Стоимость, CNY','Цена CNY','Цена за ед., CNY']),china:ix(['Доставка К→Р ($)','Дост. К→Р ($)','Дост. С (CNY)','Кит→РБ, $']),rb:ix(['Доставка РБ','Дост. В (BYN)','Дост. РБ']),total:ix(['Итого, BYN','Итого BYN','Итого с доставкой, BYN']),weight:ix(['Вес','Вес (кг']),tcny:ix(['Итого CNY','Общая стоимость, CNY']),ubyn:ix(['Цена/ед. BYN','Цена за ед., BYN']),tbyn:ix(['Товары BYN','Общая стоимость, BYN']),name:ix(['Название','Название товара'])};
}
function recalc(row){
 if(!row)return;
 const I=JSON.parse(row.dataset.cfMap||'{}'),q=Number(row.querySelector('[data-cargo-field="quantity"]')?.value||1),p=Number(row.querySelector('[data-cargo-field="priceCny"]')?.value||0),w=Number(row.querySelector('[data-cargo-field="weight"]')?.value||0),rb=Number(row.querySelector('[data-cargo-field="shippingBelarusByn"]')?.value||0),d=row.querySelector('[data-cargo-field="shippingChinaUsd"]');
 if(d&&d.dataset.manual!=='1')d.value=f(w*kg());
 const ship=Number(d?.value||0),rate=Number(row.dataset.cfRate||.48),tcny=q*p,goods=tcny*rate,delivery=ship*usd(),total=goods+delivery+rb;
 if(I.tcny>=0&&row.children[I.tcny])row.children[I.tcny].innerHTML='<b>¥ '+f(tcny)+'</b>';
 if(I.ubyn>=0&&row.children[I.ubyn])row.children[I.ubyn].innerHTML='<b>'+f(p*rate)+' BYN</b>';
 if(I.tbyn>=0&&row.children[I.tbyn])row.children[I.tbyn].innerHTML='<b>'+f(goods)+' BYN</b>';
 if(I.total>=0&&row.children[I.total])row.children[I.total].innerHTML='<b class="cargo-total">'+f(total)+' BYN</b>';
 if(I.china>=0&&row.children[I.china]){row.children[I.china].querySelectorAll('.cargo-ship-byn').forEach(x=>x.remove());const s=document.createElement('span');s.className='cargo-ship-byn';s.textContent='≈ '+f(delivery)+' BYN';row.children[I.china].appendChild(s)}
}
async function save(id,field,value,el){
 const nums=new Set(['quantity','priceCny','weight','shippingBelarusByn','shippingChinaUsd','rateCnyByn']);
 const v=nums.has(field)?(Number(value)||0):String(value??'');
 try{const r=await fetch(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,field,value:v})});const j=await r.json();if(!j.success)throw Error(j.error||'Ошибка');el.style.borderColor='#19c98d';setTimeout(()=>el.style.borderColor='',700);window.dispatchEvent(new CustomEvent('cargo-order-changed',{detail:{id,field,value:v}}));if(field==='forWhom')setTimeout(()=>location.reload(),250)}catch(e){el.style.borderColor='#ef4444';console.error('Cargo inline save error',e)}
}
function edit(cell,id,field,value,type,step,row){
 if(!cell||cell.querySelector('.cargo-inline-edit'))return;
 cell.innerHTML='';const e=document.createElement(type==='select'?'select':'input');e.className='cargo-inline-edit';
 if(type==='select'){['В пути на склад Китая','На складе в Китае','Едет в РБ','Прибыло в РБ','Выдано / Получено'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;if(v===value)o.selected=true;e.appendChild(o)})}
 else{e.type=type;e.value=value??'';if(type==='number'){e.step=step||'0.01';e.min='0'}}
 e.oninput=()=>{if(field==='shippingChinaUsd')e.dataset.manual='1';recalc(row)};
 e.onchange=()=>{recalc(row);save(id,field,e.value,e)};e.onblur=()=>save(id,field,e.value,e);e.onkeydown=x=>{if(x.key==='Enter'){x.preventDefault();e.blur()}};cell.appendChild(e);
}
function findControlCard(){
 const title=[...document.querySelectorAll('h2,h3,div')].find(x=>norm(x.textContent)==='📦 центр управления'||norm(x.textContent)==='центр управления');
 if(!title)return null;
 let p=title;for(let i=0;i<6&&p;i++,p=p.parentElement){if((p.className||'').toString().includes('lg:col-span-4'))return p}
 return title.parentElement?.parentElement?.parentElement||null;
}
function injectRates(){
 const card=findControlCard();if(!card)return;
 const stats=[...card.querySelectorAll('div')].find(x=>{const t=norm(x.textContent);return t.includes('курс cny зафиксирован')&&t.includes('средняя стоимость cny')});
 if(!stats)return;
 const old=document.getElementById('cargo-rate-tools');if(old&&old.parentElement!==stats)old.remove();
 let box=document.getElementById('cargo-rate-tools');
 if(!box){
  box=document.createElement('div');box.id='cargo-rate-tools';
  box.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #243653';
  const make=(label,key,def,step,suffix)=>{const l=document.createElement('label');l.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:6px;background:#0b1629;border:1px solid #30415b;border-radius:8px;padding:6px 8px;color:#8fa0bd;font:800 9px system-ui;white-space:nowrap;min-width:0';const sp=document.createElement('span');sp.textContent=label;const wrap=document.createElement('span');wrap.style.cssText='display:flex;align-items:center;gap:3px';const inp=document.createElement('input');inp.type='number';inp.step=step;inp.min='0';inp.value=num(key,def);inp.style.cssText='width:54px;background:transparent!important;border:0!important;outline:0!important;color:#f3f7ff!important;font:900 11px ui-monospace;text-align:right';const unit=document.createElement('span');unit.textContent=suffix;unit.style.cssText='color:#64748b;font-size:9px';inp.onchange=()=>{localStorage.setItem(key,String(Number(inp.value)||0));window.dispatchEvent(new CustomEvent('cargo-rates-changed'));install()};wrap.append(inp,unit);l.append(sp,wrap);return l};
  box.append(make('🚚 Карго',KG,5.5,'.01','$/кг'),make('💵 USD → BYN',USD,3.25,'.0001','BYN/$'));
  stats.appendChild(box);
 }
 const total=document.getElementById('cargo-shipping-total');if(total)total.textContent='$ '+f(window.__cargoTotalShippingUsd||0);
}
function paintShippingSummary(orders){
 window.__cargoTotalShippingUsd=orders.reduce((sum,o)=>sum+(Number(o.shippingChinaUsd)>0?Number(o.shippingChinaUsd):(Number(o.weight)||0)*kg()),0);
 const card=findControlCard();if(!card)return;
 let stats=[...card.querySelectorAll('div')].find(x=>norm(x.textContent).includes('курс cny зафиксирован')&&norm(x.textContent).includes('средняя стоимость cny'));
 if(!stats)return;
 let line=document.getElementById('cargo-shipping-total-line');
 if(!line){line=document.createElement('div');line.id='cargo-shipping-total-line';line.style.cssText='display:flex;justify-content:space-between;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid #243653;color:#8fa0bd;font-size:11px;font-weight:700';line.innerHTML='<span>🚚 Доставка из Китая (итого):</span><strong id="cargo-shipping-total" style="color:#f59e0b;font-family:ui-monospace">$ 0.00</strong>';stats.appendChild(line)}
 const value=document.getElementById('cargo-shipping-total');if(value)value.textContent='$ '+f(window.__cargoTotalShippingUsd||0);
 let tip=document.getElementById('cargo-rate-tip');if(!tip){tip=document.createElement('div');tip.id='cargo-rate-tip';tip.style.cssText='margin-top:8px;padding:7px 9px;border-radius:8px;background:#0b2745;border:1px solid #124d78;color:#55c7ff;font-size:10px;line-height:1.35';tip.textContent='📦 Совет: вес можно менять прямо в таблице, доставка $/кг пересчитается автоматически.';stats.appendChild(tip)}
}
async function install(){
 const t=table();if(!t)return;const I=indexes(t);
 if(I.china>=0&&t.querySelectorAll('thead th')[I.china])t.querySelectorAll('thead th')[I.china].textContent='Доставка К→Р ($)';
 let style=document.getElementById('cargo-inline-style');if(!style){style=document.createElement('style');style.id='cargo-inline-style';style.textContent='.cargo-inline-edit{width:100%;height:30px;box-sizing:border-box;background:#071326!important;color:#f5f8ff!important;border:1px solid #304563!important;border-radius:7px;padding:3px 5px;font:700 10px system-ui}.cargo-inline-edit:focus{border-color:#20bfff!important;outline:none}.cargo-total{color:#4ee2c2!important}.cargo-ship-byn{display:block;margin-top:3px;color:#47dcb9;font:800 9px system-ui}';document.head.appendChild(style)}
 try{
  const p=localStorage.getItem('cargo_current_project')||'1',r=await fetch('/api/orders?projectId='+encodeURIComponent(p)+'&includeImages=0&x='+Date.now(),{cache:'no-store'}),j=await r.json();if(!j.success)return;const orders=j.data||[];paintShippingSummary(orders);
  t.querySelectorAll('tbody tr').forEach(row=>{
   if(row.dataset.cfBound)return;const c=[...row.children],track=I.track>=0?norm(c[I.track]?.textContent):'',name=I.name>=0?norm(c[I.name]?.textContent):'';const byTrack=new Map(orders.filter(o=>o.trackNumber).map(o=>[norm(o.trackNumber),o]));const byName=new Map(orders.map(o=>[norm(o.name),o]));const o=byTrack.get(track)||byName.get(name);if(!o)return;
   row.dataset.cfBound='1';row.dataset.cfId=o.id;row.dataset.cfRate=o.rateCnyByn||.48;row.dataset.cfMap=JSON.stringify(I);const raw=i=>(i>=0?(c[i].textContent||'').trim():'');
   if(I.who>=0)edit(c[I.who],o.id,'forWhom',raw(I.who),'text',null,row);
   if(I.track>=0)edit(c[I.track],o.id,'trackNumber',raw(I.track).replace(/⚠\s*нет\s*трека/i,''),'text',null,row);
   if(I.status>=0)edit(c[I.status],o.id,'status',raw(I.status),'select',null,row);
   if(I.qty>=0){edit(c[I.qty],o.id,'quantity',raw(I.qty).match(/[0-9]+/)?.[0]||1,'number','1',row);c[I.qty].querySelector('input').dataset.cargoField='quantity'}
   if(I.price>=0){edit(c[I.price],o.id,'priceCny',raw(I.price).replace(',','.').match(/[0-9.]+/)?.[0]||0,'number','0.01',row);c[I.price].querySelector('input').dataset.cargoField='priceCny'}
   if(I.weight>=0){edit(c[I.weight],o.id,'weight',raw(I.weight).replace(',','.').match(/[0-9.]+/)?.[0]||0,'number','0.01',row);c[I.weight].querySelector('input').dataset.cargoField='weight'}
   if(I.china>=0){const w=Number(o.weight)||0,stored=Number(o.shippingChinaUsd)||0;edit(c[I.china],o.id,'shippingChinaUsd',f(stored>0?stored:w*kg()),'number','0.01',row);const e=c[I.china].querySelector('input');e.dataset.cargoField='shippingChinaUsd';e.dataset.manual=stored>0?'1':'0'}
   if(I.rb>=0){edit(c[I.rb],o.id,'shippingBelarusByn',f(o.shippingBelarusByn||0),'number','0.01',row);c[I.rb].querySelector('input').dataset.cargoField='shippingBelarusByn'}
   recalc(row);
  });
  t.dataset.cfMap=JSON.stringify(I);
 }catch(e){console.error('Cargo inline install error',e)}
}
function run(){injectRates();install()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
new MutationObserver(()=>{clearTimeout(window.__cargoInlineTimer);window.__cargoInlineTimer=setTimeout(run,350)}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('cargo-rates-changed',run);
})();
