// MegaRush endpoints extend PUZUNIVO's existing session and SQLite database.
// Virtual-only currency; no withdrawals, gambling, real-money rewards or client ad claims.
const HARBOR_CHECKPOINT=Object.freeze({x:0,z:112,radius:9});
const CHAPTERS = [
  'Neon Downtown','Skyline Parkour','Coastal Speedway','Boardwalk Rush','Pinewood Trails',
  'Highland Pass','River Run','Sunset Harbor','Storm City','Multiverse Summit',
];
const CHARACTERS = ['rylee','zara','leo'];
const SHOP = [
  {id:'cyan_trail',name:'Cyan Skate Trail',kind:'trail',price:65},
  {id:'violet_hoodie',name:'Violet Street Hoodie',kind:'outfit',price:90},
  {id:'sunset_board',name:'Sunset Skateboard',kind:'board',price:110},
  {id:'gold_glasses',name:'Golden Sunglasses',kind:'accessory',price:80},
];
const DEFAULTS = {
  weather:'cycle', trafficDensity:0.65, pedestrianDensity:0.7, collectibleDensity:1,
  difficultyMultiplier:1, dayCycleMinutes:12, banner:'Explore the worlds. Ride your way.',
  shopPrices:{cyan_trail:65,violet_hoodie:90,sunset_board:110,gold_glasses:80},
};
const compact = (x,max=200)=>String(x??'').trim().slice(0,max);
const bounded=(v,min,max)=>Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
const getLevel = p => Math.min(500,Math.max(1,Number(p?.level)||1));
function chapter(level){return Math.ceil(level/50);}
export function mission(level,settings={}){
 const c=chapter(level); const target=Math.min(12,Math.max(2,Math.round((3+Math.floor(((level-1)%50)/14))*(settings.difficultyMultiplier??1))));
 const biome = c<=2?'city':c===3||c===4?'coast':c===5||c===6?'mountain':c===7?'river':c===8?'coast':c===9?'city':'multiverse';
 return {chapter:c,level,chapterTitle:CHAPTERS[c-1],biome,targetCollectibles:target};
}
// Reachable road-lane spawn sites are fixed per level and do not depend on live settings.
// Three clear corridors remain walkable across all generated city variants.
export function pickupCoords(level,config={},countOverride=null) {
 const count=countOverride??Math.max(mission(level,config).targetCollectibles,Math.round(12*(config.collectibleDensity??1)));
 const lanes=[-32,0,32];
 const sites=[];
 for(let z=-78;z<=48;z+=6){
   for(let lane=0;lane<lanes.length;lane++)sites.push({x:lanes[lane]+(lane===1?0:(z%12===0?2:-2)),z});
 }
 // Independent deterministic shuffle avoids reshuffling earlier collectibles when
 // an operator raises or lowers the number of collectible spawns for NEW runs.
 let seed=(level*3701+0x51bade)>>>0;
 for(let i=sites.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[sites[i],sites[j]]=[sites[j],sites[i]];}
 return sites.slice(0,Math.min(sites.length,count)).map((site,i)=>({id:'orb-'+i,x:site.x,z:site.z}));
}

export function attachMegaRush({db,one,all,run,json,fail,now,uuid,enforce,admin,requireBody,throttle}){
 db.exec(`
 CREATE TABLE IF NOT EXISTS mr_progress(user_id TEXT PRIMARY KEY,level INTEGER NOT NULL DEFAULT 1,total_collectibles INTEGER NOT NULL DEFAULT 0,equipped_character TEXT NOT NULL DEFAULT 'rylee',equipped_skin TEXT NOT NULL DEFAULT 'default',updated_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS mr_sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,level INTEGER NOT NULL,character TEXT NOT NULL,started_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,ended_at INTEGER,x REAL NOT NULL DEFAULT 0,z REAL NOT NULL DEFAULT 0,required_orbs INTEGER NOT NULL DEFAULT 3,pickup_count INTEGER NOT NULL DEFAULT 12,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS mr_pickups(user_id TEXT NOT NULL,level INTEGER NOT NULL,item_id TEXT NOT NULL,session_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,level,item_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS mr_completions(user_id TEXT NOT NULL,level INTEGER NOT NULL,completed_at INTEGER NOT NULL,PRIMARY KEY(user_id,level),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS mr_cosmetics(user_id TEXT NOT NULL,item_id TEXT NOT NULL,obtained_at INTEGER NOT NULL,PRIMARY KEY(user_id,item_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS mr_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS mr_announcements(id TEXT PRIMARY KEY,message TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS mr_bans(user_id TEXT PRIMARY KEY,reason TEXT NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 `);
 // Additive, idempotent migration: preserve existing identity, games and sessions.
 const sessionCols=new Set(all('PRAGMA table_info(mr_sessions)').map(row=>row.name));
 if(!sessionCols.has('required_orbs'))db.exec('ALTER TABLE mr_sessions ADD COLUMN required_orbs INTEGER NOT NULL DEFAULT 3');
 if(!sessionCols.has('pickup_count'))db.exec('ALTER TABLE mr_sessions ADD COLUMN pickup_count INTEGER NOT NULL DEFAULT 12');
 // Same authoritative session row retains driving state, damage and third-person camera.
 // Add columns in place; old database rows remain readable with safe defaults.
 const sessionStateColumns={vehicle:"TEXT NOT NULL DEFAULT 'foot'",hp:'INTEGER NOT NULL DEFAULT 3',heat:'REAL NOT NULL DEFAULT 0',facing:'REAL NOT NULL DEFAULT 0',police_x:'REAL NOT NULL DEFAULT -12',police_z:'REAL NOT NULL DEFAULT 20',view_yaw:'REAL NOT NULL DEFAULT 0',chase_active:'INTEGER NOT NULL DEFAULT 0',car_slot:'INTEGER NOT NULL DEFAULT -1','harbor_reached':'INTEGER NOT NULL DEFAULT 0',incident_type:"TEXT NOT NULL DEFAULT ''",wanted_state:"TEXT NOT NULL DEFAULT 'patrol'"};
 for(const [name,type] of Object.entries(sessionStateColumns))if(!sessionCols.has(name))db.exec(`ALTER TABLE mr_sessions ADD COLUMN ${name} ${type}`);
 // Retire the forced police chase from runs started by older preview builds,
 // without deleting sessions, collectibles, achievements or user accounts.
 run("UPDATE mr_sessions SET chase_active=0, heat=0, wanted_state='patrol' WHERE incident_type='' AND chase_active=1 AND ended_at IS NULL");
 for(const [k,v] of Object.entries(DEFAULTS))run('INSERT OR IGNORE INTO mr_settings VALUES(?,?)',k,JSON.stringify(v));
 const settings=()=>Object.fromEntries(all('SELECT key,value FROM mr_settings').map(r=>[r.key,JSON.parse(r.value)]));
 const progress=user=>{
   run('INSERT OR IGNORE INTO mr_progress(user_id,updated_at) VALUES(?,?)',user.id,now());
   return one('SELECT * FROM mr_progress WHERE user_id=?',user.id);
 };
 const checkPlayer=user=>{
   enforce(user);
   if(one('SELECT 1 FROM mr_bans WHERE user_id=?',user.id))throw fail(403,'MegaRush game access has been suspended.');
 };
 const currentSession=(user,id)=>{
   const row=one('SELECT * FROM mr_sessions WHERE id=? AND user_id=?',compact(id,90),user.id);
   if(!row||row.ended_at)throw fail(409,'Start a new run to continue.');
   return row;
 };
 const audit=(user,action,details)=>run('INSERT INTO audit(admin_id,action,details,created_at) VALUES(?,?,?,?)',user.id,'megarush_'+action,JSON.stringify(details),now());
 return async function handleMegaRush(req,res,route,user){
   const method=req.method;
   // Public read-only compatibility marker for Android builds. No player information,
   // admin settings, secrets, or account counts are exposed by this endpoint.
   if(route==='/api/megarush/health'&&method==='GET'){
     return json(res,200,{ok:true,app:'PUZUNIVO',gameId:'megarush',apiVersion:1,landscape:true});
   }
   if(route==='/api/megarush/bootstrap'&&method==='GET'){
     const p=user?progress(user):null;
     return json(res,200,{game:'MegaRush: The Multi-Verse Map',chapters:CHAPTERS,level:p?.level??1,
       mission:mission(p?.level??1,settings()),settings:settings(),characters:CHARACTERS,wardrobe:SHOP.map(item=>({...item,price:settings().shopPrices?.[item.id]??item.price})),
       equipped:p?{character:p.equipped_character,skin:p.equipped_skin}:null,
       owned:user?all('SELECT item_id FROM mr_cosmetics WHERE user_id=?',user.id).map(r=>r.item_id):[],
       announcements:all('SELECT id,message FROM mr_announcements WHERE active=1 ORDER BY created_at DESC LIMIT 3'),
       profile:user?{name:user.name,role:user.role,funCoins:user.coins,xp:user.xp}:null,adStatus:'native SDK unavailable in this web build',iapStatus:'not enabled'});
   }
   // Return a player's own current run after WebView recreation or a phone app restart.
   // Existing session, progression and pickup rows stay authoritative; no new account
   // or parallel save store is introduced. Expired sessions cannot remain open forever.
   if(route==='/api/megarush/session/active'&&method==='GET'){
     checkPlayer(user);
     const p=progress(user),s=one('SELECT * FROM mr_sessions WHERE user_id=? AND level=? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',user.id,p.level);
     if(!s)return json(res,200,{active:false});
     if(now()-s.last_seen>4*3600000){
       run('UPDATE mr_sessions SET ended_at=? WHERE id=? AND ended_at IS NULL',now(),s.id);
       return json(res,200,{active:false,expired:true});
     }
     const collectedIds=all('SELECT item_id FROM mr_pickups WHERE user_id=? AND level=?',user.id,s.level).map(r=>r.item_id);
     return json(res,200,{active:true,id:s.id,level:s.level,character:s.character,
       x:s.x,z:s.z,state:{vehicle:s.vehicle,hp:s.hp,heat:s.heat,angle:s.facing,policeX:s.police_x,policeZ:s.police_z,cameraYaw:s.view_yaw,chaseActive:!!s.chase_active,carSlot:s.car_slot,wantedState:s.wanted_state},incidentType:s.incident_type,harborReached:!!s.harbor_reached,
       mission:{...mission(s.level),targetCollectibles:s.required_orbs},
       pickups:pickupCoords(s.level,{},s.pickup_count),collectedIds});
   }
   if(route==='/api/megarush/session/start'&&method==='POST'){
     checkPlayer(user);throttle('mr-start-'+user.id,20);
     const b=await requireBody(req);
     if(!CHARACTERS.includes(b.character))throw fail(400,'Invalid character');
     const p=progress(user);
     if(all('SELECT id FROM mr_sessions WHERE user_id=? AND ended_at IS NULL',user.id).length>=3)run('UPDATE mr_sessions SET ended_at=? WHERE user_id=? AND ended_at IS NULL',now(),user.id);
     const id=uuid(),t=now(),snapshot=settings(),runMission=mission(p.level,snapshot),runPickups=pickupCoords(p.level,snapshot);
     run('INSERT INTO mr_sessions(id,user_id,level,character,started_at,last_seen,x,z,required_orbs,pickup_count,vehicle,heat,chase_active,police_x,police_z) VALUES(?,?,?,?,?,?,0,0,?,?,?,?,0,-12,20)',id,user.id,p.level,b.character,t,t,runMission.targetCollectibles,runPickups.length,'skate',0);
     run('UPDATE mr_progress SET equipped_character=?,updated_at=? WHERE user_id=?',b.character,t,user.id);
     return json(res,201,{id,level:p.level,mission:runMission,incidentType:'',harborReached:false,pickups:runPickups,collectedIds:all('SELECT item_id FROM mr_pickups WHERE user_id=? AND level=?',user.id,p.level).map(r=>r.item_id)});
   }
   // Patrol is the default; only a player-triggered, server-recorded incident
   // can activate police. A browser cannot earn the harbor reward merely by
   // forging a chaseActive flag in its session heartbeat.
   // Opt-in Harbor Chase stays in the existing authenticated player session.
   if(route==='/api/megarush/mission/chase/start'&&method==='POST'){
     checkPlayer(user);throttle('mr-chase-'+user.id,8);
     const b=await requireBody(req),s=currentSession(user,b.sessionId),p=progress(user);
     if(s.level!==p.level)throw fail(409,'Level has changed');
     if(s.incident_type==='harbor_challenge')return json(res,200,{ok:true,duplicate:true,chaseActive:!!s.chase_active,harborReached:!!s.harbor_reached,heat:s.heat,wantedState:s.wanted_state});
     if(s.incident_type||s.harbor_reached)throw fail(409,'Another mission is already running');
     if(Math.abs(s.x)>55||s.z>55||s.z< -100)throw fail(409,'Start Harbor Chase from downtown streets');
     const changed=run("UPDATE mr_sessions SET incident_type='harbor_challenge',wanted_state='chase',chase_active=1,heat=0.92,police_x=x-3,police_z=z-20 WHERE id=? AND incident_type='' AND ended_at IS NULL",s.id).changes;
     if(!changed)throw fail(409,'Chase mission already started');
     run('INSERT INTO events(user_id,kind,details,created_at) VALUES(?,?,?,?)',user.id,'megarush_harbor_challenge',JSON.stringify({sessionId:s.id,level:s.level}),now());
     return json(res,200,{ok:true,chaseActive:true,heat:0.92,wantedState:'chase',mission:'harbor_challenge'});
   }
   if(route==='/api/megarush/incident'&&method==='POST'){
     checkPlayer(user);throttle('mr-incident-'+user.id,12);
     const body=await requireBody(req),s=currentSession(user,body.sessionId);
     if(!['vehicle_theft','reckless_collision'].includes(body.kind))throw fail(400,'Unknown incident');
     if(s.incident_type)return json(res,200,{ok:true,duplicate:true,chaseActive:!!s.chase_active,heat:s.heat,wantedState:s.wanted_state});
     // The player's previously validated heartbeat must show the vehicle mode.
     if(s.vehicle!=='car'||s.car_slot<0||s.car_slot>13)throw fail(409,'Enter a vehicle before reporting this incident');
     run("UPDATE mr_sessions SET incident_type=?,wanted_state='chase',chase_active=1,heat=0.92,police_x=x-3,police_z=z-20 WHERE id=? AND incident_type=''",body.kind,s.id);
     return json(res,200,{ok:true,chaseActive:true,heat:.92,wantedState:'chase'});
   }
   if(route==='/api/megarush/session/heartbeat'&&method==='POST'){
     checkPlayer(user);throttle('mr-tick-'+user.id,150);
     const b=await requireBody(req),s=currentSession(user,b.id),x=Number(b.x),z=Number(b.z),t=now();
     if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>170||Math.abs(z)>170)throw fail(400,'Invalid position');
     const dt=Math.max(0,(t-s.last_seen)/1000),travel=Math.hypot(x-s.x,z-s.z);
     if(travel>dt*23+6)throw fail(400,'Impossible travel distance');
     const raw=b.state;
     if(raw!==undefined){
       if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['foot','skate','car','swim'].includes(raw.vehicle)||!Number.isInteger(raw.hp)||raw.hp<0||raw.hp>3||typeof raw.chaseActive!=='boolean'||!Number.isInteger(raw.carSlot)||raw.carSlot< -1||raw.carSlot>13||!['patrol','search','chase'].includes(raw.wantedState??s.wanted_state)||
           ![raw.heat,raw.angle,raw.policeX,raw.policeZ,raw.cameraYaw].every(Number.isFinite)||raw.heat<0||raw.heat>1||
           Math.abs(raw.angle)>100||Math.abs(raw.cameraYaw)>100||Math.abs(raw.policeX)>170||Math.abs(raw.policeZ)>170)throw fail(400,'Invalid saved gameplay state');
       if(raw.chaseActive&&!s.incident_type)throw fail(409,'Police chase requires a verified incident');
       const wanted=raw.chaseActive?'chase':(raw.wantedState==='search'&&s.incident_type?'search':'patrol');
       run('UPDATE mr_sessions SET x=?,z=?,last_seen=?,vehicle=?,hp=?,heat=?,facing=?,police_x=?,police_z=?,view_yaw=?,chase_active=?,car_slot=?,wanted_state=? WHERE id=?',
         x,z,t,raw.vehicle,raw.hp,raw.heat,raw.angle,raw.policeX,raw.policeZ,raw.cameraYaw,Number(raw.chaseActive),raw.carSlot,wanted,s.id);
     }else run('UPDATE mr_sessions SET x=?,z=?,last_seen=? WHERE id=?',x,z,t,s.id);
     // Only the server may confirm a harbor escape. The client cannot award itself
     // the checkpoint through a submitted `harborReached` flag or teleport.
     const nearHarbor=Math.hypot(x-HARBOR_CHECKPOINT.x,z-HARBOR_CHECKPOINT.z)<HARBOR_CHECKPOINT.radius;
     const eligible=!s.harbor_reached&&s.incident_type!==''&&s.chase_active===1&&raw?.chaseActive===true&&nearHarbor&&t-s.started_at>=7000;
     if(eligible)run("UPDATE mr_sessions SET harbor_reached=1,chase_active=0,heat=0,wanted_state='patrol' WHERE id=? AND harbor_reached=0",s.id);
     return json(res,200,{ok:true,harborReached:!!s.harbor_reached||eligible});
   }
   if(route==='/api/megarush/pickup'&&method==='POST'){
     checkPlayer(user);throttle('mr-pickup-'+user.id,100);
     const b=await requireBody(req),s=currentSession(user,b.sessionId),p=progress(user);
     if(s.level!==p.level)throw fail(409,'Level has changed');
     const pickup=pickupCoords(s.level,{},s.pickup_count).find(item=>item.id===b.itemId);
     if(!pickup)throw fail(400,'Unknown collectible');
     const dist=Math.hypot(s.x-pickup.x,s.z-pickup.z);
     if(dist>5.5)throw fail(400,'Collectible is too far away from your last validated position');
     const found=one('SELECT 1 FROM mr_pickups WHERE user_id=? AND level=? AND item_id=?',user.id,s.level,pickup.id);
     if(found)return json(res,200,{ok:true,duplicate:true});
     run('INSERT INTO mr_pickups VALUES(?,?,?,?,?)',user.id,s.level,pickup.id,s.id,now());
     run('UPDATE mr_progress SET total_collectibles=total_collectibles+1,updated_at=? WHERE user_id=?',now(),user.id);
     return json(res,200,{ok:true,collected:one('SELECT count(*) n FROM mr_pickups WHERE user_id=? AND level=?',user.id,s.level).n});
   }
   if(route==='/api/megarush/level/complete'&&method==='POST'){
     checkPlayer(user);throttle('mr-complete-'+user.id,10);
     const b=await requireBody(req),s=currentSession(user,b.sessionId),p=progress(user);
     if(s.level!==p.level)throw fail(409,'Level has changed');
     const count=one('SELECT count(*) n FROM mr_pickups WHERE user_id=? AND level=?',user.id,p.level).n;
     const required=s.required_orbs;
     if(count<required&&!s.harbor_reached)throw fail(409,'Reach Harbor or collect '+required+' orbs to finish this level');
     if(now()-s.started_at<12000)throw fail(409,'Run completed implausibly quickly');
     const next=Math.min(500,p.level+1);
     db.exec('BEGIN IMMEDIATE');
     try{
       const inserted=run('INSERT OR IGNORE INTO mr_completions VALUES(?,?,?)',user.id,p.level,now()).changes;
       if(inserted){run('UPDATE users SET xp=xp+25,coins=coins+10 WHERE id=?',user.id);}
       run('UPDATE mr_progress SET level=?,updated_at=? WHERE user_id=?',next,now(),user.id);
       run('UPDATE mr_sessions SET ended_at=? WHERE id=?',now(),s.id);
       db.exec('COMMIT');
       return json(res,200,{ok:true,awarded:inserted===1,level:next,funCoins:one('SELECT coins FROM users WHERE id=?',user.id).coins});
     }catch(e){db.exec('ROLLBACK');throw e}
   }
   // A real crash checkpoint must be committed before the client teleports;
   // otherwise the next anti-teleport heartbeat rejects legitimate recovery.
   // The server never awards coins or progression for a respawn.
   if(route==='/api/megarush/session/respawn'&&method==='POST'){
     checkPlayer(user);throttle('mr-respawn-'+user.id,10);
     const b=await requireBody(req),s=currentSession(user,b.sessionId),p=progress(user);
     if(s.level!==p.level)throw fail(409,'Level has changed');
     const chase=s.chase_active===1&&!s.harbor_reached;
     const heat=chase?0.92:0;
     const wanted=chase?'chase':'patrol';
     run("UPDATE mr_sessions SET x=0,z=0,vehicle='skate',car_slot=-1,hp=3,heat=?,police_x=-3,police_z=-20,facing=0,view_yaw=0,wanted_state=?,last_seen=? WHERE id=? AND user_id=? AND ended_at IS NULL",
       heat,wanted,now(),s.id,user.id);
     return json(res,200,{ok:true,x:0,z:0,state:{
       hp:3,vehicle:'skate',carSlot:-1,heat,policeX:-3,policeZ:-20,
       chaseActive:chase,wantedState:wanted,cameraYaw:0,angle:0
     }});
   }
   if(route==='/api/megarush/session/end'&&method==='POST'){
     checkPlayer(user);const b=await requireBody(req);
     run('UPDATE mr_sessions SET ended_at=? WHERE id=? AND user_id=? AND ended_at IS NULL',now(),compact(b.id,90),user.id);
     return json(res,200,{ok:true});
   }
   if(route==='/api/megarush/wardrobe/buy'&&method==='POST'){
     checkPlayer(user);throttle('mr-buy-'+user.id,12);
     const b=await requireBody(req),item=SHOP.find(i=>i.id===b.itemId);
     if(!item)throw fail(400,'Unknown cosmetic');
     if(one('SELECT 1 FROM mr_cosmetics WHERE user_id=? AND item_id=?',user.id,item.id))throw fail(409,'Already unlocked');
     const price=settings().shopPrices?.[item.id]??item.price;
     db.exec('BEGIN IMMEDIATE');try{
       const paid=run('UPDATE users SET coins=coins-? WHERE id=? AND coins>=?',price,user.id,price).changes;
       if(!paid)throw fail(409,'Not enough Fun Coins');
       run('INSERT INTO mr_cosmetics VALUES(?,?,?)',user.id,item.id,now());db.exec('COMMIT');
       return json(res,200,{ok:true,funCoins:one('SELECT coins FROM users WHERE id=?',user.id).coins});
     }catch(e){db.exec('ROLLBACK');throw e}
   }
   if(route==='/api/megarush/wardrobe/equip'&&method==='POST'){
     checkPlayer(user);const b=await requireBody(req);
     if(!CHARACTERS.includes(b.character))throw fail(400,'Unknown character');
     if(b.skin!=='default'&&!one('SELECT 1 FROM mr_cosmetics WHERE user_id=? AND item_id=?',user.id,b.skin))throw fail(403,'Skin is locked');
     run('UPDATE mr_progress SET equipped_character=?,equipped_skin=?,updated_at=? WHERE user_id=?',b.character,b.skin,now(),user.id);
     return json(res,200,{ok:true});
   }
   if(route==='/api/megarush/admin'&&method==='GET'){
     admin(user);const since=now()-86400000,month=now()-30*86400000;
     return json(res,200,{settings:settings(),chapters:CHAPTERS,
       metrics:{runs:one('SELECT count(*) n FROM mr_sessions').n,players:one('SELECT count(DISTINCT user_id) n FROM mr_sessions').n,
         activeToday:one('SELECT count(DISTINCT user_id) n FROM mr_sessions WHERE last_seen>?',since).n,
         active30Days:one('SELECT count(DISTINCT user_id) n FROM mr_sessions WHERE last_seen>?',month).n,
         averageSessionSeconds:Math.round(one('SELECT coalesce(avg((ended_at-started_at)/1000.0),0) n FROM mr_sessions WHERE ended_at IS NOT NULL').n),
         completedLevels:one('SELECT count(*) n FROM mr_completions').n},
       levelRetention:all('SELECT ((level-1)/50)+1 AS chapter,count(*) AS players FROM mr_progress GROUP BY ((level-1)/50)+1 ORDER BY chapter'),
       recentRuns:all('SELECT s.id,u.name,s.level,s.started_at,s.ended_at FROM mr_sessions s JOIN users u ON u.id=s.user_id ORDER BY s.started_at DESC LIMIT 40'),
       announcements:all('SELECT * FROM mr_announcements ORDER BY created_at DESC LIMIT 30'),
       bans:all('SELECT b.user_id,u.name,b.reason,b.created_at FROM mr_bans b JOIN users u ON u.id=b.user_id ORDER BY b.created_at DESC LIMIT 50'),
       monetization:{adMobImpressions:null,ctr:null,estimatedRevenue:null,iapTransactions:null,integrated:false}});
   }
   if(route==='/api/megarush/admin/settings'&&method==='POST'){
     admin(user);const b=await requireBody(req);const ranges={trafficDensity:[0,1],pedestrianDensity:[0,1],collectibleDensity:[0.3,2],difficultyMultiplier:[0.5,3],dayCycleMinutes:[4,60]};
     const value=b.value;
     if(b.key==='shopPrices') {
       if(!value||typeof value!=='object'||Array.isArray(value)||!SHOP.every(item=>Number.isInteger(value[item.id])&&value[item.id]>=0&&value[item.id]<=10000))throw fail(400,'Invalid Fun Coins store price table');
       const clean=Object.fromEntries(SHOP.map(item=>[item.id,value[item.id]]));
       run('UPDATE mr_settings SET value=? WHERE key=?',JSON.stringify(clean),'shopPrices');
       audit(user,'settings',{key:'shopPrices',value:clean});return json(res,200,{ok:true});
     }
     if(b.key==='weather'&&!['cycle','clear','rain','fog'].includes(value))throw fail(400,'Invalid weather');
     else if(b.key==='banner'&&(typeof value!=='string'||value.length>160))throw fail(400,'Invalid announcement banner');
     else if(b.key in ranges&&!bounded(value,...ranges[b.key]))throw fail(400,'Out of range');
     else if(!(b.key in DEFAULTS))throw fail(400,'Unknown setting');
     const resolved=b.key==='banner'||b.key==='weather'?value:Number(value);
     run('UPDATE mr_settings SET value=? WHERE key=?',JSON.stringify(resolved),b.key);
     audit(user,'settings',{key:b.key,value:resolved});return json(res,200,{ok:true});
   }
   if(route==='/api/megarush/admin/announcement'&&method==='POST'){
     admin(user);const b=await requireBody(req),message=compact(b.message,160);
     if(message.length<5)throw fail(400,'Announcement is too short');
     const id=uuid();run('INSERT INTO mr_announcements VALUES(?,?,1,?)',id,message,now());audit(user,'announcement',{id,message});return json(res,201,{id});
   }
   if(route==='/api/megarush/admin/announcement/toggle'&&method==='POST'){
     admin(user);const b=await requireBody(req);
     if(typeof b.active!=='boolean')throw fail(400,'Invalid toggle');
     const result=run('UPDATE mr_announcements SET active=? WHERE id=?',b.active?1:0,compact(b.id,90));
     if(!result.changes)throw fail(404,'Announcement missing');audit(user,'announcement_toggle',{id:b.id,active:b.active});
     return json(res,200,{ok:true});
   }
   if(route==='/api/megarush/admin/account'&&method==='POST'){
     admin(user);const b=await requireBody(req),target=one("SELECT id,role FROM users WHERE id=?",compact(b.userId,90));
     if(!target||target.role!=='player')throw fail(404,'Player not found');
     if(b.action==='ban'){
       run('INSERT OR REPLACE INTO mr_bans VALUES(?,?,?)',target.id,compact(b.reason||'Terms violation',160),now());
     }else if(b.action==='unban')run('DELETE FROM mr_bans WHERE user_id=?',target.id);
     else if(b.action==='reset'){
       db.exec('BEGIN IMMEDIATE');try{
         // Preserve historical completions and purchases to prevent farming virtual coin rewards.
         for(const table of ['mr_pickups','mr_sessions','mr_progress'])run('DELETE FROM '+table+' WHERE user_id=?',target.id);
         db.exec('COMMIT');
       }catch(e){db.exec('ROLLBACK');throw e}
     } else throw fail(400,'Invalid account action');
     audit(user,'account_'+b.action,{userId:target.id,reason:compact(b.reason,160)});
     return json(res,200,{ok:true});
   }
   throw fail(404,'Unknown MegaRush endpoint');
 };
}
