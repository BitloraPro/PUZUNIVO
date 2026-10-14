import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import ApperIcon from '@/components/ApperIcon';
import PuzunivoShell, { SectionHeading } from '@/components/PuzunivoShell';

export const route = { path: '/challenges', layout: 'public', access: 'public' };

function todayLocal() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}

export default function Challenges() {
  const user = useSelector(state => state.user.user);
  const { data, loading, error, run } = useFetch(async () => {
    if (!user) return null;
    const r = await sdk.table('daily_challenges_c')
      .select(['Id', 'Name', 'challenge_date_c', 'puzzle_c', 'status_c', 'reward_xp_c'])
      .orderByDesc('challenge_date_c').page(1, 90).fetch();
    if (!r.success) throw new Error(r.message || 'Daily challenges unavailable');
    const today = todayLocal();
    return r.data.find(row => row.status_c === 'Published'
      && row.challenge_date_c?.slice(0,10) === today) || null;
  }, [user?.Id]);

  return (
    <PuzunivoShell pageTitle="Daily Challenge">
      <SectionHeading eyebrow="A LITTLE EVERY DAY ✦" title="Daily Brain Challenge" />
      <div className="pz-hero" style={{ marginBottom: 20, minHeight: 250 }}>
        <div className="pz-hero-copy" style={{ maxWidth: '100%' }}>
          <span className="pz-pill"><ApperIcon name="Flame" size={16} /> TODAY'S CHALLENGE</span>
          <h1 className="pz-title" style={{ maxWidth: 520 }}>
            A fresh reason to <span className="pz-gradient-text">think.</span>
          </h1>
          <p className="pz-copy">A new puzzle challenge can be published each day by the PUZUNIVO Admin.</p>
        </div>
        <ApperIcon name="CalendarDays" size={90} className="hidden text-primary opacity-70 sm:block" />
      </div>
      {!user ? (
        <section className="pz-card">
          <h2 className="pz-section-title">Sign in to see official challenges</h2>
          <p className="pz-copy" style={{ margin: '12px 0 18px' }}>
            Challenge schedules are stored in the connected Apper database for registered players.
          </p>
          <Link className="pz-button" to="/player/login">Sign in</Link>
        </section>
      ) : loading && data === undefined ? (
        <section className="pz-card"><p className="pz-copy">Checking today's published challenge…</p></section>
      ) : error ? (
        <section className="pz-card">
          <p role="alert" className="pz-copy">Could not load today's challenge: {String(error)}</p>
          <button className="pz-button pz-button-secondary" onClick={run} style={{ marginTop: 12 }}>Retry</button>
        </section>
      ) : data ? (
        <section className="pz-card">
          <span className="pz-pill">PUBLISHED • {data.challenge_date_c?.slice(0,10)}</span>
          <h2 className="pz-section-title" style={{ marginTop: 16 }}>{data.Name}</h2>
          <p className="pz-copy" style={{ margin: '12px 0' }}>
            Puzzle: {data.puzzle_c?.Name || 'Selected game puzzle'}.
            Proposed XP: {data.reward_xp_c ?? 0}. XP is not awarded until secure server-side completion verification is enabled.
          </p>
          <p className="pz-copy" style={{ fontSize: 12 }}>
            The official scheduled question is protected by Admin-only content access.
            Practice below does not complete or award this daily challenge.
          </p>
        </section>
      ) : (
        <section className="pz-card">
          <span className="pz-pill">NOT SCHEDULED</span>
          <h2 className="pz-section-title" style={{ marginTop: 15 }}>No official challenge today</h2>
          <p className="pz-copy" style={{ marginTop: 9 }}>
            There isn't a published daily challenge for {todayLocal()}. Check again after Admin schedules one.
          </p>
        </section>
      )}
      <section className="pz-card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span className="pz-quick-icon"><ApperIcon name="BrainCircuit" size={27} /></span>
          <div>
            <h3 className="pz-section-title" style={{ fontSize: 21 }}>Keep your brain active</h3>
            <p className="pz-copy" style={{ fontSize: 12 }}>Try the Number Series practice game.</p>
          </div>
        </div>
        <Link className="pz-button" style={{ marginTop: 19 }} to="/play?game=number&mode=Medium">
          Start practice <ApperIcon name="ArrowRight" size={16} />
        </Link>
      </section>
    </PuzunivoShell>
  );
}
