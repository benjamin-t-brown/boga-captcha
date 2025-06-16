import { TinyPhysics, Point, Arm, Slope } from './TinyPhysics';
import {
  Edge,
  Pin,
  PachinkoBall,
  State,
  updateStateActions,
  ArmSegment,
  FlowerSensor,
  enqueueAction,
} from './State';
import {
  DoActivateFlowerRoof,
  DoDeactivateFlowerRoof,
  DoGameComplete,
  DoGetBallInFlower,
  DoSpawnInitialReserveBalls,
  PushIconStack,
} from './Actions';
import { createCanvas, Renderer, loadImageAsSprite } from './Renderer';
import { Machine0 } from './Machines';
import {
  createMachineIntoState,
  getPrimaryFlashingArrows,
  getPrimaryFlowerRoof,
  getSecondaryFlashingArrowsForInd,
  getSecondaryFlowerRoofs,
  loadAnimations,
  loadImagesAndSprites,
} from './Db';
import { timerIsComplete, timerStart, timerUpdate } from './Timer';
import { createAnimation } from './Animation';

const calcDist = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

export class GameManager {
  r: Renderer;
  tinyPhysics: TinyPhysics;
  state: State = new State();
  renderWidth: number = 390;
  renderHeight: number = 300;
  isGameComplete: boolean = false;

  constructor() {
    const canvas = createCanvas(this.renderWidth, this.renderHeight);
    document.body.appendChild(canvas);
    this.r = new Renderer(canvas);
    this.tinyPhysics = new TinyPhysics(
      this.r.context,
      canvas.width,
      canvas.height
    );
  }

  async load() {
    await loadImagesAndSprites(this.r);
    await loadAnimations();
  }

  start() {
    this.state.pachinkoBalls = [
      // new PachinkoBall(105, 210, this.tinyPhysics),
      // new PachinkoBall(265, 212, this.tinyPhysics),
      // new PachinkoBall(215, 235, this.tinyPhysics),
      // new PachinkoBall(312, 151, this.tinyPhysics),
    ];

    createMachineIntoState(Machine0, this.state, this.tinyPhysics);
    this.state.flowerRoofs[0].activate(this.state, this.tinyPhysics);

    enqueueAction(
      this.state,
      new DoSpawnInitialReserveBalls(
        this.state.numReserveBalls,
        this.tinyPhysics
      ),
      0
    );

    for (const arrow of this.state.flashingArrows) {
      arrow.flashingAnim.start();
    }

    this.state.uiShootArrow0 = createAnimation('shootArrow');
    this.state.uiShootArrow0.start();
    this.state.uiShootArrow1 = createAnimation('shootArrow2');
    this.state.uiShootArrow1.start();

    this.loop();
  }

  loop() {
    const physicsStep = 1 / 60;
    let prevTime = 0;

    const _updateLoop = () => {
      // be fine-grained to avoid balls phasing through walls
      this.update(physicsStep);
      this.update(physicsStep);
      this.update(physicsStep);
      this.update(physicsStep);
    };

    const _renderLoop = (currentTime: number) => {
      const timeSinceLastUpdate = currentTime - prevTime;
      prevTime = currentTime;
      this.draw(timeSinceLastUpdate);
      requestAnimationFrame(_renderLoop);
    };

    setInterval(_updateLoop, 1000 / 60);
    requestAnimationFrame(_renderLoop);
  }

  isCollidingWithFlowerSensor(ball: PachinkoBall, flowerSensor: FlowerSensor) {
    return (
      calcDist(ball.point.x, ball.point.y, flowerSensor.x, flowerSensor.y) <
      flowerSensor.radius + ball.point.radius
    );
  }

  update(physicsStep: number) {
    this.tinyPhysics.run(physicsStep);
    this.tinyPhysics.render();

    for (const ball of this.state.pachinkoBalls) {
      ball.point.ax = 0;
      ball.point.ay = 0;

      for (const pin of this.state.pins) {
        if (
          calcDist(ball.point.x, ball.point.y, pin.slope.x1, pin.slope.y1) <
          ball.point.radius + 3
        ) {
          this.state.score += 1;
          break;
        }
      }

      for (const flowerSensor of this.state.flowerSensors) {
        if (this.isCollidingWithFlowerSensor(ball, flowerSensor)) {
          if (!flowerSensor.isContacting) {
            flowerSensor.isContacting = true;
            flowerSensor.ball = ball;
            timerStart(flowerSensor.contactTimer);

            break;
          }
        } else if (flowerSensor.isContacting && flowerSensor.ball === ball) {
          flowerSensor.isContacting = false;
          flowerSensor.ball = undefined;
          break;
        }
      }

      if (ball.point.y > 290 && ball.point.x > 200) {
        ball.removeFlag = true;
        if (this.state.iconStack.length === 0) {
          enqueueAction(
            this.state,
            new PushIconStack(
              'icon_fail' + Math.floor(Math.random() * PushIconStack.NUM_ICONS)
            ),
            0
          );
        }
      }
    }

    for (let i = 0; i < this.state.pachinkoBalls.length; i++) {
      const ball = this.state.pachinkoBalls[i];
      if (ball.shouldRemove()) {
        ball.remove(this.tinyPhysics);
        this.state.pachinkoBalls.splice(i, 1);
        i--;
      }
    }

    for (const flowerSensor of this.state.flowerSensors) {
      if (flowerSensor.isContacting) {
        timerUpdate(flowerSensor.contactTimer, physicsStep * 100);
        if (timerIsComplete(flowerSensor.contactTimer)) {
          enqueueAction(
            this.state,
            new DoGetBallInFlower(flowerSensor, this.tinyPhysics),
            0
          );
        }
      }
    }

    for (const spinner of this.state.spinners) {
      const bottomPoint = spinner.arm.points[0];
      const secondPoint = spinner.arm.points[1];

      const bottomDist = calcDist(
        bottomPoint.x,
        bottomPoint.y,
        bottomPoint.oldX,
        bottomPoint.oldY
      );
      const secondDist = calcDist(
        secondPoint.x,
        secondPoint.y,
        secondPoint.oldX,
        secondPoint.oldY
      );

      const force = (bottomDist + secondDist) * 100;
      if (Math.abs(force) > 0.01) {
        if (spinner.rotationVx === 0) {
          spinner.spinDirection = Math.random() > 0.5 ? 1 : -1;
          spinner.startingAngle = spinner.angle;
        }
        spinner.rotationVx += force;
      }

      spinner.angle += spinner.rotationVx * spinner.spinDirection * physicsStep;
      spinner.rotationVx = spinner.rotationVx * 0.9;
      if (Math.abs(spinner.rotationVx) < 0.01) {
        spinner.rotationVx = 0;
      } else {
        const angleDiff = Math.abs(spinner.angle - spinner.startingAngle);
        this.state.score += angleDiff;
        spinner.startingAngle = spinner.angle;
      }
    }

    if (this.state.shootPressed) {
      this.state.handle.rotationDeg += 30 * physicsStep;
      if (this.state.handle.rotationDeg > this.state.handle.maxRotationDeg) {
        this.state.handle.rotationDeg = this.state.handle.maxRotationDeg;
      }
    } else {
      this.state.handle.rotationDeg = 0;
    }

    if (
      this.state.numReserveBalls === 0 &&
      this.state.pachinkoBalls.length === 0 &&
      !this.isGameComplete
    ) {
      this.isGameComplete = true;
      enqueueAction(this.state, undefined, 1000);
      enqueueAction(this.state, new DoGameComplete(), 0);
    }

    updateStateActions(this.state, physicsStep * 100);
  }

  draw(dt: number) {
    this.r.clear();
    this.r.drawRect(0, 0, this.renderWidth, this.renderHeight, 'black');

    this.r.drawSprite(this.r.sprites.machine0Bg, 0, 0);
    this.r.drawSprite(this.r.sprites.machine0Flowers, 0, 0);
    for (const arrow of this.state.flashingArrows) {
      this.r.drawFlashingArrow(arrow);
    }

    for (const pachinkoBall of this.state.pachinkoBalls) {
      this.r.drawSprite(
        this.r.sprites.ball,
        pachinkoBall.point.x - 5, // centered
        pachinkoBall.point.y - 5
      );
    }

    timerUpdate(this.state.iconTimer, dt);
    if (timerIsComplete(this.state.iconTimer)) {
      const icon = this.state.iconStack.shift();
      if (icon) {
        timerStart(this.state.iconTimer);
        this.state.icon = icon;
      } else {
        this.state.icon = 'icon_start0';
      }
    }
    if (this.isGameComplete) {
      this.state.icon = 'icon_loading';
    }

    if (this.state.icon) {
      this.r.drawSprite(
        this.r.sprites[this.state.icon],
        this.renderWidth - 36 - 7,
        6
      );
    }

    this.r.drawSprite(this.r.sprites.machine0Fg, 0, 0);

    for (const pin of this.state.pins) {
      this.r.drawPin(pin);
    }

    for (const spinner of this.state.spinners) {
      this.r.drawSpinner(spinner);
    }

    for (const flowerRoof of this.state.flowerRoofs) {
      this.r.drawFlowerRoof(flowerRoof);
    }

    for (let i = 0; i < this.state.animatedParticles.length; i++) {
      const particle = this.state.animatedParticles[i];
      this.r.drawAnimatedParticle(particle);
      timerUpdate(particle.timer, dt);
      if (timerIsComplete(particle.timer)) {
        this.state.animatedParticles.splice(i, 1);
      }
    }

    if (this.r.debug) {
      for (const edge of this.state.edges) {
        this.r.drawLine(
          edge.slope.x1,
          edge.slope.y1,
          edge.slope.x2,
          edge.slope.y2,
          2,
          'white'
        );
      }
      for (const armSegment of this.state.armSegments) {
        this.r.drawArmSegment(armSegment);
      }
      for (const flowerSensor of this.state.flowerSensors) {
        this.r.drawFlowerSensor(flowerSensor);
      }
      this.r.drawMouseCoordinates();
    }

    this.r.drawSprite(
      this.state.shootPressed
        ? this.r.sprites.buttonPressed
        : this.r.sprites.button,
      this.state.handle.x - 30,
      this.state.handle.y - 65
    );
    this.r.drawText(
      'Press',
      this.state.handle.x - 30 + 15,
      this.state.handle.y - 65 + 26,
      'white'
    );

    this.r.drawRect(0, 250, 100, this.renderHeight - 250, 'darkslategray');
    this.r.drawRect(
      0 + 15,
      250 + 50,
      100 - 30,
      this.renderHeight - 250 - 50 - 50,
      'rgba(0, 0, 0, 0.25)'
    );
    this.r.drawSpriteRotated(
      this.r.sprites.handle,
      this.state.handle.x - 66,
      this.state.handle.y - 3,
      this.state.handle.rotationDeg + 1
    );

    const numBalls = this.state.numReserveBalls;
    const paddedNumBalls = numBalls.toString().padStart(3, '0');
    this.r.drawTextEx(paddedNumBalls, 111, 29, 'white', '32px Digital7');

    const scorePadded = Math.floor(this.state.score)
      .toString()
      .padStart(6, '0');
    this.r.drawTextEx(scorePadded, 323, 292, 'yellow', '22px Digital7');

    if (this.state.uiShootArrow0) {
      this.r.drawAnimation(this.state.uiShootArrow0, 1, 150, 60);
      this.r.drawAnimation(this.state.uiShootArrow1, 50, 150, 180 - 60);
    }
  }
}
