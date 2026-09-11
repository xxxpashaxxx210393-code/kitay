(function(){'use strict';
const nativeFetch=window.fetch.bind(window);
const numeric=new Set(['quantity','priceCny','weight','shippingBelarusByn','shippingChinaUsd','shippingUsdByn','rateCnyByn']);
function normalized(v){if(numeric.has(String(v?.field||''))){const n=Number(String(v?.value??'').replace(',','.'));return Number.isFinite(n)?n:0;}return v?.value??'';}
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  if(url.endsWith('/api/orders/inline') && init && String(init.method||'GET').toUpperCase()==='PUT'){
    let body={};
    try{body=JSON.parse(String(init.body||'{}'));}catch{}
    const first=await nativeFetch(input,init);
    if(first.ok){return first;}
    let error={};try{error=await first.clone().json();}catch{}
    if(body.id && body.field){
      try{
        const fallback=await nativeFetch('/api/orders/'+encodeURIComponent(String(body.id)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({[body.field]:normalized(body)})});
        if(fallback.ok){
          const data=await fallback.json().catch(()=>({}));
          return new Response(JSON.stringify({success:true,data:data.data||data}),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
        }
      }catch{}
    }
    return new Response(JSON.stringify({success:false,error:error.error||'Не удалось сохранить изменение'}),{status:first.status||500,headers:{'Content-Type':'application/json'}});
  }
  return nativeFetch(input,init);
};
})();