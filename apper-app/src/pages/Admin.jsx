import React from 'react';
import { Link } from 'react-router-dom';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import { StatsSkeleton } from '@/components/PageSkeleton';
import ApperIcon from '@/components/ApperIcon';
import AdminShell, { MetricCard } from '@/components/AdminShell';

export const route = { path: '/admin', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { icon: 'LayoutDashboard', label: 'Admin dashboard', section: 'Operations', profiles: ['Admin_c'], order: 10 };
const { eq } = window.ApperSDK.CoreSDK;

async function fetchRows(name, fields) {
  const response = await sdk.table(name).select(fields).page(1, 20).fetch();
  if (!response.success) throw new Error(response.message || 'Could not read records');
  return { rows: response.data, total: response.total };
}

export default function Admin() {
  const games = useFetch(() => fetchRows('games_c', ['Id', 'Name', 'code_c', 'status_c', 'target_levels_c']), []);
  const puzzles = useFetch(() => fetchRows('puzzles_c', ['Id', 'Name', 'status_c', 'difficulty_c']), []);
  const tickets = useFetch(() => fetchRows('support_tickets_c', ['Id', 'Name', 'status_c']), []);
  const published = useFetch(async () => {
    const result = await sdk.table('puzzles_c')
      .select(['Id'])
      .where(eq('status_c', 'Published'))
      .page(1, 1)
      .fetch();
    if (!result.success) throw new Error(result.message || 'Published count unavailable');
    return result.total;
  }, []);
  const loaded = games.data !== undefined && puzzles.data !== undefined && tickets.data !== undefined && published.data !== undefined;
  const errors = [games.error, puzzles.error, tickets.error, published.error].filter(Boolean);
  const gameRows = games.data?.rows ?? [];

  return (
    <AdminShell
      title="Overview"
      subtitle="Your game content and operational records. Metrics below reflect the connected environment, not fabricated player activity."
      action={<Link to="/admin/puzzles/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground"><ApperIcon name="Plus" size={17} /> Add puzzle</Link>}
    >
      {errors.length > 0 && (
        <div role="alert" className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {errors.map(e => String(e)).join(' | ')}
          <button onClick={() => { games.run(); puzzles.run(); tickets.run(); published.run(); }} className="ml-4 font-bold underline">Retry</button>
        </div>
      )}
      {!loaded && !errors.length ? <StatsSkeleton count={4} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="Gamepad2" label="Games" value={games.data?.total ?? "—"} description="Game catalog records" />
          <MetricCard icon="BrainCircuit" label="Puzzles" value={puzzles.data?.total ?? "—"} description="Puzzle Studio records" />
          <MetricCard icon="BadgeCheck" label="Published" value={published.data ?? "—"} description="Approved puzzle content" />
          <MetricCard icon="Headset" label="Tickets" value={tickets.data?.total ?? "—"} description="Player support requests" />
        </div>
      )}
      <div className="mt-7 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-black">Game Library</h2>
            <Link to="/admin/games" className="text-xs font-black text-primary">Manage games →</Link>
          </div>
          {gameRows.length ? gameRows.map((game, index) => (
            <div key={game.Id} className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <ApperIcon name={['Hash', 'Route', 'PanelsTopLeft', 'Grid3X3'][index % 4]} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{game.Name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{game.target_levels_c ?? 0} planned levels</p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-black">{game.status_c}</span>
            </div>
          )) : <p className="text-sm text-muted-foreground">No game records have been created.</p>}
        </section>
        <section className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-7">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/20 text-primary">
            <ApperIcon name="Sparkles" size={29} />
          </span>
          <h2 className="mt-6 font-heading text-3xl font-black">Puzzle Studio</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Create, edit, review and publish the challenges that power PUZUNIVO.</p>
          <Link to="/admin/puzzles" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">
            Open Puzzle Studio
            <ApperIcon name="ArrowRight" size={17} />
          </Link>
          <p className="mt-7 text-xs text-muted-foreground">Live Apper database is connected. Player scoring and rewards still require secure backend verification.</p>
        </section>
      </div>
    </AdminShell>
  );
}
