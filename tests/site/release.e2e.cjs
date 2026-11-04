/* Release QA — real browser checks at the exact approved viewports.
 * Safe: does not submit forms, add items to cart, or place orders.
 * Run: npm install --no-save playwright@1.56.1 && npx playwright install chromium
 *      BASE_URL=https://colecalfee.com node tests/site/release.e2e.cjs
 */
const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const BASE = (process.env.BASE_URL || "https://colecalfee.com").replace(/\/$/, "");
const DIR = process.env.SCREENSHOTS || "release-screenshots";
fs.mkdirSync(DIR, {recursive:true});
const sizes = [{name:"iphone-se",width:375,height:667,mobile:true},{name:"iphone-mid",width:390,height:740,mobile:true},{name:"iphone",width:390,height:844,mobile:true},{name:"desktop-1280",width:1280,height:800,mobile:false},{name:"desktop",width:1440,height:900,mobile:false}];
let failed = 0;
const results = [];
const run = async (name, fn) => {
  try { await fn(); results.push({status:"PASS",name}); console.log("PASS "+name); }
  catch(e){ failed++; results.push({status:"FAIL",name,error:String(e.message||e)}); console.error("FAIL "+name+": "+String(e.stack||e)); }
};
async function screenshot(page,name){ await page.screenshot({path:path.join(DIR,name+".png"),fullPage:true}); }
async function assertNoHorizontalOverflow(page,label){
 const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,inner:innerWidth}));
 assert.ok(m.scroll<=m.client+2,label+": horizontal overflow "+JSON.stringify(m));
}
async function assertVisibleInside(page,selector,label){
 const v=await page.locator(selector).first().evaluate(el=>{
   const b=el.getBoundingClientRect();
   return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height,vw:innerWidth,vh:innerHeight};
 });
 assert.ok(v.width>0&&v.height>0&&v.x>=-2&&v.right<=v.vw+2&&v.y>=-2&&v.bottom<=v.vh+2,label+": clipped "+JSON.stringify(v));
}
async function waitForImage(page,selector,label){
 await page.waitForFunction(selector=>{
   const el=document.querySelector(selector);
   return el && el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
 },selector,{timeout:15000});
}
async function waitForPrice(page,expected){
 await page.waitForFunction(expected=>document.querySelector("#detail-price")?.textContent?.includes(expected),expected,{timeout:20000});
}
async function waitForPage(page,path){
 await page.goto(BASE+path,{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForLoadState("load",{timeout:20000}).catch(()=>{});
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const size of sizes){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:2,isMobile:size.mobile,hasTouch:size.mobile});
   const page=await context.newPage();
   const errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   await run(size.name+" homepage / palette / no overflow",async()=>{
     await waitForPage(page,"/");
     assert.ok(await page.locator('a[href="/index/"]').count());
     assert.ok(await page.locator('a[href="/paintings/"]').count());
     assert.ok(await page.locator('a[href="/info/"]').count());
     await assertNoHorizontalOverflow(page,"homepage");
     const switchers=page.locator("[data-paper-tone]");
     assert.equal(await switchers.count(),2,"paper/graphite switcher missing");
     await switchers.nth(1).click();
     assert.equal(await page.locator("html").getAttribute("data-tone"),"graphite");
     await switchers.nth(0).click();
     assert.equal(await page.locator("html").getAttribute("data-tone"),"off-white");
     await screenshot(page,size.name+"-home");
   });
   await run(size.name+" Index 23 works / curatorial first page",async()=>{
     await waitForPage(page,"/index/");
     const rows=page.locator("#work-index-table tbody tr");
     assert.equal(await rows.count(),23);
     assert.deepEqual(await rows.locator("td:first-child").allInnerTexts(),
       Array.from({length:23},(_,i)=>String(i+1).padStart(3,"0")),
       "Index catalogue numbering must be continuous and ordered");
     assert.equal(await page.locator(".index-count").innerText(),"23 WORKS");
     const prompt=page.locator(".work-panel .panel-placeholder");
     assert.equal((await prompt.textContent()).trim(),"SELECT A PROJECT",
       "Empty work panel should use only the approved prompt");
     if(!size.mobile){
       assert.equal(await prompt.isVisible(),true,"Desktop prompt should be visible");
       assert.equal(await page.locator(".work-panel .panel-id").isVisible(),false,
         "Empty panel should not display the WORK label");
     }
     assert.equal(await page.getByText("Selected", {exact:true}).count(),0,"obsolete Selected toggle");
     const visible=rows.filter({visible:true});
     const pageOneSize=12;
     assert.equal(await visible.count(),pageOneSize,"page one must use the full intended screen capacity");
     const names=await visible.locator("td:nth-child(2)").allInnerTexts();
     for(const required of ["Ronnie Hodges","Teton Valley Ranch","Ramsey Hill"]){
       assert.ok(names.some(n=>n.includes(required)),required+" missing from page one");
     }
     assert.match(names[0],/Freeman General Contracting/);
     assert.match(names.at(-2),/Paintings/,"Paintings must be the penultimate entry on the FIRST page");
     assert.match(names.at(-1),/Drawings/,"Drawings must be the final entry on the FIRST page");
     await assertNoHorizontalOverflow(page,"Index");
     await assertVisibleInside(page,"#index-pagination","Index pagination");
     const fit=await page.evaluate(()=>{
       const rows=[...document.querySelectorAll("#work-index-table tbody tr")].filter(r=>!r.hidden);
       const last=rows.at(-1).getBoundingClientRect();
       const nav=document.querySelector("#index-pagination").getBoundingClientRect();
       const scroll=document.querySelector(".index-scroll");
       return {lastBottom:last.bottom,navTop:nav.top,gap:nav.top-last.bottom,scrollOverflow:scroll.scrollHeight-scroll.clientHeight};
     });
     assert.ok(fit.gap>=-3,"Index rows overlap pagination: "+JSON.stringify(fit));
     assert.ok(fit.scrollOverflow<=3,"Index contains invisible vertical overflow: "+JSON.stringify(fit));
     const rhythm=await page.evaluate(()=>[...document.querySelectorAll("#work-index-table tbody tr")]
       .filter(row=>!row.hidden).map(row=>row.getBoundingClientRect().height));
     const expandedDesktop=!size.mobile&&size.width>=851&&size.height>=750;
     if(expandedDesktop){
       assert.ok(fit.gap<=12,"Desktop rows should fill the table area above pagination: "+JSON.stringify(fit));
       assert.ok(Math.min(...rhythm)>=39&&Math.max(...rhythm)-Math.min(...rhythm)<2,
         "Desktop rows should expand evenly: "+JSON.stringify(rhythm));
     }else{
       assert.ok(rhythm.every(height=>height>=35&&height<=39),
         "Mobile and short-viewport rows must stay a consistent 36px: "+JSON.stringify(rhythm));
     }
     assert.match(await rows.nth(10).locator("td:nth-child(2)").textContent(),/Paintings/,"Paintings is always 011");
     assert.match(await rows.nth(11).locator("td:nth-child(2)").textContent(),/Drawings/,"Drawings is always 012");
     if(size.mobile){
       const lastLink=visible.last().locator("a").first();
       if(await lastLink.count()){
         const background=await lastLink.evaluate(el=>getComputedStyle(el).backgroundColor);
         assert.equal(background,"rgba(0, 0, 0, 0)","touch devices must not retain a desktop hover highlight");
       }
     }
     await screenshot(page,size.name+"-index-01");
     // Freeman must show the actual homepage, not the previous fake text block.
     await page.locator('[data-client="freeman"]').click();
     await waitForImage(page,'[data-panel="freeman"] .freeman-homepage-image',"Freeman homepage preview");
     const freemanPreview=page.locator('[data-panel="freeman"] .freeman-site-live');
     assert.equal(await freemanPreview.getAttribute("href"),"https://www.freemangc.com/");
     assert.equal(await freemanPreview.locator(".freeman-preview-nav").count(),0,
       "Freeman preview must not revert to fake wordmark text");
     await page.locator('[data-panel="freeman"] .panel-close').click();
     await page.locator('[data-index-page="1"]').click();
     assert.equal(await rows.filter({visible:true}).count(),23-pageOneSize,"remaining work count on page two");
     assert.equal(await page.locator(".index-page-count").innerText(),"02 / 02");
     if(expandedDesktop){
       const secondPageGap=await page.evaluate(()=>{
         const visibleRows=[...document.querySelectorAll("#work-index-table tbody tr")].filter(row=>!row.hidden);
         return document.querySelector("#index-pagination").getBoundingClientRect().top-
           visibleRows.at(-1).getBoundingClientRect().bottom;
       });
       assert.ok(secondPageGap>=-3&&secondPageGap<=12,
         "Desktop second-page rows should fill to pagination: "+secondPageGap);
     }
     const secondPageNames=await rows.filter({visible:true}).locator("td:nth-child(2)").allInnerTexts();
     assert.ok(!secondPageNames.some(n=>/Paintings|Drawings/.test(n)),"Independent archives must not be hidden on page 02");
     await screenshot(page,size.name+"-index-02");
     await page.locator('[data-index-page="-1"]').click();
     assert.equal(await page.locator(".index-page-count").innerText(),"01 / 02");
     await page.locator('[data-client="ronnie"]').click();
     assert.equal(await page.locator(".work-panel").evaluate(e=>e.classList.contains("is-open")),true);
     await waitForImage(page,'[data-panel="ronnie-photo"] img', "Ronnie image");
     await screenshot(page,size.name+"-ronnie");
     await page.locator(".work-panel .panel-content:not([hidden]) .panel-close").click();
     await page.locator('[data-client="teton"]').click();
     await waitForImage(page,'[data-panel="teton-photo"] img', "Teton image");
     await screenshot(page,size.name+"-teton");
     await page.locator(".work-panel .panel-content:not([hidden]) .panel-close").click();
     const drawingsRow=page.locator('[data-client="drawings"]');
     assert.equal(await drawingsRow.isVisible(),true,"Drawings should be accessible on the FIRST page");
     await drawingsRow.click();
     await waitForImage(page,"#drawings-active-image","Drawings image");
     await screenshot(page,size.name+"-drawings");
     await page.locator(".work-panel .panel-content:not([hidden]) .panel-close").click();
   });
   await run(size.name+" Available / viewer / Shopify metadata",async()=>{
     await waitForPage(page,"/paintings/");
     assert.equal(await page.locator(".gallery-available .piece").count(),2);
     assert.equal(await page.locator("#red-sea .caption h3").innerText(),"Red Sea");
     assert.equal(await page.locator("#flowers-in-mccarty-vase .caption h3").innerText(),"Flowers in McCarty Vase");
     await assertNoHorizontalOverflow(page,"Available");
     await screenshot(page,size.name+"-available");
     // Purchase must look neutral at rest and visibly change on hover.
     // This was broken when static.css painted the entire sale label red.
     const purchase=page.locator("#red-sea .sale-open");
     await purchase.waitFor({state:"visible",timeout:20000});
     const rest=await purchase.evaluate(e=>getComputedStyle(e).color);
     if(!size.mobile){
       await purchase.hover();
       const hover=await purchase.evaluate(e=>getComputedStyle(e).color);
       assert.notEqual(rest,hover,"Purchase must change color on mouse hover");
       assert.equal(hover,"rgb(164, 63, 51)","Light-theme Purchase hover should use rust red");
       await page.evaluate(()=>{document.documentElement.dataset.tone="graphite";});
       await page.locator("#red-sea .caption h3").hover();
       const graphiteRest=await purchase.evaluate(e=>getComputedStyle(e).color);
       await purchase.hover();
       const graphiteHover=await purchase.evaluate(e=>getComputedStyle(e).color);
       assert.notEqual(graphiteRest,graphiteHover,"Graphite Purchase must change on hover");
       assert.equal(graphiteHover,"rgb(255, 132, 107)","Graphite hover should be coral");
       await page.evaluate(()=>{document.documentElement.dataset.tone="off-white";});
     }
     await page.locator("#red-sea .image-button").click();
     assert.equal(await page.locator("#painting-detail").evaluate(e=>e.open),true);
     assert.equal(await page.locator("#detail-name").innerText(),"Red Sea");
     await assertVisibleInside(page,"#detail-close","Painting close");
     await waitForImage(page,"#detail-image","Red Sea viewer image");
     await waitForPrice(page,"$2,250");
     await screenshot(page,size.name+"-red-sea");
     const neighbor=await page.locator("#detail-next").evaluate(button=>({
       title:button.textContent.trim(),width:button.clientWidth,scroll:button.scrollWidth
     }));
     assert.equal(neighbor.title,"Flowers in McCarty Vase →","Viewer must present the complete neighbouring title");
     assert.ok(neighbor.scroll<=neighbor.width+2,"Neighbour title clips: "+JSON.stringify(neighbor));
     const stepMargin=await page.locator(".viewer-steps").evaluate(el=>innerHeight-el.getBoundingClientRect().bottom);
     assert.ok(stepMargin>=20,"Painting steps need a safe bottom margin: "+stepMargin);
     await page.locator("#detail-next").click();
     assert.equal(await page.locator("#detail-name").innerText(),"Flowers in McCarty Vase");
     await waitForImage(page,"#detail-image","Flowers viewer image");
     await waitForPrice(page,"$1,650");
     await screenshot(page,size.name+"-flowers");
     await page.locator("#detail-close").click();
     assert.equal(await page.locator("#painting-detail").evaluate(e=>e.open),false);
   });
   await run(size.name+" Contact / layout",async()=>{
     await waitForPage(page,"/info/");
     assert.equal(await page.locator("h1").innerText(),"Cole Calfee");
     assert.ok(await page.locator('a[href="mailto:colecalfee@gmail.com"]').count());
     assert.ok(await page.locator('a[href="https://www.instagram.com/colecalfee/"]').count());
     await assertNoHorizontalOverflow(page,"Contact");
     await screenshot(page,size.name+"-about");
   });
   await run(size.name+" shared Index / Available / Contact header",async()=>{
     const headers=[];
     for(const route of ["/index/","/paintings/","/info/"]){
       await waitForPage(page,route);
       headers.push(await page.evaluate(()=>{
         const mast=document.querySelector(".site-head").getBoundingClientRect();
         const brand=document.querySelector(".site-head .brand").getBoundingClientRect();
         const nav=document.querySelector(".site-head .nav").getBoundingClientRect();
         return {left:mast.left,top:mast.top,bottom:mast.bottom,
           brandX:brand.x,brandY:brand.y,navRight:nav.right,navY:nav.y};
       }));
     }
     for(const metric of Object.keys(headers[0])){
       const range=Math.max(...headers.map(h=>h[metric]))-Math.min(...headers.map(h=>h[metric]));
       assert.ok(range<=2,"Header "+metric+" differs across routes: "+JSON.stringify(headers));
     }
   });
   await run(size.name+" no uncaught browser errors",async()=>{assert.deepEqual(errors,[])});
   await context.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(DIR,"results.json"),JSON.stringify({base:BASE,failed,results},null,2));
 console.log("\n"+results.filter(r=>r.status==="PASS").length+" passed; "+failed+" failed");
 process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
