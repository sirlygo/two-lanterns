const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const dependency=name=>require(process.env.TWO_LANTERNS_NODE_MODULES?path.join(process.env.TWO_LANTERNS_NODE_MODULES,name):name);
const {chromium}=dependency('playwright');
const sharp=dependency('sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'art','qa');
fs.mkdirSync(out,{recursive:true});
let qaBrowser;
(async()=>{
 const launch={headless:true,args:['--disable-background-networking']};
 if(process.env.TWO_LANTERNS_CHROME)launch.executablePath=process.env.TWO_LANTERNS_CHROME;
 const browser=qaBrowser=await chromium.launch(launch);
 const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function check(label){
  await page.waitForFunction(()=>!window.__tl||!__tl.ui.rolling);
  const result=await page.evaluate(()=>({screen:window.__tl?.S.screen,overflow:document.documentElement.scrollWidth>innerWidth,scenes:[...document.querySelectorAll('svg[data-scene]')].map(n=>n.dataset.scene),portraits:document.querySelectorAll('.shadow-portrait').length,assets:[...document.querySelectorAll('svg image')].every(n=>n.getAttribute('href')?.startsWith('data:image/webp;base64,'))}));
  if(result.overflow)errors.push('Horizontal overflow: '+label);
  if(!result.assets)errors.push('External or missing image: '+label);
  checks.push({label,...result});
 }
 const go=()=>page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load'});
 await go();await check('desktop-title');await page.screenshot({path:path.join(out,'desktop-title.png'),fullPage:true});
 await page.locator('[data-act="start"]').click();
 await page.locator('input[name="n0"]').fill('Ember');await page.locator('input[name="n1"]').fill('Verdigris');await page.locator('form[data-form="names"] button[type="submit"]').click();
 let created=0;
 for(let step=0;step<40;step++){
  const state=await page.evaluate(()=>({screen:__tl.S.screen,cq:__tl.S.cq,cp:__tl.S.cp}));
  if(state.screen==='meet')break;
  if(state.screen==='handoff'){await page.locator('[data-act="ho"]').click();continue;}
  if(state.screen!=='create')throw Error('Unexpected creation screen '+state.screen);
  if(state.cq<0){await page.locator('[data-act="fresh"]').click();continue;}
  await check('create-'+state.cp+'-'+state.cq);
  const choices=[[0,2,1,2,2],[3,3,3,1,1]];
  await page.locator('[data-act="sel"][data-i="'+choices[state.cp][state.cq]+'"]').click();
  if(state.cp===0&&state.cq===2)await page.screenshot({path:path.join(out,'desktop-creation.png'),fullPage:true});
  await page.locator('[data-act="next"]').click();created++;
 }
 await check('meet');await page.screenshot({path:path.join(out,'desktop-characters.png'),fullPage:true});
 for(let k=0;k<30;k++){if(await page.evaluate(()=>__tl.S.lead!==null))break;await page.locator('[data-act="first"]').click();await page.waitForFunction(()=>!__tl.ui.rolling);}
 await page.locator('[data-act="descend"]').click();
 for(let step=0;step<120;step++){
  const state=await page.evaluate(()=>({screen:__tl.S.screen,room:__tl.S.room,rolled:!!__tl.S.rl,sel:__tl.S.sel}));
  await check(state.screen+'-'+state.room);
  if(state.screen==='ending'){await page.screenshot({path:path.join(out,'desktop-ending.png'),fullPage:true});break;}
  if(state.screen==='intro'){
    if(state.room===0)await page.screenshot({path:path.join(out,'desktop-room.png'),fullPage:true});
    await page.locator('[data-act="begin"]').click();
  }else if(state.screen==='choose'){
    const opts=await page.evaluate(()=>__tl.E.optsFor(__tl.S,__tl.S.turn).map((o,i)=>({i,k:o.k,a:o.a,score:__tl.S.p[__tl.S.turn].stats[o.k]+(o.a==='team'?1:0)})).sort((a,b)=>b.score-a.score));
    await page.locator('[data-act="sel"][data-i="'+opts[0].i+'"]').click();
    if(state.room===0)await page.screenshot({path:path.join(out,'desktop-choices.png'),fullPage:true});
    await page.locator('[data-act="lock"]').click();
  }else if(state.screen==='handoff')await page.locator('[data-act="ho"]').click();
  else if(state.screen==='roll'){
    if(!state.rolled){await page.locator('[data-act="roll"]').click();await page.waitForFunction(()=>!__tl.ui.rolling);}
    else{if(state.room===0)await page.screenshot({path:path.join(out,'desktop-results.png'),fullPage:true});await page.locator('[data-act="onward"]').click();}
  }else if(state.screen==='stall'){
    await page.screenshot({path:path.join(out,'desktop-stall-'+state.room+'.png'),fullPage:true});
    await page.locator('[data-act="leave"]').last().click();
  }else throw Error('Unexpected play screen '+state.screen);
 }
 if(await page.evaluate(()=>__tl.S.screen)!=='ending')throw Error('Descent did not finish');
 await page.locator('[data-act="book"]').click();await check('book');await page.screenshot({path:path.join(out,'desktop-book.png'),fullPage:true});
 for(const group of ['rooms','support','endings','portraits','symbols']){
  await page.goto(pathToFileURL(path.join(root,'art-review.html')).href+'?group='+group,{waitUntil:'load'});
  await check('review-'+group);
  await page.screenshot({path:path.join(out,'review-'+group+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await go();await check('mobile-title');await page.screenshot({path:path.join(out,'mobile-title.png'),fullPage:true});
 await page.locator('[data-act="start"]').click();await check('mobile-names');
 await page.locator('form[data-form="names"] button[type="submit"]').click();
 await page.locator('[data-act="fresh"]').click();
 await page.locator('[data-act="sel"][data-i="1"]').click();await check('mobile-create');await page.screenshot({path:path.join(out,'mobile-creation.png'),fullPage:true});
 await page.evaluate(()=>{__tl.ACT['reset-yes']();});await page.locator('[data-act="online"]').click();await check('mobile-lobby');await page.screenshot({path:path.join(out,'mobile-lobby.png'),fullPage:true});
 const alpha=[];
 for(const name of ['guard','thief','witch','cantor']){const meta=await sharp(path.join(root,'art/portraits',name+'.webp')).metadata();if(!meta.hasAlpha)errors.push('Portrait lacks alpha: '+name);alpha.push({name,alpha:meta.hasAlpha,width:meta.width,height:meta.height});}
 const report={ok:errors.length===0,createdChoices:created,checks,alpha,errors};
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));await browser.close();if(errors.length)process.exitCode=1;
})().catch(async e=>{console.error(e);if(qaBrowser)await qaBrowser.close();process.exitCode=1;});
