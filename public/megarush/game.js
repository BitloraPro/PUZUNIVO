import {WebGLWorld,updatePlayer,cameraRelativeInput,waypointArrowRotation,trafficPosition,advanceFixedPhysics,HARBOR_FINISH,atHarbor} from './engine.js';
import {nativeAdsAvailable,rewardedRevive,interstitialBetweenChapters} from './native-monetization.js';
const $=id=>document.getElementById(id);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const characters=[{id:'rylee',name:'Rylee',desc:'Skate Hero',icon:'🛹'},{id:'zara',name:'Zara',desc:'Parkour Ace',icon:'🏃'},{id:'leo',name:'Leo',desc:'BMX Rider',icon:'🚲'}];
let jumpTimer=0,climbTimer=0,physicsCarry=0,checkpointPending=false,harborEscaped=false;let liveOpsTimer=null;let resumeGraphicsAfterRestore=false;let world,boot,session=null,selected='rylee',activeTab='',player=null,running=false,frameId=0,last=performance.now(),startAt=0,control={x:0,z:0,jump:false,dive:false,climb:false,sprint:false},keys=new Set(),analog={x:0,z:0},gameTime=0,collectibles=[],sentPickups=new Set(),pickupsReceived=0,heartbeatPromise=null,missionDone=false,lastHeartbeat=0,toastTimer=0,radio=false,hitMessage='',frameSamples=0,fpsElapsed=0,renderFps=0;
const btns={play:$('play'),menu:$('menu-btn'),finish:$('finish')};
async function api(path,body,base='/api/megarush/'){
 const res=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},credentials:'same-origin',body:body===undefined?undefined:JSON.stringify(body)});
 let json;try{json=await res.json()}catch{throw Error('Unable to contact PUZUNIVO server')}
 if(!res.ok)throw Error(json.error||json.message||'Request failed');return json;
}
async function tryLandscape(){
 if(!window.matchMedia('(pointer:coarse)').matches)return;
 try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen()}catch{}
 try{await screen.orientation?.lock?.('landscape')}catch{}
}
function flash(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3500)}
function account(){if(!boot)return;$('account-line').textContent=boot.profile?`${boot.profile.name} · ${boot.profile.funCoins} Fun Coins · ${boot.profile.xp} XP`:'Play as a guest, or sign in through PUZUNIVO to keep your progress.';}
function roster(){const box=$('character-row');box.innerHTML=characters.map(c=>`<button class="char ${selected===c.id?'active':''}" data-character="${c.id}"><span class="face">${c.icon}</span>${c.name}<small>${c.desc}</small></button>`).join('');box.querySelectorAll('[data-character]').forEach(el=>el.onclick=()=>{selected=el.dataset.character;roster();if(player)player.character=selected;});}
function showPanel(tab=''){activeTab=tab;$('panel').classList.remove('hidden');$('hud').classList.add('hidden');$('touch').classList.add('hidden');$('mission').classList.add('hidden');roster();account();fillPanel();}
function fillPanel(){const box=$('panel-content');if(!boot)return;
 if(activeTab==='crash'){
  box.innerHTML=`<h2>💥 Oops! Big crash!</h2><p class="muted">Adventure never stops. Free respawn is always available. A verified rewarded ad can optionally revive you in a real Android build.</p><button id="respawn" class="cta">❤️ Free Respawn</button> <button id="reward-revive" ${nativeAdsAvailable()?'':'disabled'}>▶ Rewarded Ad Revive</button><p class="muted">${nativeAdsAvailable()?'Native SDK detected':'AdMob is disabled in the web browser. No fake ad rewards.'}</p>`;
  box.querySelector('#respawn').onclick=()=>revive(false);box.querySelector('#reward-revive').onclick=()=>revive(true);
 }else if(activeTab==='locker'){
  box.innerHTML=`<h2>👟 Character Locker</h2><p class="muted">Choose your hero or equip an owned cosmetic. Store purchases are virtual-only.</p><div class="cards">${[{id:'default',name:'Original Gear'},...boot.wardrobe].map(item=>{
    const unlocked=item.id==='default'||boot.owned.includes(item.id);return `<div class="mini-card"><b>${esc(item.name)}</b><small>${unlocked?'Unlocked':`🔒 ${item.price} Fun Coins`}</small><button data-skin="${item.id}" ${unlocked?'':'disabled'}>Equip</button></div>`;
  }).join('')}</div>`;
  box.querySelectorAll('[data-skin]').forEach(el=>el.onclick=()=>equip(el.dataset.skin));
 }else if(activeTab==='store'){
  box.innerHTML=`<h2>✨ Fun Coins Store</h2><p class="muted">These virtual coins have no cash value, cannot be withdrawn, and are not cryptocurrency. Real-money IAP is disabled until verified mobile billing exists.</p><div class="cards">${boot.wardrobe.map(item=>`<div class="mini-card"><b>${esc(item.name)}</b><small>${esc(item.kind)} · ${item.price} 🪙</small><button data-buy="${item.id}" ${boot.owned.includes(item.id)?'disabled':''}>${boot.owned.includes(item.id)?'Owned':'Unlock'}</button></div>`).join('')}</div>`;
  box.querySelectorAll('[data-buy]').forEach(el=>el.onclick=()=>buy(el.dataset.buy));
 }else if(activeTab==='map'){
  box.innerHTML=`<h2>🗺 The Multiverse Map</h2><p class="muted">10 chapters · 50 progressive zones per chapter. Zone layouts vary procedurally; chapters are progression tracks, not 500 handcrafted maps.</p>${boot.chapters.map((s,i)=>`<div class="chapter"><span>${String(i+1).padStart(2,'0')} · ${esc(s)}</span><span class="${i+1<=boot.mission.chapter?'on':''}">${i+1<boot.mission.chapter?'✓':i+1===boot.mission.chapter?`ZONE ${boot.level}`:'🔒'}</span></div>`).join('')}`;
 }else if(activeTab==='help'){
  box.innerHTML=`<h2>🎮 Controls</h2><div class="cards"><div class="mini-card"><b>Move</b><small>WASD / Arrow keys / Touch pad</small></div><div class="mini-card"><b>Jump / Dive</b><small>Space / V</small></div><div class="mini-card"><b>Skateboard</b><small>B to toggle</small></div><div class="mini-card"><b>Enter / leave car</b><small>E near traffic</small></div><div class="mini-card"><b>Stunts</b><small>K for kickflip</small></div><div class="mini-card"><b>Climb</b><small>R when jumping near rooftops</small></div><div class="mini-card"><b>Pause</b><small>Escape / Menu</small></div><div class="mini-card"><b>Radio</b><small>M to toggle synthesised game tones</small></div></div><p class="muted">Balanced speeds, simplified arcade physics, 3D city/park/forest/coast environments. Ads and paid purchases are intentionally unavailable in web preview.</p>`;
 }else box.innerHTML=`<p class="muted">${esc(boot.settings.banner)}</p>${boot.announcements.map(a=>`<div class="mini-card">📢 ${esc(a.message)}</div>`).join('')}`;
}
async function revive(withAd){if(!player)return;if(withAd){try{const earned=await rewardedRevive();if(!earned){flash('Reward not earned. Free respawn is available.');return}}catch(e){flash('Ad unavailable: '+e.message);return}}
 player.hp=3;player.heat=player.chaseActive?.92:0;player.wantedState=player.chaseActive?'chase':'patrol';player.crashCooldown=5;
 if(!withAd){player.x=0;player.y=0;player.z=0;player.policeX=-3;player.policeZ=-20;}
 player.vx=0;player.vy=0;player.vz=0;session&&menu();flash(withAd?'❤️ Revived after earned ad':'❤️ Free checkpoint respawn');}
async function refresh(){boot=await api('bootstrap');selected=boot.equipped?.character||selected;account();roster();if(activeTab)fillPanel();}
async function equip(skin){if(!boot.profile){flash('Start a guest session first');return;}try{await api('wardrobe/equip',{character:selected,skin});await refresh();if(player)player.skin=skin;flash('Equipped!')}catch(e){flash(e.message)}}
async function buy(itemId){if(!boot.profile){flash('Start as guest or log in to unlock outfits.');return;}try{await api('wardrobe/buy',{itemId});await refresh();fillPanel();flash('New cosmetic unlocked!')}catch(e){flash(e.message)}}
async function start(mode='free'){
 // Orientation lock must be requested while the user's Play gesture is active.
 tryLandscape();
 btns.play.disabled=true;btns.play.textContent='Preparing World…';try{
 if(!boot.profile){await api('auth/guest',{},'/api/');await refresh()}
 // Prefer the authoritative saved session; a paused Android WebView must not
 // discard a player's progress just because the OS recreated the page.
 const saved=await api('session/active');const resumed=saved.active===true;
 const s=resumed?saved:await api('session/start',{character:selected});
 session=s.id;boot.level=s.level;boot.mission=s.mission;
 if(resumed)selected=s.character;
 collectibles=s.pickups.map(p=>({...p,collected:(s.collectedIds||[]).includes(p.id)}));sentPickups=new Set(s.collectedIds||[]);pickupsReceived=(s.collectedIds||[]).length;missionDone=false;harborEscaped=!!s.harborReached;checkpointPending=false;
 const savedState=resumed?s.state||{}:{};
 player={x:resumed?s.x:0,y:0,z:resumed?s.z:0,vx:0,vy:0,vz:0,onGround:true,character:selected,skin:boot.equipped?.skin||'default',
  angle:savedState.angle??0,hp:savedState.hp??3,vehicle:savedState.vehicle??(resumed?'foot':'skate'),
  heat:savedState.heat??0,crashCooldown:resumed?0:5,
  policeX:savedState.policeX??-12,policeZ:savedState.policeZ??20,moving:false,trickTimer:0,
  chaseActive:savedState.chaseActive??false,wantedState:savedState.wantedState??'patrol',carSlot:savedState.carSlot??-1};
 if(!world)world=new WebGLWorld($('world'));world.generate(boot.level);if(!resumed)world.cameraYaw=0;
 if(resumed){world.cameraYaw=savedState.cameraYaw??0;
  if(player.vehicle==='car'&&player.carSlot>=0&&world.traffic[player.carSlot])world.traffic[player.carSlot].occupied=true;
 }
 // The server, not a client-only police flag, activates the selected Harbor Chase.
 if(mode==='chase'&&!harborEscaped&&!player.chaseActive){
  await heartbeat(true);
  const challenge=await api('mission/chase/start',{sessionId:session});
  if(challenge.chaseActive){
   player.chaseActive=true;player.wantedState='chase';player.heat=challenge.heat;
   player.policeX=player.x-3;player.policeZ=player.z-20;
  }
 }
 // Fullscreen/orientation APIs may be refused; the rotate prompt remains as fallback.
 $('panel').classList.add('hidden');$('hud').classList.remove('hidden');$('touch').classList.remove('hidden');$('mission').classList.remove('hidden');
 if(!liveOpsTimer)liveOpsTimer=setInterval(async()=>{if(!running)return;try{const update=await api('bootstrap');const previous=boot.settings.banner;boot.settings=update.settings;boot.announcements=update.announcements;if(previous!==boot.settings.banner)$('notice').textContent=boot.settings.banner}catch{}},25000);
 $('where').textContent=`Ch ${s.mission.chapter} · ${s.mission.chapterTitle}`;$('level').textContent=s.level;
 $('mission-title').textContent=player.chaseActive?'ESCAPE THE CHASE':'FREE ROAM · CITY MISSIONS';$('hearts').textContent=player.hp;
 startAt=performance.now();last=startAt;gameTime=0;physicsCarry=0;frameSamples=0;fpsElapsed=0;running=true;if(!frameId)frameId=requestAnimationFrame(loop);flash(player.chaseActive?'🚨 HARBOR CHASE — Skate to the waterfront!':resumed?'Adventure restored. Your collected shards are saved.':'🌴 Free roam! Skate the city. Police respond only to incidents.');
 }catch(e){flash(e.message);showPanel();}finally{btns.play.disabled=false;btns.play.textContent='▶ Start Adventure'}}
function pressAction(action){if(!running||!player)return;
 if(action==='ride'){
  if(player.vehicle==='car'){
   if(player.carSlot>=0&&world.traffic[player.carSlot]){
    const vehicle=world.traffic[player.carSlot];vehicle.occupied=false;
    vehicle.lane=[-32,0,32].reduce((best,lane)=>Math.abs(lane-player.x)<Math.abs(best-player.x)?lane:best,0);
    // Rejoin traffic at the exit position instead of spawning a duplicate car.
    vehicle.position=((player.z+95-gameTime*vehicle.speed)%188+188)%188;
   }
   player.carSlot=-1;
   player.vehicle='foot';
   player.trickTimer=0;
   player.vy=0;
   player.onGround=true;
   player.crashCooldown=Math.max(player.crashCooldown||0,.4);
   flash('Back on foot');
   return;
  }
  const available=world.traffic.map((v,index)=>({v,index,distance:Math.hypot(player.x-v.lane,player.z-trafficPosition(v,gameTime))}))
   .filter(item=>!item.v.occupied&&item.distance<6).sort((a,b)=>a.distance-b.distance)[0];
  if(!available){flash('Approach a traffic vehicle to drive (E)');return}
  available.v.occupied=true;player.carSlot=available.index;
  player.x=available.v.lane;player.z=trafficPosition(available.v,gameTime);
  player.vehicle='car';
  player.trickTimer=0;
  player.vy=0;
  player.onGround=true;
  player.crashCooldown=Math.max(player.crashCooldown||0,.35);
  flash('Vehicle entered. Keep moving!');
  // Only server-confirmed criminal actions start a wanted pursuit.
  reportCrime('vehicle_theft').catch(e=>flash('Incident sync failed: '+e.message));
 }else if(action==='skate'){
  if(player.vehicle==='car'){flash('Leave the car before skating');return}
  if(player.vehicle==='swim'){flash('Swim back to land to skate');return}
  player.trickTimer=0;
  player.vehicle=player.vehicle==='skate'?'foot':'skate';
  flash(player.vehicle==='skate'?'🛹 Skate mode':'Walking mode');
 }
 else if(action==='trick'){
  if(player.vehicle==='skate'&&player.onGround&&player.trickTimer<=0){player.vy=Math.max(player.vy,7.8);player.onGround=false;player.trickTimer=.72;flash('✨ 360° Kickflip!')}
  else flash('Land your board before the next trick.');
 }
 else if(action==='jump'){
  // Frames read the held-key set; mutating control.jump directly was overwritten
  // on the next frame, making mobile Jump a no-op.
  keys.add('jump');clearTimeout(jumpTimer);
  jumpTimer=setTimeout(()=>keys.delete('jump'),230);
 }
 else if(action==='climb'){
  keys.add('climb');clearTimeout(climbTimer);
  climbTimer=setTimeout(()=>keys.delete('climb'),600);
 }
}
async function reportCrime(kind){
 if(!session||!player||player.chaseActive)return;
 // An incident cannot be replayed as a reward; the existing authoritative
 // session must have a validated occupied vehicle before it is registered.
 await heartbeat(true);
 const result=await api('incident',{sessionId:session,kind});
 if(result.chaseActive){
  player.chaseActive=true;player.wantedState='chase';player.searchTime=0;
  player.heat=result.heat;player.policeX=player.x-3;player.policeZ=player.z-20;
  flash(kind==='vehicle_theft'?'🚨 Vehicle theft reported — escape or lose the police!':'🚨 Reckless collision — police alerted!');
 }
}
function heartbeat(force=false){
 // The last forced save must finish even if Android has already paused the
 // WebView while a previous network heartbeat was still outstanding.
 if(!session||!player||(!running&&!force))return Promise.resolve();
 // Collecting, pausing and finishing always wait for fresh authoritative state.
 // When a frame heartbeat is pending, force a second write AFTER it commits.
 if(heartbeatPromise)return force?heartbeatPromise.then(()=>heartbeat(true)):heartbeatPromise;
 const id=session,x=+player.x.toFixed(2),z=+player.z.toFixed(2);
 const state={vehicle:player.vehicle,hp:player.hp,heat:player.heat,angle:player.angle,policeX:player.policeX,policeZ:player.policeZ,cameraYaw:world?.cameraYaw??0,chaseActive:!!player.chaseActive,carSlot:player.carSlot??-1,wantedState:player.wantedState??'patrol'};
 heartbeatPromise=api('session/heartbeat',{id,x,z,state}).catch(e=>{
  if(e.message==='Impossible travel distance'){
   running=false;flash('Run sync failed. Restart the level.');showPanel();
  }else if(!e.message.includes('Start a new run'))console.warn(e);
  throw e;
 }).finally(()=>{heartbeatPromise=null});
 return heartbeatPromise;
}
async function pickup(p){if(sentPickups.has(p.id)||p.collected)return;sentPickups.add(p.id);
 try{await heartbeat(true);const res=await api('pickup',{sessionId:session,itemId:p.id});p.collected=true;pickupsReceived=res.collected??pickupsReceived;flash('✦ Light shard collected!');sound(770,.09)}catch(e){sentPickups.delete(p.id);flash(e.message)}
}
async function complete(){if(missionDone||!session)return;missionDone=true;btns.finish.disabled=true;
 try{await heartbeat(true);const previous=boot.level;const result=await api('level/complete',{sessionId:session});running=false;flash(result.awarded?'🏆 Zone completed! +25 XP · +10 virtual Fun Coins':'🏆 Zone completed! This level was previously rewarded.');if(previous%50===0&&nativeAdsAvailable())interstitialBetweenChapters().catch(()=>{});await refresh();session=null;showPanel('map');
 }catch(e){missionDone=false;btns.finish.disabled=false;flash(e.message)}}
let audioContext;function sound(hz=600,secs=.12){if(!radio)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=hz;o.type='triangle';g.gain.value=.028;o.connect(g);g.connect(audioContext.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+secs);o.stop(audioContext.currentTime+secs)}catch{}}
// The mini-map is a real 2D projection of our procedural city, updated at 10 FPS.
// No fabricated maps, GPS lookups, or external map services.
let miniLast=-1;
function drawMiniMap(){
 const c=$('minimap-canvas'),ctx=c?.getContext('2d');if(!ctx||!world||!player)return;
 const w=Math.max(40,Math.round(c.clientWidth)),h=Math.max(40,Math.round(c.clientHeight));
 const dpr=Math.min(2,window.devicePixelRatio||1);
 if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#15304b';ctx.fillRect(0,0,w,h);
 const scale=1.3,wx=x=>w/2+(x-player.x)*scale,wz=z=>h/2-(z-player.z)*scale;
 const box=(x,z,bw,bh,color)=>{ctx.fillStyle=color;ctx.fillRect(wx(x-bw/2),wz(z+bh/2),bw*scale,bh*scale)};
 if(player.z>25)box(0,94,290,60,'#246b99');
 box(0,65,290,24,'#c7ae7b');
 for(const roadX of [-32,0,32]){box(roadX,0,13,190,'#455569');box(roadX-8,0,2,190,'#9aa5b2');box(roadX+8,0,2,190,'#9aa5b2');}
 box(0,-30,185,12,'#455569');
 for(const o of world.obstacles)box(o.x,o.z,o.w,o.d,'#8191a8');
 // Draw the verified harbor destination and a road-following guidance line.
 // Navigation uses the same world coordinates as collision and server checkpoint.
 if(player.chaseActive&&!harborEscaped){
  const x=wx(HARBOR_FINISH.x),y=wz(HARBOR_FINISH.z);
  ctx.save();
  ctx.beginPath();
  ctx.rect(1,1,w-2,h-2);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(wx(player.x),wz(player.z));
  // Road approach: align to downtown's central boulevard before the harbor.
  if(Math.abs(player.x)>6)ctx.lineTo(wx(0),wz(player.z));
  ctx.lineTo(wx(0),wz(HARBOR_FINISH.z));
  ctx.strokeStyle='#ffd76e';
  ctx.lineWidth=3;
  ctx.setLineDash([7,5]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x,y,7,0,Math.PI*2);
  ctx.fillStyle='#fbc94c';
  ctx.fill();
  ctx.strokeStyle='#fff7d1';
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.fillStyle='#213352';
  ctx.font='bold 10px sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('H',x,y+.3);
  ctx.restore();
 }
 for(const item of collectibles){if(item.collected)continue;const x=wx(item.x),y=wz(item.z);if(x<0||y<0||x>w||y>h)continue;
  ctx.beginPath();ctx.fillStyle='#ffe66b';ctx.shadowBlur=6;ctx.shadowColor='#ffe66b';ctx.arc(x,y,3.4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 }
 if(player.heat>.1){const x=wx(player.policeX),y=wz(player.policeZ);ctx.fillStyle='#fc517a';ctx.fillRect(x-3,y-3,6,6);}
 ctx.save();ctx.translate(w/2,h/2);ctx.rotate(player.angle);ctx.fillStyle='#52f7fe';ctx.strokeStyle='#f3fcff';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,3);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function loop(timestamp){if(!running||!player||!world){frameId=0;return;}frameId=requestAnimationFrame(loop);
 const dt=Math.min(.12,Math.max(0,(timestamp-last)/1000));last=timestamp;
 // Adaptive pixel ratio keeps the physically simulated world consistent on midrange phones.
 // Downscale conservatively when frames drop and upscale only after sustained smooth rendering.
 frameSamples++;fpsElapsed+=dt;
 if(fpsElapsed>=2&&world){
  renderFps=Math.round(frameSamples/fpsElapsed);
  if(renderFps<26)world.setRenderScale(world.renderScale-.09);
  else if(renderFps>52)world.setRenderScale(world.renderScale+.04);
  const fpsDisplay=$('fps');if(fpsDisplay)fpsDisplay.textContent=`${renderFps} FPS · ${Math.round(world.renderScale*100)}%`;
  frameSamples=0;fpsElapsed=0;
 }

 const held=k=>keys.has(k);
 control.x=(held('KeyD')||held('ArrowRight')?1:0)-(held('KeyA')||held('ArrowLeft')?1:0)+analog.x;
 control.z=(held('KeyW')||held('ArrowUp')?1:0)-(held('KeyS')||held('ArrowDown')?1:0)+analog.z;
 control.jump=held('Space')||held('jump');control.climb=held('KeyR')||held('climb');control.dive=held('KeyV');control.sprint=held('ShiftLeft')||held('ShiftRight')||held('sprint');
 world.weather=boot.settings.weather==='cycle'?(['clear','clear','rain','fog'][Math.floor(gameTime/50)%4]):boot.settings.weather;
 const adjusted=cameraRelativeInput(control.x,control.z,world.cameraYaw);
 let crash=null;
 const stepped=advanceFixedPhysics(physicsCarry,dt,fixedDt=>{
  gameTime+=fixedDt;world.t=gameTime;
  crash=updatePlayer(player,{...control,...adjusted},world,fixedDt);
  return !crash;
 });
 physicsCarry=stepped.carry;
 if(crash){running=false;showPanel('crash');flash('💥 Crash! Choose a free or optional rewarded revive.');return;}
 if(player.pendingIncident){const incident=player.pendingIncident;player.pendingIncident=null;reportCrime(incident).catch(e=>flash('Incident sync failed: '+e.message));}
 // The finish is real only when the existing PUZUNIVO server acknowledges it.
 // Keep the chase alive while a pending or failed request is retried.
 if(player.chaseActive&&!harborEscaped&&atHarbor(player.x,player.z)&&!checkpointPending){
  checkpointPending=true;
  heartbeat(true).then(result=>{
   if(result?.harborReached){
    harborEscaped=true;player.chaseActive=false;player.heat=0;player.policeX=-12;player.policeZ=20;
    flash('🏁 HARBOR ESCAPE VERIFIED — Finish your zone!');sound(920,.19);
   }
  }).catch(e=>flash('Checkpoint sync: '+e.message)).finally(()=>{checkpointPending=false});
 }
 for(const p of collectibles){if(!p.collected&&!sentPickups.has(p.id)&&Math.hypot(player.x-p.x,player.z-p.z)<2.15)pickup(p)}
 if(gameTime-lastHeartbeat>1.35){lastHeartbeat=gameTime;heartbeat().catch(()=>{})}
 const weather=world.draw(player,boot.settings,collectibles,gameTime);
 $('orbs').textContent=pickupsReceived+'/'+boot.mission.targetCollectibles;$('hearts').textContent=player.hp;$('heat').textContent=player.chaseActive?'CHASE':player.wantedState==='search'?'SEARCH':'CLEAR';
 $('speed').textContent=Math.round(Math.hypot(player.vx,player.vz)*3.6);
 $('prompt').classList.toggle('pursuit',player.chaseActive);
 const ratio=Math.min(1,pickupsReceived/boot.mission.targetCollectibles);
 const chaseDistance=Math.hypot(player.x-HARBOR_FINISH.x,player.z-HARBOR_FINISH.z);
 // A harbor chase must display harbor progress, not a misleading full shard bar.
 const chaseRatio=Math.max(0,Math.min(1,1-chaseDistance/112));
 $('mission-fill').style.width=Math.round((harborEscaped?1:player.chaseActive?chaseRatio:ratio)*100)+'%';
 $('mission-progress').textContent=pickupsReceived+' / '+boot.mission.targetCollectibles+' shards';btns.finish.disabled=!harborEscaped&&ratio<1;
 if(gameTime-miniLast>.1){drawMiniMap();miniLast=gameTime;}
 const closest=harborEscaped?null:player.chaseActive?HARBOR_FINISH:collectibles.filter(p=>!p.collected).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
 if(closest){const dx=closest.x-player.x,dz=closest.z-player.z;const distance=Math.round(Math.hypot(dx,dz));
  const arrowRotation=waypointArrowRotation(dx,dz,world.cameraYaw);
  $('waypoint').textContent=player.chaseActive?`◆ REACH HARBOR · ${distance}m`:`✦ NEXT SHARD · ${distance}m`;
  $('waypoint-arrow').style.transform=`rotate(${arrowRotation}rad)`;
 }else{$('waypoint').textContent=harborEscaped?'◆ HARBOR SECURED':'✦ ALL SHARDS FOUND';$('waypoint-arrow').style.transform='none';}
 if(harborEscaped){$('mission-title').textContent='HARBOR ESCAPE COMPLETE';$('mission-progress').textContent='Checkpoint verified · Finish Zone';
  $('prompt').textContent='🏁 Escape verified by PUZUNIVO · Zone ready';btns.finish.disabled=false;
 }else if(player.chaseActive){$('mission-title').textContent='ESCAPE THE CHASE';$('mission-progress').textContent=`Reach the Harbor · ${Math.round(Math.hypot(player.x-HARBOR_FINISH.x,player.z-HARBOR_FINISH.z))}m`;
  $('prompt').textContent='🚨 WANTED — Break contact or reach the Harbor checkpoint';btns.finish.disabled=true;
 }else{$('mission-title').textContent='FREE ROAM · CITY MISSIONS';
  $('mission-progress').textContent=pickupsReceived+' / '+boot.mission.targetCollectibles+' shards';btns.finish.disabled=ratio<1;
  $('prompt').textContent=player.wantedState==='search'?'🔎 POLICE SEARCH — Stay out of sight':`🌴 FREE ROAM • ${player.vehicle.toUpperCase()} • ${weather.weather.toUpperCase()} • No police unless an incident occurs`;
 }
}
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);
 if(e.repeat)return;const actions={KeyB:'skate',KeyE:'ride',KeyK:'trick',Escape:'menu',KeyM:'radio'};
 if(e.code==='KeyM'){radio=!radio;flash(radio?'♪ Audio enabled':'Audio muted')}
 else if(e.code==='Escape')menu();else if(actions[e.code])pressAction(actions[e.code]);
});window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{clearTimeout(jumpTimer);clearTimeout(climbTimer);keys.clear();analog.x=0;analog.z=0;resetStick()});
// Android may pause a WebView before Chromium emits visibilitychange. Keep the
// authoritative run in the existing server and stop physics while it is hidden.
function pauseForInterruption(){
 if(!running)return;
 // Queue the final position and vehicle/camera state before clearing running.
 heartbeat(true).catch(()=>{});
 running=false;resumeGraphicsAfterRestore=false;
 clearTimeout(jumpTimer);clearTimeout(climbTimer);keys.clear();analog.x=0;analog.z=0;resetStick();
 showPanel();
}
window.addEventListener('puzunivo:native-pause',pauseForInterruption);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForInterruption()});
// Virtual analog joystick: continuous movement, no four-button D-pad, with clamped radius.
const stick=$('joystick'),knob=$('joystick-knob');let activeStick=null;
function resetStick(){knob.style.transform='translate(-50%,-50%)';}
function stickMove(e){const box=stick.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
 const max=Math.min(box.width,box.height)*.33,dx=e.clientX-cx,dy=e.clientY-cy,mag=Math.hypot(dx,dy)||1,scale=Math.min(1,max/mag);
 analog.x=(dx*scale)/max;analog.z=-(dy*scale)/max;
 knob.style.transform=`translate(calc(-50% + ${dx*scale}px),calc(-50% + ${dy*scale}px))`;
}
stick.addEventListener('pointerdown',e=>{if(!running)return;e.preventDefault();activeStick=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e)});
stick.addEventListener('pointermove',e=>{if(activeStick!==e.pointerId)return;e.preventDefault();stickMove(e)});
function stickRelease(e){if(activeStick!==e.pointerId)return;activeStick=null;analog.x=0;analog.z=0;resetStick()}
stick.addEventListener('pointerup',stickRelease);stick.addEventListener('pointercancel',stickRelease);stick.addEventListener('lostpointercapture',()=>{activeStick=null;analog.x=0;analog.z=0;resetStick()});
// Orbit the third-person camera by dragging the world; on touch, avoids overlay controls.
let cameraPointer=null,cameraXY=null;
$('world').addEventListener('pointerdown',e=>{if(!running||e.button>0)return;cameraPointer=e.pointerId;cameraXY=[e.clientX,e.clientY];$('world').setPointerCapture(e.pointerId)});
$('world').addEventListener('pointermove',e=>{if(cameraPointer!==e.pointerId||!cameraXY||!world)return;
 const dx=e.clientX-cameraXY[0],dy=e.clientY-cameraXY[1];cameraXY=[e.clientX,e.clientY];world.cameraYaw=Math.atan2(Math.sin(world.cameraYaw-dx*.006),Math.cos(world.cameraYaw-dx*.006));world.cameraPitch=Math.max(-.23,Math.min(.7,world.cameraPitch+dy*.004));
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(event,()=>{cameraPointer=null;cameraXY=null});
document.querySelectorAll('[data-key]').forEach(b=>{const key=b.dataset.key;
 if(key==='sprint'){
  b.addEventListener('pointerdown',e=>{if(!running)return;e.preventDefault();keys.add('sprint');b.classList.add('pressed');b.setPointerCapture(e.pointerId)});
  const release=()=>{keys.delete('sprint');b.classList.remove('pressed')};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
 }else b.onclick=()=>pressAction(key);
});
$('landscape-btn').onclick=tryLandscape;
function menu(){if(running){running=false;clearTimeout(jumpTimer);clearTimeout(climbTimer);keys.clear();analog.x=0;analog.z=0;resetStick();showPanel();}else if(session){running=true;$('panel').classList.add('hidden');$('hud').classList.remove('hidden');$('touch').classList.remove('hidden');$('mission').classList.remove('hidden');
 last=performance.now();physicsCarry=0;if(!frameId)frameId=requestAnimationFrame(loop);}else showPanel();}
btns.menu.onclick=menu;
const chaseButton=$('play-chase');
if(chaseButton)chaseButton.onclick=()=>{
 if(session&&player){
  heartbeat(true).then(()=>api('mission/chase/start',{sessionId:session})).then(result=>{
   if(result.chaseActive){
    player.chaseActive=true;player.heat=result.heat;player.wantedState='chase';
    player.policeX=player.x-3;player.policeZ=player.z-20;
   }
   if(result.harborReached)harborEscaped=true;
   menu();flash(result.harborReached?'🏁 Harbor already secured':'🚨 Harbor Chase activated — reach the waterfront!');
  }).catch(e=>flash(e.message));
 }else start('chase');
};
btns.play.onclick=()=>{if(session){running=true;$('panel').classList.add('hidden');$('hud').classList.remove('hidden');$('touch').classList.remove('hidden');$('mission').classList.remove('hidden');
 last=performance.now();physicsCarry=0;if(!frameId)frameId=requestAnimationFrame(loop);}else start()};
btns.finish.onclick=complete;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;fillPanel()});
refresh().then(()=>{if(boot.profile?.name)showPanel();else showPanel('help');$('admin-link').classList.toggle('hidden',boot?.profile?.role!=='admin')}).catch(e=>{$('account-line').textContent='Could not connect: '+e.message;$('panel-content').textContent='Open this game through PUZUNIVO local server, not a file:// URL.'});

// Native Chromium/WebView may evict its GPU context when an Android app is backgrounded.
// Never keep issuing WebGL draw calls while the context is lost. The player can restart
// the current session on a restored context without changing the shared player database.
$('world').addEventListener('webglcontextlost',event=>{
 event.preventDefault();resumeGraphicsAfterRestore=running&&!document.hidden;
 if(world)world.contextLost=true;
 // Last valid position is saved before the context is discarded.
 if(running)heartbeat(true).catch(()=>{});
 running=false;keys.clear();analog.x=0;analog.z=0;resetStick();
 flash('3D graphics paused. Android GPU context was lost; restoring…');
});
$('world').addEventListener('webglcontextrestored',()=>{
 try{
  const previous=world,canvas=$('world');previous?.dispose();world=new WebGLWorld(canvas);
  world.generate(boot?.level||1);world.cameraYaw=previous?.cameraYaw||0;
  if(session){
   const mayResume=resumeGraphicsAfterRestore&&!document.hidden;
   resumeGraphicsAfterRestore=false;last=performance.now();physicsCarry=0;frameSamples=0;fpsElapsed=0;
   if(mayResume){running=true;if(!frameId)frameId=requestAnimationFrame(loop);}
   else{running=false;showPanel();}
   flash(mayResume?'3D graphics restored. Continue your adventure.':'3D graphics restored. Tap Resume when ready.');
  }
 }catch(e){running=false;resumeGraphicsAfterRestore=false;showPanel('help');flash('3D renderer unavailable: '+e.message)}
});
