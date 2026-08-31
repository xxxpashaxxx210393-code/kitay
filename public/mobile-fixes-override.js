(function(){
'use strict';
const s=document.createElement('style');
s.textContent=`@media(max-width:900px){
main table tbody tr>td:nth-child(19){display:flex!important;grid-column:1/-1!important;justify-content:flex-end!important;min-height:44px!important}
main table tbody tr>td:nth-child(19)::before{content:'Действия';display:block!important}
}`;
document.head.appendChild(s);
})();
