import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ApperIcon from '@/components/ApperIcon';
import PuzunivoShell, { GlowCard, SectionHeading } from '@/components/PuzunivoShell';

export const route = { path: '/profile', layout: 'public', access: 'public' };

export default function Profile() {
  const user = useSelector(state => state.user.user);
  return (
    <PuzunivoShell pageTitle="Player profile">
      <SectionHeading eyebrow="A PLACE FOR YOUR JOURNEY" title="My Profile" />
      <GlowCard className="border-primary/25 bg-gradient-to-br from-primary/15 to-card p-7 sm:p-9">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <span className="grid size-23 place-items-center rounded-3xl border border-primary/30 bg-primary/15 text-primary">
            <ApperIcon name="UserRound" size={42} />
          </span>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-primary">{user ? 'PLAYER ACCOUNT' : 'GUEST PLAYER'}</p>
            <h1 className="mt-2 font-heading text-3xl font-black">{user?.Name || 'Hello, puzzle explorer!'}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{user ? 'Your Apper account is signed in.' : 'You can play locally as a guest, or sign in to access your account.'}</p>
          </div>
          {!user && <Link to="/player/login" className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground">Sign in</Link>}
        </div>
      </GlowCard>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Link to="/rewards" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:bg-accent">
          <span className="grid size-12 place-items-center rounded-xl bg-highlight/15 text-highlight"><ApperIcon name="Trophy" /></span>
          <span className="flex-1 font-extrabold">My progress</span>
          <ApperIcon name="ArrowRight" size={18} />
        </Link>
        <Link to="/games" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:bg-accent">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary"><ApperIcon name="Gamepad2" /></span>
          <span className="flex-1 font-extrabold">Browse games</span>
          <ApperIcon name="ArrowRight" size={18} />
        </Link>
      </div>
      <p className="mt-7 text-sm text-muted-foreground">Progress currently lives on this device. Cloud syncing and account deletion workflows will be enabled only after verified live database integration.</p>
      <Link to="/support" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-accent"><ApperIcon name="Headset" size={18}/> Help & Support</Link>
      {user?.profile === 'Admin_c' && <Link to="/admin" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-accent"><ApperIcon name="Shield" size={18} /> Admin dashboard (authorized accounts only)</Link>}
    </PuzunivoShell>
  );
}
