// class ShootPachinkoBall {

import { AutomatedAction, PachinkoBall, State } from './State';
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
