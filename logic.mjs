export const GAMES = [
  { id:'number', title:'Number Series', icon:'⌗', caption:'Find the missing number', color:'#40d8df', description:'Spot clever numerical patterns.' },
  { id:'line', title:'One-Line Logic', icon:'◇', caption:'Connect every path', color:'#a594ff', description:'Traverse every line just once.' },
  { id:'slide', title:'Slide & Escape', icon:'▥', caption:'Move the blocks to escape', color:'#ffba6d', description:'Clear the way for the gold block.' },
  { id:'memory', title:'Memory Pattern', icon:'▦', caption:'Watch, remember, repeat', color:'#ff81b5', description:'Train your visual recall.' }
];
export const MODES=['Easy','Medium','Hard'];
export const LEVELS=30;
const rng=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
export function numberPuzzle(mode,level,question){
  const d=MODES.indexOf(mode); if(d<0||level<1||level>LEVELS||question<0||question>4)throw Error('Invalid puzzle');
  const rand=rng(level*991+question*179+d*123457), base=2+Math.floor(rand()*8)+Math.floor(level/8), step=2+Math.floor(rand()*5)+Math.floor(level/8);
  const type=(level+question*3+d)%5;
  let seq=[], answer,explanation;
  if(d===0){
    const easyType=(level+question)%4;
    if(easyType===0){seq=Array.from({length:5},(_,i)=>base+i*step); answer=seq[4]; explanation=`Add ${step} each time.`;}
    if(easyType===1){seq=Array.from({length:5},(_,i)=>base+Math.floor(i*(i+1)/2)*step);answer=seq[4];explanation=`Add ${step}, ${step*2}, ${step*3}, then ${step*4}.`;}
    if(easyType===2){seq=Array.from({length:5},(_,i)=>(base+i)*(base+i));answer=seq[4];explanation='These are squares of consecutive integers.';}
    if(easyType===3){let mult=2+(level>19?1:0);seq=Array.from({length:5},(_,i)=>base*(mult**i));answer=seq[4];explanation=`Multiply by ${mult} each time.`;}
  }else if(d===1){
    if(type===0){seq=Array.from({length:5},(_,i)=>base+i*i*step);explanation=`Differences are ${step}, ${3*step}, ${5*step}, ${7*step}.`;}
    if(type===1){seq=Array.from({length:5},(_,i)=>base+Math.floor(i/2)*step+(i%2?step*3:0));explanation='Two interleaved sequences each increase by the same step.';}
    if(type===2){seq=Array.from({length:5},(_,i)=>base+i*step+i*(i-1)/2);explanation='The gap between consecutive values increases by one.';}
    if(type===3){seq=Array.from({length:5},(_,i)=>(base+i)*(i+1));explanation='Multiply increasing consecutive factors.';}
    if(type===4){seq=Array.from({length:5},(_,i)=>base+step*(2**i-1));explanation='Each successive difference doubles.';}
    answer=seq[4];
  }else{
    if(type===0){seq=[base,base+step];for(let i=2;i<5;i++)seq.push(seq[i-1]+seq[i-2]);explanation='Each number is the sum of the previous two.';}
    if(type===1){seq=Array.from({length:5},(_,i)=>base+i*i*i+step*i);explanation='The rule is a cube progression plus a constant linear step.';}
    if(type===2){seq=Array.from({length:5},(_,i)=>base*(2**i)+i*step);explanation='Double the exponential component and add an increasing offset.';}
    if(type===3){seq=Array.from({length:5},(_,i)=>(i+2)*(i+2)*(i+1)+base);explanation='The pattern follows (n + 2)² × (n + 1) plus a constant.';}
    if(type===4){seq=Array.from({length:5},(_,i)=>base+(i+1)*(i+2)*(i+3));explanation='Successive products of three consecutive integers plus a constant.';}
    answer=seq[4];
  }
  const wrong=new Set(), deltas=[step,step*2,step*3+1,step*4+2,Math.max(1,Math.floor(answer/4))];
  for(let i=0;wrong.size<3&&i<30;i++){const delta=deltas[i%5]+Math.floor(i/5)*2;const x=answer+(i%2?delta:-delta);if(x!==answer&&x>0)wrong.add(x);}
  const options=[answer,...wrong].sort((a,b)=>a-b);const rotation=Math.floor(rand()*4); options.push(...options.splice(0,rotation));
  return {id:`number-${mode}-${level}-${question}`,game:'number',mode,level,question,seq:seq.slice(0,4),answer,options,explanation};
}
export function linePuzzle(mode,level){
  const d=MODES.indexOf(mode);if(d<0||level<1||level>LEVELS)throw Error('Invalid level');
  const band=Math.floor((level-1)/10), count=d===0?4+band:d===1?4+band:6+band;
  const rotation=level*.39;const nodes=Array.from({length:count},(_,i)=>{const a=rotation+(Math.PI*2*i/count)-Math.PI/2;return [Number((.5+.38*Math.cos(a)).toFixed(4)),Number((.5+.38*Math.sin(a)).toFixed(4))]});
  const edges=[];for(let i=0;i<count;i++)edges.push([i,(i+1)%count]);
  if(d===1)edges.push([0,Math.floor(count/2)]);
  if(d===2){if(band<2)edges.push([1,Math.floor(count/2)+1]);else edges.push([0,2],[2,4],[4,0]);}
  const shift=level%edges.length;edges.push(...edges.splice(0,shift));
  return {nodes,edges,hint:d===0?'Start anywhere and travel every line once.':d===1?'Find the two odd-degree dots to start and finish.':'Explore loops and branches without repeating an edge.'};
}
export function validateLine(puzzle,trace){
  if(!Array.isArray(trace)||trace.length!==puzzle.edges.length) return false;
  const unique=new Set(), degree=[];let prev=null;
  for(const index of trace){if(!Number.isInteger(index)||index<0||index>=puzzle.edges.length||unique.has(index))return false;unique.add(index);const [a,b]=puzzle.edges[index];if(!degree.length){degree.push(a,b);prev=[a,b];continue;}let last=degree.at(-1);if(a===last)degree.push(b);else if(b===last)degree.push(a);else return false;}
  // A path can start at either endpoint of the first selected edge.
  if(trace.length>1){const [a,b]=puzzle.edges[trace[0]];for(const start of [a,b]){let cur=start, ok=true;for(const idx of trace){const e=puzzle.edges[idx];if(e[0]===cur)cur=e[1];else if(e[1]===cur)cur=e[0];else{ok=false;break;}}if(ok)return true;}return false;}
  return true;
}
export function slidePuzzle(mode,level){
  const d=MODES.indexOf(mode);if(d<0||level<1||level>LEVELS)throw Error('Invalid level');
  const band=Math.floor((level-1)/10), count=Math.min(3,1+d+band);const xs=[2,3,4].slice(3-count);
  const blocks=[{id:'T',x:0,y:2,w:2,h:1,axis:'h'}];
  for(let i=0;i<xs.length;i++){const len=d===2&&band===2?3:2;blocks.push({id:String.fromCharCode(65+i),x:xs[i],y:len===3?0:1,w:1,h:len,axis:'v'});}
  if(d>=1)blocks.push({id:'D',x:0,y:4,w:2,h:1,axis:'h'});
  if(d===2&&band>=1)blocks.push({id:'E',x:4,y:5,w:2,h:1,axis:'h'});
  return {size:6,blocks,hint:'Move vertical blocks away from the target row, then slide the gold block to the right.'};
}
export function moveBlock(blocks,id,direction){const copy=structuredClone(blocks),block=copy.find(b=>b.id===id);if(!block||!Number.isInteger(direction)||Math.abs(direction)!==1)return null;const next={...block};if(next.axis==='h')next.x+=direction;else next.y+=direction;
 if(next.x<0||next.y<0||next.x+next.w>6||next.y+next.h>6)return null;
 for(const b of copy){if(b.id===id)continue;if(next.x<b.x+b.w&&next.x+next.w>b.x&&next.y<b.y+b.h&&next.y+next.h>b.y)return null;}
 Object.assign(block,next);return copy;
}
export function validateSlide(moves,mode,level){if(!Array.isArray(moves)||moves.length>250)return false;let state=slidePuzzle(mode,level).blocks;for(const m of moves){state=moveBlock(state,m.id,m.direction);if(!state)return false;}const target=state.find(b=>b.id==='T');return target.x===6-target.w;}
export function memoryPuzzle(mode,level){const d=MODES.indexOf(mode);if(d<0||level<1||level>30)throw Error('Invalid level');const size=[3,4,5][d],r=rng(level*971+d*24489),cells=new Set(),count=Math.min(size*size-1,2+d+Math.floor((level-1)/6));while(cells.size<count)cells.add(Math.floor(r()*size*size));return {size,cells:[...cells].sort((a,b)=>a-b),duration:[3500,2600,1800][d]};}
export function validateMemory(answer,mode,level){const correct=memoryPuzzle(mode,level).cells;return Array.isArray(answer)&&answer.length===correct.length&&answer.slice().sort((a,b)=>a-b).every((x,i)=>Number(x)===correct[i]);}
export function validateNumber(answer,mode,level,question){return Number(answer)===numberPuzzle(mode,level,question).answer;}
