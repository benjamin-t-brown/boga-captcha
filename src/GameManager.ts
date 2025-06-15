import { TinyPhysics, Point, Arm, Slope } from './TinyPhysics';
import {
  Edge,
  Pin,
  PachinkoBall,
  State,
  updateStateActions,
  ArmSegment,
  FlowerSensor,
} from './State';
import { createCanvas, Renderer, loadImageAsSprite } from './Renderer';
import { Machine0 } from './Machines';
import {
  createMachineIntoState,
  loadAnimations,
  loadImagesAndSprites,
} from './db';
import { timerIsComplete, timerStart, timerUpdate } from './Timer';

const calcDist = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

export class GameManager {
  r: Renderer;
  tinyPhysics: TinyPhysics;
  state: State = new State();
  renderWidth: number = 390;
  renderHeight: number = 300;

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
      new PachinkoBall(10, 10, this.tinyPhysics),
      new PachinkoBall(215, 235, this.tinyPhysics),
      // new PachinkoBall(200, 200, 4, this.tinyPhysics),
    ];

    createMachineIntoState(Machine0, this.state, this.tinyPhysics);
    this.state.flowerRoofs[0].activate(this.state, this.tinyPhysics);

    for (const arrow of this.state.flashingArrows) {
      arrow.flashingAnim.start();
    }

    this.loop();
  }

  loop() {
    const desiredFps = 60;
    const fixedDt = 1 / desiredFps;
    let fixedUpdateTime = 0;

    const _updateLoop = () => {
      // im a goofball and forgot my screen updates at 144hz
      this.update(fixedDt);
      this.update(fixedDt);
      this.update(fixedDt);
      this.update(fixedDt);
      fixedUpdateTime += 16;
    };

    const _renderLoop = (currentTime: number) => {
      const timeSinceLastUpdate = currentTime - fixedUpdateTime;
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

  update(fixedDt: number) {
    this.tinyPhysics.run(fixedDt);
    this.tinyPhysics.render();

    for (const ball of this.state.pachinkoBalls) {
      ball.point.ax = 0;
      ball.point.ay = 0;

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

      if (ball.point.y > 290 && ball.point.x > 227 && ball.point.x < 233) {
        ball.removeFlag = true;
      }
    }

    this.state.pachinkoBalls = this.state.pachinkoBalls.filter(
      ball => !ball.shouldRemove()
    );

    for (const flowerSensor of this.state.flowerSensors) {
      if (flowerSensor.isContacting) {
        timerUpdate(flowerSensor.contactTimer, fixedDt * 100);
        if (timerIsComplete(flowerSensor.contactTimer)) {
          const ball = flowerSensor.ball;
          if (ball) {
            ball.remove(this.tinyPhysics);
            this.state.pachinkoBalls = this.state.pachinkoBalls.filter(
              b => b !== ball
            );
          }
          if (!flowerSensor.flowerRoof.active) {
            flowerSensor.flowerRoof.activate(this.state, this.tinyPhysics);
          }
          flowerSensor.isContacting = false;
          flowerSensor.ball = undefined;
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
        }
        spinner.rotationVx += force;
      }

      spinner.angle += spinner.rotationVx * spinner.spinDirection * fixedDt;
      spinner.rotationVx = spinner.rotationVx * 0.9;
      if (Math.abs(spinner.rotationVx) < 0.01) {
        spinner.rotationVx = 0;
      }
    }

    updateStateActions(this.state, fixedDt);
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
      this.r.drawCircle(
        pachinkoBall.point.x,
        pachinkoBall.point.y,
        pachinkoBall.point.radius,
        'red'
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
    }

    this.r.drawMouseCoordinates();
  }
}

// const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

// if (!canvas) {
//   throw new Error('Canvas element not found!');
// }

// const ctx = canvas.getContext('2d');

// if (!ctx) {
//   throw new Error('2D context not available!');
// }

// interface MouseState {
//   x: number;
//   y: number;
//   down: boolean;
// }

// const mouse: MouseState = { x: 0, y: 0, down: false };

// let currentPoint: Point | null = null;

// // Declare tinyPhysics here, will be initialized after canvas is sized
// let tinyPhysics: TinyPhysics;

// // Function to resize canvas and update physics engine
// function resizeCanvas() {
//   if (canvas && canvas.parentElement) {
//     canvas.width = canvas.parentElement.offsetWidth;
//     canvas.height = canvas.parentElement.offsetHeight;
//     // If tinyPhysics has been initialized, update its dimensions
//     if (tinyPhysics) {
//       tinyPhysics.updateCanvasDimensions(canvas.width, canvas.height);
//     }
//   }
// }

// // Call resizeCanvas once to set initial canvas dimensions correctly
// resizeCanvas();

// // Now instantiate TinyPhysics with the correct dimensions
// tinyPhysics = new TinyPhysics(ctx, canvas.width, canvas.height);

// // Add the resize event listener
// window.addEventListener('resize', resizeCanvas);

// for (let y = 0; y < 10; y++) {
//   for (let x = 0; x < 10; x++) {
//     tinyPhysics.add(
//       new Point(canvas.width / 2 + x * 30 - 150, 100 + y * 30, !y)
//     );
//   }
// }

// // Assuming tinyPhysics.points is populated correctly by the previous loop
// // and contains Point instances from the TypeScript version.
// if (tinyPhysics.points.length >= 100) {
//   // Ensure enough points exist
//   for (let i = 0; i < 99; i++) {
//     if (!((i + 1) % 10 === 0)) {
//       // Check horizontal connections
//       tinyPhysics.add(
//         new Arm(tinyPhysics.points[i], tinyPhysics.points[i + 1], 30)
//       );
//     }
//     if (i + 10 < 100) {
//       // Check vertical connections
//       tinyPhysics.add(
//         new Arm(tinyPhysics.points[i], tinyPhysics.points[i + 10], 30)
//       );
//     }
//   }
// }

// tinyPhysics.add(new Slope(0, 500, canvas.width, 700));
// tinyPhysics.add(new Slope(canvas.width, 700, canvas.width, 500));

// const p1 = new Point(10, 10);
// const p2 = new Point(110, 10);
// const p3 = new Point(110, 80);
// const p4 = new Point(10, 80);
// tinyPhysics.add(new Arm(p1, p2, 100));
// tinyPhysics.add(new Arm(p2, p3, 70));
// tinyPhysics.add(new Arm(p3, p4, 100));
// tinyPhysics.add(new Arm(p4, p1, 70));
// tinyPhysics.add(new Arm(p1, p3, Math.sqrt(100 * 100 + 70 * 70)));
// tinyPhysics.add(p1);
// tinyPhysics.add(p2);
// tinyPhysics.add(p3);
// tinyPhysics.add(p4);

// // Add a new point to demonstrate gravity and bounce
// const gravityBouncePoint = new Point(canvas.width * 0.5, 50, false); // Start near the top-middle
// gravityBouncePoint.radius = 15;
// gravityBouncePoint.bounce = 0.8; // Set a clear bounce factor
// // No need to set initial oldX/oldY differently if starting from rest, gravity will take over.
// tinyPhysics.add(gravityBouncePoint);

// let lastTime = 0;
// const desiredFps = 60;
// const fixedDt = 1 / desiredFps; // Fixed delta time for 60 FPS

// function loop(currentTime: number) {
//   // The initial checks for canvas and ctx ensure they are not null if this point is reached.
//   // We use non-null assertion operator (!) to satisfy TypeScript's strict null checks here.
//   ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

//   tinyPhysics.run(fixedDt); // Pass fixed delta time
//   tinyPhysics.render();

//   for (let i = 0; i < tinyPhysics.points.length; i++) {
//     const p = tinyPhysics.points[i];
//     if (
//       mouse.x > p.x - p.radius &&
//       mouse.x < p.x + p.radius &&
//       mouse.y > p.y - p.radius &&
//       mouse.y < p.y + p.radius &&
//       mouse.down &&
//       !currentPoint
//     ) {
//       // Check if no point is currently selected
//       currentPoint = p;
//       currentPoint.fixed = true; // Make the point fixed while dragging
//     }
//   }

//   if (currentPoint && mouse.down) {
//     // Ensure mouse is still down for dragging
//     currentPoint.x = mouse.x;
//     currentPoint.y = mouse.y;
//   } else if (currentPoint && !mouse.down) {
//     // Mouse released
//     currentPoint.fixed = false; // Unfix the point
//     currentPoint = null;
//   }

//   requestAnimationFrame(loop);
// }

// // Start the loop
// requestAnimationFrame(loop);

// document.onmousemove = e => {
//   const rect = canvas.getBoundingClientRect();
//   mouse.x = e.clientX - rect.left;
//   mouse.y = e.clientY - rect.top;
// };

// document.onmousedown = e => {
//   mouse.down = true;
//   // Check for point selection on mousedown as well,
//   // this makes picking more responsive.
//   let foundPoint = false;
//   for (let i = 0; i < tinyPhysics.points.length; i++) {
//     const p = tinyPhysics.points[i];
//     if (
//       mouse.x > p.x - p.radius &&
//       mouse.x < p.x + p.radius &&
//       mouse.y > p.y - p.radius &&
//       mouse.y < p.y + p.radius
//     ) {
//       currentPoint = p;
//       currentPoint.fixed = true;
//       foundPoint = true;
//       break;
//     }
//   }
//   if (!foundPoint) {
//     currentPoint = null; // Clear selection if clicking on empty space
//   }
// };

// document.onmouseup = e => {
//   if (currentPoint) {
//     currentPoint.fixed = false; // Unfix the point when mouse is up
//     currentPoint = null;
//   }
//   mouse.down = false;
// };
