import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
// Override PLAYWRIGHT_MODULE and CHROME_PATH when using another local runtime.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || `${homedir()}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`).href);
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const plan=JSON.parse(await readFile(new URL('../docs/cinematic/living-world-shots.json',import.meta.url),'utf8'));
const mode=process.argv[2]||'proof',filter=process.argv[3];
const out=new URL('../artifacts/cinematic/living-world/',import.meta.url).pathname;
await mkdir(out+'shots',{recursive:true});await mkdir(out+'proofs',{recursive:true});
console.log('LAUNCH');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
console.log('BROWSER READY');
const page=await browser.newPage({viewport:{width:mode==='render'?1920:1280,height:mode==='render'?804:536},deviceScaleFactor:1});
page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
page.on('pageerror',e=>console.error('PAGE ERROR',e.message));
console.log('NAVIGATE');
await page.goto('http://127.0.0.1:5173/?capture',{waitUntil:'domcontentloaded',timeout:120000});
console.log('PAGE LOADED');
await page.addStyleTag({content:'.atlas-v2 > :not(:first-child){display:none!important} canvas{outline:none}'});
await page.waitForFunction(()=>window.stormfatherCapture,{timeout:120000});
console.log('CAPTURE READY');
await page.evaluate(async()=>{
 const [{useAtlas,worldClock},integration,subjects,T,{useLoading}]=await Promise.all([import('/src/atlas/store.ts'),import('/src/atlas/integration.ts'),import('/src/atlas/subjects.ts'),import('/node_modules/three/build/three.module.js'),import('/src/atlas/loading/state.ts')]);
 window.film={useAtlas,worldClock,integration,subjects,T,useLoading};
 useAtlas.getState().set({labels:false,borders:false,exploreOpen:false,playing:false});
 window.stormfatherCapture.root.setFrameloop('never');
 window.film.pose=(shot,u,step)=>{
   const {root,model}=window.stormfatherCapture,{camera,controls}=root;
   const p=integration.placementById.get(shot.city),v=a=>new T.Vector3(...a);
   const t=u*u*(3-2*u);
   let eye,target;
   if(shot.kind==='atlas'){eye=v(shot.eye);target=v(shot.target);}
   else {
     const preset=shot.kind==='street'?model.close:model.overview;
     eye=v(shot.eye||preset.eye);target=v(shot.target||preset.target);
     if(shot.kind==='wildlife'||shot.kind==='radiants'){
       let subject=(shot.kind==='radiants'?subjects.radiantSubjects:subjects.wildlifeSubjects).get(shot.city);
       if(shot.subjectNear){const actors=root.scene.getObjectByName('Native_creatures')?.children.filter(o=>o.name==='chull')||[];actors.sort((a,b)=>a.position.distanceToSquared(v(shot.subjectNear))-b.position.distanceToSquared(v(shot.subjectNear)));if(actors[0])subject={object:actors[0],length:3.2,height:2.8};}
       if(!subject)throw Error('Missing subject '+shot.city);
       target.copy(subject.object.position);target.y+=subject.height*.5;
       const distance=shot.distance||Math.max(subject.length*1.8,subject.height*3,4);
       eye.copy(target).add(v(shot.offset||[distance*.7,distance*.35,distance]));
     }
   }
   const offset=eye.clone().sub(target);
   offset.applyAxisAngle(T.Object3D.DEFAULT_UP,(shot.orbit||0)*(t-.5));
   offset.multiplyScalar(1+(shot.dolly||0)*(t-.5));
   eye.copy(target).add(offset);
   if(shot.drift){const drift=v(shot.drift).multiplyScalar(t-.5);eye.add(drift);target.add(drift);}
   if(shot.city){integration.toAtlas(p,eye,eye);integration.toAtlas(p,target,target);}
   root.gl.toneMappingExposure=shot.exposure||1.2;
   camera.position.copy(eye);camera.fov=shot.fov||42;camera.near=Math.max(.00001,Math.min(.01,eye.distanceTo(target)*.001));camera.updateProjectionMatrix();
   controls.enabled=false;controls.enableDamping=false;controls.target.copy(target);controls.update();
   root.advance(root.clock.elapsedTime+step,true);
 };
});
for(const shot of plan.shots.filter(s=>!filter||s.id.includes(filter))){
 console.log('PREPARE',shot.id);
 await page.evaluate(shot=>{
  const f=window.film,s=f.useAtlas.getState();
  if(shot.city)s.travel(shot.city);else s.showAtlas();
  if(shot.scene)s.startScene(shot.scene);
  if(shot.order)f.useAtlas.getState().selectOrder(shot.order);
  f.useAtlas.getState().set({playing:false,closeView:shot.kind==='street'||!!shot.close,daylight:shot.light??.7,weather:shot.storm?'highstorm':'clear',sceneStartedAt:0});
  f.worldClock.time=shot.time??12;f.worldClock.storm=shot.storm?.9:0;f.worldClock.stormTime=shot.stormTime??0;f.worldClock.stormActive=!!shot.storm;
 },shot);
 await page.waitForFunction(city=>{const c=window.stormfatherCapture;return c&&(!city||c.model?.id===city)&&!window.film.useLoading.getState().place;},shot.city,{timeout:180000});
 await page.waitForTimeout(700);
 await page.evaluate(shot=>{for(let i=0;i<6;i++)window.film.pose({...shot,kind:['wildlife','radiants'].includes(shot.kind)?'overview':shot.kind},.5,1/24);},shot);
 // The first settled render installs skin textures and articulated subject registries.
 await page.waitForTimeout(500);
 const meta=await page.evaluate(()=>{const m=window.stormfatherCapture.model;return m?{overview:m.overview,close:m.close,routes:m.routes,market:m.group.userData.marketCourt}:{};});
 await writeFile(out+'proofs/'+shot.id+'.json',JSON.stringify(meta,null,2));
 if(mode==='proof'){
  for(const [tag,u] of [['start',0],['mid',.5],['end',1]]){
   const data=await page.evaluate(({shot,u})=>{window.film.pose(shot,u,1/24);return window.stormfatherCapture.root.gl.domElement.toDataURL('image/jpeg',.94).split(',')[1];},{shot,u});
   await writeFile(out+'proofs/'+shot.id+'-'+tag+'.jpg',Buffer.from(data,'base64'));
  }
  console.log('PROOF',shot.id);continue;
 }
 const frames=Math.round(shot.duration*plan.fps);
 const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-r',String(plan.fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p',out+'shots/'+shot.id+'.mp4'],{stdio:['pipe','inherit','inherit']});
 const ended=once(ff,'close');
 await page.evaluate(()=>window.film.useAtlas.getState().set({playing:true}));
 const started=Date.now();
 for(let i=0;i<frames;i++){
  const data=await page.evaluate(({shot,u,dt})=>{window.film.pose(shot,u,dt);return window.stormfatherCapture.root.gl.domElement.toDataURL('image/jpeg',.97).split(',')[1];},{shot,u:i/(frames-1),dt:1/plan.fps});
  if(!ff.stdin.write(Buffer.from(data,'base64')))await once(ff.stdin,'drain');
  if(i===Math.floor(frames/2))await writeFile(out+'proofs/'+shot.id+'-final.jpg',Buffer.from(data,'base64'));
  if(i%48===0)console.log('FRAME',shot.id,i+'/'+frames,((Date.now()-started)/1000).toFixed(1)+'s');
 }
 ff.stdin.end();const [code]=await ended;if(code!==0)throw Error('ffmpeg failed '+shot.id);
 console.log('DONE',shot.id);
}
await browser.close();
