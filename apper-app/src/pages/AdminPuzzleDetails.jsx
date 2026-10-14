import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import { toast } from 'sonner';
import AdminShell from '@/components/AdminShell';
import LookupPicker from '@/components/LookupPicker';
import { DetailSkeleton } from '@/components/PageSkeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const route = { path: '/admin/puzzles/:id', layout: 'owner', access: "profile === 'Admin_c'" };
const FIELDS = ['Id','Name','game_c','difficulty_c','level_c','question_c','options_c','correct_answer_c','explanation_c','status_c','version_c'];
const EMPTY = {Name:'',game_c:null,difficulty_c:'Easy',level_c:1,question_c:'',options_c:'',correct_answer_c:'',explanation_c:'',status_c:'Draft',version_c:1};

function valid(form) {
  if (!form.Name?.trim() || !form.game_c || !form.question_c?.trim()) return 'Name, game, and question are required.';
  if (!Number.isInteger(Number(form.level_c)) || Number(form.level_c)<1) return 'Level must be a positive integer.';
  let choices;
  try { choices=JSON.parse(form.options_c); } catch {return 'Answer options must be valid JSON, for example [10,12,14,16].';}
  if (!Array.isArray(choices) || choices.length!==4 || new Set(choices.map(String)).size!==4) return 'Provide exactly four distinct answer options.';
  if (!choices.map(String).includes(String(form.correct_answer_c))) return 'Correct answer must match one of the four options.';
  if (form.status_c==='Published' && !form.explanation_c?.trim()) return 'Published questions require an explanation.';
  return null;
}
export default function AdminPuzzleDetails() {
  const { id }=useParams();
  const navigate=useNavigate();
  const isNew=id==='new';
  const { data, loading, error, run }=useFetch(async () => {
    if (isNew) return { ...EMPTY };
    const r=await sdk.table('puzzles_c').select(FIELDS).get(id);
    if (!r.success || !r.data) throw new Error('Puzzle not found or access denied.');
    return r.data;
  },[id,isNew]);
  const [draft,setDraft]=useState(null);
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const form=draft ?? data ?? EMPTY;
  const set=(name,value)=>setDraft({ ...form,[name]:value });

  async function submit(event) {
    event.preventDefault();
    const issue=valid(form);
    if(issue) return toast.error(issue);
    setSaving(true);
    try {
      const payload = {
        Name:form.Name.trim(),
        game_c:form.game_c?.Id ?? form.game_c,
        difficulty_c:form.difficulty_c,
        level_c:Number(form.level_c),
        question_c:form.question_c.trim(),
        options_c:form.options_c,
        correct_answer_c:String(form.correct_answer_c),
        explanation_c:form.explanation_c,
        status_c:form.status_c,
        version_c:Number(form.version_c)||1,
      };
      const r=isNew ? await sdk.table('puzzles_c').create(payload) : await sdk.table('puzzles_c').update({ Id:id, ...payload });
      if(!r.data?.length) throw new Error(r.messages?.[0]||r.message||'Unable to save puzzle');
      toast.success(isNew?'Puzzle created':'Puzzle updated');
      if(isNew) navigate('/admin/puzzles/'+r.data[0].Id);
      else {setDraft(null);run();}
    } catch(e){toast.error(e.message);}
    finally{setSaving(false);}
  }
  async function remove() {
    setDeleting(true);
    try {
      const r=await sdk.table('puzzles_c').remove([id]);
      if(!r.data?.length) throw new Error(r.messages?.[0]||r.message||'Unable to delete puzzle');
      toast.success('Puzzle deleted');
      navigate('/admin/puzzles');
    }catch(e){toast.error(e.message);}
    finally{setDeleting(false);}
  }
  return (
    <AdminShell title={isNew?'Create puzzle':'Puzzle details'} subtitle="Create and validate every question before setting its release status.">
      <Link to="/admin/puzzles" className="mb-6 inline-flex text-sm font-bold text-primary">← Back to Puzzle Studio</Link>
      {loading && data===undefined ? <DetailSkeleton /> : error ? <p role="alert" className="text-destructive">{String(error)} <button type="button" className="font-bold underline" onClick={run}>Retry</button></p> : (
        <form onSubmit={submit} className="mt-5 grid gap-5 rounded-3xl border border-border bg-card p-5 md:grid-cols-2 md:p-8">
          <label className="block text-sm font-bold">Puzzle title
            <input required value={form.Name} onChange={e=>set('Name',e.target.value)} placeholder="Number Series Easy 01" className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="block text-sm font-bold">Game
            <div className="mt-2">
              <LookupPicker table="games_c" searchField="Name" value={form.game_c?.Id??form.game_c??null} onChange={value=>set('game_c',value)} clearable />
            </div>
          </label>
          <label className="block text-sm font-bold">Difficulty
            <select value={form.difficulty_c} onChange={e=>set('difficulty_c',e.target.value)} className="mt-2 block w-full rounded-xl border border-input bg-background p-3">
              {['Easy','Medium','Hard'].map(s=><option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Level number
            <input type="number" min="1" value={form.level_c} onChange={e=>set('level_c',e.target.value)} className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="block text-sm font-bold md:col-span-2">Question
            <textarea required value={form.question_c} onChange={e=>set('question_c',e.target.value)} rows={3} placeholder="2, 4, 8, 16, ?" className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="block text-sm font-bold">Four answer choices as JSON
            <textarea required value={form.options_c} onChange={e=>set('options_c',e.target.value)} rows={3} placeholder="[24, 28, 32, 36]" className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="block text-sm font-bold">Correct answer
            <input required value={form.correct_answer_c} onChange={e=>set('correct_answer_c',e.target.value)} placeholder="32" className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="block text-sm font-bold md:col-span-2">Explanation
            <textarea value={form.explanation_c} onChange={e=>set('explanation_c',e.target.value)} rows={3} placeholder="Every number doubles." className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <label className="block text-sm font-bold">Publication status
            <select value={form.status_c} onChange={e=>set('status_c',e.target.value)} className="mt-2 block w-full rounded-xl border border-input bg-background p-3">
              {['Draft','Review','Published','Archived'].map(s=><option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Content version
            <input type="number" min="1" value={form.version_c} onChange={e=>set('version_c',e.target.value)} className="mt-2 block w-full rounded-xl border border-input bg-background p-3" />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button disabled={saving} type="submit" className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving?'Saving…':'Save puzzle'}</button>
            <Link to="/admin/puzzles" className="rounded-xl border border-border px-6 py-3 text-sm font-bold">Cancel</Link>
            {!isNew && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" className="ml-auto rounded-xl border border-destructive/30 px-5 py-3 text-sm font-bold text-destructive">Delete</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete {form.Name}?</AlertDialogTitle><AlertDialogDescription>This action permanently removes this puzzle record.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={deleting} onClick={remove}>Delete puzzle</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      )}
    </AdminShell>
  );
}
