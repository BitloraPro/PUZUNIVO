import React, { useState } from 'react';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import { toast } from 'sonner';
import AdminShell from '@/components/AdminShell';

export const route = { path: '/admin/challenges', layout: 'owner', access: "profile === 'Admin_c'" };
const STATUS = ['Draft', 'Scheduled', 'Published', 'Expired'];
function todayLocal() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}
const EMPTY = {
  Name: '',
  puzzle_c: '',
  challenge_date_c: todayLocal(),
  status_c: 'Draft',
  reward_xp_c: 40,
};

export default function AdminChallenges() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, run } = useFetch(async () => {
    const r = await sdk.table('daily_challenges_c')
      .select(['Id', 'Name', 'puzzle_c', 'challenge_date_c', 'status_c', 'reward_xp_c'])
      .orderByDesc('challenge_date_c').page(1, 100).fetch();
    if (!r.success) throw new Error(r.message || 'Challenges could not be loaded');
    return r.data;
  }, []);

  const { data: puzzles, error: puzzleError } = useFetch(async () => {
    const r = await sdk.table('puzzles_c')
      .select(['Id', 'Name', 'status_c', 'difficulty_c', 'level_c'])
      .page(1, 100).fetch();
    if (!r.success) throw new Error(r.message || 'Puzzle records are unavailable');
    return r.data;
  }, []);

  function set(name, value) {
    setForm(current => ({ ...current, [name]: value }));
  }

  async function save(event) {
    event.preventDefault();
    if (!form.Name.trim() || !form.puzzle_c || !form.challenge_date_c) {
      toast.error('Enter the title, puzzle and date');
      return;
    }
    const xp = Number(form.reward_xp_c);
    if (!Number.isInteger(xp) || xp < 0 || xp > 1000) {
      toast.error('Display XP must be between 0 and 1000');
      return;
    }
    const conflict = (data ?? []).find(
      c => c.challenge_date_c?.slice(0,10) === form.challenge_date_c && c.Id !== form.Id
        && c.status_c !== 'Expired'
    );
    if (conflict) {
      toast.error('A non-expired challenge is already configured for that date');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        Name: form.Name.trim(),
        puzzle_c: form.puzzle_c?.Id ?? form.puzzle_c,
        challenge_date_c: form.challenge_date_c,
        status_c: form.status_c,
        reward_xp_c: xp,
      };
      const r = form.Id
        ? await sdk.table('daily_challenges_c').update({ Id: form.Id, ...payload })
        : await sdk.table('daily_challenges_c').create(payload);
      if (!r.data?.length) throw new Error(r.messages?.[0] || r.message || 'Save failed');
      toast.success(form.Id ? 'Challenge updated' : 'Challenge created');
      setForm(null);
      run();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  const puzzleOptions = (puzzles ?? []).filter(p => p.status_c === 'Published');

  return (
    <AdminShell
      title="Daily Challenges"
      subtitle="Schedule one puzzle per day using real approved puzzle records. Player rewards are not yet server-granted."
      action={
        <button className="pz-button" onClick={() => setForm({ ...EMPTY })}>+ New challenge</button>
      }
    >
      {form && (
        <form onSubmit={save} className="pz-admin-panel" style={{ display: 'grid', gap: 15, marginBottom: 19 }}>
          <h2>{form.Id ? 'Edit daily challenge' : 'Schedule new challenge'}</h2>
          <label>Challenge title
            <input
              required value={form.Name}
              onChange={e => set('Name', e.target.value)}
              placeholder="Tuesday brain workout"
              className="pz-input"
              style={{ width: '100%', display: 'block', padding: 11, marginTop: 6 }}
            />
          </label>
          <label>Select a published puzzle
            <select
              required value={form.puzzle_c?.Id ?? form.puzzle_c}
              onChange={e => set('puzzle_c', e.target.value)}
              className="pz-input"
              style={{ width: '100%', display: 'block', padding: 11, marginTop: 6 }}
            >
              <option value="">Choose a puzzle</option>
              {puzzleOptions.map(p => <option value={p.Id} key={p.Id}>{p.Name} · {p.difficulty_c} / Level {p.level_c}</option>)}
            </select>
          </label>
          {puzzleError && <p role="alert">{String(puzzleError)}</p>}
          {!puzzleOptions.length && <p className="pz-copy">No published puzzles are available. Publish a question in Puzzle Studio first.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            <label>Challenge date
              <input type="date" required className="pz-input"
                value={form.challenge_date_c?.slice(0,10) ?? ''}
                onChange={e => set('challenge_date_c', e.target.value)}
                style={{ width: '100%', padding: 11, marginTop: 6 }}
              />
            </label>
            <label>Release status
              <select className="pz-input" value={form.status_c}
                onChange={e => set('status_c', e.target.value)}
                style={{ width: '100%', padding: 11, marginTop: 6 }}
              >
                {STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Proposed XP (not automatically credited)
              <input className="pz-input" type="number" min="0" max="1000"
                value={form.reward_xp_c} onChange={e => set('reward_xp_c', e.target.value)}
                style={{ width: '100%', padding: 11, marginTop: 6 }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="pz-button" type="submit" disabled={busy || !puzzleOptions.length}>
              {busy ? 'Saving…' : 'Save challenge'}
            </button>
            <button className="pz-button pz-button-secondary" type="button" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <section className="pz-admin-panel">
        <h2>Scheduled Content</h2>
        {loading && data === undefined ? <p>Loading challenges…</p>
          : error ? <p role="alert">{String(error)}</p>
          : !(data ?? []).length ? <p className="pz-copy">No challenges scheduled. Add one from this screen.</p>
          : (data ?? []).map(c => (
            <div className="pz-admin-row" key={c.Id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{c.Name}</strong>
                <p className="pz-copy" style={{ fontSize: 12, marginTop: 5 }}>
                  {c.challenge_date_c?.slice(0,10)} · {c.puzzle_c?.Name || 'Puzzle'} · Proposed XP: {c.reward_xp_c}
                </p>
              </div>
              <span className="pz-admin-tag">{c.status_c}</span>
              <button className="pz-button pz-button-secondary" style={{ fontSize: 12, padding: '8px 12px' }}
                onClick={() => setForm({ ...c })}
              >Edit</button>
            </div>
          ))}
      </section>
    </AdminShell>
  );
}
