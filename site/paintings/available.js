/* Fixed-screen Available gallery. Purchasing stays in gallery.js and purchase.js. */
(()=>{
const pieces=[...document.querySelectorAll('.gallery-available .piece')],stage=document.querySelector('.gallery-available'),counter=document.querySelector('.available-counter');
if(!stage||!counter||!pieces.length)return;
const soldIds=["harvest","harvest-2","porter-study","flowers-in-a-jug","nine-ball","little-window","zen-bison","fj40","scout","target","purple-haze","peach-circuit"];
const hash=decodeURIComponent(location.hash.slice(1));
if(soldIds.includes(hash)){location.replace('/index/#'+encodeURIComponent(hash));return;}
let index=0,touch=null;const mobile=matchMedia('(max-width:700px)');
function show(i){index=(i+pieces.length)%pieces.length;pieces.forEach((p,n)=>{p.classList.toggle('is-current',n===index);p.setAttribute('aria-hidden',String(mobile.matches&&n!==index));});counter.textContent=String(index+1).padStart(2,'0')+' / '+String(pieces.length).padStart(2,'0');}
document.querySelectorAll('[data-available-step]').forEach(b=>b.addEventListener('click',()=>show(index+Number(b.dataset.availableStep))));
mobile.addEventListener('change',()=>show(index));
stage.addEventListener('touchstart',e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
stage.addEventListener('touchend',e=>{if(!mobile.matches||!touch||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1));},{passive:true});
document.addEventListener('keydown',e=>{if(!mobile.matches||document.getElementById('painting-detail')?.open||e.target.closest('input,textarea,select'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));}});
show(0);
})();