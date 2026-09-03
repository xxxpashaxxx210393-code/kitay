(function(){
  "use strict";
  if(window.__cargoShippingClean)return; window.__cargoShippingClean=true;
  function zoom(){
    if(document.getElementById("cargo-photo-modal")) return;
    const modal=document.createElement("div"); modal.id="cargo-photo-modal"; modal.hidden=true;
    modal.innerHTML='<div><button type="button">×</button><img alt="Фото товара"></div>';
    modal.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(2,8,23,.84);padding:18px;';
    const card=modal.querySelector('div'); card.style.cssText='position:relative;width:min(760px,92vw);height:min(780px,90vh);background:#0b1830;border:1px solid #29415f;border-radius:18px;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box';
    modal.querySelector('img').style.cssText='max-width:100%;max-height:100%;object-fit:contain;background:#fff;border-radius:10px';
    modal.querySelector('button').style.cssText='position:absolute;right:10px;top:10px;width:34px;height:34px;border-radius:50%;background:#10233e;color:#fff;border:1px solid #365171;font-size:22px;cursor:pointer;z-index:2';
    document.body.appendChild(modal);
    const close=()=>modal.hidden=true; modal.querySelector('button').onclick=close; modal.onclick=e=>{if(e.target===modal)close()}; document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    const bind=()=>document.querySelectorAll('table tbody img').forEach(img=>{if(img.dataset.cargoZoom)return;img.dataset.cargoZoom='1';img.style.cursor='zoom-in';img.onclick=e=>{e.preventDefault();e.stopPropagation();modal.querySelector('img').src=img.currentSrc||img.src;modal.hidden=false}});
    bind(); new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',zoom);else zoom();
})();
