import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  WebGLWorld,
  updatePlayer,
  cameraRelativeInput,
  waypointArrowRotation,
  advanceFixedPhysics,
  trafficPosition,
  HARBOR_FINISH,
  atHarbor
} from '@/lib/megarushEngine';
import './MegaRush.css';

export const route = {
  path: '/megarush',
  layout: 'public',
  access: 'public'
};

const WORLD_CONFIG = {
  weather: 'cycle',
  dayCycleMinutes: 18,
  trafficDensity: 0.85,
  pedestrianDensity: 0.85,
  collectibleDensity: 1
};

function makePlayer(chase = false) {
  return {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    angle: 0,
    onGround: true,
    character: 'rylee',
    skin: 'default',
    vehicle: 'skate',
    hp: 3,
    heat: chase ? 0.92 : 0,
    crashCooldown: 4,
    trickTimer: 0,
    moving: false,
    chaseActive: chase,
    harborChallenge: chase,
    wantedState: chase ? 'chase' : 'patrol',
    policeX: -3,
    policeZ: -20,
    carSlot: -1
  };
}

function miniMap(canvas, world, player, active) {
  const context = canvas?.getContext('2d');
  if (!context || !world || !player) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(90, Math.round(rect.width * ratio));
  const height = Math.max(90, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.save();
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const w = width / ratio;
  const h = height / ratio;
  context.fillStyle = '#163044';
  context.fillRect(0, 0, w, h);
  const scale = 1.15;
  const screenX = x => w / 2 + (x - player.x) * scale;
  const screenY = z => h / 2 - (z - player.z) * scale;
  context.strokeStyle = '#7898a4';
  context.lineWidth = 11 * scale;
  for (const road of [-32, 0, 32]) {
    context.beginPath();
    context.moveTo(screenX(road), screenY(-118));
    context.lineTo(screenX(road), screenY(124));
    context.stroke();
  }
  context.lineWidth = 1.2;
  context.strokeStyle = '#c2c9bf';
  for (const road of [-32, 0, 32]) {
    context.beginPath();
    context.moveTo(screenX(road), screenY(-118));
    context.lineTo(screenX(road), screenY(124));
    context.stroke();
  }
  context.fillStyle = '#345b6d';
  for (const block of world.obstacles) {
    context.fillRect(
      screenX(block.x - block.w / 2),
      screenY(block.z + block.d / 2),
      block.w * scale,
      block.d * scale
    );
  }
  context.fillStyle = '#2d91ad';
  context.fillRect(screenX(-120), screenY(66), 240 * scale, 95 * scale);
  if (active && player.chaseActive) {
    context.strokeStyle = '#ffd272';
    context.lineWidth = 2;
    context.setLineDash([5, 4]);
    context.beginPath();
    context.moveTo(w / 2, h / 2);
    context.lineTo(screenX(0), screenY(112));
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = '#ffd272';
    context.beginPath();
    context.arc(screenX(0), screenY(112), 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fc4d72';
    context.fillRect(screenX(player.policeX) - 3, screenY(player.policeZ) - 3, 6, 6);
  }
  context.translate(w / 2, h / 2);
  context.rotate(player.angle);
  context.fillStyle = '#5cffff';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(0, -9);
  context.lineTo(6, 7);
  context.lineTo(0, 4);
  context.lineTo(-6, 7);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function MegaRush() {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const stickRef = useRef(null);
  const worldRef = useRef(null);
  const playerRef = useRef(makePlayer());
  const modeRef = useRef('menu');
  const keysRef = useRef(new Set());
  const touchRef = useRef({ x: 0, z: 0, jump: false, sprint: false, climb: false });
  const pointerRef = useRef(null);
  const stickIdRef = useRef(null);
  const lastFrameRef = useRef(0);
  const simTimeRef = useRef(0);
  const carryRef = useRef(0);
  const lastHudRef = useRef(0);
  const [phase, setPhase] = useState('menu');
  const [mode, setMode] = useState('chase');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('Explore the coastal city.');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hud, setHud] = useState({
    hp: 3,
    heat: 0,
    speed: 0,
    distance: 112,
    waypointAngle: 0,
    vehicle: 'skate',
    wanted: 'CLEAR'
  });

  const chooseMode = useCallback(async chase => {
    const world = worldRef.current;
    if (!world) {
      setNotice('The 3D renderer is not available on this device.');
      return;
    }
    try {
      if (window.matchMedia('(pointer:coarse)').matches) {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.().catch(() => {});
        }
        await screen.orientation?.lock?.('landscape').catch(() => {});
      }
    } catch {
      // User agents can decline fullscreen and orientation locks.
    }
    world.generate(1);
    world.cameraYaw = 0;
    world.cameraPitch = 0.08;
    simTimeRef.current = 0;
    carryRef.current = 0;
    lastFrameRef.current = 0;
    keysRef.current.clear();
    touchRef.current = { x: 0, z: 0, jump: false, sprint: false, climb: false };
    playerRef.current = makePlayer(chase);
    modeRef.current = chase ? 'chase' : 'free';
    setMode(chase ? 'chase' : 'free');
    setPhase('playing');
    setNotice(chase ? 'ESCAPE THE CHASE · Reach the harbor!' : 'FREE ROAM · Discover Sunset City');
  }, []);

  const togglePause = useCallback(() => {
    if (modeRef.current === 'paused') {
      modeRef.current = mode;
      setPhase('playing');
    } else if (modeRef.current === 'free' || modeRef.current === 'chase') {
      modeRef.current = 'paused';
      keysRef.current.clear();
      touchRef.current = { x: 0, z: 0, jump: false, sprint: false, climb: false };
      setPhase('paused');
    }
  }, [mode]);

  const action = useCallback(name => {
    const player = playerRef.current;
    const world = worldRef.current;
    if (!world || !player || !['chase', 'free'].includes(modeRef.current)) return;
    if (name === 'skate') {
      if (player.vehicle === 'car' || player.vehicle === 'swim') return;
      player.vehicle = player.vehicle === 'skate' ? 'foot' : 'skate';
      setNotice(player.vehicle === 'skate' ? 'Neon board equipped' : 'Now exploring on foot');
    } else if (name === 'trick') {
      if (player.vehicle !== 'skate') return;
      player.trickTimer = 0.72;
      if (player.onGround) {
        player.vy = 7.8;
        player.onGround = false;
      }
      setNotice('KICKFLIP ✦');
    } else if (name === 'vehicle') {
      if (player.vehicle === 'car') {
        const car = world.traffic[player.carSlot];
        if (car) car.occupied = false;
        player.vehicle = 'foot';
        player.carSlot = -1;
        setNotice('Exited the car');
        return;
      }
      const nearby = world.traffic
        .map((car, index) => ({
          car,
          index,
          distance: Math.hypot(player.x - car.lane, player.z - trafficPosition(car, simTimeRef.current))
        }))
        .filter(item => !item.car.occupied && item.distance < 6)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!nearby) {
        setNotice('Move closer to a traffic car to enter');
        return;
      }
      nearby.car.occupied = true;
      player.vehicle = 'car';
      player.carSlot = nearby.index;
      player.x = nearby.car.lane;
      player.z = trafficPosition(nearby.car, simTimeRef.current);
      if (modeRef.current === 'free') {
        player.chaseActive = true;
        player.heat = 0.92;
        player.wantedState = 'chase';
        player.policeX = player.x - 3;
        player.policeZ = player.z - 20;
        setNotice('POLICE ALERT · Vehicle taken!');
      } else {
        setNotice('Vehicle entered · Drive to Harbor');
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let world;
    try {
      world = new WebGLWorld(canvas);
      world.generate(1);
      worldRef.current = world;
    } catch (cause) {
      setError('This device needs WebGL2 graphics support. ' + (cause?.message || 'Renderer initialization failed.'));
      return undefined;
    }

    let frameId = 0;
    let disposed = false;
    const onKeyDown = event => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      keysRef.current.add(event.code);
      if (event.repeat) return;
      if (event.code === 'Escape') {
        const current = modeRef.current;
        if (current === 'paused') {
          modeRef.current = 'chase' in playerRef.current && playerRef.current.harborChallenge ? 'chase' : 'free';
          setPhase('playing');
        } else if (current === 'free' || current === 'chase') {
          modeRef.current = 'paused';
          setPhase('paused');
        }
      }
      if (event.code === 'KeyB') action('skate');
      if (event.code === 'KeyK') action('trick');
      if (event.code === 'KeyE') action('vehicle');
    };
    const onKeyUp = event => keysRef.current.delete(event.code);
    const onBlur = () => {
      keysRef.current.clear();
      touchRef.current = { x: 0, z: 0, jump: false, sprint: false, climb: false };
    };
    const onVisibility = () => {
      if (document.hidden && ['chase', 'free'].includes(modeRef.current)) {
        modeRef.current = 'paused';
        setPhase('paused');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    const frame = timestamp => {
      if (disposed) return;
      frameId = window.requestAnimationFrame(frame);
      const previous = lastFrameRef.current;
      lastFrameRef.current = timestamp;
      const dt = previous ? Math.min(0.10, (timestamp - previous) / 1000) : 1 / 60;
      const player = playerRef.current;
      const state = modeRef.current;

      if (state === 'chase' || state === 'free') {
        const keys = keysRef.current;
        const touch = touchRef.current;
        const x = (Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))) + touch.x;
        const z = (Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))) + touch.z;
        const moved = cameraRelativeInput(clamp(x, -1, 1), clamp(z, -1, 1), world.cameraYaw);
        world.weather = WORLD_CONFIG.weather === 'cycle'
          ? ['clear', 'clear', 'rain', 'fog'][Math.floor(simTimeRef.current / 65) % 4]
          : WORLD_CONFIG.weather;
        const controls = {
          ...moved,
          jump: keys.has('Space') || touch.jump,
          climb: keys.has('KeyR') || touch.climb,
          dive: keys.has('KeyV'),
          sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.sprint
        };
        const stepped = advanceFixedPhysics(carryRef.current, dt, tick => {
          simTimeRef.current += tick;
          world.t = simTimeRef.current;
          if (updatePlayer(player, controls, world, tick) === 'crash') {
            modeRef.current = 'crash';
            setPhase('crash');
            setNotice('You crashed. Choose a free respawn.');
            return false;
          }
          return true;
        });
        carryRef.current = stepped.carry;
        if (state === 'chase' && player.chaseActive && atHarbor(player.x, player.z)) {
          player.chaseActive = false;
          player.heat = 0;
          player.harborChallenge = false;
          modeRef.current = 'complete';
          setPhase('complete');
          setNotice('Harbor reached! Local practice mission complete.');
          try {
            const best = Number(localStorage.getItem('mr-local-harbor-escapes') || 0);
            localStorage.setItem('mr-local-harbor-escapes', String(Math.min(99999, best + 1)));
          } catch {
            // Storage may be disabled.
          }
        }
      }
      try {
        world.draw(player, WORLD_CONFIG, [], simTimeRef.current);
      } catch (cause) {
        disposed = true;
        setError('3D graphics stopped: ' + (cause?.message || 'unknown renderer error'));
        return;
      }
      if (timestamp - lastHudRef.current > 110) {
        lastHudRef.current = timestamp;
        const distance = Math.round(Math.hypot(player.x - HARBOR_FINISH.x, player.z - HARBOR_FINISH.z));
        setHud({
          hp: player.hp,
          heat: player.heat,
          speed: Math.round(Math.hypot(player.vx, player.vz) * 3.6),
          distance,
          waypointAngle: waypointArrowRotation(HARBOR_FINISH.x - player.x, HARBOR_FINISH.z - player.z, world.cameraYaw),
          vehicle: player.vehicle,
          wanted: player.chaseActive ? 'CHASE' : player.wantedState === 'search' ? 'SEARCH' : 'CLEAR'
        });
        miniMap(mapRef.current, world, player, modeRef.current === 'chase');
      }
    };
    frameId = window.requestAnimationFrame(frame);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      world.dispose();
      worldRef.current = null;
    };
  }, [action]);

  const onViewDown = event => {
    if (!['free', 'chase'].includes(modeRef.current)) return;
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onViewMove = event => {
    const pointer = pointerRef.current;
    const world = worldRef.current;
    if (!pointer || !world || pointer.id !== event.pointerId) return;
    world.cameraYaw += clamp((event.clientX - pointer.x) * 0.004, -0.18, 0.18);
    world.cameraPitch = clamp(world.cameraPitch + (event.clientY - pointer.y) * 0.002, -0.22, 0.40);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };

  const onStickMove = event => {
    if (stickIdRef.current !== event.pointerId) return;
    const box = stickRef.current?.getBoundingClientRect();
    if (!box) return;
    const half = Math.min(box.width, box.height) * 0.35;
    touchRef.current.x = clamp((event.clientX - box.left - box.width / 2) / half, -1, 1);
    touchRef.current.z = clamp(-(event.clientY - box.top - box.height / 2) / half, -1, 1);
    const knob = stickRef.current?.querySelector('.mr-stick-knob');
    if (knob) {
      knob.style.transform = 'translate(calc(-50% + ' + touchRef.current.x * half + 'px), calc(-50% - ' + touchRef.current.z * half + 'px))';
    }
  };

  const onStickEnd = event => {
    if (stickIdRef.current !== event.pointerId) return;
    stickIdRef.current = null;
    touchRef.current.x = 0;
    touchRef.current.z = 0;
    const knob = stickRef.current?.querySelector('.mr-stick-knob');
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
  };

  const hold = (key, held) => {
    touchRef.current[key] = held;
  };

  return (
    <div className="mr-root" aria-label="MegaRush live 3D game">
      <canvas
        ref={canvasRef}
        className="mr-world"
        aria-label="Live WebGL2 coastal city"
        onPointerDown={onViewDown}
        onPointerMove={onViewMove}
        onPointerUp={() => { pointerRef.current = null; }}
        onPointerCancel={() => { pointerRef.current = null; }}
      />

      <div className="mr-horizon" aria-hidden="true" />
      {error ? (
        <div className="mr-message-card" role="alert">
          <h1>3D renderer unavailable</h1>
          <p>{error}</p>
          <Link to="/" className="mr-primary">Back to home</Link>
        </div>
      ) : (
        <>
          {phase === 'playing' && (
            <>
              <div className="mr-topline">
                <div className="mr-map-shell">
                  <canvas ref={mapRef} className="mr-map" aria-label="Live local map of your position, harbor and police chase" />
                  <span className="mr-map-north">N</span>
                  <span className="mr-map-caption">SUNSET CITY</span>
                </div>
                <div className="mr-objective">
                  <div className="mr-objective-eyebrow">{mode === 'chase' ? '🚨 POLICE PURSUIT' : '🌴 FREE ROAM'}</div>
                  <strong>{mode === 'chase' ? 'ESCAPE THE CHASE' : 'EXPLORE THE OPEN CITY'}</strong>
                  <div className="mr-destination">
                    <span style={{ transform: 'rotate(' + hud.waypointAngle + 'rad)' }}>➤</span>
                    {mode === 'chase' ? 'REACH THE HARBOR · ' + hud.distance + 'm' : 'SKATE · RIDE · EXPLORE'}
                  </div>
                </div>
                <div className="mr-stats">
                  <span className="mr-stat">LEVEL <b>1</b></span>
                  <span className="mr-stat">🪙 <b>—</b></span>
                  <span className="mr-stat">XP <b>—</b></span>
                  <span className="mr-stat" aria-label={hud.hp + ' hearts'}>❤️ <b>{hud.hp}/3</b></span>
                  <span className={'mr-stat mr-wanted ' + (hud.wanted === 'CHASE' ? 'active' : '')}>{hud.wanted}</span>
                </div>
              </div>
              <div className="mr-speed"><b>{hud.speed}</b><span>KM/H</span></div>
              <div className="mr-movement">
                <div
                  className="mr-stick"
                  ref={stickRef}
                  aria-label="Touch movement joystick"
                  onPointerDown={event => {
                    stickIdRef.current = event.pointerId;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onStickMove(event);
                  }}
                  onPointerMove={onStickMove}
                  onPointerUp={onStickEnd}
                  onPointerCancel={onStickEnd}
                >
                  <div className="mr-stick-track" />
                  <div className="mr-stick-knob" />
                  <span>MOVE</span>
                </div>
                <div className="mr-action-grid">
                  <button onClick={() => action('vehicle')} aria-label="Enter or exit vehicle">🚘<span>VEHICLE</span></button>
                  <button onClick={() => action('skate')} aria-label="Swap skateboard and walking">🛹<span>BOARD</span></button>
                  <button className="mr-accent" onClick={() => action('trick')} aria-label="Skateboard trick">✦<span>TRICK</span></button>
                  <button
                    onPointerDown={() => hold('jump', true)}
                    onPointerUp={() => hold('jump', false)}
                    onPointerCancel={() => hold('jump', false)}
                    onPointerLeave={() => hold('jump', false)}
                    aria-label="Jump"
                  >↥<span>JUMP</span></button>
                  <button
                    onPointerDown={() => hold('climb', true)}
                    onPointerUp={() => hold('climb', false)}
                    onPointerCancel={() => hold('climb', false)}
                    onPointerLeave={() => hold('climb', false)}
                    aria-label="Climb"
                  >↟<span>CLIMB</span></button>
                  <button
                    className="mr-green"
                    onPointerDown={() => hold('sprint', true)}
                    onPointerUp={() => hold('sprint', false)}
                    onPointerCancel={() => hold('sprint', false)}
                    onPointerLeave={() => hold('sprint', false)}
                    aria-label="Hold to sprint"
                  >➤<span>SPRINT</span></button>
                </div>
              </div>
              <button className="mr-pause" onClick={togglePause} aria-label="Pause game">Ⅱ</button>
              <div className="mr-status">{notice}</div>
              <div className="mr-local-notice">Practice run · Cloud coins and XP not connected</div>
            </>
          )}

          {phase !== 'playing' && (
            <div className="mr-menu-shade">
              <div className="mr-story">
                <p className="mr-kicker">PUZUNIVO ORIGINAL • 3D OPEN WORLD</p>
                <h1>MEGA<span>RUSH</span></h1>
                <p className="mr-subtitle">THE SUNSET HARBOR CHASE</p>
                <h2>
                  {phase === 'complete'
                    ? 'HARBOR ESCAPED'
                    : phase === 'crash'
                      ? 'THE CHASE ISN’T OVER'
                      : phase === 'paused'
                        ? 'PAUSED IN THE CITY'
                        : 'RIDE FAST. OUTRUN THE CITY.'}
                </h2>
                <p className="mr-description">
                  {phase === 'complete'
                    ? 'You reached the waterfront. This is a local practice completion, not yet a cloud-verified reward.'
                    : phase === 'crash'
                      ? 'You ran out of hearts. Restart freely with all three hearts restored.'
                      : 'Skate through sunset streets, dodge traffic, escape the police, and reach the glowing harbor checkpoint.'}
                </p>
                <div className="mr-menu-buttons">
                  {phase === 'paused' ? (
                    <button className="mr-primary" onClick={togglePause}>▶ RESUME GAME</button>
                  ) : (
                    <button className="mr-primary" onClick={() => chooseMode(true)}>
                      🚨 {phase === 'complete' ? 'PLAY AGAIN' : phase === 'crash' ? 'FREE RESPAWN · CHASE' : 'START HARBOR CHASE'}
                    </button>
                  )}
                  <button className="mr-secondary" onClick={() => chooseMode(false)}>🛹 FREE ROAM</button>
                  {phase !== 'menu' && (
                    <button className="mr-text-button" onClick={() => {
                      modeRef.current = 'menu';
                      setPhase('menu');
                    }}>MAIN MENU</button>
                  )}
                </div>
                <p className="mr-key-help">WASD move · Mouse/drag look · Space jump · Shift sprint · B board · E car · K trick</p>
                <p className="mr-no-fake">Playable 3D WebGL2 build. Real cash rewards, verified cloud XP and AdMob are not enabled here.</p>
              </div>
            </div>
          )}
          <div className="mr-rotate" role="status">
            <div>↻</div>
            <strong>ROTATE TO LANDSCAPE</strong>
            <p>Turn your phone sideways for the full 3D city and all touch controls.</p>
          </div>
        </>
      )}
    </div>
  );
}
