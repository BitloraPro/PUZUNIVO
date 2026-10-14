// PUZUNIVO local puzzle engines. Deterministic content; not a cash/rewards authority.
export const MODES = ['Easy', 'Medium', 'Hard'];
export const GAMES = {
  number: 'Number Series',
  line: 'One-Line Logic',
  slide: 'Slide & Escape',
  memory: 'Memory Pattern',
};
export const MAX_LEVEL = 30;

export function numberPuzzle(mode, level) {
  const n = Math.min(MAX_LEVEL, Math.max(1, Number(level) || 1));
  const tier = MODES.indexOf(mode);
  const variant = (n - 1) % 5;
  const seed = Math.floor((n - 1) / 5);
  let series, correct, explanation;
  if (tier === 0) {
    const start = n + seed + 1;
    const step = seed + 2;
    if (variant === 0) {
      series = [0,1,2,3].map(i => start + i * step);
      correct = start + 4 * step;
      explanation = 'Add ' + step + ' at each step.';
    } else if (variant === 1) {
      series = [0,1,2,3].map(i => start + 21 - i * (step + 1));
      correct = start + 21 - 4 * (step + 1);
      explanation = 'Subtract ' + (step + 1) + ' at each step.';
    } else if (variant === 2) {
      const base = 1 + seed;
      series = [0,1,2,3].map(i => base * (2 ** i));
      correct = base * 16;
      explanation = 'Double the previous number.';
    } else if (variant === 3) {
      series = [0,1,2,3].map(i => (seed + 1) + (i + 1) * (i + 1));
      correct = (seed + 1) + 25;
      explanation = 'Take consecutive square numbers, plus ' + (seed + 1) + '.';
    } else {
      const base = seed + 3;
      series = [0,1,2,3].map(i => base + (i * (i + 1)) / 2);
      correct = base + 10;
      explanation = 'Add 1, 2, 3, then 4.';
    }
  } else if (tier === 1) {
    const base = n + seed;
    if (variant === 0) {
      series = [0,1,2,3].map(i => base + 2 * i * i);
      correct = base + 32;
      explanation = 'The difference grows by 4 each time: +2,+6,+10,+14.';
    } else if (variant === 1) {
      series = [0,1,2,3].map(i => base + 3 ** i);
      correct = base + 81;
      explanation = 'Subtract ' + base + '; each term is a power of 3.';
    } else if (variant === 2) {
      series = [0,1,2,3].map(i => base + i * i + i);
      correct = base + 20;
      explanation = 'Add consecutive even numbers: 2, 4, 6, 8.';
    } else if (variant === 3) {
      series = [0,1,2,3].map(i => base + (i+1) ** 3);
      correct = base + 125;
      explanation = 'Subtract ' + base + '; the remainders are cubes.';
    } else {
      series = [0,1,2,3].map(i => base + 5 * i * (i+1));
      correct = base + 100;
      explanation = 'Differences grow as 10, 20, 30, 40.';
    }
  } else {
    const base = 1 + seed + n;
    if (variant === 0) {
      series = [0,1,2,3].map(i => base + (2 ** (i+1)) - 1);
      correct = base + 31;
      explanation = 'Differences double: 2, 4, 8, 16.';
    } else if (variant === 1) {
      series = [1,2,6,24].map(x => x + base);
      correct = 120 + base;
      explanation = 'Subtract ' + base + '; the values are factorials: 1!,2!,3!,4!,5!.';
    } else if (variant === 2) {
      series = [0,1,2,3].map(i => base + 2 ** (2 * i));
      correct = base + 256;
      explanation = 'Subtract ' + base + '; the values multiply by 4.';
    } else if (variant === 3) {
      series = [0,1,2,3].map(i => base + i ** 3 + 2 * i);
      correct = base + 72;
      explanation = 'The rule is base + n³ + 2n for n=0,1,2,3,4.';
    } else {
      series = [0,1,2,3].map(i => base + (i+1) * (i+2) * (i+3));
      correct = base + 210;
      explanation = 'Add products of three consecutive integers.';
    }
  }
  const adjustment = Math.max(2, Math.floor(Math.abs(correct - series[3]) / 3));
  const candidates = new Set([correct,correct + adjustment,correct - adjustment,correct + adjustment * 2]);
  while (candidates.size < 4) candidates.add(correct + adjustment * (candidates.size + 1));
  const choices = [...candidates];
  for (let i=choices.length-1;i>0;i--) {
    const j=(n * 7 + tier * 5 + i * 3) % (i+1);
    [choices[j],choices[i]]=[choices[i],choices[j]];
  }
  return {series,correct,choices,explanation,level:n,mode};
}

// Stable, deterministic generator: a level never changes on refresh.
function puzzleRandom(seed) {
  let value = (seed >>> 0) || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function gridNeighbors(cell, size) {
  return [
    cell % size > 0 ? cell - 1 : -1,
    cell % size < size - 1 ? cell + 1 : -1,
    cell >= size ? cell - size : -1,
    cell < size * (size - 1) ? cell + size : -1,
  ].filter(value => value >= 0);
}

function rawHamiltonianPath(size, seed) {
  const random = puzzleRandom(seed);
  const seen = new Set();
  const path = [];

  function walk(cell) {
    seen.add(cell);
    path.push(cell);

    if (path.length === size * size) return true;

    const choices = gridNeighbors(cell, size)
      .filter(next => !seen.has(next))
      .map(next => ({
        cell: next,
        onward: gridNeighbors(next, size).filter(n => !seen.has(n)).length,
        tie: random(),
      }))
      .sort((a, b) => a.onward - b.onward || a.tie - b.tie);

    for (const candidate of choices) {
      if (walk(candidate.cell)) return true;
    }

    seen.delete(cell);
    path.pop();
    return false;
  }

  const start = Math.floor(random() * size * size);
  return walk(start) ? path : null;
}

function smallGridPaths() {
  const paths = [];
  function visit(path, seen) {
    if (path.length === 9) {
      paths.push(path);
      return;
    }

    for (const next of gridNeighbors(path[path.length - 1], 3)) {
      if (!seen.has(next)) visit([...path, next], new Set([...seen, next]));
    }
  }
  for (let start = 0; start < 9; start += 1) {
    visit([start], new Set([start]));
  }
  const random = puzzleRandom(372903);
  for (let i = paths.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [paths[i], paths[j]] = [paths[j], paths[i]];
  }
  return paths;
}
const EASY_PATHS = smallGridPaths();

function uniqueLinePath(size, level) {
  if (size === 3) return EASY_PATHS[level - 1];

  const seen = new Set();
  let chosen = null;
  for (let index = 1; index <= level; index += 1) {
    let found = null;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const path = rawHamiltonianPath(
        size,
        index * 7919 + size * 4001 + attempt * 9973,
      );
      if (path && !seen.has(path.join(','))) {
        found = path;
        break;
      }
    }

    if (!found) throw new Error('Unable to generate unique line puzzle');
    seen.add(found.join(','));
    chosen = found;
  }
  return chosen;
}

export function linePuzzle(mode, level) {
  const n = Math.min(MAX_LEVEL, Math.max(1, Number(level) || 1));
  const size = mode === 'Hard' ? 5 : mode === 'Medium' ? 4 : 3;
  const path = uniqueLinePath(size, n);
  const edges = path.slice(1).map((cell, i) => [path[i], cell]);
  const random = puzzleRandom(n * 3907 + size * 877);
  const shortcuts = mode === 'Hard' ? 5 : mode === 'Medium' ? 3 : n >= 16 ? 1 : 0;

  for (let i = 0, added = 0; i < size * size * 4 && added < shortcuts; i += 1) {
    const a = Math.floor(random() * size * size);
    const neighbors = gridNeighbors(a, size);
    const b = neighbors[Math.floor(random() * neighbors.length)];
    if (!edges.some(([from, to]) => from === a && to === b || from === b && to === a)) {
      edges.push([a, b]);
      added += 1;
    }
  }

  return {
    size,
    edges,
    start: path[0],
    finish: path[path.length - 1],
    solution: path,
  };
}
export function lineNext(puzzle,trace,node) {
  if (!Number.isInteger(node) || node<0 || node>=puzzle.size*puzzle.size) return {ok:false,complete:false};
  if(trace.length===0)return {ok:node===puzzle.start,complete:false};
  const prev=trace[trace.length-1];
  if(trace.includes(node))return {ok:false,complete:false};
  const connected=puzzle.edges.some(([a,b])=>a===prev&&b===node||a===node&&b===prev);
  const complete=connected&&trace.length+1===puzzle.size*puzzle.size&&node===puzzle.finish;
  return {ok:connected&&(! (trace.length+1===puzzle.size*puzzle.size) || node===puzzle.finish),complete};
}

export function slidePuzzle(mode, level) {
  const n = Math.min(MAX_LEVEL, Math.max(1, Number(level) || 1));
  const tier = Math.max(0, MODES.indexOf(mode));
  let blocks = [
    { id: 'target', x: 4, y: 2, w: 2, h: 1, axis: 'x', target: true },
    { id: 'gate', x: 3, y: 3, w: 1, h: 2, axis: 'y', target: false },
    { id: 'upper', x: 0, y: 0, w: 2, h: 1, axis: 'x', target: false },
    { id: 'lower', x: 0, y: 5, w: 2, h: 1, axis: 'x', target: false },
    { id: 'side', x: 5, y: 3, w: 1, h: 2, axis: 'y', target: false },
  ];
  if (tier >= 1) {
    blocks.push({ id: 'middle', x: 0, y: 3, w: 2, h: 1, axis: 'x', target: false });
  }
  if (tier >= 2) {
    blocks.push({ id: 'pillar', x: 2, y: 0, w: 1, h: 2, axis: 'y', target: false });
  }

  // Scramble backward from a legal winning arrangement. Every generated
  // configuration has a reversible series of legal moves back to the goal.
  blocks = moveSlide(blocks, 'target', -1);
  blocks = moveSlide(blocks, 'target', -1);
  const random = puzzleRandom((n * 0x9e3779b1 ^ (tier + 1) * 0x85ebca6b) >>> 0);
  const key = state => state.map(b => b.x + '.' + b.y).join('|');
  const visited = new Set([key(blocks)]);
  const steps = 8 + n + tier * 5;

  for (let step = 0; step < steps; step += 1) {
    const options = [];
    for (const block of blocks) {
      for (const change of [-1, 1]) {
        const next = moveSlide(blocks, block.id, change);
        if (next === blocks || visited.has(key(next))) continue;
        if (next.find(b => b.target).x === 4) continue;
        options.push(next);
      }
    }
    if (!options.length) break;
    blocks = options[Math.floor(random() * options.length)];
    visited.add(key(blocks));
  }

  return { size: 6, blocks, exitY: 2, level: n };
}
export function moveSlide(blocks,id,amount) {
  const selected=blocks.find(b=>b.id===id);
  if(!selected||!Number.isInteger(amount)||Math.abs(amount)!==1)return blocks;
  const next=blocks.map(b=>b.id===id?{...b,x:b.x+(b.axis==='x'?amount:0),y:b.y+(b.axis==='y'?amount:0)}:b);
  const b=next.find(b=>b.id===id);
  if(b.x<0||b.y<0||b.x+b.w>6||b.y+b.h>6)return blocks;
  const collided=next.some(o=>o.id!==id&&b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y);
  return collided?blocks:next;
}
export function slideWon(blocks) {
  const t=blocks.find(b=>b.target);
  return Boolean(t&&t.x+t.w===6&&t.y===2);
}

export function memoryPuzzle(mode, level) {
  const n = Math.min(MAX_LEVEL, Math.max(1, Number(level) || 1));
  const size = mode === 'Easy' ? 3 : mode === 'Medium' ? 4 : 5;
  const count = Math.min(
    8,
    (mode === 'Easy' ? 3 : mode === 'Medium' ? 4 : 5) + Math.floor((n - 1) / 7),
  );

  const tiles = Array.from({ length: size * size }, (_, index) => index);
  const random = puzzleRandom(n * 4019 + MODES.indexOf(mode) * 9257 + 2081);
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return { size, sequence: tiles.slice(0, count), level: n };
}
