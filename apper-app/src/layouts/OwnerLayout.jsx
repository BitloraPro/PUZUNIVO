import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useOwnerLayoutData } from '@/hooks/useOwnerLayoutData';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import UserMenu from '@/components/UserMenu';
import ApperIcon from '@/components/ApperIcon';

export default function OwnerLayout(){
  const { user,logout,homeRoute,navItems,initials,displayName,counts }=useOwnerLayoutData();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link to={homeRoute||'/admin'} className="flex items-center gap-2 text-xl font-black"><ApperIcon name="BrainCircuit" className="text-primary"/> PUZUNIVO</Link>
          <nav className="flex gap-4">{navItems.map(item=><NavLink to={item.to} key={item.to} className={({isActive})=>isActive?'border-b-2 border-highlight pb-1 font-bold':'text-muted-foreground'}>{item.label}</NavLink>)}</nav>
          <UserMenu user={user} logout={logout} initials={initials} displayName={displayName}/>
        </div>
      </header>
      <main className="mx-auto max-w-7xl"><ErrorBoundary><Outlet/></ErrorBoundary></main>
    </div>
  );
}