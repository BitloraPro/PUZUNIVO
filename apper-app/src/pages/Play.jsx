import React,{useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import { getAdMobStatus, showInterstitialAd, showRewardedAd } from '@/services/admob';
import { useSelector } from 'react-redux';
import {GAMES,MODES,MAX_LEVEL,numberPuzzle,linePuzzle,lineNext,slidePuzzle,moveSlide,slideWon,memoryPuzzle} from '@/lib/puzunivoPuzzles';
import '@/components/puzunivo-neon.css';

export const route={path:'/play',layout:'public',access:'public'};
const MAX_LIVES=3,REFILL_MS=15*60*1000;
function stored(key,fallback){
  try {const x=localStorage.getItem(key);return x===null?fallback:JSON.parse(x);}
  catch{return fallback;}
}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* disabled by browser */}}
function snapshot(game){
  const saved=stored('puzunivo-lives-'+game,{remaining:3,refillAt:0});
  const valid=Number.isFinite(saved?.remaining)&&saved.remaining>=0&&saved.remaining<=3;
  if(!valid)return {remaining:3,refillAt:0};
  if(saved.remaining===0&&saved.refillAt&&Date.now()>=saved.refillAt)return {remaining:3,refillAt:0};
  return saved;
}

export default function Play(){
  const [params]=useSearchParams();
  const game=GAMES[params.get('game')]?params.get('game'):'number';
  const mode=MODES.includes(params.get('mode'))?params.get('mode'):'Easy';
  const key='puzunivo-progress-'+game+'-'+mode;
  const [level,setLevel]=useState(()=>{
    const max=Math.min(MAX_LEVEL,Math.max(1,Number(stored(key,1))||1));
    const requested=Number(params.get('level'));
    return Number.isInteger(requested)&&requested>=1&&requested<=max?requested:max;
  });
  const [life,setLife]=useState(()=>snapshot(game));
  const [trace,setTrace]=useState([]);
  const [blocks,setBlocks]=useState(()=>slidePuzzle(mode,1).blocks);
  const [selected,setSelected]=useState('target');
  const [reveal,setReveal]=useState(true);
  const [seconds,setSeconds]=useState(5);
  const [feedback,setFeedback]=useState('');
  const [victory,setVictory]=useState(false);
  const [now,setNow]=useState(Date.now());
  const [adBusy,setAdBusy]=useState(false);
  const user=useSelector(state=>state.user.user);
  useEffect(()=>{
    const max=Math.min(MAX_LEVEL,Math.max(1,Number(stored(key,1))||1));
    const requested=Number(params.get('level'));
    setLevel(Number.isInteger(requested)&&requested>=1&&requested<=max?requested:max);
    setLife(snapshot(game));setFeedback('');setVictory(false);setTrace([]);setSelected('target');
    setReveal(true);setSeconds(5);
  },[game,mode,key,params]);
  useEffect(()=>{
    setBlocks(slidePuzzle(mode,level).blocks);
    setTrace([]);setSelected('target');setReveal(true);setSeconds(5);
  },[game,mode,level]);
  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    if(life.remaining===0&&life.refillAt&&now>=life.refillAt){
      const refreshed={remaining:MAX_LIVES,refillAt:0};store('puzunivo-lives-'+game,refreshed);setLife(refreshed);
      setFeedback('Free refill complete. Three lives restored.');
    }
  },[life,now,game]);
  useEffect(()=>{
    if(game!=='memory'||!reveal||life.remaining===0||victory)return;
    const tick=setTimeout(()=>{
      setSeconds(s=>{
        if(s<=1){setReveal(false);return 0;}
        return s-1;
      });
    },1000);
    return ()=>clearTimeout(tick);
  },[game,reveal,seconds,level,life.remaining,victory]);
  const number=useMemo(()=>numberPuzzle(mode,level),[mode,level]);
  const line=useMemo(()=>linePuzzle(mode,level),[mode,level]);
  const slide=useMemo(()=>slidePuzzle(mode,level),[mode,level]);
  const memory=useMemo(()=>memoryPuzzle(mode,level),[mode,level]);
  const remaining=Math.max(0,Math.ceil(((life.refillAt||0)-now)/1000));
  const available=getAdMobStatus().ready;
  function resetBoard(){
    setTrace([]);setBlocks(slide.blocks);setSelected('target');
    setReveal(true);setSeconds(5);setFeedback('');
  }
  function wrong(){
    if(life.remaining===0||victory)return;
    const r=Math.max(0,life.remaining-1);
    const next={remaining:r,refillAt:r===0?Date.now()+REFILL_MS:0};
    store('puzunivo-lives-'+game,next);setLife(next);
    setFeedback('Not quite! '+r+' '+(r===1?'life':'lives')+' remaining.');
    setTrace([]);setBlocks(slide.blocks);setSelected('target');setReveal(true);setSeconds(5);
  }
  function win(reason){
    if(life.remaining===0||victory)return;
    const old=Math.min(MAX_LEVEL,Math.max(1,Number(stored(key,1))||1));
    const unlock=Math.min(MAX_LEVEL,Math.max(old,level+1));
    store(key,unlock);
    setFeedback(reason);setVictory(true);
  }
  async function nextLevel(){
    if(adBusy)return;
    setAdBusy(true);
    try {
      // Interstitial appears only at a natural level transition, not on a wrong answer.
      if(level%3===0&&getAdMobStatus().ready) {
        try {await showInterstitialAd();} catch (error) {console.warn('Interstitial unavailable:',error?.message);}
      }
      if(level<MAX_LEVEL){setLevel(level+1);setVictory(false);setFeedback('');}
      else {setVictory(false);resetBoard();}
    }finally{setAdBusy(false);}
  }
  function chooseLine(node){
    if(trace.length===0&&node!==line.start){wrong();return;}
    const result=lineNext(line,trace,node);
    if(!result.ok){wrong();return;}
    if(result.complete){win('You connected every node using valid edges.');return;}
    setTrace(t=>[...t,node]);
  }
  function shift(amount){
    const moved=moveSlide(blocks,selected,amount);
    if(moved===blocks){setFeedback('This block cannot move there. Try a free space.');return;}
    setBlocks(moved);setFeedback('');
    if(slideWon(moved))win('Exit cleared! You moved the target block out.');
  }
  function chooseMemory(tile){
    if(reveal||victory)return;
    if(tile!==memory.sequence[trace.length]){wrong();return;}
    const newTrace=[...trace,tile];
    if(newTrace.length===memory.sequence.length)win('Perfect recall! Every tile was in the correct order.');
    else setTrace(newTrace);
  }
  async function rewardedAd(){
    if(!available||adBusy||life.remaining!==0)return;
    setAdBusy(true);
    setFeedback('');
    try {
      const result=await showRewardedAd({userId:user?.Id});
      if(result.earned&&result.source==='native-sdk') {
        // Non-cash, device-local gameplay refill only. Cloud XP/reward grants
        // require Google SSV and a durable single-use transaction verifier.
        const refreshed={remaining:MAX_LIVES,refillAt:0};
        store('puzunivo-lives-'+game,refreshed);
        setLife(refreshed);
        setFeedback('Rewarded ad completed. Your 3 local lives are restored.');
      } else {
        setFeedback('No earned-reward callback received. Your free refill timer remains active.');
      }
    }catch(error){
      setFeedback('Ad unavailable: '+(error?.message||'Try again later.')+' Your free refill timer remains active.');
    }finally{setAdBusy(false);}
  }
  const blockSize=100/6;
  const selectedBlock=blocks.find(block=>block.id===selected);
  const vertical=selectedBlock?.axis==='y';
  const canMoveBackward=moveSlide(blocks,selected,-1)!==blocks;
  const canMoveForward=moveSlide(blocks,selected,1)!==blocks;
  const count=mode==='Easy'?3:mode==='Medium'?4:5;
  return (
    <div className="pz-play min-h-screen px-3 py-5">
      <div className="pz-gameplay">
        <header className="mb-6 flex items-center justify-between">
          <Link to={'/levels?game='+game+'&mode='+mode} className="pz-button pz-button-secondary" style={{fontSize:12,minHeight:36,padding:'7px 12px'}}>← Levels</Link>
          <span className="pz-pill">{mode} · Level {level} / {MAX_LEVEL}</span>
        </header>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><p className="pz-eyebrow">BRAIN CHALLENGE ✦</p><h1 className="pz-section-title" style={{fontSize:28}}>{GAMES[game]}</h1></div>
          <div className="flex gap-2" aria-label={life.remaining+' lives remaining'}>
            {[1,2,3].map(x=><ApperIcon key={x} name="Heart" size={24} className={x<=life.remaining?'pz-heart':'pz-heart empty'}/>)}
          </div>
        </div>
        <section className="pz-game-panel">
          {life.remaining===0 ? (
            <div style={{padding:'23px 4px',textAlign:'center'}}>
              <div style={{fontSize:72}}>💔</div>
              <h2 className="pz-section-title" style={{color:'#ff7eaa',fontSize:34,marginTop:10}}>No Lives Left!</h2>
              <p className="pz-copy" style={{margin:'15px auto',maxWidth:330}}>All three chances are used. Restore lives after the free timer or watch a verified rewarded ad in the native app.</p>
              <div className="pz-result" style={{fontSize:24,margin:'20px 0'}}>❤️ ❤️ ❤️</div>
              <button disabled={!available||adBusy} onClick={rewardedAd} className="pz-button pz-button-yellow" style={{width:'100%'}}>{adBusy?'Loading rewarded ad…':'▶ Watch Ad to Restore 3 Lives'}</button>
              {!available&&<p className="pz-copy" style={{fontSize:12,marginTop:12}}>AdMob SDK is not available in this web build; ad rewards are disabled.</p>}
              <div className="pz-pill" style={{marginTop:20}}>FREE REFILL IN {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</div>
              <Link to="/games" className="pz-button pz-button-secondary" style={{width:'100%',marginTop:20}}>Maybe Later</Link>
            </div>
          ) : victory ? (
            <div style={{textAlign:'center',padding:'20px 6px'}}>
              <div style={{fontSize:70}}>🏆</div>
              <h2 className="pz-title" style={{fontSize:35}}>Level Complete!</h2>
              <div style={{fontSize:46,margin:'14px 0'}}>⭐ ⭐ ⭐</div>
              <div className="pz-result">{feedback}<p className="pz-copy" style={{fontSize:12,marginTop:10}}>Local level progress saved · XP and virtual coins require server verification</p></div>
              <button disabled={adBusy} onClick={nextLevel} className="pz-button" style={{width:'100%',marginTop:25}}>{level===MAX_LEVEL?'Replay':'Next Level →'}</button>
              <Link className="pz-button pz-button-secondary" style={{width:'100%',marginTop:12}} to="/games">All Games</Link>
            </div>
          ) : (
            <>
              {game==='number'&&(
                <>
                  <p className="pz-copy" style={{textAlign:'center'}}>Find the next number in the sequence</p>
                  <p className="pz-question">{number.series.join(' · ')} · ?</p>
                  <div className="pz-answer-grid">
                    {number.choices.map(x=><button key={x} onClick={()=>x===number.correct?win(number.explanation):wrong()}>{x}</button>)}
                  </div>
                </>
              )}
              {game==='line'&&(
                <>
                  <p className="pz-copy" style={{textAlign:'center'}}>Connect all dots without revisiting a dot. Follow the glowing lines.</p>
                  <div style={{position:'relative',width:'100%',maxWidth:380,aspectRatio:1,margin:'25px auto 15px',borderRadius:18,background:'#081a4c',border:'1px solid #336de2'}}>
                    <svg viewBox={'0 0 '+(line.size*80)+' '+(line.size*80)} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
                      {line.edges.map(([a,b],i)=>(
                        <line key={i} x1={40+(a%line.size)*80} y1={40+Math.floor(a/line.size)*80} x2={40+(b%line.size)*80} y2={40+Math.floor(b/line.size)*80} stroke="#20dff8" strokeWidth="4" opacity=".67" strokeLinecap="round"/>
                      ))}
                      {trace.slice(1).map((node,i)=>(
                        <line key={'tr'+i} x1={40+(trace[i]%line.size)*80} y1={40+Math.floor(trace[i]/line.size)*80} x2={40+(node%line.size)*80} y2={40+Math.floor(node/line.size)*80} stroke="#ffff8d" strokeWidth="8" strokeLinecap="round"/>
                      ))}
                    </svg>
                    {Array.from({length:line.size*line.size},(_,node)=>{
                      const left=(node%line.size+.5)/line.size*100,top=(Math.floor(node/line.size)+.5)/line.size*100;
                      const visited=trace.includes(node);
                      return <button key={node} onClick={()=>chooseLine(node)} aria-label={'Dot '+(node+1)} style={{position:'absolute',left:left+'%',top:top+'%',transform:'translate(-50%,-50%)',width:line.size===5?32:40,height:line.size===5?32:40,borderRadius:99,zIndex:3,background:visited?'#ffdd56':'linear-gradient(135deg,#21faff,#0373b9)',border:'3px solid #b8faff',boxShadow:'0 0 16px #22ffffa0',color:'#0c2c54',fontWeight:950,fontSize:12}}>{node===line.start?'▶':node===line.finish?'★':node+1}</button>;
                    })}
                  </div>
                  <p className="pz-copy" style={{textAlign:'center',fontSize:12}}>Start at ▶ · Reach ★ · {trace.length}/{line.size*line.size} dots connected</p>
                </>
              )}
              {game==='slide'&&(
                <>
                  <p className="pz-copy" style={{textAlign:'center'}}>Tap any block to select it. Move along its direction and clear the target's exit.</p>
                  <div style={{position:'relative',width:'100%',maxWidth:360,aspectRatio:1,margin:'24px auto',background:'#14265e',border:'5px solid #396bd2',borderRadius:16,overflow:'hidden'}}>
                    {Array.from({length:36},(_,i)=><div key={i} style={{position:'absolute',left:(i%6)*blockSize+'%',top:Math.floor(i/6)*blockSize+'%',width:blockSize+'%',height:blockSize+'%',border:'1px solid #3b5fa480'}}/>)}
                    {blocks.map(b=><button key={b.id} onClick={()=>setSelected(b.id)} aria-label={'Select '+b.id+' block'} style={{position:'absolute',left:b.x*blockSize+'%',top:b.y*blockSize+'%',width:b.w*blockSize+'%',height:b.h*blockSize+'%',borderRadius:9,border:selected===b.id?'3px solid white':'2px solid #fedc82',background:b.target?'linear-gradient(120deg,#ff3568,#f9924d)':b.id==='gate'?'linear-gradient(#ffbf4d,#ff772d)':'linear-gradient(#ffe59f,#bf853f)',boxShadow:selected===b.id?'0 0 20px #ffeb76': 'inset 0 4px 6px #fff6',display:'grid',placeItems:'center',fontSize:18,fontWeight:900,color:b.target?'white':'#582a10'}}>{b.target?'→':b.id==='gate'?'↕':''}</button>)}
                    <span style={{position:'absolute',right:0,top:2*blockSize+'%',height:blockSize+'%',width:5,background:'#32ffba',pointerEvents:'none'}}/>
                  </div>
                  <div style={{display:'flex',gap:13,justifyContent:'center'}}>
                    <button className="pz-button pz-button-secondary" disabled={!canMoveBackward} onClick={()=>shift(-1)}>{vertical ? "↑ Move Up" : "← Move Left"}</button>
                    <button className="pz-button" disabled={!canMoveForward} onClick={()=>shift(1)}>{vertical ? "↓ Move Down" : "Move Right →"}</button>
                  </div>
                  <p className="pz-copy" style={{textAlign:'center',fontSize:12,marginTop:15}}>Selected: {selected} · Move {vertical ? 'vertically' : 'horizontally'} · Tap another block to switch</p>
                </>
              )}
              {game==='memory'&&(
                <>
                  <p className="pz-copy" style={{textAlign:'center'}}>{reveal?'Memorize the numbered glowing tiles before they disappear.':'Repeat the exact tile order you memorized.'}</p>
                  {reveal&&<p className="pz-pill" style={{display:'flex',justifyContent:'center',margin:'15px auto',width:'max-content'}}>Memorize · {seconds}s</p>}
                  <div style={{display:'grid',gridTemplateColumns:'repeat('+count+',minmax(0,1fr))',gap:9,maxWidth:335,margin:'24px auto'}}>
                    {Array.from({length:count*count},(_,tile)=>{
                      const order=memory.sequence.indexOf(tile);
                      const chosen=trace.includes(tile);
                      return <button key={tile} aria-label={'Memory tile '+(tile+1)} disabled={reveal} onClick={()=>chooseMemory(tile)} style={{aspectRatio:1,borderRadius:12,border:'2px solid '+(order>=0&&reveal?'#ed8dff':'#3763b7'),background:chosen?'linear-gradient(#f77cf7,#8b2aff)':order>=0&&reveal?'linear-gradient(#e549f8,#742aea)':'linear-gradient(#1c326c,#121c48)',boxShadow:order>=0&&reveal?'0 0 19px #de43fb9a':'inset 0 2px 0 #ffffff18',fontWeight:1000,fontSize:24,color:'#fff'}}>{reveal&&order>=0?order+1:chosen?'✓':''}</button>;
                    })}
                  </div>
                  {reveal?<button className="pz-button" style={{width:'100%'}} onClick={()=>setReveal(false)}>I Remember · Play</button>:<p className="pz-copy" style={{textAlign:'center'}}>Correct tiles: {trace.length} / {memory.sequence.length}</p>}
                </>
              )}
              {feedback&&<p role="status" className="pz-result" style={{marginTop:18,fontSize:13}}>{feedback}</p>}
              <button onClick={resetBoard} className="pz-button pz-button-secondary" style={{width:'100%',marginTop:18}}>
                <ApperIcon name="RotateCcw" size={17}/> Restart Level
              </button>
            </>
          )}
        </section>
        <p className="pz-copy" style={{textAlign:'center',fontSize:11,marginTop:18}}>Play progress and lives are local to this device. Live reward SDK requires Android/iOS packaging; server-verified cloud rewards remain disabled.</p>
      </div>
    </div>
  );
}
