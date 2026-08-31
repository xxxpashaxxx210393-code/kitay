(function(){
'use strict';
if(window.__cargoMobileFixes)return;window.__cargoMobileFixes=true;
const RATE_KEY='cargo_cny_byn_rate', DEFAULT_RATE=.48;
const readRate=()=>{const n=Number(localStorage.getItem(RATE_KEY));return Number.isFinite(n)&&n>0?n:DEFAULT_RATE};
const saveRate=v=>{const n=Number(v);if(Number.isFinite(n)&&n>0)localStorage.setItem(RATE_KEY,String(n))};

/* Do not refetch the whole database because a UI observer/re-render fired. */
const originalFetch=window.fetch.bind(window);
let cachedOrders=null,cachedUrl='',cachedAt=0;
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:input.url;
  const method=(init?.method||(typeof input!=='string'?input.method:'GET')||'GET').toUpperCase();
  if(url.includes('/api/orders?projectId=')&&method==='GET'){
    const now=Date.now();
    if(cachedOrders&&cachedUrl===url&&now-cachedAt<10000){
      return new Response(cachedOrders,{status:200,headers:{'Content-Type':'application/json'}});
    }
    const res=await originalFetch(input,init);const clone=res.clone();
    clone.text().then(t=>{cachedOrders=t;cachedUrl=url;cachedAt=Date.now()}).catch(()=>{});
    return res;
  }
  if(url.includes('/api/orders')&&method!=='GET'){
    try{
      if(init?.body){const p=JSON.parse(init.body);if(p&&p.rateCnyByn!==undefined){const sent=Number(p.rateCnyByn);if(Number.isFinite(sent)&&sent>0){saveRate(sent);if(method==='POST'&&sent===DEFAULT_RATE&&readRate()!==DEFAULT_RATE){p.rateCnyByn=readRate();init={...init,body:JSON.stringify(p)}}}}}
    }catch{}
    cachedOrders=null;cachedAt=0;
  }
  return originalFetch(input,init);
};

const mobileCss=document.createElement('style');
mobileCss.id='cargo-mobile-fixes';
mobileCss.textContent=`
@media(max-width:900px){
  html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
  header{position:sticky!important;top:0!important;z-index:40!important}
  header>div{width:100%!important;padding:10px 12px!important}
  main{width:100%!important;max-width:none!important;margin:0!important;padding:10px!important}
  main>.space-y-6{width:100%!important;max-width:none!important;gap:10px!important}
  main>.space-y-6>*{width:100%!important;max-width:none!important;min-width:0!important}
  main .grid{min-width:0!important}
  main table{display:block!important;width:100%!important;min-width:0!important;table-layout:auto!important;border:0!important;background:transparent!important}
  main table thead{display:none!important}
  main table tbody{display:block!important;width:100%!important}
  main table tbody tr{display:grid!important;grid-template-columns:1fr 1fr!important;width:100%!important;margin:0 0 10px!important;border:1px solid #263754!important;border-radius:14px!important;overflow:hidden!important;background:#101d34!important;box-shadow:0 6px 18px rgba(0,0,0,.16)!important}
  main table tbody tr>td{display:flex!important;align-items:center!important;min-width:0!important;width:auto!important;min-height:40px!important;padding:7px 8px!important;font-size:11px!important;border-bottom:1px solid rgba(49,67,99,.45)!important;overflow:hidden!important}
  main table tbody tr>td:nth-child(1){grid-column:1!important}
  main table tbody tr>td:nth-child(2){grid-column:2!important;justify-content:flex-end!important}
  main table tbody tr>td:nth-child(3),main table tbody tr>td:nth-child(6),main table tbody tr>td:nth-child(20){grid-column:1/-1!important}
  main table tbody tr>td:nth-child(3)::before{content:'Товар'}
  main table tbody tr>td:nth-child(4)::before{content:'Для кого'}
  main table tbody tr>td:nth-child(5)::before{content:'Трек'}
  main table tbody tr>td:nth-child(6)::before{content:'Статус'}
  main table tbody tr>td:nth-child(7)::before{content:'Кол-во'}
  main table tbody tr>td:nth-child(8)::before{content:'Цена CNY'}
  main table tbody tr>td:nth-child(9)::before{content:'Всего CNY'}
  main table tbody tr>td:nth-child(10)::before{content:'Курс'}
  main table tbody tr>td:nth-child(11)::before{content:'Цена BYN'}
  main table tbody tr>td:nth-child(12)::before{content:'Всего BYN'}
  main table tbody tr>td:nth-child(13)::before{content:'Дост. CNY'}
  main table tbody tr>td:nth-child(14)::before{content:'Дост. РБ'}
  main table tbody tr>td:nth-child(15)::before{content:'Итого'}
  main table tbody tr>td:nth-child(16)::before{content:'Себест. 1 шт'}
  main table tbody tr>td:nth-child(17)::before{content:'Вес'}
  main table tbody tr>td:nth-child(18)::before{content:'Дата'}
  main table tbody tr>td:nth-child(20)::before{content:'Действия'}
  main table tbody tr>td::before{flex:0 0 78px;margin-right:6px;color:#7186a5;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
  main table tbody tr>td:nth-child(1)::before,main table tbody tr>td:nth-child(2)::before{display:none}
  main table tbody tr>td:nth-child(3)::before,main table tbody tr>td:nth-child(6)::before{flex-basis:48px}
  main table tbody tr>td:nth-child(6) select{width:100%!important;min-width:0!important}
  main table tbody tr>td:nth-child(19){display:none!important}
  main table tfoot{display:none!important}
  .overflow-x-auto{overflow-x:visible!important}
  .fixed.inset-0.z-50{padding:8px!important}
  .fixed.inset-0.z-50>div{width:100%!important;max-width:none!important;max-height:calc(100dvh - 16px)!important;border-radius:18px!important}
  .fixed.inset-0.z-50 input,.fixed.inset-0.z-50 select,.fixed.inset-0.z-50 textarea{font-size:16px!important;min-height:42px!important}
  .fixed.inset-0.z-50 button{min-height:42px!important}
}
`;
document.head.appendChild(mobileCss);

function restoreRate(){const rate=readRate();document.querySelectorAll('div,span').forEach(el=>{const t=(el.textContent||'').trim();const m=t.match(/^1 CNY =\s*([0-9.,]+)\s*BYN$/);if(!m)return;const n=Number(m[1].replace(',','.'));if(n===DEFAULT_RATE&&rate!==DEFAULT_RATE)el.textContent='1 CNY = '+rate+' BYN';else if(n!==DEFAULT_RATE&&n>0)saveRate(n)})}
restoreRate();setInterval(restoreRate,1000);
})();
