import React from 'react';
import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import PuzunivoShell, { GlowCard, SectionHeading } from '@/components/PuzunivoShell';

export const route = { path: '/rewards', layout: 'public', access: 'public' };

export default function Rewards() {
  const games = [
    { id: 'number', title: 'Number Series' },
    { id: 'line', title: 'One-Line Logic' },
    { id: 'slide', title: 'Slide & Escape' },
    { id: 'memory', title: 'Memory Pattern' },
  ];
  const levels = [];
  for (const game of games) {
    for (const mode of ['Easy', 'Medium', 'Hard']) {
      let level = 1;
      try {
        level = Number(JSON.parse(localStorage.getItem('puzunivo-progress-' + game.id + '-' + mode))) || 1;
      } catch {
        level = 1;
      }
      levels.push({ name: game.title, mode, completed: Math.max(0, level - 1) });
    }
  }
  const completed = levels.reduce((sum, item) => sum + item.completed, 0);
  return (
    <PuzunivoShell pageTitle="Player progress">
      <SectionHeading eyebrow="YOUR PUZZLE JOURNEY" title="Progress & Rewards" />
      <div className="grid gap-4 sm:grid-cols-2">
        <GlowCard className="border-highlight/20 bg-gradient-to-br from-highlight/20 to-card">
          <ApperIcon name="Trophy" size={35} className="text-highlight" />
          <p className="mt-5 font-heading text-4xl font-black">{completed}</p>
          <p className="mt-2 text-sm text-muted-foreground">Levels completed on this device</p>
        </GlowCard>
        <GlowCard className="border-primary/20 bg-gradient-to-br from-primary/20 to-card">
          <ApperIcon name="Sparkles" size={35} className="text-primary" />
          <p className="mt-5 font-heading text-2xl font-black">New challenges ahead</p>
          <p className="mt-2 text-sm text-muted-foreground">XP, virtual coins, and achievements require verified cloud rewards and are not fabricated here.</p>
        </GlowCard>
      </div>
      <div className="mt-7 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-heading text-2xl font-black">Your level history</h2>
        <div className="mt-5 space-y-3">
          {levels.map(item => (
            <div key={item.name + item.mode} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
              <span>{item.name} <span className="text-muted-foreground">· {item.mode}</span></span>
              <strong className="font-extrabold">{item.completed} complete</strong>
            </div>
          ))}
        </div>
      </div>
    </PuzunivoShell>
  );
}
