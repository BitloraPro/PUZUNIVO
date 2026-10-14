import React from 'react';
import {sdk} from '@/services/sdk';
import {useFetch} from '@/hooks/useFetch';
import AdminShell from '@/components/AdminShell';
export const route={path:'/admin/analytics',layout:'owner',access:"profile === 'Admin_c'"};
const config=[
 ['games_c','Games','Gamepad2'],
 ['puzzles_c','Puzzle content','BrainCircuit'],
 ['player_progress_c','Player progress records','TrendingUp'],
 ['player_lives_c','Life records','Heart'],
 ['reward_events_c','Verified reward records','Gift'],
 ['daily_challenges_c','Daily challenges','CalendarDays'],
 ['support_tickets_c','Support tickets','Headset'],
];
export default function AdminAnalytics(){
 const {data,loading,error,run}=useFetch(async()=>{
  const answers=await Promise.allSettled(config.map(async ([name])=>{
   const r=await sdk.table(name).select(['Id']).page(1,1).fetch();
   if(!r.success)throw new Error(r.message||name+' unavailable');
   return r.total??r.data.length;
  }));
  return config.map((c,i)=>({name:c[1],icon:c[2],count:answers[i].status==='fulfilled'?answers[i].value:null}));
 },[]);
 return <AdminShell title="Analytics" subtitle="Actual database record counts, not predicted or fabricated engagement statistics.">
   <div className="pz-metrics">
    {(data??config.map(c=>({name:c[1],icon:c[2],count:null}))).map(r=><div key={r.name} className="pz-metric">
      <strong>{r.count===null?'—':r.count}</strong><p>{r.name}</p>
    </div>)}
   </div>
   {loading&&<p className="pz-copy">Refreshing live counts…</p>}
   {error&&<p role="alert">{String(error)}</p>}
   <div className="pz-admin-panel"><h2>Reporting integrity</h2><p className="pz-copy">Active players, retention and play time will appear only after secure gameplay events are recorded. This dashboard deliberately does not invent player growth or revenue charts.</p><button className="pz-button pz-button-secondary" style={{marginTop:15}} onClick={run}>Refresh counts</button></div>
 </AdminShell>;
}