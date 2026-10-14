import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MODES,
  MAX_LEVEL,
  numberPuzzle,
  linePuzzle,
  lineNext,
  slidePuzzle,
  moveSlide,
  slideWon,
  memoryPuzzle,
} from '../src/lib/puzunivoPuzzles.js';

for (const mode of MODES) {
  test(mode + ': Number Series has one correct answer at every level', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const puzzle = numberPuzzle(mode, level);
      assert.equal(puzzle.series.length, 4);
      assert.equal(puzzle.choices.length, 4);
      assert.equal(new Set(puzzle.choices).size, 4);
      assert.equal(puzzle.choices.filter(x => x === puzzle.correct).length, 1);
      assert.ok(puzzle.explanation.length > 8);
      assert.deepEqual(numberPuzzle(mode, level), puzzle);
    }
  });

  test(mode + ': One-Line paths stay connected and uniquely visit each dot', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const puzzle = linePuzzle(mode, level);
      const visited = [];
      const cells = puzzle.size * puzzle.size;
      assert.equal(puzzle.solution.length, cells);
      assert.equal(new Set(puzzle.solution).size, cells);
      assert.equal(puzzle.start, puzzle.solution[0]);
      assert.equal(puzzle.finish, puzzle.solution[cells - 1]);

      for (const node of puzzle.solution) {
        const result = lineNext(puzzle, visited, node);
        assert.equal(result.ok, true, 'Disconnected path on ' + level);
        assert.equal(result.complete, visited.length === cells - 1);
        visited.push(node);
      }

      assert.equal(lineNext(puzzle, visited, visited[0]).ok, false);
      assert.deepEqual(linePuzzle(mode, level), puzzle);
    }
  });

  test(mode + ': Slide boards have no overlapping blocks and no pre-solved start', () => {
    const layouts = new Set();

    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const puzzle = slidePuzzle(mode, level);
      assert.equal(puzzle.size, 6);
      assert.equal(slideWon(puzzle.blocks), false);
      assert.deepEqual(slidePuzzle(mode, level), puzzle);

      for (const block of puzzle.blocks) {
        assert.ok(block.x >= 0 && block.y >= 0);
        assert.ok(block.x + block.w <= 6 && block.y + block.h <= 6);
        assert.ok(block.axis === 'x' || block.axis === 'y');

        const wrongAxis = moveSlide(puzzle.blocks, block.id, 2);
        assert.equal(wrongAxis, puzzle.blocks);
      }

      for (let i = 0; i < puzzle.blocks.length; i += 1) {
        const a = puzzle.blocks[i];
        for (let j = i + 1; j < puzzle.blocks.length; j += 1) {
          const b = puzzle.blocks[j];
          const overlap = a.x < b.x + b.w && a.x + a.w > b.x
            && a.y < b.y + b.h && a.y + a.h > b.y;
          assert.equal(overlap, false, 'Collision on level ' + level);
        }
      }

      layouts.add(puzzle.blocks.map(block => block.id + ':' + block.x + ':' + block.y).join('|'));
    }

    assert.equal(layouts.size, MAX_LEVEL, 'Each level must have a distinct sliding board');
  });

  test(mode + ': Memory has ordered, unique, deterministic tiles', () => {
    const sequences = new Set();

    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const puzzle = memoryPuzzle(mode, level);
      assert.ok(puzzle.sequence.length >= 3 && puzzle.sequence.length <= 8);
      assert.equal(new Set(puzzle.sequence).size, puzzle.sequence.length);
      assert.ok(puzzle.sequence.every(tile => Number.isInteger(tile) && tile >= 0 && tile < puzzle.size ** 2));
      assert.deepEqual(memoryPuzzle(mode, level), puzzle);
      sequences.add(puzzle.sequence.join(','));
    }

    assert.equal(sequences.size, MAX_LEVEL, 'Each level must present a distinct ordered tile sequence');
  });
}
