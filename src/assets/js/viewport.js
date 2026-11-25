/* Explicit page turns. No scroll or wheel handlers. */
(()=>{
const root=document.documentElement, main=document.querySelector('main');
if(!main)return;
const index=main.querySelector('.works'),work=main.querySelector('.work'),available=main.querySelector('.avail');
let layout=()=>{};
const show=(el,yes)=>{el.hidden=!yes};
function check(){
root.classList.remove('folio-overflow');
const bottom=document.body.getBoundingClientRect().bottom;
const visible=[...main.querySelectorAll('a,button,h1,p,dd,figcaption,select')].filter(el=>el.getClientRects().length);
const stage=main.querySelector('.folio-stage');
const plate=stage&&[...stage.children].find(p=>!p.hidden);
if(visible.some(el=>el.getBoundingClientRect().bottom>bottom+1)||(plate&&[...plate.querySelectorAll('p,dd,figcaption,a')].some(el=>el.getClientRects().length&&el.getBoundingClientRect().bottom>stage.getBoundingClientRect().bottom+1))||root.scrollHeight>innerHeight+1)root.classList.add('folio-overflow');
if(!root.classList.contains('folio-overflow'))window.scrollTo(0,0);
}
function controls(host,before,change){
const nav=document.createElement('nav');nav.className='folio-controls cap';nav.setAttribute('aria-label','Pages');
nav.innerHTML='<button type="button" aria-label="Previous page">← Prev</button><span aria-live="polite"></span><button type="button" aria-label="Next page">Next →</button>';
host.insertBefore(nav,before||null);
const [prev,label,next]=nav.children;
prev.addEventListener('click',()=>change(-1));next.addEventListener('click',()=>change(1));
document.addEventListener('keydown',e=>{
if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.defaultPrevented||/^(INPUT|SELECT|TEXTAREA|VIDEO|IFRAME)$/.test(e.target.tagName)||e.target.isContentEditable)return;
if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change(e.key==='ArrowLeft'?-1:1)}
});
return(n,total)=>{label.textContent=(total?n+1:0)+' / '+total;prev.disabled=n<=0;next.disabled=n>=total-1};
}
root.classList.add('folio');
if(index){
const rows=[...index.querySelectorAll('li.row')],list=index.querySelector('ol'),filter=main.querySelector('.filter'),buttons=[...filter.querySelectorAll('button')];
let current=0,pages=[],selected='all',anchor=null;
function readHash(){try{anchor=document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch{}}
readHash();
const select=document.createElement('select');select.className='filter-select';select.setAttribute('aria-label','Filter by discipline');
buttons.forEach(b=>{const o=document.createElement('option');o.value=b.dataset.f;o.textContent=b.textContent;select.append(o)});filter.append(select);
function render(){const set=new Set(pages[current]||[]);rows.forEach(r=>show(r,set.has(r)));update(current,pages.length)}
const update=controls(main,null,d=>{current=Math.min(Math.max(0,current+d),Math.max(0,pages.length-1));render();check()});
function paginate(preserve){
const old=preserve&&pages[current]&&pages[current][0],compact=innerWidth<1024;
buttons.forEach(b=>show(b,!compact));show(select,compact);
const matches=rows.filter(r=>selected==='all'||r.dataset.d.trim().split(/\s+/).includes(selected));
rows.forEach(r=>show(r,false));
const room=Math.max(0,index.getBoundingClientRect().bottom-list.getBoundingClientRect().top);
pages=[];let batch=[],used=0;
matches.forEach(r=>{show(r,true);const h=r.getBoundingClientRect().height;show(r,false);if(batch.length&&used+h>room+.5){pages.push(batch);batch=[];used=0}batch.push(r);used+=h});
if(batch.length)pages.push(batch);
current=Math.max(0,pages.findIndex(p=>p.includes(anchor||old)));anchor=null;
document.getElementById('count').textContent=matches.length;render();
}
function choose(f){selected=f;select.value=f;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===f)));root.classList.remove('folio-overflow');paginate(false);check()}
buttons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.f)));select.addEventListener('change',()=>choose(select.value));
layout=()=>paginate(true);
window.addEventListener('hashchange',()=>{readHash();layout();check()});
}else if(work||available){
const host=work?work.querySelector('.pane'):available,stage=document.createElement('div');stage.className='folio-stage';
let plates=[],before=null;
if(work){
const header=host.querySelector(':scope > header'),head=header.querySelector('.pane-head'),media=host.querySelector('.media');
before=host.querySelector('.step');
host.insertBefore(head,header);host.insertBefore(stage,header);plates.push(header);
for(const el of [...media.children]){
if(el.matches('.releases')){
const links=[...el.querySelectorAll('.list a')];
for(let i=0;i<links.length;i+=2){const p=el.cloneNode(false);p.append(el.querySelector('p').cloneNode(true));const l=el.querySelector('.list').cloneNode(false);links.slice(i,i+2).forEach(a=>l.append(a));p.append(l);plates.push(p)}
}else{el.classList.add('plate-visual');plates.push(el)}
}media.remove();
}else{
const grid=host.querySelector('.grid-2');plates=[...grid.children];host.insertBefore(stage,grid);grid.remove();plates.forEach(p=>p.classList.add('plate-visual'))
}
plates.forEach(p=>{p.classList.add('plate');stage.append(p)});
let n=0;
const update=controls(host,before,d=>{n=Math.min(Math.max(0,n+d),plates.length-1);render();check()});
function render(){plates.forEach((p,i)=>{show(p,i===n);if(i!==n)p.querySelectorAll('video').forEach(v=>v.pause());else p.querySelectorAll('img[loading="lazy"]').forEach(img=>img.loading='eager')});update(n,plates.length)}
render();
}
function resize(){root.classList.remove('folio-overflow');layout();check()}
resize();if(document.fonts)document.fonts.ready.then(resize);window.addEventListener('resize',resize);
if(available)new MutationObserver(check).observe(available,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();
