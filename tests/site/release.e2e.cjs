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
const sizes = [{name:"iphone-se",width:375,height:667,mobile:true},{name:"iphone",width:390,height:844,mobile:true},{name:"desktop",width:1440,height:900,mobile:false}];
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
     assert.equal(await page.getByText("Selected", {exact:true}).count(),0,"obsolete Selected toggle");
     const visible=rows.filter({visible:true});
     const pageOneSize=size.mobile?(size.height>=780?16:size.height>=720?14:12):12;
     assert.equal(await visible.count(),pageOneSize,"page one must use the full intended screen capacity");
     const names=await visible.locator("td:nth-child(2)").allInnerTexts();
     for(const required of ["Ronnie Hodges","Teton Valley Ranch","Drawings"]){
       assert.ok(names.some(n=>n.includes(required)),required+" missing from page one");
     }
     assert.match(names[0],/Freeman General Contracting/);
     assert.equal(names.some(n=>/Paintings/.test(n)),false,"Paintings belongs in the archive, not at the top");
     await assertNoHorizontalOverflow(page,"Index");
     await assertVisibleInside(page,"#index-pagination","Index pagination");
     const fit=await page.evaluate(()=>{
       const rows=[...document.querySelectorAll("#work-index-table tbody tr")].filter(r=>!r.hidden);
       const last=rows.at(-1).getBoundingClientRect();
       const nav=document.querySelector("#index-pagination").getBoundingClientRect();
       const scroll=document.querySelector(".index-scroll");
       return {lastBottom:last.bottom,navTop:nav.top,gap:nav.top-last.bottom,scrollOverflow:scroll.scrollHeight-scroll.clientHeight};
     });
     assert.ok(fit.gap>=-3 && fit.gap<=28,"Index leaves dead space or overlaps pagination: "+JSON.stringify(fit));
     assert.ok(fit.scrollOverflow<=3,"Index contains invisible vertical overflow: "+JSON.stringify(fit));
     await screenshot(page,size.name+"-index-01");
     await page.locator('[data-index-page="1"]').click();
     assert.equal(await rows.filter({visible:true}).count(),23-pageOneSize,"remaining work count on page two");
     assert.equal(await page.locator(".index-page-count").innerText(),"02 / 02");
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
     await page.locator('[data-client="drawings"]').click();
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
     await page.locator("#red-sea .image-button").click();
     assert.equal(await page.locator("#painting-detail").evaluate(e=>e.open),true);
     assert.equal(await page.locator("#detail-name").innerText(),"Red Sea");
     await assertVisibleInside(page,"#detail-close","Painting close");
     await waitForImage(page,"#detail-image","Red Sea viewer image");
     await waitForPrice(page,"$2,250");
     await screenshot(page,size.name+"-red-sea");
     await page.locator("#detail-next").click();
     assert.equal(await page.locator("#detail-name").innerText(),"Flowers in McCarty Vase");
     await waitForImage(page,"#detail-image","Flowers viewer image");
     await waitForPrice(page,"$1,650");
     await screenshot(page,size.name+"-flowers");
     await page.locator("#detail-close").click();
     assert.equal(await page.locator("#painting-detail").evaluate(e=>e.open),false);
   });
   await run(size.name+" About / contact / layout",async()=>{
     await waitForPage(page,"/info/");
     assert.equal(await page.locator("h1").innerText(),"Cole Calfee");
     assert.ok(await page.locator('a[href="mailto:colecalfee@gmail.com"]').count());
     assert.ok(await page.locator('a[href="https://www.instagram.com/colecalfee/"]').count());
     await assertNoHorizontalOverflow(page,"About");
     await screenshot(page,size.name+"-about");
   });
   await run(size.name+" no uncaught browser errors",async()=>{assert.deepEqual(errors,[])});
   await context.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(DIR,"results.json"),JSON.stringify({base:BASE,failed,results},null,2));
 console.log("\n"+results.filter(r=>r.status==="PASS").length+" passed; "+failed+" failed");
 process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
