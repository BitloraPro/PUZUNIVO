import React, { useState } from 'react';
import { toast } from 'sonner';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import AdminShell from '@/components/AdminShell';
import ApperIcon from '@/components/ApperIcon';

export const route = {
  path: '/admin/players',
  layout: 'owner',
  access: "profile === 'Admin_c'",
};

const PLAYER_PROFILE = 'Player_c';
const PROGRESS_FIELDS = [
  'Id', 'Name', 'Owner', 'game_c', 'difficulty_c',
  'level_c', 'completed_c', 'xp_c', 'updated_at_c',
];

export default function AdminPlayers() {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [offset, setOffset] = useState(0);

  const members = useFetch(async () => {
    const response = await sdk.teams.getMembers(offset, 50);
    return { rows: response.data ?? [], total: response.total ?? 0 };
  }, [offset]);

  const invitations = useFetch(async () => {
    const response = await sdk.teams.getInvitedMembers(0, 100);
    return response.data ?? [];
  }, []);

  const progress = useFetch(async () => {
    const response = await sdk.table('player_progress_c')
      .select(PROGRESS_FIELDS)
      .orderByDesc('updated_at_c')
      .page(1, 50)
      .fetch();

    if (!response.success) {
      throw new Error(response.message || 'Player progress could not be loaded.');
    }

    return { rows: response.data, total: response.total };
  }, []);

  async function invitePlayer(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }

    const alreadyMember = (members.data?.rows ?? []).some(
      member => member.email?.toLowerCase() === normalizedEmail
    );
    const alreadyInvited = (invitations.data ?? []).some(
      item => item.invitedEmail?.toLowerCase() === normalizedEmail
    );

    if (alreadyMember || alreadyInvited) {
      toast.error('This account is already a member or has a pending invitation.');
      return;
    }

    setInviting(true);
    try {
      await sdk.teams.inviteUsers({
        invitations: [{ email: normalizedEmail, profileName: PLAYER_PROFILE }],
      });

      toast.success('Player invitation submitted to Apper.');
      setEmail('');
      invitations.run();
      members.run();
    } catch (error) {
      toast.error(error?.message || 'Could not invite the player.');
    } finally {
      setInviting(false);
    }
  }

  const rows = members.data?.rows ?? [];
  const playerRows = rows.filter(member => member.profile?.name === PLAYER_PROFILE);

  return (
    <AdminShell
      title="Player Management"
      subtitle="Actual Apper account directory, invitation state, and stored player progress. No fake player statistics."
    >
      <div className="pz-admin-panels">
        <section className="pz-admin-panel">
          <h2>Registered Accounts</h2>

          {members.loading && members.data === undefined && <p className="pz-copy">Loading account directory…</p>}
          {members.error && (
            <p role="alert" className="pz-copy">
              {members.error}
              <button onClick={members.run} className="pz-button pz-button-secondary" style={{ marginLeft: 12 }}>
                Retry
              </button>
            </p>
          )}
          {members.data !== undefined && (
            <>
              <div className="pz-statbar">
                <div className="pz-statbox">
                  <strong>{members.data.total}</strong>
                  <span>Registered accounts</span>
                </div>
                <div className="pz-statbox">
                  <strong>{playerRows.length}</strong>
                  <span>Players on this page</span>
                </div>
                <div className="pz-statbox">
                  <strong>{invitations.data?.length ?? '—'}</strong>
                  <span>Pending invitations shown</span>
                </div>
              </div>
              {rows.length === 0 ? (
                <p className="pz-copy" style={{ marginTop: 18 }}>No accounts found.</p>
              ) : (
                <div style={{ marginTop: 17 }}>
                  {rows.map(member => (
                    <div key={member.id} className="pz-admin-row">
                      <span className="pz-quick-icon" style={{ flexShrink: 0 }}>
                        <ApperIcon name="UserRound" size={20} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block' }}>{member.name || 'Unnamed account'}</strong>
                        <p className="pz-copy" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{member.email}</p>
                      </div>
                      <span className="pz-admin-tag">{member.profile?.name || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 16 }}>
                <button
                  disabled={offset === 0}
                  className="pz-button pz-button-secondary"
                  onClick={() => setOffset(value => Math.max(0, value - 50))}
                >
                  Previous
                </button>
                <button
                  disabled={offset + rows.length >= members.data.total}
                  className="pz-button pz-button-secondary"
                  onClick={() => setOffset(value => value + 50)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>

        <section className="pz-admin-panel">
          <h2>Invite a Player</h2>
          <p className="pz-copy" style={{ fontSize: 13 }}>
            Invitations use Apper identity and are restricted to the Player role.
            No password or duplicate user table is created.
          </p>
          <form onSubmit={invitePlayer} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            <label>
              Player email
              <input
                className="pz-input"
                required
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="player@example.com"
                style={{ display: 'block', padding: 12, width: '100%', marginTop: 8 }}
              />
            </label>
            <button className="pz-button" type="submit" disabled={inviting}>
              {inviting ? 'Sending invitation…' : 'Invite Player'}
            </button>
          </form>

          <h2 style={{ marginTop: 24 }}>Pending Invitations</h2>
          {invitations.loading && invitations.data === undefined && (
            <p className="pz-copy">Loading pending invitations…</p>
          )}
          {invitations.error && (
            <p role="alert" className="pz-copy">
              {invitations.error}
              <button className="pz-button pz-button-secondary" onClick={invitations.run}>Retry</button>
            </p>
          )}
          {invitations.data && !invitations.data.length && (
            <p className="pz-copy">No pending invitations.</p>
          )}
          {(invitations.data ?? []).map(invitation => (
            <div key={invitation.invitationId} className="pz-admin-row">
              <ApperIcon name="Mail" size={18} />
              <span style={{ overflowWrap: 'anywhere' }}>{invitation.invitedEmail}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="pz-admin-panel" style={{ marginTop: 18 }}>
        <h2>Stored Player Progress</h2>
        <p className="pz-copy" style={{ fontSize: 12, marginBottom: 14 }}>
          Only data actually saved by the backend is counted; browser-only
          gameplay progress does not appear here.
        </p>

        {progress.loading && progress.data === undefined && <p className="pz-copy">Loading progress…</p>}
        {progress.error && (
          <p role="alert" className="pz-copy">
            {progress.error}
            <button onClick={progress.run} className="pz-button pz-button-secondary">Retry</button>
          </p>
        )}
        {progress.data && !progress.data.rows.length && (
          <p className="pz-copy">No backend-verified player progress yet.</p>
        )}
        {!!progress.data?.rows.length && (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Game</th>
                  <th>Difficulty</th>
                  <th>Level</th>
                  <th>Completed</th>
                  <th>XP</th>
                </tr>
              </thead>
              <tbody>
                {progress.data.rows.map(record => (
                  <tr key={record.Id}>
                    <td>{record.Owner?.Name || '—'}</td>
                    <td>{record.game_c?.Name || '—'}</td>
                    <td>{record.difficulty_c}</td>
                    <td>{record.level_c}</td>
                    <td>{record.completed_c}</td>
                    <td>{record.xp_c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
