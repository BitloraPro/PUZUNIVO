import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { mission,pickupCoords } from '../megarush-api.mjs';
import { updatePlayer, cameraRelativeInput, MeshBuilder, WebGLWorld, buildCharacterMesh, buildVehicleMesh, trafficPosition, advanceFixedPhysics, cameraSafePosition, onHarborRoad, atHarbor, HARBOR_FINISH, cameraFollowFactor } from '../public/megarush/engine.js';

function reservePort() { return new Promise(resolve => {const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})}) }


test('Fixed physics yields equal player travel at 30 and 60 Hz and limits background catch-up',()=>{
 const world={weather:'clear',collide:()=>null,elevation:()=>0,traffic:[],t:0};
 const run=fps=>{
  let carry=0,time=0;const p={x:0,y:0,z:0,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'skate',heat:0,hp:3,crashCooldown:0};
  for(let i=0;i<fps*2;i++){
   const stepped=advanceFixedPhysics(carry,1/fps,d=>{time+=d;world.t=time;updatePlayer(p,{x:0,z:1,sprint:true},world,d)});
   carry=stepped.carry;
  }
  return p.z;
 };
 assert.ok(Math.abs(run(30)-run(60))<0.01,'travel time must not depend on rendering FPS');
 let steps=0;const caught=advanceFixedPhysics(0,8,()=>{steps++});
 assert.equal(steps,6,'long app-background time is capped');
 assert.ok(caught.carry<1/60,'no long physics debt carries into resumed game');
});

test('MegaRush progression defines ten chapters across exactly 500 zones',()=>{
 assert.equal(mission(1).chapter,1);
 assert.equal(mission(50).chapter,1);
 assert.equal(mission(51).chapter,2);
 assert.equal(mission(500).chapter,10);
 assert.ok(mission(500).targetCollectibles>=3);
});

test('MegaRush physics uses realistic movement caps and water changes vehicle mode',()=>{
 const world={weather:'clear',collide:()=>false,elevation:()=>0};
 const p={x:0,y:0,z:0,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'foot',heat:0,hp:3,crashCooldown:0};
 const original={x:0,z:1,jump:false,dive:false,climb:false};
 for(let i=0;i<40;i++)updatePlayer(p,original,world,.025);
 assert.ok(p.z>5.5 && p.z<8.1,'foot movement is responsive but remains speed-capped');
 p.x=20;p.z=66.5;updatePlayer(p,{...original,z:0},world,.02);
 assert.equal(p.vehicle,'swim');
});

test('MegaRush uses existing PUZUNIVO session, checks anti-duplicate purchases and guards Admin',async t=>{
 const temp=mkdtempSync(path.join(tmpdir(),'megarush-test-'));
 const port=await reservePort(),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),PUZUNIVO_DATA_DIR:temp,ADMIN_EMAIL:'administrator@localhost.test',ADMIN_PASSWORD:'an-unshared-test-password-2026'},stdio:['ignore','pipe','pipe']});
 t.after(()=>{child.kill();rmSync(temp,{recursive:true,force:true})});
 let error='';child.stderr.on('data',chunk=>error+=chunk);
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,30));if(i===99)throw Error('API failed: '+error)}
 let cookies={player:'',admin:''};
 async function request(route,body,who='player'){
  const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookies[who]?{Cookie:cookies[who]}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const cookie=r.headers.get('set-cookie');if(cookie)cookies[who]=cookie.split(';')[0];
  return {status:r.status,body:await (r.headers.get('content-type')?.includes('application/json')?r.json():r.text())};
 }
 const health=await request('/api/megarush/health');
 assert.equal(health.status,200);
 assert.deepEqual(health.body,{ok:true,app:'PUZUNIVO',gameId:'megarush',apiVersion:1,landscape:true});
 assert.equal((await request('/megarush')).status,200);
 assert.equal((await request('/admin/megarush')).status,200);
 assert.equal((await request('/megarush/game.js')).status,200);
 assert.equal((await request('/api/megarush/bootstrap')).status,200);
 assert.equal((await request('/api/megarush/session/start',{character:'rylee'})).status,401);
 assert.equal((await request('/api/megarush/session/active')).status,401);
 assert.equal((await request('/api/megarush/admin')).status,401);
 let guest=await request('/api/auth/guest',{});assert.equal(guest.status,201);const userId=guest.body.user.id;
 const b=await request('/api/megarush/bootstrap');assert.equal(b.status,200);assert.equal(b.body.level,1);assert.equal(b.body.chapters.length,10);
 assert.deepEqual((await request('/api/megarush/session/active')).body,{active:false});
 assert.equal((await request('/api/megarush/admin')).status,403);
 assert.equal((await request('/api/megarush/session/start',{character:'invalid'})).status,400);
 const session=await request('/api/megarush/session/start',{character:'zara'});assert.equal(session.status,201);assert.equal(session.body.mission.level,1);
 const restored=await request('/api/megarush/session/active');
 assert.equal(restored.status,200);assert.equal(restored.body.active,true);assert.equal(restored.body.id,session.body.id);
 assert.deepEqual(restored.body.pickups,session.body.pickups);
 assert.deepEqual([restored.body.x,restored.body.z],[0,0]);
 assert.equal(session.body.pickups.length,12);
 // A phone restart restores the original vehicle/camera/health, not just x/z.
 const savedState={vehicle:'skate',hp:2,heat:.34,angle:1.25,policeX:-10,policeZ:18,cameraYaw:-1.1,chaseActive:true,carSlot:2};
 assert.equal((await request('/api/megarush/session/heartbeat',{id:session.body.id,x:1,z:1,state:savedState})).status,200);
 const resumedState=await request('/api/megarush/session/active');
 assert.deepEqual(resumedState.body.state,savedState);
 assert.deepEqual([resumedState.body.x,resumedState.body.z],[1,1]);
 await new Promise(r=>setTimeout(r,165));
 assert.equal((await request('/api/megarush/session/heartbeat',{id:session.body.id,x:1,z:1,state:{...savedState,vehicle:'spaceship'}})).status,400);
 assert.deepEqual((await request('/api/megarush/session/active')).body.state,savedState,'invalid client state must not alter existing save');
 assert.equal((await request('/api/megarush/pickup',{sessionId:session.body.id,itemId:session.body.pickups[0].id})).status,400);
 assert.equal((await request('/api/megarush/level/complete',{sessionId:session.body.id})).status,409);
 assert.equal((await request('/api/megarush/wardrobe/buy',{itemId:'sunset_board'})).status,409);
 assert.equal((await request('/api/megarush/wardrobe/equip',{character:'leo',skin:'sunset_board'})).status,403);
 assert.equal((await request('/api/megarush/wardrobe/equip',{character:'leo',skin:'default'})).status,200);
 const login=await request('/api/auth/login',{email:'administrator@localhost.test',password:'an-unshared-test-password-2026'},'admin');assert.equal(login.status,200);
 const stats=await request('/api/megarush/admin',undefined,'admin');assert.equal(stats.status,200);assert.equal(stats.body.metrics.runs,1);assert.equal(stats.body.metrics.players,1);
 assert.equal(stats.body.monetization.estimatedRevenue,null);
 assert.equal((await request('/api/megarush/admin/settings',{key:'trafficDensity',value:1.2},'admin')).status,400);
 assert.equal((await request('/api/megarush/admin/settings',{key:'trafficDensity',value:.45},'admin')).status,200);
 // A live operator can change future runs without retroactively invalidating this run.
 const persisted=new DatabaseSync(path.join(temp,'puzunivo.sqlite'));
 const initial=persisted.prepare('SELECT required_orbs,pickup_count FROM mr_sessions WHERE id=?').get(session.body.id);
 assert.equal(initial.required_orbs,session.body.mission.targetCollectibles);
 assert.equal(initial.pickup_count,session.body.pickups.length);
 assert.equal((await request('/api/megarush/admin/settings',{key:'difficultyMultiplier',value:2},'admin')).status,200);
 assert.equal((await request('/api/megarush/admin/settings',{key:'collectibleDensity',value:.3},'admin')).status,200);
 const unchanged=persisted.prepare('SELECT required_orbs,pickup_count FROM mr_sessions WHERE id=?').get(session.body.id);
 assert.deepEqual(unchanged,initial);
 const snapshot=await request('/api/megarush/session/active');
 assert.equal(snapshot.body.mission.targetCollectibles,initial.required_orbs,'admin changes do not change an in-progress resumed mission');
 assert.equal(snapshot.body.pickups.length,initial.pickup_count);
 persisted.close();
 const announced=await request('/api/megarush/admin/announcement',{message:'Welcome to this weekend\'s neon street challenge!'},'admin');assert.equal(announced.status,201);
 assert.equal((await request('/api/megarush/bootstrap')).body.announcements.length,1);
 assert.equal((await request('/api/megarush/admin/account',{userId,action:'ban',reason:'Test restriction'},'admin')).status,200);
 assert.equal((await request('/api/megarush/session/start',{character:'rylee'})).status,403);
 assert.equal((await request('/api/megarush/admin/account',{userId,action:'unban'},'admin')).status,200);
 // A stale Android WebView session is safely expired rather than silently revived.
 const db2=new DatabaseSync(path.join(temp,'puzunivo.sqlite'));
 db2.prepare('UPDATE mr_sessions SET last_seen=? WHERE id=?').run(Date.now()-5*3600000,session.body.id);
 db2.close();
 const expired=await request('/api/megarush/session/active');
 assert.deepEqual(expired.body,{active:false,expired:true});
 const nextRun=await request('/api/megarush/session/start',{character:'rylee'});
 assert.equal(nextRun.status,201);
 assert.equal((await request('/api/megarush/session/active')).body.id,nextRun.body.id);
 assert.ok(nextRun.body.mission.targetCollectibles>session.body.mission.targetCollectibles);
 assert.ok(nextRun.body.pickups.length>=nextRun.body.mission.targetCollectibles);
});

test('Sprint increases traversal speed without altering normal movement and police collision damages once per cooldown',()=>{
 const world={weather:'clear',collide:()=>false,elevation:()=>0};
 function avatar(){return {x:0,y:0,z:0,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'skate',heat:0,hp:3,crashCooldown:0,policeX:15,policeZ:20}}
 const a=avatar(),b=avatar();for(let i=0;i<40;i++){
  updatePlayer(a,{x:0,z:1,sprint:false},world,.025);
  updatePlayer(b,{x:0,z:1,sprint:true},world,.025);
 }
 assert.ok(b.z>a.z*1.25,'sprint materially increases skate distance');
 const chased={...avatar(),vehicle:'car',heat:.95,policeX:1,policeZ:1};
 updatePlayer(chased,{x:0,z:0,sprint:false},world,.03);
 assert.equal(chased.hp,2,'pursuit contact consumes a heart');
 updatePlayer(chased,{x:0,z:0,sprint:false},world,.03);
 assert.equal(chased.hp,2,'contact cooldown prevents repeated instant damage');
 assert.ok(chased.policeX<1&&chased.policeZ<1,'pursuer advances toward player');
});

test('Directional avatar geometry rotates with the character and maintains valid vertex normals',()=>{
 const m=new MeshBuilder();m.orientedBox(0,0,0,1,2,4,'#54ffa3',Math.PI/2);
 assert.equal(m.vertices.length,36*9);
 const xs=[],zs=[];for(let i=0;i<m.vertices.length;i+=9){xs.push(m.vertices[i]);zs.push(m.vertices[i+2]);
  assert.ok(Number.isFinite(m.vertices[i+3])&&Number.isFinite(m.vertices[i+5]));
 }
 assert.ok(Math.max(...xs)-Math.min(...xs)>3.9,'length rotated onto X axis');
 assert.ok(Math.max(...zs)-Math.min(...zs)<1.01,'width rotated onto Z axis');
});

test('Landscape HUD, real analog touch control, and orientation fallback are integrated only into MegaRush',()=>{
 const root=new URL('../public/megarush/',import.meta.url);
 const html=readFileSync(new URL('index.html',root),'utf8');
 const css=readFileSync(new URL('game.css',root),'utf8');
 const js=readFileSync(new URL('game.js',root),'utf8');
 assert.match(html,/id="joystick"/);assert.match(html,/id="rotate-screen"/);
 assert.match(html,/data-key="sprint"/);assert.match(html,/id="speed"/);
 assert.match(css,/@media \(orientation: portrait\) and \(max-width:900px\)/);
 assert.match(js,/stick\.addEventListener\('pointermove'/);
 assert.match(js,/screen\.orientation\?\.lock\?\.\('landscape'\)/);
 assert.match(js,/world\.cameraYaw/);
});

test('Original 3D world generation and frame rendering execute against a minimal WebGL2 interface',()=>{
 const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ARRAY_BUFFER:34962,FLOAT:5126,DEPTH_TEST:2929,LEQUAL:515,TEXTURE_2D:3553,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,STATIC_DRAW:35044,DYNAMIC_DRAW:35048,TRIANGLES:4};
 for(const method of ['createShader','createProgram','getUniformLocation','createVertexArray','createBuffer'])gl[method]=()=>({});
 for(const method of ['shaderSource','compileShader','attachShader','linkProgram','useProgram','bindVertexArray','bindBuffer','enableVertexAttribArray','vertexAttribPointer','enable','depthFunc','viewport','bufferData','clearColor','clear','uniformMatrix4fv','uniform3fv','uniform1f','drawArrays'])gl[method]=()=>{};
 gl.getShaderParameter=()=>true;gl.getProgramParameter=()=>true;gl.getAttribLocation=()=>0;
 const oldWindow=globalThis.window,oldDpr=globalThis.devicePixelRatio;
 globalThis.window={addEventListener:()=>{}};globalThis.devicePixelRatio=1;
 try{
  const canvas={getContext:(name)=>name==='webgl2'?gl:null,clientWidth:960,clientHeight:540,width:0,height:0};
  const world=new WebGLWorld(canvas);world.generate(1);assert.ok(world.staticCount>500);
  assert.equal(world.traffic.length,14);assert.equal(world.walkers.length,32);
  const player={x:0,y:0,z:0,angle:0,vx:0,vy:0,moving:true,character:'rylee',skin:'default',vehicle:'skate',heat:.9,chaseActive:true,policeX:-8,policeZ:8,hp:3,crashCooldown:0};
  const out=world.draw(player,{dayCycleMinutes:12,weather:'clear',trafficDensity:.7,pedestrianDensity:.5},[{x:8,z:0,collected:false}],1);
  assert.equal(out.weather,'clear');assert.ok(canvas.width>0&&canvas.height>0);
  assert.ok(world.dynamicVbo&&world.staticVertices.length>1000);
 }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldDpr===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=oldDpr}
});


test('Camera-relative movement tracks rotated viewpoint without direction inversion',()=>{
 assert.deepEqual(cameraRelativeInput(0,1,0),{x:0,z:1});
 const screenRight=cameraRelativeInput(1,0,0);
 const screenLeft=cameraRelativeInput(-1,0,0);
 assert.ok(screenRight.x<-.999&&screenLeft.x>.999,'analog left and right agree with screen coordinates');
 const r=cameraRelativeInput(0,1,Math.PI/2);
 assert.ok(Math.abs(r.x-1)<1e-10&&Math.abs(r.z)<1e-10);
 const side=cameraRelativeInput(1,0,Math.PI/2);
 assert.ok(Math.abs(side.x)<1e-10&&Math.abs(side.z-1)<1e-10);
});

test('Every server collectible is unique, within walkable city corridors, and survives live-ops density changes',()=>{
 for(const level of [1,9,49,50,51,148,250,451,500]){
  const picks=pickupCoords(level,{collectibleDensity:2,difficultyMultiplier:3});
  assert.equal(picks.length,24);
  const ids=new Set(),places=new Set();
  for(const p of picks){
   assert.match(p.id,/^orb-\d+$/);assert.ok(!ids.has(p.id));ids.add(p.id);
   assert.ok(!places.has(`${p.x}/${p.z}`));places.add(`${p.x}/${p.z}`);
   assert.ok(p.z>=-78&&p.z<=48);
   assert.ok([-34,-32,-30,0,30,32,34].some(lane=>Math.abs(lane-p.x)<.001));
  }
  const before=pickupCoords(level,{collectibleDensity:1});
  const snapshot=pickupCoords(level,{collectibleDensity:.3,difficultyMultiplier:3},before.length);
  assert.deepEqual(snapshot,before,'a running session retains its spawn layout after settings change');
 }
});

test('Extended 3D landmark geometry, character cosmetics and day/weather assets run without fake images',()=>{
 const mesh=new MeshBuilder();mesh.beam([0,0,0],[10,6,1],.2,'#ffe799');
 assert.equal(mesh.vertices.length,24*9);
 assert.ok(mesh.vertices.every(Number.isFinite));
 const dir=new URL('../public/megarush/',import.meta.url);
 const engine=readFileSync(new URL('engine.js',dir),'utf8');
 assert.match(engine,/Ferris wheel/);assert.match(engine,/wheelX/);
 assert.match(engine,/violet_hoodie/);assert.match(engine,/gold_glasses/);assert.match(engine,/cyan_trail/);
 const page=readFileSync(new URL('index.html',dir),'utf8');
 assert.match(page,/id="waypoint"/);
 const client=readFileSync(new URL('game.js',dir),'utf8');
 assert.match(client,/cameraRelativeInput/);
 assert.match(client,/if\(!frameId\)frameId=requestAnimationFrame\(loop\)/);
});

test('Existing PUZUNIVO database session schema migrates in place without deleting legacy runs',async t=>{
 const temp=mkdtempSync(path.join(tmpdir(),'megarush-migrate-'));
 const database=path.join(temp,'puzunivo.sqlite'),legacy=new DatabaseSync(database);
 legacy.exec(`
 CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,role TEXT NOT NULL DEFAULT 'player',name TEXT NOT NULL,coins INTEGER NOT NULL DEFAULT 0,xp INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
 CREATE TABLE mr_sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,level INTEGER NOT NULL,character TEXT NOT NULL,started_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,ended_at INTEGER,x REAL NOT NULL DEFAULT 0,z REAL NOT NULL DEFAULT 0,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 INSERT INTO users(id,role,name,created_at) VALUES('legacy-player','player','Original Player',1);
 INSERT INTO mr_sessions(id,user_id,level,character,started_at,last_seen,x,z) VALUES('legacy-run','legacy-player',7,'rylee',1,1,7,3);
 `);legacy.close();
 const port=await reservePort();
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),PUZUNIVO_DATA_DIR:temp},stdio:['ignore','pipe','pipe']});
 t.after(()=>{child.kill();rmSync(temp,{recursive:true,force:true})});
 let error='';child.stderr.on('data',chunk=>error+=chunk);
 for(let i=0;i<100;i++){
  try{if((await fetch('http://127.0.0.1:'+port+'/api/health')).ok)break}catch{}
  await new Promise(r=>setTimeout(r,40));if(i===99)throw Error('Migration startup failed: '+error);
 }
 const db=new DatabaseSync(database);
 try{
  const item=db.prepare("SELECT id,user_id,level,x,z,required_orbs,pickup_count,vehicle,hp,heat,view_yaw,car_slot FROM mr_sessions WHERE id='legacy-run'").get();
  assert.equal(item.user_id,'legacy-player');assert.equal(item.level,7);
  assert.equal(item.x,7);assert.equal(item.z,3);
  assert.equal(item.required_orbs,3);assert.equal(item.pickup_count,12);
  assert.equal(item.vehicle,'foot');assert.equal(item.hp,3);assert.equal(item.heat,0);assert.equal(item.view_yaw,0);assert.equal(item.car_slot,-1);
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='progress'").get(),'original game progress table retained');
 }finally{db.close()}
});


test('Higher-fidelity 3D rounded geometry has finite positions, vertex normals and real volume',()=>{
 const geo=new MeshBuilder();geo.sphere(1,3,-2,.5,.8,.4,'#70eac9',9,14);
 geo.cylinder([0,0,0],[1,4,1],.2,'#28354d',12);geo.disc(0,.03,0,1.2,.7,'#112d44');
 assert.ok(geo.vertices.length>3000,'high-detail meshes expand to actual triangles');
 assert.equal(geo.vertices.length%9,0);
 for(const value of geo.vertices) assert.ok(Number.isFinite(value));
 const ys=[];for(let i=1;i<geo.vertices.length;i+=9)ys.push(geo.vertices[i]);
 assert.ok(Math.max(...ys)>3.7&&Math.min(...ys)<.1);
});

test('3D Rylee animation changes actual vertex positions with gait and airborne state',()=>{
 const p={x:0,y:0,z:0,angle:.4,vx:4,vy:0,vz:0,onGround:true,vehicle:'foot',character:'rylee',skin:'default'};
 const idle=new MeshBuilder(),run=new MeshBuilder(),air=new MeshBuilder();
 buildCharacterMesh(idle,{...p,vx:0},0);buildCharacterMesh(run,p,.2);
 buildCharacterMesh(air,{...p,onGround:false,vehicle:'skate',skin:'cyan_trail'},.2);
 assert.ok(idle.vertices.length>2500);
 assert.equal(idle.vertices.length,run.vertices.length,'animation preserves rig topology');
 assert.notDeepEqual(idle.vertices,run.vertices,'limbs actually move in 3D, not static boxes');
 assert.ok(air.vertices.length>idle.vertices.length,'board/cosmetics add real 3D geometry');
 assert.ok(air.vertices.every(Number.isFinite));
});

test('Police and vehicle mesh include 3D wheels, windows, and emergency bar',()=>{
 const normal=new MeshBuilder(),police=new MeshBuilder();
 buildVehicleMesh(normal,{x:1,z:10,color:'#edaf78'});
 buildVehicleMesh(police,{x:1,z:10,police:true,flash:true});
 assert.ok(normal.vertices.length>1500,'detailed car is real geometry');
 assert.ok(police.vertices.length>normal.vertices.length,'police emergency light assembly is real geometry');
 assert.ok(police.vertices.every(Number.isFinite));
});

test('Native Android shell preserves shared Puzunivo identity and landscape only for MegaRush',()=>{
 const android=new URL('../mobile/android-native/',import.meta.url);
 const activity=readFileSync(new URL('app/src/main/java/com/puzunivo/game/MainActivity.java',android),'utf8');
 const manifest=readFileSync(new URL('app/src/main/AndroidManifest.xml',android),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/android-debug-megarush.yml',import.meta.url),'utf8');
 assert.match(activity,/SCREEN_ORIENTATION_SENSOR_LANDSCAPE/);
 assert.match(activity,/SCREEN_ORIENTATION_UNSPECIFIED/);
 assert.match(activity,/"\/megarush"\.equals\(path\)/);
 assert.match(activity,/MIXED_CONTENT_NEVER_ALLOW/);
 assert.match(activity,/setAcceptThirdPartyCookies\(web,false\)/);
 assert.doesNotMatch(manifest,/android:screenOrientation="landscape"/,'cannot lock all puzzles landscape');
 assert.match(workflow,/assembleDebug/);
 assert.match(workflow,/https/);
 assert.match(workflow,/upload-artifact/);
});

test('Adaptive rendering scale and context recovery stay inside existing MegaRush module',()=>{
 const e=readFileSync(new URL('../public/megarush/engine.js',import.meta.url),'utf8');
 const g=readFileSync(new URL('../public/megarush/game.js',import.meta.url),'utf8');
 assert.match(e,/setRenderScale\(scale\)/);
 assert.match(g,/webglcontextlost/);assert.match(g,/webglcontextrestored/);
 assert.match(g,/renderFps<26/);
});


test('Traffic collision remains in physics even if the 3D renderer skips a frame',()=>{
 const car={x:0,y:0,z:0,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'car',heat:0,hp:3,crashCooldown:0};
 const traffic={position:95,speed:0,lane:0};
 assert.equal(trafficPosition(traffic,0),0);
 const world={weather:'clear',t:0,traffic:[traffic],collide:()=>false,elevation:()=>0};
 updatePlayer(car,{x:0,z:0},world,.02);
 assert.equal(car.hp,2);
 updatePlayer(car,{x:0,z:0},world,.02);
 assert.equal(car.hp,2,'cooldown must work without any render() calls');
});

test('Cars cannot pass through solid buildings or drive across the shoreline',()=>{
 function vehicle(z=0){return {x:0,y:0,z,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'car',heat:0,hp:3,crashCooldown:0};}
 const building=vehicle();
 const wall={weather:'clear',t:0,traffic:[],collide:()=>({h:9}),elevation:()=>0};
 updatePlayer(building,{x:0,z:1},wall,.05);
 assert.equal(building.z,0,'solid-building collision blocks forward travel');
 assert.equal(building.hp,2,'impact causes a bounded damage event');
 const water=vehicle(63.99),open={...wall,collide:()=>false};water.x=20;
 updatePlayer(water,{x:0,z:1},open,.05);
 assert.ok(water.z<=64,'car cannot drive into ocean');
 const causeway=vehicle(63.99);updatePlayer(causeway,{x:0,z:1},open,.05);
 assert.ok(causeway.z>64,'car can now drive on the real elevated harbor highway');
});


test('Physical skateboard kickflip rotates 3D board geometry and retains unit-length normals',()=>{
 const base={x:0,y:0,z:0,angle:.4,vx:5,vy:3,vz:3,onGround:false,vehicle:'skate',character:'rylee',skin:'default',trickTimer:0};
 const unflipped=new MeshBuilder(),halfFlipped=new MeshBuilder();
 buildCharacterMesh(unflipped,base,1.2);
 buildCharacterMesh(halfFlipped,{...base,trickTimer:.36},1.2);
 assert.equal(unflipped.vertices.length,halfFlipped.vertices.length,'animation preserves mesh topology');
 assert.notDeepEqual(unflipped.vertices.slice(432,468),halfFlipped.vertices.slice(432,468),'skateboard vertices rotate rather than only the avatar jumping');
 for(let i=0;i<halfFlipped.vertices.length;i+=9){
  assert.ok(halfFlipped.vertices.slice(i,i+9).every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...halfFlipped.vertices.slice(i+3,i+6))-1)<.002);
 }
});

test('Kickflip timer progresses on 60 Hz physics and scene shader supports moving sun',()=>{
 const p={x:0,y:0,z:0,vx:0,vy:7,vz:0,angle:0,onGround:false,vehicle:'skate',heat:0,hp:3,crashCooldown:0,trickTimer:.72};
 const world={weather:'clear',collide:()=>null,elevation:()=>0,traffic:[]};
 for(let i=0;i<18;i++)updatePlayer(p,{x:0,z:0},world,1/60);
 assert.ok(p.trickTimer>.41&&p.trickTimer<.43,'stunt is 0.3s through its 0.72s flight');
 for(let i=0;i<40;i++)updatePlayer(p,{x:0,z:0},world,1/60);
 assert.equal(p.trickTimer,0);
 const src=readFileSync(new URL('../public/megarush/engine.js',import.meta.url),'utf8');
 assert.match(src,/uSunDir/);
 assert.match(src,/uSunColor/);
 assert.match(src,/rotateRange\(boardStart/);
});


test('Camera cannot travel through a building during a third-person orbit',()=>{
 const tower={x:0,z:-6,w:8,d:6,h:20},target=[0,1.8,0],desired=[0,8,-15];
 const safe=cameraSafePosition(target,desired,[tower]);
 assert.ok(safe[2]>-2.8,'camera clips before the building front wall');
 assert.ok(safe[2]<0,'camera still sits behind the hero');
 assert.deepEqual(cameraSafePosition(target,[14,9,3],[tower]),[14,9,3],'clear camera path stays unchanged');
 const lowTower={...tower,h:2};
 assert.deepEqual(cameraSafePosition(target,[0,15,-15],[lowTower]),[0,15,-15],'camera can pass above buildings');
});

test('Distant pedestrian LOD avoids full 3D sphere and cylinder tessellation',()=>{
 const src=readFileSync(new URL('../public/megarush/engine.js',import.meta.url),'utf8');
 assert.match(src,/distSq>90\*90/);
 assert.match(src,/distSq<33\*33/);
 assert.match(src,/dynamic\.box\(zx,1\.36/);
});


test('Real Harbor Chase has a traversable elevated causeway and a physical finish checkpoint',()=>{
 assert.equal(onHarborRoad(0,94),true);assert.equal(onHarborRoad(20,94),false);
 assert.equal(atHarbor(0,112),true);assert.equal(atHarbor(50,112),false);
 assert.deepEqual(HARBOR_FINISH,{x:0,z:112});
 const world={weather:'clear',collide:()=>null,elevation:(x,z)=>onHarborRoad(x,z)?1.85:0,traffic:[]};
 const car={x:0,y:1.85,z:100,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'car',heat:.94,hp:3,crashCooldown:0,policeX:0,policeZ:80};
 for(let i=0;i<110&&!atHarbor(car.x,car.z);i++)updatePlayer(car,{x:0,z:1},world,1/60);
 assert.ok(atHarbor(car.x,car.z),'car drives onto the harbor checkpoint without an invisible shoreline');
 assert.equal(car.hp,3);
 const js=readFileSync(new URL('../public/megarush/game.js',import.meta.url),'utf8');
 assert.match(js,/ESCAPE THE CHASE/);assert.match(js,/REACH HARBOR/);
 assert.match(js,/chaseActive=false/);
 assert.doesNotMatch(js,/Harbor.*[+][0-9]+ Fun Coins/,'harbor does not fabricate paid rewards');
});


test('Third-person camera follows by elapsed time rather than render FPS',()=>{
 const a=cameraFollowFactor(1/30);
 const b=cameraFollowFactor(1/60);
 assert.ok(Math.abs((1-a)-(1-b)*(1-b))<1e-12,'two 60 Hz frames match one 30 Hz frame');
 assert.equal(cameraFollowFactor(0),0);
 assert.ok(cameraFollowFactor(20)<1,'backgrounded frames cannot teleport the camera');
});

test('Closer third-person phone camera, faster board and proportional analog steering are shipped together',()=>{
 const source=readFileSync(new URL('../public/megarush/engine.js',import.meta.url),'utf8');
 assert.match(source,/vehicle==='car'\?11\.6:7\.9/);
 assert.match(source,/matPerspective\(62\*Math\.PI\/180/);
 assert.match(source,/vehicle==='skate'\?13\.8/);
 const world={weather:'clear',collide:()=>false,elevation:()=>0,traffic:[]};
 const player=()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'skate',heat:0,hp:3,crashCooldown:0});
 const half=player(),full=player();
 for(let i=0;i<50;i++){
  updatePlayer(half,{x:0,z:.5},world,.02);
  updatePlayer(full,{x:0,z:1},world,.02);
 }
 assert.ok(half.z<full.z*.63&&half.z>full.z*.35,'analog stick deflection controls pace, not just heading');
 const css=readFileSync(new URL('../public/megarush/game.css',import.meta.url),'utf8');
 assert.match(css,/v0\.5: compact unobstructed gameplay view/);
 assert.match(source,/Palm silhouettes on the walkable boulevard/);
});

test('Harbor skate pursuit stays physically active until the actual waterfront finish',()=>{
 const world={weather:'clear',collide:()=>null,elevation:()=>0,traffic:[],t:0};
 const p={x:0,y:0,z:0,vx:0,vy:0,vz:0,angle:0,onGround:true,vehicle:'skate',chaseActive:true,heat:.9,hp:3,crashCooldown:8,policeX:0,policeZ:-20};
 for(let i=0;i<60*9;i++){world.t=i/60;updatePlayer(p,{x:0,z:1,sprint:false},world,1/60)}
 assert.ok(p.z>60,'skate chase covers significant road distance');
 assert.ok(p.heat>=.78,'pursuit heat cannot silently decay while Harbor Chase is active');
 assert.ok(p.policeZ>-20,'the police car actually moves, not a decorative UI alert');
 p.chaseActive=false;const oldHeat=p.heat;
 for(let i=0;i<60;i++)updatePlayer(p,{x:0,z:0},world,1/60);
 assert.ok(p.heat<oldHeat,'heat decays normally after harbor escape');
 const source=readFileSync(new URL('../public/megarush/game.js',import.meta.url),'utf8');
 assert.match(source,/chaseActive:savedState\.chaseActive\?\?!resumed/,'first-run chase starts on skateboard and persists on restore');
 assert.match(source,/player\.chaseActive\?chaseRatio:ratio/,'HUD meter follows current chase objective');
});

test('World-space waypoints map to correct screen-side arrows at all camera orbits', async()=>{
 const {waypointArrowRotation,buildHelicopterMesh}=await import('../public/megarush/engine.js');
 const near=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-8;
 assert.ok(near(waypointArrowRotation(0,10,0),-Math.PI/2),'in front should point up');
 assert.ok(near(waypointArrowRotation(-10,0,0),0),'world negative X is screen right for rear-facing camera');
 assert.ok(near(waypointArrowRotation(10,0,0),Math.PI),'world positive X is screen left');
 assert.ok(near(waypointArrowRotation(0,10,Math.PI/2),0),'after 90° orbit world +Z is screen right');
 const helicopter=new MeshBuilder();buildHelicopterMesh(helicopter,{x:-22,y:26,z:70,t:2.4});
 assert.ok(helicopter.vertices.length>850,'rotorcraft is real triangulated 3D, not a billboard image');
 for(let i=0;i<helicopter.vertices.length;i+=9){
  assert.ok(helicopter.vertices.slice(i,i+9).every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...helicopter.vertices.slice(i+3,i+6))-1)<.003);
 }
});
