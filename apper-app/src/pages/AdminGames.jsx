import React, { useState } from 'react';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import { toast } from 'sonner';
import ApperIcon from '@/components/ApperIcon';
import AdminShell from '@/components/AdminShell';
import { ListSkeleton } from '@/components/PageSkeleton';

export const route = { path: '/admin/games', layout: 'owner', access: "profile === 'Admin_c'" };
const FIELDS = ['Id', 'Name', 'code_c', 'category_c', 'status_c', 'target_levels_c', 'description_c'];
const statuses = ['Draft', 'Testing', 'Coming Soon', 'Active', 'Disabled'];
const categories = ['Numbers', 'Spatial', 'Strategy', 'Memory'];
const empty = { Name: '', code_c: '', category_c: 'Numbers', status_c: 'Draft', target_levels_c: 90, description_c: '' };
const BUILT_INS = [
  {Name:'Number Series',code_c:'number',category_c:'Numbers',description_c:'Solve mathematical number sequences.'},
  {Name:'One-Line Logic',code_c:'line',category_c:'Spatial',description_c:'Connect every dot with a single continuous route.'},
  {Name:'Slide & Escape',code_c:'slide',category_c:'Strategy',description_c:'Move sliding blocks and clear the target exit.'},
  {Name:'Memory Pattern',code_c:'memory',category_c:'Memory',description_c:'Remember and repeat an ordered tile pattern.'}
];

export default function AdminGames() {
  const { data, loading, error, run } = useFetch(async () => {
    const result = await sdk.table('games_c').select(FIELDS).fetch();
    if (!result.success) throw new Error(result.message || 'Games unavailable');
    return result.data;
  }, []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [search, setSearch] = useState('');
  const records = (data ?? []).filter(game => game.Name.toLowerCase().includes(search.toLowerCase()));
  function edit(field, value) { setForm(current => ({ ...current, [field]: value })); }
  async function save(event) {
    event.preventDefault();
    if (!form.Name.trim() || !form.code_c.trim()) return toast.error('Name and game key are required.');
    setBusy(true);
    try {
      const payload = {
        Name: form.Name.trim(),
        code_c: form.code_c.trim().toLowerCase(),
        category_c: form.category_c,
        status_c: form.status_c,
        target_levels_c: Number(form.target_levels_c),
        description_c: form.description_c,
      };
      const response = form.Id
        ? await sdk.table('games_c').update({ Id: form.Id, ...payload })
        : await sdk.table('games_c').create(payload);
      if (!response.data?.length) throw new Error(response.messages?.[0] || response.message || 'Save failed');
      toast.success(form.Id ? 'Game updated' : 'Game created');
      setForm(null);
      run();
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  }
  async function initializeGames() {
    if (initializing) return;
    setInitializing(true);
    try {
      const current=await sdk.table('games_c').select(['Id','Name','code_c']).page(1,100).fetch();
      if(!current.success)throw new Error(current.message||'Unable to inspect game catalog');
      const existing=new Set(current.data.map(row=>row.code_c));
      const missing=BUILT_INS.filter(item=>!existing.has(item.code_c));
      if(!missing.length){toast.info('All four game records already exist; no duplicates created.');return;}
      const r=await sdk.table('games_c').create(missing.map(item=>({...item,status_c:'Testing',target_levels_c:90})));
      if(!r.data?.length)throw new Error(r.messages?.[0]||r.message||'Could not initialize game catalog');
      toast.success('Created '+r.data.length+' unique game catalog records');
      run();
    }catch(e){toast.error(e.message);}finally{setInitializing(false);}
  }
  return (
    <AdminShell title="Game manager" subtitle="Manage real game catalog records, difficulty plans and release statuses." action={
      <button onClick={() => setForm({ ...empty })} className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">
        <ApperIcon name="Plus" size={17} /> New game
      </button>
    }>
      <div className="pz-admin-panel" style={{marginBottom:17,display:'flex',alignItems:'center',justifyContent:'space-between',gap:15,flexWrap:'wrap'}}>
        <div><strong>Initialize PUZUNIVO Game Catalog</strong><p className="pz-copy" style={{fontSize:12,marginTop:5}}>Creates only missing built-in games in Live Database; checks existing keys before inserting.</p></div>
        <button className="pz-button" disabled={initializing} onClick={initializeGames}>{initializing?'Checking…':'Initialize 4 Games'}</button>
      </div>
      {form && (
        <form onSubmit={save} className="mb-7 grid gap-4 rounded-3xl border border-primary/30 bg-card p-6 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <h2 className="font-heading text-2xl font-black">{form.Id ? 'Edit game' : 'New game'}</h2>
            <button type="button" onClick={() => setForm(null)} aria-label="Close editor"><ApperIcon name="X" /></button>
          </div>
          <label className="text-sm font-bold">Name
            <input required value={form.Name} onChange={e => edit('Name', e.target.value)} placeholder="Pattern Matrix" className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="text-sm font-bold">Game key
            <input required value={form.code_c} onChange={e => edit('code_c', e.target.value)} placeholder="pattern_matrix" className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="text-sm font-bold">Category
            <select value={form.category_c} onChange={e => edit('category_c', e.target.value)} className="mt-2 block w-full rounded-xl border border-input bg-background p-3">
              {categories.map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Status
            <select value={form.status_c} onChange={e => edit('status_c', e.target.value)} className="mt-2 block w-full rounded-xl border border-input bg-background p-3">
              {statuses.map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Planned levels
            <input type="number" min="1" value={form.target_levels_c} onChange={e => edit('target_levels_c', e.target.value)} className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="text-sm font-bold">Description
            <textarea rows={3} value={form.description_c} onChange={e => edit('description_c', e.target.value)} placeholder="A short game description" className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={busy} className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? 'Saving…' : 'Save game'}</button>
            <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-border px-6 py-3 text-sm font-bold">Cancel</button>
          </div>
        </form>
      )}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading text-xl font-black">Game catalog</h2>
          <input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search game catalog" placeholder="Search games…" className="min-h-11 rounded-xl border border-input bg-background px-4 text-sm" />
        </div>
        {loading && data === undefined ? <ListSkeleton rows={4} /> : error ? (
          <div role="alert" className="text-sm text-destructive">{String(error)} <button onClick={run} className="font-bold underline">Retry</button></div>
        ) : records.length ? (
          <div className="space-y-3">
            {records.map(game => (
              <div key={game.Id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-l-4 border-primary bg-muted/40 p-4">
                <div>
                  <h3 className="font-heading text-lg font-black">{game.Name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{game.code_c} · {game.category_c} · {game.target_levels_c} planned</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-accent px-3 py-2 text-xs font-bold">{game.status_c}</span>
                  <button onClick={() => setForm({ ...game })} className="rounded-xl bg-primary/15 px-4 py-3 text-xs font-black text-primary">Edit</button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="rounded-xl bg-muted p-6 text-sm text-muted-foreground">No matching games. Use New game to add your first record.</p>}
      </div>
    </AdminShell>
  );
}
