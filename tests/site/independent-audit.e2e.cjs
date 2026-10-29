const fs=require("node:fs");
const path=require("node:path");
const SHOTS=process.env.SCREENSHOTS||"release-screenshots";
fs.mkdirSync(SHOTS,{recursive:true});
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const BASE=(process.env.BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const views=[{name:"desktop",width:1440,height:900,mobile:false},{name:"desktop-1280",width:1280,height:800,mobile:false},{name:"iphone",width:390,height:844,mobile:true},{name:"iphone-se",width:375,height:667,mobile:true}];
let failures=0;const result=[];
async function test(name,cb){
 try{await cb();console.log("PASS",name);result.push({name,status:"pass"});}
 catch(e){failures++;console.log("FAIL",name,String(e.stack||e).slice(0,1500));result.push({name,status:"fail",message:e.message});}
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const view of views){
  const ctx=await browser.newContext({viewport:{width:view.width,height:view.height},isMobile:view.mobile,hasTouch:view.mobile});
  const page=await ctx.newPage();
  await page.goto(BASE+"/index/",{waitUntil:"load"});
  const panel=page.locator("#selected-work-panel");
  await test(view.name+" initial index remains closed",async()=>{
   assert.equal(await panel.evaluate(el=>el.classList.contains("is-open")),false);
   assert.equal(await page.locator("#index-page-count").count(),0); // use class selector below
  });
  await test(view.name+" Freeman opens on first click",async()=>{
   await page.locator('[data-client="freeman"]').click();
   assert.equal(await panel.evaluate(el=>el.classList.contains("is-open")),true);
   assert.equal(await page.locator('[data-panel="freeman"]').isVisible(),true);
   assert.equal(await page.locator('[data-client="freeman"]').getAttribute("aria-expanded"),"true");
   assert.equal(await page.locator('[data-panel="freeman"] iframe').count(),0);
   await page.screenshot({path:path.join(SHOTS,"audit-"+view.name+"-freeman.png")});
   await page.locator('[data-panel="freeman"] .panel-close').click();
  });
  if(view.mobile){
   await test(view.name+" Ramsey marks visible and fitted",async()=>{
    const row=page.locator('[data-client="ramsey-hill"]');
    if(!await row.isVisible())await page.locator('[data-index-page="1"]').click();
    await row.click();
    await page.locator('[data-panel="ramsey-hill"] img').first().evaluate(e=>e.decode());
    const v=await page.locator('[data-panel="ramsey-hill"] img').evaluateAll(imgs=>imgs.map(e=>({height:e.getBoundingClientRect().height,natural:e.naturalWidth,bottom:e.getBoundingClientRect().bottom})));
    assert.equal(v.length,2);
    v.forEach(x=>assert.ok(x.natural>0&&x.height>=40&&x.bottom<=view.height+1,JSON.stringify(v)));
    const cap=page.locator('[data-panel="ramsey-hill"] .archive-plate-caption').last();
    assert.ok((await cap.boundingBox()).y+(await cap.boundingBox()).height <view.height);
    await page.screenshot({path:path.join(SHOTS,"audit-"+view.name+"-ramsey.png")});
    await page.locator('[data-panel="ramsey-hill"] .panel-close').click();
   });
  }else{
   await test(view.name+" pagination preserves column geometry and clears detail",async()=>{
    const before=await page.locator(".index-scroll").boundingBox();
    await page.locator('[data-client="joseph"]').click();
    await page.locator('[data-index-page="1"]').click();
    const after=await page.locator(".index-scroll").boundingBox();
    assert.ok(Math.abs(before.x-after.x)<3&&Math.abs(before.width-after.width)<3,JSON.stringify({before,after}));
    assert.equal(await panel.evaluate(el=>el.classList.contains("is-open")),false);
    assert.equal(await page.locator('[data-panel="joseph"]').isVisible(),false);
    assert.equal(await page.locator(".index-page-count").innerText(),"02 / 02");
    await page.locator('[data-index-page="-1"]').click();
   });
   await test(view.name+" Enter opens enlarged viewer and arrow advances slideshow",async()=>{
    await page.locator('[data-client="ronnie"]').click();
    const fig=page.locator('[data-panel="ronnie-photo"] .photo-plate').first();
    await fig.focus();await page.keyboard.press("Enter");
    assert.equal(await page.locator("#work-image-dialog").evaluate(el=>el.open),true);
    assert.equal(await page.locator("#viewer-count").innerText(),"01 / 02");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#viewer-count").innerText(),"02 / 02");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#work-image-dialog").evaluate(el=>el.open),false);
    await page.locator('[data-panel="ronnie-photo"] .panel-close').click();
   });
   await test(view.name+" row focus arrow keys change gallery",async()=>{
    await page.locator('[data-client="teton"]').click();
    await page.locator('[data-client="teton"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(()=>document.querySelector("#teton-count")?.textContent?.includes("02 / 03"));
    await page.locator('[data-panel="teton-photo"] .panel-close').click();
   });
   await test(view.name+" paintings captions clear of footer",async()=>{
    await page.locator('[data-index-page="1"]').click();
    await page.locator('[data-client="paintings"]').click();
    await page.locator("#sold-painting-image").evaluate(img=>img.decode());
    const dimensions=await page.locator("#sold-painting-image").evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight,visible:img.getBoundingClientRect().height}));
    assert.ok(dimensions.width>=200 && dimensions.height>=200 && dimensions.visible>=60,JSON.stringify(dimensions));
    const state=await page.evaluate(()=>{
      const cap=document.querySelector(".paintings-archive-caption").getBoundingClientRect();
      const footer=document.querySelector(".footer").getBoundingClientRect();
      const stage=document.querySelector(".paintings-archive-stage").getBoundingClientRect();
      return {capTop:cap.top,capBottom:cap.bottom,footerTop:footer.top,stageHeight:stage.height};
    });
    assert.ok(state.capBottom+3<state.footerTop&&state.stageHeight>=60,JSON.stringify(state));
    await page.screenshot({path:path.join(SHOTS,"audit-"+view.name+"-sold-paintings.png")});
    await page.locator('[data-panel="paintings"] .panel-close').click();
   });
  }
  await ctx.close();
 }
 await browser.close();
 console.log(result.length-failures+"/"+result.length+" targeted audit checks passed");
 process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});