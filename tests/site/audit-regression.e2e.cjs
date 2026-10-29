
/* Independent audit regression, actual Chromium at viewport sizes cited by auditor. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");const path=require("node:path");
const BASE=(process.env.BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const DIR=process.env.SCREENSHOTS||"release-screenshots";fs.mkdirSync(DIR,{recursive:true});
let passed=0,failed=0;
const run=async(name,fn)=>{try{await fn();console.log("PASS",name);passed++;}catch(e){console.log("FAIL",name,String(e.stack||e).slice(0,1400));failed++;}};
(async()=>{
const b=await chromium.launch({headless:true});
for(const size of [{label:"375",width:375,height:667,mobile:true},{label:"390",width:390,height:844,mobile:true},{label:"1280",width:1280,height:800,mobile:false}]){
const ctx=await b.newContext({viewport:{width:size.width,height:size.height},isMobile:size.mobile,hasTouch:size.mobile});
const page=await ctx.newPage();page.setDefaultTimeout(7000);
await page.goto(BASE+"/index/",{waitUntil:"load"});
await run(size.label+" Ramsey images visible and nonzero",async()=>{
 const btn=page.locator('[data-client="ramsey-hill"]');await btn.click();
 const imgs=page.locator('[data-panel="ramsey-hill"] .ramsey-marks img');
 await page.waitForFunction(()=>{
 const es=[...document.querySelectorAll('[data-panel="ramsey-hill"] .ramsey-marks img')];
 return es.length===2&&es.every(el=>el.complete&&el.naturalWidth>0);
 },null,{timeout:8000});
 const metrics=await imgs.evaluateAll(imgs=>imgs.map(el=>{const b=el.getBoundingClientRect();return {h:b.height,w:b.width,naturalWidth:el.naturalWidth}}));
 assert.ok(metrics.every(m=>m.h>=70&&m.w>=50),JSON.stringify(metrics));
 await page.screenshot({path:path.join(DIR,"audit-"+size.label+"-ramsey.png")});
});
await run(size.label+" closing detail restores list",async()=>{
 await page.locator('[data-panel="ramsey-hill"] .panel-close').click();
 assert.equal(await page.locator(".work-panel").evaluate(e=>e.classList.contains("is-open")),false);
});
await run(size.label+" page change resets open panel",async()=>{
 await page.locator('[data-client="joseph"]').click();
 if(size.mobile)await page.locator('[data-panel="joseph"] .panel-close').click();
 const before=await page.locator(".index-layout").evaluate(e=>getComputedStyle(e).gridTemplateColumns);
 await page.locator('[data-index-page="1"]').click();
 const panel=page.locator(".work-panel");
 assert.equal(await panel.evaluate(e=>e.classList.contains("is-open")),false,"stale Joseph panel");
 assert.equal(await page.locator('[data-client="joseph"]').getAttribute("aria-expanded"),"false");
 const after=await page.locator(".index-layout").evaluate(e=>getComputedStyle(e).gridTemplateColumns);
 if(!size.mobile)assert.notEqual(before,after,"desktop layout should revert from expanded pane to catalogue grid");
 const c=await page.locator(".index-page-count").innerText();assert.equal(c,"02 / 02");
 await page.screenshot({path:path.join(DIR,"audit-"+size.label+"-index-02.png")});
});
await run(size.label+" Paintings caption fully visible",async()=>{
 const button=page.locator('[data-client="paintings"]');await button.click();
 await page.waitForFunction(()=>{
   const img=document.querySelector("#sold-painting-image");
   return img&&img.complete&&img.naturalWidth>0&&img.naturalHeight>0;
 },null,{timeout:10000});

 const state=await page.evaluate(()=>{
  const caption=document.querySelector(".paintings-archive-caption");
  const panel=document.querySelector(".panel-content.paintings-panel");
  const footer=document.querySelector(".footer");
  const image=document.querySelector("#sold-painting-image");
  const rect=el=>{const x=el.getBoundingClientRect();return {top:x.top,bottom:x.bottom,h:x.height}};
  const elements=[...caption.querySelectorAll("#sold-title,#sold-detail,.sold-mark")].map(rect);
  return {caption:rect(caption),panel:rect(panel),footer:rect(footer),elements,image:rect(image),stage:rect(document.querySelector(".paintings-archive-stage")),style:{display:getComputedStyle(image).display,visibility:getComputedStyle(image).visibility,opacity:getComputedStyle(image).opacity},vh:innerHeight,captionText:caption.innerText};
 });
 console.log("PAINT METRICS",size.label,JSON.stringify(state));
 assert.ok(state.image.h>=120&&state.image.bottom>state.image.top,"painting image has no painted stage "+JSON.stringify(state));
 assert.ok(state.caption.h>=45,"caption collapsed "+JSON.stringify(state));
 assert.ok(state.caption.bottom<=state.panel.bottom+2,"caption clipped within its panel "+JSON.stringify(state));
 assert.ok(state.caption.bottom<=state.footer.top-1,"caption overlaps footer "+JSON.stringify(state));
 assert.ok(state.elements.every(e=>e.h>=13&&e.bottom<=state.caption.bottom+2),"sold title/detail clipped "+JSON.stringify(state));
 await page.screenshot({path:path.join(DIR,"audit-"+size.label+"-paintings.png")});
});
await ctx.close();
}
await run("Purchase arrow is single icon",async()=>{
 const ctx=await b.newContext({viewport:{width:1280,height:800}});const p=await ctx.newPage();
 await p.goto(BASE+"/paintings/",{waitUntil:"load"});
 const result=await p.locator("body").evaluate(()=>getComputedStyle(document.createElement("div")).content);
 const pseudo=await p.evaluate(()=>{
 const e=document.createElement("button");e.className="buy-add";e.textContent="Purchase ↗";document.querySelector("#detail-action")?.append(e);
 const c=getComputedStyle(e,"::after").content;e.remove();return c;
 });
 assert.ok(["none","normal",'""'].includes(pseudo),"duplicate purchase arrow CSS: "+pseudo);
 await ctx.close();
});
await b.close();console.log(passed+" passed; "+failed+" failed");process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
