import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import GameArtwork from '@/components/GameArtwork';
import PuzunivoShell from '@/components/PuzunivoShell';
import { GAMES, MODES, MAX_LEVEL } from '@/lib/puzunivoPuzzles';

export const route = { path: '/levels', layout: 'public', access: 'public' };

export default function Levels() {
  const [params] = useSearchParams();
  const game = GAMES[params.get('game')] ? params.get('game') : 'number';
  const [mode, setMode] = useState(MODES.includes(params.get('mode')) ? params.get('mode') : 'Easy');
  const key = 'puzunivo-progress-' + game + '-' + mode;
  let unlocked = 1;
  try {
    const value = JSON.parse(localStorage.getItem(key));
    unlocked = Math.max(1, Math.min(MAX_LEVEL, Number(value) || 1));
  } catch {
    unlocked = 1;
  }

  return (
    <PuzunivoShell pageTitle="Choose your next level">
      <Link to="/games" className="pz-button pz-button-secondary" style={{ padding: '7px 13px', minHeight: 38, fontSize: 12 }}>
        <ApperIcon name="ArrowLeft" size={17} /> All Games
      </Link>
      <div className="pz-hero" style={{ marginTop: 22, marginBottom: 22, minHeight: 235 }}>
        <div className="pz-hero-copy">
          <span className="pz-pill">LEVEL SELECT ✦</span>
          <h1 className="pz-title" style={{ fontSize: 'clamp(30px,4.5vw,47px)' }}>{GAMES[game]}</h1>
          <p className="pz-copy">Start easy, get clever, and unlock each new challenge.</p>
        </div>
        <GameArtwork game={game} />
      </div>
      <div className="pz-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <p className="pz-eyebrow">CHOOSE YOUR DIFFICULTY</p>
            <h2 className="pz-section-title" style={{ fontSize: 24 }}>Ready for a challenge?</h2>
          </div>
          <div className="pz-filter">
            {MODES.map(d => <button key={d} className={d === mode ? 'active' : ''} onClick={() => setMode(d)}>{d}</button>)}
          </div>
        </div>
        <div className="pz-statbar" style={{ marginTop: 20 }}>
          <div className="pz-statbox"><strong>{unlocked}</strong><span>Current level</span></div>
          <div className="pz-statbox"><strong>{MAX_LEVEL}</strong><span>Levels / mode</span></div>
          <div className="pz-statbox"><strong>3</strong><span>Lives per game</span></div>
        </div>
        <div style={{ borderRadius: 999, background: '#1b3061', height: 10, marginTop: 20, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg,#20dfb8,#43eeff,#9f6aff)', height: 10, width: (unlocked / MAX_LEVEL * 100) + '%' }} />
        </div>
      </div>
      <div className="pz-level-box">
        <div className="pz-heading-row" style={{ marginTop: 0 }}>
          <div><p className="pz-kicker">YOUR ADVENTURE</p><h2 className="pz-section-title">Level map</h2></div>
          <span className="pz-pill">{mode}</span>
        </div>
        <div className="pz-level-grid">
          {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(n => {
            const available = n <= unlocked;
            const current = n === unlocked;
            return available ? (
              <Link className={'pz-level ' + (current ? 'current' : '')}
                to={'/play?game=' + game + '&mode=' + mode + '&level=' + n} key={n} aria-label={'Play level ' + n}>{n}</Link>
            ) : (
              <span className="pz-level locked" key={n} aria-label={'Level ' + n + ' locked'}>
                <ApperIcon name="LockKeyhole" size={17} />
              </span>
            );
          })}
        </div>
        <Link className="pz-button" to={'/play?game=' + game + '&mode=' + mode}
          style={{ display: 'flex', width: '100%', marginTop: 24 }}>
          <ApperIcon name="Play" size={19} /> Continue Level {unlocked}
        </Link>
        <p className="pz-copy" style={{ textAlign: 'center', fontSize: 12, marginTop: 17 }}>
          Your progress is saved on this device. Verified account-wide cloud sync is not active yet.
        </p>
      </div>
    </PuzunivoShell>
  );
}
