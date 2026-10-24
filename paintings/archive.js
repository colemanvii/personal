/* Archival names/status are transcribed from Cole's Shopify collection screenshots.
 * Photographs and product URLs are read from the public Shopify product catalog,
 * never guessed. A blocked catalog leaves a tidy text archive instead. */
const archiveWorks = [
 ["Target","sold"],["Peach Circuit","sold"],["Purple Haze","sold"],
 ["Scout","sold"],["FJ40","sold"],["Zen Buffalo","available"],
 ["Little Window","sold"],["Nine Ball","sold"],["Flowers in a jug","sold"],
 ["Peace of Wild Things","sold"],["Porter Study","sold"],["Harvest 1","sold"]
];
const archiveRoot=document.getElementById("archive-items");
const archiveControls=document.getElementById("archive-controls");
const archiveCount=document.getElementById("archive-count");
const catalogHost="https://241880-3.myshopify.com";
const products=new Map();
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
function buildPages(){
  if(!archiveRoot)return;
  const mobile=window.innerWidth<=650;
  const perPage=mobile?4:6;
  const count=Math.ceil(archiveWorks.length/perPage);
  let page=Math.min(Number(archiveRoot.dataset.page||0),count-1);
  function render(){
    archiveRoot.innerHTML="";
    archiveWorks.slice(page*perPage,(page+1)*perPage).forEach(([name,status],i)=>{
      const record=products.get(norm(name));
      const item=document.createElement("article");
      item.className="archive-card";
      const image=record?.featured_image||record?.images?.[0];
      const src=typeof image==="string"?image:image?.src;
      if(src){
        const figure=document.createElement("div");figure.className="archive-art";
        const img=document.createElement("img");img.alt=name;img.loading="lazy";img.src=src.startsWith("//")?"https:"+src:src;
        img.onerror=()=>figure.remove();figure.appendChild(img);item.appendChild(figure);
      }
      const lower=document.createElement("div");lower.className="archive-caption";
      const title=document.createElement("span");title.textContent=name;
      lower.appendChild(title);
      const state=document.createElement("span");state.textContent=status==="sold"?"SOLD":"ARCHIVE";state.className="archive-state";
      lower.appendChild(state);item.appendChild(lower);
      archiveRoot.appendChild(item);
    });
    archiveCount.textContent=String(page+1).padStart(2,"0")+" / "+String(count).padStart(2,"0");
    archiveRoot.dataset.page=page;
    const nav=archiveControls.querySelectorAll("button");
    nav[0].disabled=page===0;nav[1].disabled=page===count-1;
  }
  archiveControls.querySelectorAll("button").forEach((button,i)=>{button.onclick=()=>{page=Math.max(0,Math.min(count-1,page+(i===0?-1:1)));render()};});
  render();
}
buildPages();
let wasMobile=window.innerWidth<=650;
window.addEventListener("resize",()=>{const mobile=window.innerWidth<=650;if(mobile!==wasMobile){wasMobile=mobile;archiveRoot.dataset.page=0;buildPages();}});
async function loadArchivePhotos(){
 try{
   /* Shopify's public collection JSON supplies real product imagery. */
   const response=await fetch(catalogHost+"/collections/all/products.json?limit=250",{mode:"cors"});
   if(!response.ok)throw new Error("Catalog unavailable");
   const payload=await response.json();
   const items=Array.isArray(payload.products)?payload.products:[];
   for(const product of items)products.set(norm(product.title),product);
   buildPages();
 }catch(error){
   /* Fallback: request exact handles for verified titles only. */
   await Promise.all(archiveWorks.map(async ([title])=>{
     const handle=title.toLowerCase().replace(/[^a-z0-9 ]/g,"").trim().replace(/\s+/g,"-");
     try{
       const response=await fetch(catalogHost+"/products/"+handle+".js",{mode:"cors"});
       if(response.ok){const product=await response.json();if(norm(product.title)===norm(title))products.set(norm(title),product);}
     }catch(_){}
   }));
   buildPages();
 }
}
loadArchivePhotos();
