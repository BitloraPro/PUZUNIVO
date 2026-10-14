import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import { toast } from 'sonner';
import AdminShell from '@/components/AdminShell';
import { ListSkeleton } from '@/components/PageSkeleton';
import { MODES, numberPuzzle } from '@/lib/puzunivoPuzzles';

export const route = { path: '/admin/puzzles', layout: 'owner', access: "profile === 'Admin_c'" };
const FIELDS = ['Id','Name','game_c','difficulty_c','level_c','question_c','options_c','correct_answer_c','explanation_c','status_c','version_c'];
const { contains, eq } = window.ApperSDK.CoreSDK;
export default function AdminPuzzles() {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('All');
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const { data, loading, error, run } = useFetch(async () => {
    let q = sdk.table('puzzles_c').select(FIELDS);
    if (search) q = q.where(contains('Name', search));
    if (mode !== 'All') q = q.where(eq('difficulty_c', mode));
    const result = await q.orderBy('level_c').page(page, 25).fetch();
    if (!result.success) throw new Error(result.message || 'Puzzle retrieval failed');
    return { rows: result.data, total: result.total, hasMore: result.hasMore };
  }, [search, mode, page]);
  const rows = data?.rows ?? [];

  async function generateNumberSeriesDrafts() {
    if (generating) return;
    setGenerating(true);

    try {
      const catalog = await sdk.table('games_c')
        .select(['Id', 'Name', 'code_c'])
        .where(eq('code_c', 'number'))
        .page(1, 10)
        .fetch();

      if (!catalog.success) throw new Error(catalog.message || 'Could not read the game catalog.');

      const game = catalog.data.find(item => item.code_c === 'number');
      if (!game) {
        throw new Error('Number Series does not exist yet. Initialize it in Game Manager first.');
      }

      const existing = new Set();
      let cursor = 1;

      while (cursor <= 100) {
        const chunk = await sdk.table('puzzles_c')
          .select(['Id', 'Name', 'game_c', 'difficulty_c', 'level_c'])
          .page(cursor, 50)
          .fetch();

        if (!chunk.success) throw new Error(chunk.message || 'Unable to check existing puzzle levels.');

        for (const entry of chunk.data) {
          if (String(entry.game_c?.Id ?? entry.game_c) === String(game.Id)) {
            existing.add(entry.difficulty_c + ':' + entry.level_c);
          }
        }

        if (!chunk.hasMore || !chunk.data.length) break;
        cursor += 1;
      }

      const drafts = [];

      for (const difficulty of MODES) {
        for (let level = 1; level <= 30; level += 1) {
          if (existing.has(difficulty + ':' + level)) continue;

          const puzzle = numberPuzzle(difficulty, level);
          drafts.push({
            Name: 'Number Series · ' + difficulty + ' · ' + String(level).padStart(2, '0'),
            game_c: game.Id,
            difficulty_c: difficulty,
            level_c: level,
            question_c: puzzle.series.join(', ') + ', ?',
            options_c: JSON.stringify(puzzle.choices),
            correct_answer_c: String(puzzle.correct),
            explanation_c: puzzle.explanation,
            status_c: 'Draft',
            version_c: 1,
          });
        }
      }

      if (!drafts.length) {
        toast.info('All 90 Number Series levels already exist. No duplicates added.');
        return;
      }

      let created = 0;
      for (let i = 0; i < drafts.length; i += 15) {
        const result = await sdk.table('puzzles_c').create(drafts.slice(i, i + 15));
        created += result.data?.length ?? 0;

        if (!result.data?.length || result.data.length < Math.min(15, drafts.length - i)) {
          throw new Error(result.messages?.[0] || result.message || 'Some puzzle drafts were not saved.');
        }
      }

      toast.success(created + ' unique Number Series drafts created for editorial review.');
      setPage(1);
      run();
    } catch (error) {
      toast.error(error.message || 'Unable to generate puzzle drafts. Existing records were preserved.');
      run();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AdminShell title="Puzzle Studio" subtitle="Manage questions, validate answer options and publish reviewed content." action={
      <Link to="/admin/puzzles/new" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">+ Create puzzle</Link>
    }>
      <div className="pz-admin-panel" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h2>Number Series · 90 Level Drafts</h2>
          <p className="pz-copy" style={{ fontSize: 12 }}>
            Create missing Easy, Medium and Hard questions from the existing puzzle engine.
            Existing records stay unchanged, and all new content begins as Draft for review.
          </p>
        </div>
        <button
          type="button"
          className="pz-button"
          disabled={generating}
          onClick={generateNumberSeriesDrafts}
        >
          {generating ? 'Checking & saving…' : 'Generate Missing Drafts'}
        </button>
      </div>
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap gap-3">
          <input aria-label="Search puzzles" placeholder="Search puzzle..." value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} className="min-h-11 flex-1 rounded-xl border border-input bg-background px-4 text-sm" />
          <select aria-label="Difficulty" value={mode} onChange={e => {setMode(e.target.value);setPage(1);}} className="min-h-11 rounded-xl border border-input bg-background px-4 text-sm">
            {['All','Easy','Medium','Hard'].map(x => <option key={x}>{x}</option>)}
          </select>
          <button onClick={run} className="rounded-xl border border-border px-4 text-sm font-bold">Refresh</button>
        </div>
        {loading && data === undefined ? <ListSkeleton rows={6} /> : error ? <p role="alert" className="text-destructive">{String(error)} <button type="button" className="font-bold underline" onClick={run}>Retry</button></p> :
          !rows.length ? <p className="rounded-xl bg-muted p-6 text-sm text-muted-foreground">No puzzles found. Create a new question to get started.</p> :
          <div className="space-y-3" aria-busy={loading}>
            {rows.map(item => (
              <Link key={item.Id} to={'/admin/puzzles/' + item.Id} className="flex flex-wrap items-center gap-4 rounded-2xl border-l-4 border-primary bg-muted/40 p-4 transition hover:bg-accent">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{item.Name}</h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{item.question_c}</p>
                </div>
                <span className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary">{item.difficulty_c} · Level {item.level_c}</span>
                <span className="rounded-lg border border-border px-3 py-2 text-xs font-bold">{item.status_c}</span>
              </Link>
            ))}
          </div>}
        <div className="mt-7 flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page} · {data?.total ?? 0} matching</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={()=>setPage(n=>n-1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Previous</button>
            <button disabled={!data?.hasMore} onClick={()=>setPage(n=>n+1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
