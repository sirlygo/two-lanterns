const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const inventory=JSON.parse(fs.readFileSync(path.join(root,'art/inventory.json'),'utf8'));
function load(file){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 for(const s of scripts)new vm.Script(s);
 const main=scripts.at(-1),ctx=vm.createContext({console});
 vm.runInContext(main.slice(0,main.indexOf('/* Two Lanterns :: saved characters.')),ctx);
 return {ctx,html};
}
const original=load('backups/index-placeholders.html'),current=load('index.html'),{Art,Data,Engine}=current.ctx;
const pack=require('./rooms-pack.cjs'),added=pack.ready(root);
for(const r of added.rooms){assert(Data.pool.includes(r.id)&&Data.byId[r.id].opts2&&Data.relics[r.relic],'Pack room not wired in: '+r.id);inventory.scenes.push(r.id);}
assert.deepEqual(pack.strip(JSON.parse(JSON.stringify(Data)),added),JSON.parse(JSON.stringify(original.ctx.Data)),'Game data changed');
for(const k of Object.keys(Engine))if(typeof Engine[k]==='function')assert.equal(Engine[k].toString(),original.ctx.Engine[k].toString(),'Rule changed: '+k);
assert.equal(Art.names.length,inventory.scenes.length);
assert.equal(Art.ROOMS.length,38+added.rooms.length);
for(const id of inventory.icons)assert(Art.icons.includes(id),'Missing icon '+id);
for(const id of Art.names){
 const s=Art.scene(id,{label:'Quoted " < & test',picks:[{calling:'guard'},{calling:'witch'}]});
 assert(s.includes('data:image/webp;base64,'),'Scene missing image '+id);
 assert(s.includes('role="img"'),'Scene missing accessibility '+id);
 assert(s.includes('Quoted &quot; &lt; &amp; test'),'Unsafe label '+id);
}
let variants=0;
for(const kind of ['ring','break','steal','keep','collapse','deadlock'])for(const f0 of inventory.fates)for(const f1 of inventory.fates){
 const s=Art.scene('end',{dun:{kind},fates:[f0,f1]});
 assert(s.includes('data-asset="end-'+kind+'"'));
 assert(s.includes('data-fate="'+f0+'"')&&s.includes('data-fate="'+f1+'"'));
 variants++;
}
for(const id of Art.ROOMS)for(let tier=0;tier<4;tier++)assert(Art.scene(id,{tier}).includes('data-tier="'+tier+'"'));
for(const calling of ['guard','thief','witch','cantor'])for(const origin of ['ringer','dock','barrow','priory'])for(const lantern of ['tallow','witchfire','glowmoss','saintoil'])for(const keepsake of ['clapper','letter','locket','coin'])for(let who=0;who<2;who++){
 const s=Art.portrait({calling,origin,lantern,keepsake},who);
 assert(s.includes('data-calling="'+calling+'"'));
 assert(s.includes('data-flame="'+lantern+'"'));
 assert(s.includes('data-origin="'+origin+'"'));
 assert(s.includes('data-keepsake="'+keepsake+'"'));
}
assert(current.html.includes('function blankDie() { return A.die(0); }'),'Old die remains');
assert(!current.html.includes('art drawn in code'),'Stale art credit');
assert(!current.html.includes('/* Two Lanterns :: art core'),'Placeholder renderer remains');
for(const gone of ['Light the lanterns','PeerJS matchmaker','Pass-and-play for two','Online play ·','Play online'])assert(!current.html.includes(gone),'Stale UI text: '+gone);
for(const here of ['Play on one device','Play on two devices','About twenty-five minutes.<br>'].concat(added.rooms.length?[]:['at random from thirty-six']))assert(current.html.includes(here),'Missing UI text: '+here);
for(const here of ['window.TL_ICE=','Net.ice = ','function watchIce(','function lineHook(','function switchToLine(','OPEN_MS = 30000','c && c.relay ? LINE_BYTES : DIRECT'])assert(current.html.includes(here),'Missing online-play fix: '+here);
const onlinePlay=require('./verify-net.cjs')(current.html);
console.log(JSON.stringify({ok:true,packRooms:added.rooms.length,onlinePlay,scenes:Art.names.length,assets:Art.assetCount,icons:Art.icons.length,portraitCombinations:512,endingCombinations:variants,unchangedRules:true,unchangedStory:true,bytes:Buffer.byteLength(current.html)}));
