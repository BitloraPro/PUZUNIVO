import React,{useState} from 'react';
import {sdk} from '@/services/sdk';
import {useFetch} from '@/hooks/useFetch';
import {toast} from 'sonner';
import AdminShell from '@/components/AdminShell';
export const route={path:'/admin/support',layout:'owner',access:"profile === 'Admin_c'"};
const STATUSES=['Open','In Progress','Resolved','Closed'];
export default function AdminSupport(){
 const [filter,setFilter]=useState('All');
 const [editing,setEditing]=useState(null);
 const [reply,setReply]=useState('');
 const [status,setStatus]=useState('Open');
 const [busy,setBusy]=useState(false);
 const {data,loading,error,run}=useFetch(async()=>{
  const r=await sdk.table('support_tickets_c').select(['Id','Name','Owner','category_c','message_c','status_c','reply_c','CreatedOn']).orderByDesc('CreatedOn').page(1,100).fetch();
  if(!r.success)throw new Error(r.message||'Could not fetch tickets');
  return r.data;
 },[]);
 const rows=(data??[]).filter(t=>filter==='All'||t.status_c===filter);
 async function save(e){
  e.preventDefault();if(!editing)return;
  setBusy(true);
  try{
   const r=await sdk.table('support_tickets_c').update({Id:editing.Id,status_c:status,reply_c:reply.trim()});
   if(!r.data?.length)throw new Error(r.messages?.[0]||r.message||'Ticket update failed');
   toast.success('Ticket updated');setEditing(null);run();
  }catch(e){toast.error(e.message);}finally{setBusy(false);}
 }
 return <AdminShell title="Support Tickets" subtitle="Real player requests with owner-scoped access and Admin response controls.">
  <div className="pz-admin-panel">
   <div style={{display:'flex',gap:10,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',marginBottom:18}}>
    <h2>Support inbox · {data?.length??0}</h2>
    <div style={{display:'flex',gap:8}}><select value={filter} onChange={e=>setFilter(e.target.value)} className="pz-input" style={{padding:9}}>{['All',...STATUSES].map(s=><option key={s}>{s}</option>)}</select><button className="pz-button pz-button-secondary" onClick={run}>Refresh</button></div>
   </div>
   {loading&&data===undefined?<p>Loading tickets…</p>:error?<p role="alert">{String(error)}</p>:rows.length===0?<p className="pz-copy">No matching tickets in the live database.</p>:rows.map(t=><div key={t.Id} className="pz-admin-row" style={{alignItems:'flex-start'}}>
    <div style={{flex:1,minWidth:0}}>
     <strong>{t.Name}</strong><span className="pz-admin-tag" style={{marginLeft:8}}>{t.status_c}</span>
     <p className="pz-copy" style={{fontSize:12,marginTop:6}}>{t.category_c} · {t.Owner?.Name||'Player'}</p>
     <p className="pz-copy" style={{fontSize:12,marginTop:6,whiteSpace:'pre-wrap'}}>{t.message_c}</p>
     {t.reply_c&&<p className="pz-copy" style={{fontSize:12,marginTop:6}}>Reply: {t.reply_c}</p>}
    </div>
    <button className="pz-button pz-button-secondary" style={{fontSize:12,padding:'8px 12px'}} onClick={()=>{setEditing(t);setStatus(t.status_c);setReply(t.reply_c||'');}}>Respond</button>
   </div>)}
  </div>
  {editing&&<form onSubmit={save} className="pz-admin-panel" style={{marginTop:18,display:'grid',gap:13}}>
    <h2>Respond to {editing.Name}</h2>
    <label>Ticket status<select className="pz-input" value={status} onChange={e=>setStatus(e.target.value)} style={{display:'block',width:'100%',padding:11,marginTop:6}}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Reply<textarea className="pz-input" value={reply} onChange={e=>setReply(e.target.value)} rows={4} maxLength={4000} placeholder="Write a helpful reply…" style={{display:'block',width:'100%',padding:11,marginTop:6}}/></label>
    <div style={{display:'flex',gap:9}}><button type="submit" className="pz-button" disabled={busy}>{busy?'Saving…':'Save response'}</button><button type="button" className="pz-button pz-button-secondary" onClick={()=>setEditing(null)}>Cancel</button></div>
  </form>}
 </AdminShell>;
}