import { GameManager } from './GameManager';
import { SpawnPachinkoBall } from './Actions';
import { enqueueAction } from './State';

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

  window.addEventListener('keydown', ev => {
    console.log('keydown', ev.key);
    if (ev.key === ' ') {
      const randomForce =
        Math.floor(Math.random() * (19000 - 16000 + 1)) + 16000;

      console.log('enqueueing action spawn ball', randomForce);
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
    }
  });
});
