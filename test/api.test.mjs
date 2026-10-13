import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';import {numberPuzzle,linePuzzle,slidePuzzle,moveBlock,memoryPuzzle} from '../logic.mjs';
function reservePort(){return new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))})})}
test('API verifies real game progress, lives, admin changes, and access control',async t=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'puzunivo-test-')),port=await reservePort(),base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(port),PUZUNIVO_DATA_DIR:temp,ADMIN_EMAIL:'admin@test.local',ADMIN_PASSWORD:'long-secure-admin-password-2026'},stdio:['ignore','pipe','pipe']});
 t.after(()=>{child.kill();rmSync(temp,{recursive:true,force:true})});
 let stderr='';child.stderr.on('data',d=>stderr+=d.toString());
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/api/health');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,35));if(i===99)throw Error('API did not start: '+stderr)}
 let playerCookie='',adminCookie='';
 const call=async(url,body=undefined,who='player')=>{const r=await fetch(base+'/api/'+url,{method:body===undefined?'GET':'POST',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(who==='player'&&playerCookie?{Cookie:playerCookie}:{}),...(who==='admin'&&adminCookie?{Cookie:adminCookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});const json=await r.json();const cookie=r.headers.get('set-cookie');if(cookie){if(who==='admin')adminCookie=cookie.split(';')[0];else playerCookie=cookie.split(';')[0];}return {status:r.status,data:json}};
 assert.equal((await call('admin')).status,401);
 let g=await call('auth/guest',{});assert.equal(g.status,201);assert.equal(g.data.user.coins,0);
 let p=await call('progress?game=number&mode=Easy');assert.equal(p.status,200);assert.equal(p.data.puzzle.answer,undefined);
 for(let q=0;q<5;q++){const puzzle=numberPuzzle('Easy',1,q);const s=await call('submit',{game:'number',mode:'Easy',level:1,question:q,answer:puzzle.answer});assert.equal(s.status,200);assert.equal(s.data.correct,true);assert.equal(s.data.levelComplete,q===4)}
 let pr=await call('profile');assert.equal(pr.data.user.coins,20);assert.equal(pr.data.user.xp,40);
 assert.equal((await call('progress?game=number&mode=Easy')).data.level,2);
 let duplicate=await call('submit',{game:'number',mode:'Easy',level:1,question:4,answer:numberPuzzle('Easy',1,4).answer});assert.equal(duplicate.status,409);
 for(let i=0;i<3;i++){let r=await call('submit',{game:'number',mode:'Easy',level:2,question:0,answer:-500});assert.equal(r.data.lives.amount,2-i)}
 assert.equal((await call('submit',{game:'number',mode:'Easy',level:2,question:0,answer:0})).status,403);
 assert.equal((await call('progress?game=line&mode=Easy')).data.lives.amount,3);

 // Complete the other three games through the real API.
 const graph=linePuzzle('Easy',1);const trail=graph.edges.map((_,i)=>i);const line=await call('submit',{game:'line',mode:'Easy',level:1,question:0,trace:trail});assert.equal(line.status,200);assert.equal(line.data.correct,true);
 const memory=memoryPuzzle('Easy',1);const mem=await call('submit',{game:'memory',mode:'Easy',level:1,question:0,cells:memory.cells});assert.equal(mem.status,200);assert.equal(mem.data.correct,true);
 const slide=slidePuzzle('Easy',1);const block=slide.blocks.find(b=>b.id==='A');const moves=[];const board=slide.blocks;let current=board;for(let i=0;i<2;i++){const next=moveBlock(current,'A',1);if(!next)break;current=next;moves.push({id:'A',direction:1});}for(let i=0;i<4;i++){const next=moveBlock(current,'T',1);if(!next)break;current=next;moves.push({id:'T',direction:1});}const sliding=await call('submit',{game:'slide',mode:'Easy',level:1,question:0,moves});assert.equal(sliding.status,200);assert.equal(sliding.data.correct,true);
 assert.equal((await call('profile')).data.user.coins,80);

 let a=await call('auth/login',{email:'admin@test.local',password:'long-secure-admin-password-2026'},'admin');assert.equal(a.status,200);assert.equal(a.data.user.role,'admin');
 assert.equal((await call('admin/config',{key:'refill_minutes',value:22})).status,403);
 assert.equal((await call('admin/config',{key:'refill_minutes',value:22},'admin')).status,200);
 assert.equal((await call('admin',undefined,'admin')).data.config.refillMinutes,22);
 assert.equal((await call('admin/config',{key:'games',value:{number:false,line:true,slide:true,memory:true}},'admin')).status,200);
 assert.equal((await call('progress?game=number&mode=Easy')).status,403);
 assert.equal((await call('admin/config',{key:'games',value:{number:true,line:true,slide:true,memory:true}},'admin')).status,200);
 assert.equal((await call('support',{category:'Bug',message:'Board needs a hint'})).status,201);
 const dashboard=await call('admin',undefined,'admin');assert.equal(dashboard.data.stats.players,1);assert.equal(dashboard.data.stats.completed,4);assert.equal(dashboard.data.stats.supportOpen,1);assert.ok(dashboard.data.audit.length>=3);
 assert.equal((await call('auth/delete',{})).status,200);
 assert.equal((await call('profile')).status,401);
});
