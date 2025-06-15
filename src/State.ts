import { StateAction } from './Actions';
import { Arm, Point, Slope, TinyPhysics } from './TinyPhysics';
import { createTimer, Timer, timerIsComplete, timerUpdate } from './Timer';
import { createAnimation, Animation } from './Animation';

export class Removable {
  removeFlag: boolean;
  constructor() {
    this.removeFlag = false;
  }
  shouldRemove() {
    return this.removeFlag;
  }
}

export class PachinkoBall extends Removable {
  point: Point;

  constructor(x: number, y: number, tinyPhysics: TinyPhysics) {
    super();
    this.point = new Point(x, y, false);
    this.point.radius = 4;
    this.point.damping = 0.991;
    tinyPhysics.add(this.point);
  }

  remove(tinyPhysics: TinyPhysics) {
    tinyPhysics.remove(this.point);
  }
}

export class Pin {
  slope: Slope;
  constructor(x: number, y: number, tinyPhysics: TinyPhysics) {
    this.slope = new Slope(x - 2, y + 1, x + 2, y - 1);
    tinyPhysics.add(this.slope);
  }

  remove(tinyPhysics: TinyPhysics) {
    tinyPhysics.remove(this.slope);
  }
}

export class ArmSegment {
  points: Point[] = [];
  arms: Arm[] = [];

  constructor(points: [number, number][], tinyPhysics: TinyPhysics) {
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      const p = new Point(x, y, i === points.length - 1);
      p.radius = 2;
      this.points.push(p);
      tinyPhysics.add(p);
    }

    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[i];
      const p1 = this.points[i + 1];
      const dist = Math.sqrt(
        Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2)
      );
      const arm = new Arm(p0, p1, dist);
      this.arms.push(arm);
      tinyPhysics.add(arm);
    }
  }

  remove(tinyPhysics: TinyPhysics) {
    for (const point of this.points) {
      tinyPhysics.remove(point);
    }
    for (const arm of this.arms) {
      tinyPhysics.remove(arm);
    }
  }
}

export class Edge {
  slope: Slope;

  constructor(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tinyPhysics: TinyPhysics
  ) {
    this.slope = new Slope(x1, y1, x2, y2);
    tinyPhysics.add(this.slope);
  }

  remove(tinyPhysics: TinyPhysics) {
    tinyPhysics.remove(this.slope);
  }
}

export class FlowerRoof {
  x: number;
  y: number;
  activeAnim: Animation;
  inactiveAnim: Animation;
  pointList: [number, number][];
  active: boolean;
  edges: Edge[] = [];

  constructor(pointList: [number, number][]) {
    this.x = pointList[1][0];
    this.y = pointList[1][1];
    this.activeAnim = createAnimation('flowerRoofOpen');
    this.inactiveAnim = createAnimation('flowerRoofClose');
    this.pointList = pointList;
  }

  activate(state: State, tinyPhysics: TinyPhysics) {
    this.active = true;
    this.activeAnim.start();
    for (let i = 0; i < this.pointList.length - 1; i++) {
      const roofPoint = this.pointList[i];
      const nextRoofPoint = this.pointList[i + 1];
      const edge = new Edge(
        roofPoint[0],
        roofPoint[1],
        nextRoofPoint[0],
        nextRoofPoint[1],
        tinyPhysics
      );
      state.edges.push(edge);
      this.edges.push(edge);
    }
  }

  deactivate(state: State, tinyPhysics: TinyPhysics) {
    this.active = false;
    this.inactiveAnim.start();
    for (const edge of this.edges) {
      edge.remove(tinyPhysics);
      state.edges.splice(state.edges.indexOf(edge), 1);
    }
  }
}

export class FlashingArrow {
  flashingAnim: Animation;
  dullAnim: Animation;
  x: number;
  y: number;
  angle: number;
  index: number;
  isFlashing: boolean;

  constructor(index: number, x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.flashingAnim = createAnimation('flashingArrow' + index);
    this.dullAnim = createAnimation('dullArrow');
    this.angle = angle;
    this.isFlashing = true;
    this.index = index;
  }
}

export class Spinner {
  x: number;
  y: number;
  angle: number;
  arm: ArmSegment;
  rotationVx: number;
  spinDirection: number;

  constructor(x: number, y: number, arm: ArmSegment) {
    this.x = x;
    this.y = y;
    this.arm = arm;
    this.angle = 0;
    this.rotationVx = 0;
    this.spinDirection = 1;
  }
}

export class FlowerSensor {
  x: number;
  y: number;
  flowerRoof: FlowerRoof;
  contactTimer: Timer;
  isContacting: boolean;
  radius: number;
  ball: PachinkoBall | undefined;
  constructor(x: number, y: number, flowerRoof: FlowerRoof) {
    this.x = x;
    this.y = y;
    this.flowerRoof = flowerRoof;
    this.contactTimer = createTimer(500);
    this.isContacting = false;
    this.radius = 5;
  }
}

export class AutomatedAction {
  timer: Timer;
  action: StateAction | undefined;

  constructor(action: StateAction | undefined, ms: number) {
    this.timer = createTimer(ms);
    this.action = action;
  }

  update(dt: number) {
    timerUpdate(this.timer, dt);
  }
  isComplete() {
    return timerIsComplete(this.timer);
  }
}

export class State {
  pachinkoBalls: PachinkoBall[] = [];
  edges: Edge[] = [];
  pins: Pin[] = [];
  armSegments: ArmSegment[] = [];
  flowerRoofs: FlowerRoof[] = [];
  flowerSensors: FlowerSensor[] = [];
  flashingArrows: FlashingArrow[] = [];
  spinners: Spinner[] = [];
  actions: AutomatedAction[] = [];
}

export const enqueueAction = (
  state: State,
  action: StateAction | undefined,
  ms: number
) => {
  state.actions.push(new AutomatedAction(action, ms));
};

export const updateStateActions = (state: State, dt: number) => {
  const logAutomationUpdates = false;

  let runningAutomations = true;
  let i = 0;
  const maxIterations = 100;
  while (state.actions.length && runningAutomations) {
    i++;
    if (i > maxIterations) {
      throw new Error('Infinite loop in battleV2Update');
    }
    const frontAutomation = state.actions[0];
    if (frontAutomation.action) {
      if (logAutomationUpdates) {
        console.log(
          'execute automation',
          frontAutomation.action.constructor.name
        );
      }
      frontAutomation.action.execute(state);
    }
    frontAutomation.update(dt);
    if (frontAutomation.isComplete()) {
      if (logAutomationUpdates) {
        console.log(
          'automation complete',
          frontAutomation.action?.constructor.name,
          frontAutomation.timer.duration
        );
      }
      state.actions.shift();
      if (frontAutomation.timer.duration === 0) {
        if (logAutomationUpdates) {
          console.log(
            ' continue processing...',
            frontAutomation.action?.constructor.name
          );
        }
        continue;
      }
    }
    runningAutomations = false;
    if (logAutomationUpdates) {
      console.log();
    }
  }
};
