import {
  getPrimaryFlashingArrows,
  getPrimaryFlowerRoof,
  getSecondaryFlashingArrowsForInd,
  getSecondaryFlowerRoofs,
} from './Db';
import {
  AutomatedAction,
  enqueueAction,
  FlowerSensor,
  PachinkoBall,
  State,
  AnimatedParticle,
  addParallelAction,
} from './State';
import { timerStart } from './Timer';
import { TinyPhysics } from './TinyPhysics';

export class StateAction {
  state: State | undefined;
  insertCount = 0;
  hasExecuted = false;

  getState() {
    if (!this.state) {
      throw new Error('State is not set');
    }
    return this.state;
  }

  insertAction(state: State, action: StateAction | undefined, ms: number) {
    const startingIndex = state.actions.findIndex(a => a.action === this) ?? -1;
    const index = startingIndex + this.insertCount + 1;
    state.actions.splice(index, 0, new AutomatedAction(action, ms));
    this.insertCount++;
  }

  execute(state: State) {
    if (this.hasExecuted) {
      return;
    }
    this.state = state;
    this.act();
    this.hasExecuted = true;
  }

  act() {}
}

export class SpawnReserveBall extends StateAction {
  tinyPhysics: TinyPhysics;

  act() {
    const localState = this.getState();
    const ball = new PachinkoBall(105, 240, this.tinyPhysics);
    ball.point.damping = 1;
    localState.pachinkoBalls.push(ball);
    localState.reserveBalls.push(ball);
  }

  constructor(tinyPhysics: TinyPhysics) {
    super();
    this.tinyPhysics = tinyPhysics;
  }
}

export class DespawnBottomReserveBall extends StateAction {
  tinyPhysics: TinyPhysics;

  act() {
    const localState = this.getState();
    const ball = localState.reserveBalls.shift();
    if (ball) {
      ball.remove(this.tinyPhysics);
      const ind = localState.pachinkoBalls.indexOf(ball);
      if (ind !== -1) {
        localState.pachinkoBalls.splice(ind, 1);
      }
    }

    if (localState.numReserveBalls > 0) {
      localState.numReserveBalls--;
    }

    const numExcessBalls =
      localState.numReserveBalls -
      DoSpawnInitialReserveBalls.NUM_VISIBLE_RESERVE_BALLS;

    if (numExcessBalls > 0) {
      const msDelay =
        100 +
        localState.parallelActions.reduce((prev, curr) => {
          return Math.max(prev, curr.timer.duration);
        }, 0);
      addParallelAction(
        localState,
        new SpawnReserveBall(this.tinyPhysics),
        msDelay
      );
    }
  }

  constructor(tinyPhysics: TinyPhysics) {
    super();
    this.tinyPhysics = tinyPhysics;
  }
}

export class DoSpawnInitialReserveBalls extends StateAction {
  tinyPhysics: TinyPhysics;
  numBalls: number;

  static NUM_VISIBLE_RESERVE_BALLS = 11;
  act() {
    const localState = this.getState();
    for (
      let i = 0;
      i <
      Math.min(
        this.numBalls,
        DoSpawnInitialReserveBalls.NUM_VISIBLE_RESERVE_BALLS
      );
      i++
    ) {
      addParallelAction(
        localState,
        new SpawnReserveBall(this.tinyPhysics),
        50 * i
      );
    }
  }

  constructor(numBalls: number, tinyPhysics: TinyPhysics) {
    super();
    this.numBalls = numBalls;
    this.tinyPhysics = tinyPhysics;
  }
}

export class SpawnPachinkoBall extends StateAction {
  x: number;
  y: number;
  force: number;
  tinyPhysics: TinyPhysics;

  act() {
    const localState = this.getState();
    const ball = new PachinkoBall(this.x, this.y, this.tinyPhysics);
    ball.point.ax = -this.force;
    ball.point.ay = -this.force;
    localState.pachinkoBalls.push(ball);
  }

  constructor(x: number, y: number, force: number, tinyPhysics: TinyPhysics) {
    super();
    this.x = x;
    this.y = y;
    this.force = force;
    this.tinyPhysics = tinyPhysics;
  }
}

export class SpawnAnimatedParticle extends StateAction {
  x: number;
  y: number;
  animName: string;
  durationMs: number;

  act() {
    const state = this.getState();
    state.animatedParticles.push(
      new AnimatedParticle(this.x, this.y, this.animName, this.durationMs)
    );
  }

  constructor(x: number, y: number, animName: string, durationMs: number) {
    super();
    this.x = x;
    this.y = y;
    this.animName = animName;
    this.durationMs = durationMs;
  }
}

export class DoDeactivatePrimaryFlowerRoof extends StateAction {
  tinyPhysics: TinyPhysics;

  act() {
    const state = this.getState();
    console.log('deactivate primary');
    const primaryRoof = getPrimaryFlowerRoof(state);
    primaryRoof.deactivate(state, this.tinyPhysics);
    const primaryArrows = getPrimaryFlashingArrows(state);
    for (const arrow of primaryArrows) {
      arrow.isFlashing = true;
    }
  }

  constructor(tinyPhysics: TinyPhysics) {
    super();
    this.tinyPhysics = tinyPhysics;
  }
}

export class DoActivateFlowerRoof extends StateAction {
  flowerSensor: FlowerSensor;
  tinyPhysics: TinyPhysics;

  act() {
    const state = this.getState();
    const flowerSensor = this.flowerSensor;
    flowerSensor.flowerRoof.activate(state, this.tinyPhysics);
    const flowerInd = state.flowerSensors.indexOf(flowerSensor);
    const arrows = getSecondaryFlashingArrowsForInd(state, flowerInd - 1);
    for (const arrow of arrows) {
      arrow.isFlashing = false;
    }

    const shouldOpenPrimary = getSecondaryFlowerRoofs(state).reduce(
      (prev, curr) => {
        return prev && curr.active;
      },
      true
    );
    if (shouldOpenPrimary && getPrimaryFlowerRoof(state).active) {
      enqueueAction(state, undefined, 300);
      enqueueAction(
        state,
        new DoDeactivatePrimaryFlowerRoof(this.tinyPhysics),
        0
      );
    }
  }

  constructor(flowerSensor: FlowerSensor, tinyPhysics: TinyPhysics) {
    super();
    this.flowerSensor = flowerSensor;
    this.tinyPhysics = tinyPhysics;
  }
}

export class DoDeactivateFlowerRoof extends StateAction {
  flowerSensor: FlowerSensor;
  tinyPhysics: TinyPhysics;

  act() {
    const state = this.getState();
    const flowerSensor = this.flowerSensor;
    flowerSensor.flowerRoof.deactivate(state, this.tinyPhysics);
  }

  constructor(flowerSensor: FlowerSensor, tinyPhysics: TinyPhysics) {
    super();
    this.flowerSensor = flowerSensor;
    this.tinyPhysics = tinyPhysics;
  }
}

export class DoGetBallInFlower extends StateAction {
  flowerSensor: FlowerSensor;
  tinyPhysics: TinyPhysics;

  act() {
    const state = this.getState();
    const flowerSensor = this.flowerSensor;
    const ball = flowerSensor.ball;
    if (ball) {
      ball.remove(this.tinyPhysics);
      state.pachinkoBalls = state.pachinkoBalls.filter(b => b !== ball);
      state.score += 1000;
      if (state.flowerRoofs.indexOf(flowerSensor.flowerRoof) === 0) {
        state.score += 4000;
      }

      enqueueAction(
        state,
        new SpawnAnimatedParticle(
          flowerSensor.flowerRoof.pointList[1][0] - 4,
          ball.point.y - 4,
          'ballGet',
          1000
        ),
        0
      );
    }
    if (
      !flowerSensor.flowerRoof.active &&
      state.flowerRoofs.indexOf(flowerSensor.flowerRoof) !== 0
    ) {
      enqueueAction(
        state,
        new DoActivateFlowerRoof(flowerSensor, this.tinyPhysics),
        0
      );
    } else if (flowerSensor.flowerRoof.active) {
      enqueueAction(
        state,
        new DoDeactivateFlowerRoof(flowerSensor, this.tinyPhysics),
        0
      );
    }

    enqueueAction(
      state,
      new PushIconStack(
        'icon_good' + Math.floor(Math.random() * PushIconStack.NUM_ICONS)
      ),
      0
    );

    flowerSensor.isContacting = false;
    flowerSensor.ball = undefined;
  }

  constructor(flowerSensor: FlowerSensor, tinyPhysics: TinyPhysics) {
    super();
    this.flowerSensor = flowerSensor;
    this.tinyPhysics = tinyPhysics;
  }
}

export class PushIconStack extends StateAction {
  icon: string;

  static NUM_ICONS = 7;

  act() {
    const state = this.getState();
    state.iconStack.push(this.icon);
  }

  constructor(icon: string) {
    super();
    this.icon = icon;
  }
}

export class DoGameComplete extends StateAction {
  act() {
    const state = this.getState();
    const globalWindow = window as any;
    if (Math.floor(state.score) > 10000) {
      globalWindow.showSuccessMessage(Math.floor(state.score));
    } else {
      globalWindow.showFailMessage(Math.floor(state.score));
    }
  }
}
