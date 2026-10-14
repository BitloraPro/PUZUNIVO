import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import './puzunivo-neon.css';
export const ADMIN_LINKS=[
 {to:'/admin',label:'Overview',icon:'LayoutDashboard',end:true},
 {to:'/admin/games',label:'Game Manager',icon:'Gamepad2'},
 {to:'/admin/puzzles',label:'Puzzle Studio',icon:'BrainCircuit'},
 {to:'/admin/challenges',label:'Daily Challenges',icon:'CalendarDays'},
 {to:'/admin/players',label:'Players',icon:'Users'},
 {to:'/admin/rewards',label:'Rewards & Lives',icon:'Heart'},
 {to:'/admin/analytics',label:'Analytics',icon:'ChartColumn'},
 {to:'/admin/support',label:'Support',icon:'Headset'},
 {to:'/admin/settings',label:'Settings',icon:'Settings'},
];
export function MetricCard({icon,label,value,description}){
 return <div className="pz-metric">
  <span className="pz-metric-icon"><ApperIcon name={icon} size={23}/></span>
  <strong>{value}</strong>
  <p style={{fontWeight:900}}>{label}</p>
  <p style={{marginTop:3,opacity:.65}}>{description}</p>
 </div>;
}
export default function AdminShell({title,subtitle,action,children}){
 return (
  <div className="pz-admin-root">
   <div className="pz-neon-header" style={{position:'relative'}}>
    <div className="pz-neon-header-inner" style={{maxWidth:'none'}}>
     <Link to="/admin" className="pz-logo"><span className="pz-logo-brain"><ApperIcon name="BrainCircuit" size={30}/></span><span>PUZUNIVO<small>ADMIN CONTROL CENTER</small></span></Link>
     <span style={{color:'#a7c2f8',fontSize:13}}>✦ <span style={{color:'#61dfff'}}>Think.</span> Play. Discover.</span>
     <Link to="/games" className="pz-button pz-button-secondary" style={{padding:'7px 12px',minHeight:38,fontSize:12}}>Player App ↗</Link>
    </div>
   </div>
   <div className="pz-admin-grid">
    <aside className="pz-admin-sidebar">
     <h4>GAME MANAGEMENT</h4>
     {ADMIN_LINKS.slice(0,4).map(item=><NavLink key={item.to} to={item.to} end={item.end}><ApperIcon name={item.icon} size={20}/>{item.label}</NavLink>)}
     <h4>USER MANAGEMENT</h4>
     {ADMIN_LINKS.slice(4,6).map(item=><NavLink key={item.to} to={item.to}><ApperIcon name={item.icon} size={20}/>{item.label}</NavLink>)}
     <h4>ANALYTICS & SUPPORT</h4>
     {ADMIN_LINKS.slice(6).map(item=><NavLink key={item.to} to={item.to}><ApperIcon name={item.icon} size={20}/>{item.label}</NavLink>)}
    </aside>
    <div className="pz-admin-content">
     <nav style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:14}} className="lg:hidden">
      {ADMIN_LINKS.map(item=><NavLink key={item.to} to={item.to} end={item.end} style={({isActive})=>({padding:'8px 10px',borderRadius:9,background:isActive?'#722ce6':'#112d61',border:'1px solid #3e59a2',color:'white',fontSize:11})}>{item.label}</NavLink>)}
     </nav>
     <div className="pz-admin-hero">
      <div>
       <span className="pz-eyebrow">OPERATIONS DASHBOARD ✦</span>
       <h1>{title}</h1>
       <p>{subtitle||'Manage your puzzle universe.'}</p>
      </div>
      {action || <span style={{fontSize:45}}>🧠✨</span>}
     </div>
     <div style={{marginTop:18}}>{children}</div>
    </div>
   </div>
  </div>
 );
}