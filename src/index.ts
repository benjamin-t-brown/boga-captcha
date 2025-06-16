import { GameManager } from './GameManager';
import {
  DespawnBottomReserveBall,
  SpawnPachinkoBall,
  SpawnReserveBall,
} from './Actions';
import { enqueueAction } from './State';

function normalize(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  return c + ((x - a) * (d - c)) / (b - a);
}

const handleShootClick = (game: GameManager) => {
  game.state.shootPressed = false;
  if (game.isGameComplete || game.state.numReserveBalls <= 0) {
    return;
  }

  const buckets = [
    [15800, 16200],
    [16500, 17500],
    [16700, 18500],
    [17500, 19000],
  ];

  const ind = Math.floor(
    normalize(
      game.state.handle.rotationDeg,
      0,
      game.state.handle.maxRotationDeg,
      0,
      3
    )
  );

  console.log('ind', ind);

  const [minVal, maxVal] = buckets[ind];
  const randomForce =
    Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;

  enqueueAction(
    game.state,
    new SpawnPachinkoBall(
      game.renderWidth / 2 + 5,
      game.renderHeight - 10,
      randomForce,
      game.tinyPhysics
    ),
    0
  );
  enqueueAction(game.state, new DespawnBottomReserveBall(game.tinyPhysics), 0);
};

window.addEventListener('load', () => {
  const game = new GameManager();
  console.log('game', game);
  game
    .load()
    .then(() => {
      console.log('Game loaded');
      game.start();
    })
    .catch(e => {
      console.error('Error starting game', e);
    });
  window.addEventListener('touchstart', e => {
    const rect = game.r.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX =
      ((touch.clientX - rect.left) / rect.width) * game.r.canvas.width;
    const touchY =
      ((touch.clientY - rect.top) / rect.height) * game.r.canvas.height;
    const shootButtonCoords = [
      [18, 200],
      [87, 238],
    ];
    const [x1, y1] = shootButtonCoords[0];
    const [x2, y2] = shootButtonCoords[1];
    const isInShootButton =
      touchX >= x1 && touchX <= x2 && touchY >= y1 && touchY <= y2;
    if (isInShootButton) {
      game.state.shootPressed = true;
    }
  });

  window.addEventListener('touchend', ev => {
    if (game.state.shootPressed) {
      handleShootClick(game);
      ev.preventDefault();
    }
  });

  window.addEventListener('mousedown', e => {
    const rect = game.r.canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * game.r.canvas.width;
    const mouseY =
      ((e.clientY - rect.top) / rect.height) * game.r.canvas.height;
    const shootButtonCoords = [
      [18, 200],
      [87, 238],
    ];
    const [x1, y1] = shootButtonCoords[0];
    const [x2, y2] = shootButtonCoords[1];
    const isInShootButton =
      mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2;
    if (isInShootButton) {
      game.state.shootPressed = true;
    }
  });

  window.addEventListener('mouseup', () => {
    if (game.state.shootPressed) {
      handleShootClick(game);
    }
  });

  window.addEventListener('keydown', ev => {
    if (ev.key === ' ') {
      game.state.shootPressed = true;
    }
    if (ev.key === 'r') {
      enqueueAction(game.state, new SpawnReserveBall(game.tinyPhysics), 0);
    }
    if (ev.key === '~' && ev.shiftKey) {
      game.r.debug = !game.r.debug;
    }
  });

  window.addEventListener('keyup', ev => {
    console.log('keyup', ev.key);
    if (ev.key === ' ') {
      handleShootClick(game);
    }
  });
});
