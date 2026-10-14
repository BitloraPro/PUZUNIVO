import React from 'react';
import {sdk} from '@/services/sdk';
import {useFetch} from '@/hooks/useFetch';
import AdminShell from '@/components/AdminShell';
export const route={path:'/admin/rewards',layout:'owner',access:"profile === 'Admin_c'"};
export default function AdminRewards(){
 const {data,loading,error,run}=useFetch(async()=>{
  const [r,l]=await Promise.all([
   sdk.table('reward_events_c').select(['Id','Name','Owner','kind_c','game_c','xp_delta_c','coins_delta_c','status_c','CreatedOn']).orderByDesc('CreatedOn').page(1,50).fetch(),
   sdk.table('player_lives_c').select(['Id','Name','Owner','game_c','remaining_c','refill_at_c']).page(1,50).fetch()
  ]);
  if(!r.success||!l.success)throw new Error(r.message||l.message||'Failed to load reward records');
  return {rewards:r.data,lives:l.data};
 },[]);
 return <AdminShell title="Rewards & Lives" subtitle="Read-only audit of database-backed player rewards and lives; unsafe manual balance grants are disabled.">
  <div style={{display:'grid',gap:17}}>
   <div className="pz-admin-panel"><div style={{display:'flex',justifyContent:'space-between',gap:10}}><h2>Reward Event Audit · {data?.rewards?.length??0}</h2><button className="pz-button pz-button-secondary" onClick={run}>Refresh</button></div>
    {error?<p role="alert">{String(error)}</p>:loading&&data===undefined?<p>Loading…</p>:!(data?.rewards?.length)?<p className="pz-copy">No verified reward records yet.</p>:<div style={{overflowX:'auto'}}><table><thead><tr><th>Event</th><th>Player</th><th>Type</th><th>XP</th><th>Coins</th><th>Status</th></tr></thead><tbody>{data.rewards.map(r=><tr key={r.Id}><td>{r.Name}</td><td>{r.Owner?.Name||'—'}</td><td>{r.kind_c}</td><td>{r.xp_delta_c}</td><td>{r.coins_delta_c}</td><td>{r.status_c}</td></tr>)}</tbody></table></div>}
   </div>
   <div className="pz-admin-panel"><h2>Player Lives · {data?.lives?.length??0}</h2>{!(data?.lives?.length)?<p className="pz-copy">No cloud life records yet; local preview lives are not included.</p>:<div style={{overflowX:'auto'}}><table><thead><tr><th>Player</th><th>Game</th><th>Hearts</th><th>Refill eligible</th></tr></thead><tbody>{data.lives.map(r=><tr key={r.Id}><td>{r.Owner?.Name||'—'}</td><td>{r.game_c?.Name||'—'}</td><td>{r.remaining_c}</td><td>{r.refill_at_c?new Date(r.refill_at_c).toLocaleString():'—'}</td></tr>)}</tbody></table></div>}</div>
  </div>
 </AdminShell>;
}