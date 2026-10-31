/* Assert the fixed viewport contract in actual Chromium; no transaction/form submissions.
 * Test opened panels, not just the default screen.
 */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("fs");
const path=require("path");
const BASE=(process.env.BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const DIR=process.env.SCREENSHOTS||"release-screenshots";
fs.mkdirSync(DIR,{recursive:true});
const sizes=[{name:"iphone-se",width:375,height:667,mobile:true},
 {name:"iphone",width:390,height:844,mobile:true},
 {name:"desktop",width:1440,height:900,mobile:false}];
const clients=["freeman","kashus","scout","ronnie","teton","drawings","ramsey-hill","ernest","habitat","corey","joseph","pbr","cowboyer","mags","paintings"];
let failures=0;
(async()=>{
const browser=await chromium.launch({headless:true});
for(const size of sizes){
const context=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:size.mobile,hasTouch:size.mobile});
const page=await context.newPage();
await page.goto(BASE+"/index/",{waitUntil:"domcontentloaded"});
for(const client of ["list",...clients]){
 try{
 if(client!=="list"){
  const button=page.locator('.index-table [data-client="'+client+'"]');
  if(!await button.isVisible()){
    await page.locator('[data-index-page="1"]').click();
  }
  if(await button.getAttribute("aria-expanded")!=="true")await button.click();
  await page.waitForTimeout(50);
 }
 const metrics=await page.evaluate(()=>{
   const sels=["html","body",".shell",".section",".index-layout",".index-scroll",".work-panel.is-open",".work-panel.is-open .panel-content:not([hidden])"];
   const els=sels.map(q=>({q,el:document.querySelector(q)})).filter(({el})=>!!el);
   const rows=els.map(({q,el})=>{const c=getComputedStyle(el),b=el.getBoundingClientRect();return {
     q,scroll:el.scrollHeight-el.clientHeight,client:el.clientHeight,overflow:c.overflowY,
     top:Math.round(b.top),bottom:Math.round(b.bottom),viewport:innerHeight};
   });
   const panel=document.querySelector(".work-panel.is-open .panel-content:not([hidden])");
   const content=panel?[...panel.children].filter(e=>getComputedStyle(e).display!=="none").map(e=>{
     const b=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,bottom:Math.round(b.bottom),top:Math.round(b.top),height:Math.round(b.height)};
   }):[];
   return {rows,content,scrollY:scrollY,innerHeight,htmlScroll:document.documentElement.scrollHeight-document.documentElement.clientHeight};
 });
 const over=metrics.rows.filter(x=>x.scroll>4&&["auto","scroll"].includes(x.overflow));
 const clipping=metrics.rows.filter(x=>x.scroll>12&&x.q.includes("panel-content"));
 const beyond=metrics.content.filter(x=>x.bottom>metrics.innerHeight-10);
 await page.mouse.wheel(0,650);
 await page.waitForTimeout(70);
 const scrolled=await page.evaluate(()=>({
   scrollY:window.scrollY,
   index:document.querySelector(".index-scroll")?.scrollTop||0,
   panel:document.querySelector(".work-panel")?.scrollTop||0,
   content:document.querySelector(".work-panel .panel-content:not([hidden])")?.scrollTop||0
 }));
 if(over.length||clipping.length||beyond.length||Object.values(scrolled).some(x=>x>2)){
   throw Error(JSON.stringify({over,clipping,beyond,scrolled,metrics}).slice(0,1900));
 }
 if(size.mobile&&["scout","pbr"].includes(client)){
   const nav=page.locator('[data-pair-nav="'+client+'"]');
   await nav.locator('[data-pair-step="1"]').click();
   assert.equal(await nav.locator('[data-pair-count]').innerText(),"02 / 02");
   const figs=page.locator('[data-panel="'+client+'"] .photo-pair .photo-plate');
   assert.equal(await figs.nth(0).isVisible(),false);
   assert.equal(await figs.nth(1).isVisible(),true);
   await page.screenshot({path:path.join(DIR,"mobile-fitted-"+size.name+"-"+client+".png")});
 }
 console.log("PASS",size.name,client);
 }catch(e){
   failures++;
   console.log("FAIL",size.name,client,String(e.message).slice(0,2200));
   await page.screenshot({path:path.join(DIR,"no-scroll-"+size.name+"-"+client+".png")}).catch(()=>{});
 }
 if(client!=="list"){
  const close=page.locator(".work-panel .panel-content:not([hidden]) .panel-close");
  if(await close.isVisible())await close.click();
  await page.mouse.wheel(0,-700);
 }
}

for(const route of ["/","/paintings/","/info/","/404.html"]){
  try{
    await page.goto(BASE+route,{waitUntil:"domcontentloaded"});
    await page.waitForTimeout(100);
    const first=await page.evaluate(()=>({
      documentScroll:document.documentElement.scrollHeight-document.documentElement.clientHeight,
      overflow:getComputedStyle(document.documentElement).overflowY,
      bodyOverflow:getComputedStyle(document.body).overflowY,
      shellScroll:document.querySelector(".shell")?.scrollHeight-document.querySelector(".shell")?.clientHeight
    }));
    await page.mouse.wheel(0,600);await page.waitForTimeout(100);
    const after=await page.evaluate(()=>({window:scrollY,document:document.documentElement.scrollTop,body:document.body.scrollTop,shell:document.querySelector(".shell")?.scrollTop||0}));
    assert.ok(Object.values(after).every(v=>v<3),JSON.stringify({first,after}));
    console.log("PASS",size.name,route,"no document scrolling");
  }catch(e){failures++;console.log("FAIL",size.name,route,String(e.message).slice(0,1200));}
}
if(size.mobile){
 try{
   await page.goto(BASE+"/paintings/",{waitUntil:"domcontentloaded"});
   await page.locator("#red-sea .image-button").click();
   await page.waitForTimeout(150);
   const detail=await page.evaluate(()=>{
     const els=["#painting-detail .full","#painting-detail .label","#painting-detail .full-art"];
     return els.map(q=>{const e=document.querySelector(q);return {q,scroll:e.scrollHeight-e.clientHeight,overflow:getComputedStyle(e).overflowY};});
   });
   const candidates=detail.filter(x=>x.scroll>4&&["auto","scroll"].includes(x.overflow));
   assert.equal(candidates.length,0,JSON.stringify(detail));
   console.log("PASS",size.name,"painting detail no scrolling");
 }catch(e){failures++;console.log("FAIL",size.name,"painting-detail",String(e.message).slice(0,1200));}
}
await context.close();
}
await browser.close();
console.log(failures?failures+" scroll failures":"All non-scrolling gallery states passed");
process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
