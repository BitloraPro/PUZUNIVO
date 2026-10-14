import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {sdk} from '@/services/sdk';
import {useFetch} from '@/hooks/useFetch';
import {useSelector} from 'react-redux';
import {toast} from 'sonner';
import ApperIcon from '@/components/ApperIcon';
import PuzunivoShell,{SectionHeading} from '@/components/PuzunivoShell';

export const route={path:'/support',layout:'public',access:'public'};
const CATEGORIES=['Gameplay','PuzzleError','Account','Purchase','Other'];
export default function Support(){
 const user=useSelector(s=>s.user.user);
 const [category,setCategory]=useState('Gameplay');
 const [subject,setSubject]=useState('');
 const [description,setDescription]=useState('');
 const [saving,setSaving]=useState(false);
 const {data,loading,error,run}=useFetch(async()=>{
   if(!user)return [];
   const r=await sdk.table('support_tickets_c').select(['Id','Name','category_c','message_c','status_c','reply_c','CreatedOn']).orderByDesc('CreatedOn').page(1,30).fetch();
   if(!r.success)throw new Error(r.message||'Could not load your tickets');
   return r.data;
 },[user?.Id]);
 async function submit(e){
   e.preventDefault();
   if(!user){toast.error('Sign in to open a support ticket');return;}
   if(subject.trim().length<5||description.trim().length<15){toast.error('Enter a clear subject and description');return;}
   setSaving(true);
   try{
     const r=await sdk.table('support_tickets_c').create({
       Name:subject.trim(),category_c:category,message_c:description.trim(),status_c:'Open'
     });
     if(!r.data?.length)throw new Error(r.messages?.[0]||r.message||'Ticket creation failed');
     toast.success('Your support ticket was created');
     setSubject('');setDescription('');run();
   }catch(e){toast.error(e.message);}finally{setSaving(false);}
 }
 return <PuzunivoShell pageTitle="Help & Support">
  <SectionHeading eyebrow="WE'RE HERE TO HELP" title="Help & Support"/>
  {!user?<div className="pz-card"><h2 className="pz-section-title">Sign in for support</h2><p className="pz-copy" style={{margin:'14px 0'}}>Your tickets will be linked to your player account.</p><Link className="pz-button" to="/player/login">Sign in</Link></div>:
  <div style={{display:'grid',gap:20}}>
   <form onSubmit={submit} className="pz-card" style={{display:'grid',gap:14}}>
    <h2 className="pz-section-title">Create a ticket</h2>
    <label>Issue category
     <select className="pz-input" style={{display:'block',width:'100%',padding:12,marginTop:7}} value={category} onChange={e=>setCategory(e.target.value)}>
      {CATEGORIES.map(x=><option key={x}>{x}</option>)}
     </select>
    </label>
    <label>Subject
     <input value={subject} onChange={e=>setSubject(e.target.value)} required minLength={5} maxLength={120} placeholder="What went wrong?" style={{display:'block',width:'100%',padding:12,marginTop:7}}/>
    </label>
    <label>Describe the problem
     <textarea value={description} onChange={e=>setDescription(e.target.value)} required minLength={15} maxLength={3000} rows={5} placeholder="Include game name, level and what happened..." className="pz-input" style={{display:'block',width:'100%',padding:12,marginTop:7}}/>
    </label>
    <button type="submit" disabled={saving} className="pz-button">{saving?'Sending…':'Submit ticket'}</button>
   </form>
   <section className="pz-card">
    <h2 className="pz-section-title" style={{marginBottom:16}}>My tickets</h2>
    {loading&&data===undefined?<p className="pz-copy">Loading your tickets…</p>:error?<p role="alert">{String(error)}</p>:!(data??[]).length?<p className="pz-copy">No tickets yet.</p>:(data??[]).map(item=>(
      <div key={item.Id} className="pz-admin-row" style={{display:'block'}}>
       <div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{item.Name}</strong><span className="pz-admin-tag">{item.status_c}</span></div>
       <p className="pz-copy" style={{fontSize:12,marginTop:8}}>{item.message_c}</p>
       {item.reply_c&&<p style={{background:'#0c3260',borderRadius:10,padding:12,marginTop:9,fontSize:12}}>Support reply: {item.reply_c}</p>}
      </div>
    ))}
   </section>
  </div>}
 </PuzunivoShell>;
}