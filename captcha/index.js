class StateAction {
  state;
  insertCount = 0;
  hasExecuted = false;
  getState() {
    if (!this.state) {
      throw new Error('State is not set');
    }
    return this.state;
  }
  insertAction(state, action, ms) {
    const startingIndex = state.actions.findIndex(a => a.action === this) ?? -1;
    const index = startingIndex + this.insertCount + 1;
    state.actions.splice(index, 0, new AutomatedAction(action, ms));
    this.insertCount++;
  }
  execute(state) {
    if (this.hasExecuted) {
      return;
    }
    this.state = state;
    this.act();
    this.hasExecuted = true;
  }
  act() {}
}
class SpawnReserveBall extends StateAction {
  tinyPhysics;
  act() {
    const localState = this.getState();
    const ball = new PachinkoBall(105, 240, this.tinyPhysics);
    ball.point.damping = 1;
    localState.pachinkoBalls.push(ball);
    localState.reserveBalls.push(ball);
  }
  constructor(tinyPhysics) {
    super();
    this.tinyPhysics = tinyPhysics;
  }
}
class DespawnBottomReserveBall extends StateAction {
  tinyPhysics;
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
  constructor(tinyPhysics) {
    super();
    this.tinyPhysics = tinyPhysics;
  }
}
class DoSpawnInitialReserveBalls extends StateAction {
  tinyPhysics;
  numBalls;
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
  constructor(numBalls, tinyPhysics) {
    super();
    this.numBalls = numBalls;
    this.tinyPhysics = tinyPhysics;
  }
}
class SpawnPachinkoBall extends StateAction {
  x;
  y;
  force;
  tinyPhysics;
  act() {
    const localState = this.getState();
    const ball = new PachinkoBall(this.x, this.y, this.tinyPhysics);
    ball.point.ax = -this.force;
    ball.point.ay = -this.force;
    localState.pachinkoBalls.push(ball);
  }
  constructor(x, y, force, tinyPhysics) {
    super();
    this.x = x;
    this.y = y;
    this.force = force;
    this.tinyPhysics = tinyPhysics;
  }
}
class SpawnAnimatedParticle extends StateAction {
  x;
  y;
  animName;
  durationMs;
  act() {
    const state = this.getState();
    state.animatedParticles.push(
      new AnimatedParticle(this.x, this.y, this.animName, this.durationMs)
    );
  }
  constructor(x, y, animName, durationMs) {
    super();
    this.x = x;
    this.y = y;
    this.animName = animName;
    this.durationMs = durationMs;
  }
}
class DoDeactivatePrimaryFlowerRoof extends StateAction {
  tinyPhysics;
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
  constructor(tinyPhysics) {
    super();
    this.tinyPhysics = tinyPhysics;
  }
}
class DoActivateFlowerRoof extends StateAction {
  flowerSensor;
  tinyPhysics;
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
  constructor(flowerSensor, tinyPhysics) {
    super();
    this.flowerSensor = flowerSensor;
    this.tinyPhysics = tinyPhysics;
  }
}
class DoDeactivateFlowerRoof extends StateAction {
  flowerSensor;
  tinyPhysics;
  act() {
    const state = this.getState();
    const flowerSensor = this.flowerSensor;
    flowerSensor.flowerRoof.deactivate(state, this.tinyPhysics);
  }
  constructor(flowerSensor, tinyPhysics) {
    super();
    this.flowerSensor = flowerSensor;
    this.tinyPhysics = tinyPhysics;
  }
}
class DoGetBallInFlower extends StateAction {
  flowerSensor;
  tinyPhysics;
  act() {
    const state = this.getState();
    const flowerSensor = this.flowerSensor;
    const ball = flowerSensor.ball;
    if (ball) {
      ball.remove(this.tinyPhysics);
      state.pachinkoBalls = state.pachinkoBalls.filter(b => b !== ball);
      state.score += 1500;
      if (state.flowerRoofs.indexOf(flowerSensor.flowerRoof) === 0) {
        state.score += 9500;
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
  constructor(flowerSensor, tinyPhysics) {
    super();
    this.flowerSensor = flowerSensor;
    this.tinyPhysics = tinyPhysics;
  }
}
class PushIconStack extends StateAction {
  icon;
  static NUM_ICONS = 7;
  act() {
    const state = this.getState();
    state.iconStack.push(this.icon);
  }
  constructor(icon) {
    super();
    this.icon = icon;
  }
}
class DoGameComplete extends StateAction {
  act() {
    const state = this.getState();
    const globalWindow = window;
    if (Math.floor(state.score) > getScoreTarget()) {
      globalWindow.showSuccessMessage(Math.floor(state.score));
      state.showConfetti = true;
    } else {
      globalWindow.showFailMessage(Math.floor(state.score));
    }
  }
}
class Animation {
  name;
  loop;
  sprites;
  done;
  totalDurationMs;
  currentSpriteIndex;
  timestampStart;
  timestampPause;
  constructor(loop) {
    this.loop = loop || false;
    this.sprites = [];
    this.done = false;
    this.timestampPause = 0;
    this.totalDurationMs = 0;
    this.currentSpriteIndex = 0;
    this.timestampStart = 0;
    this.name = '';
  }
  reset() {
    this.done = false;
    this.currentSpriteIndex = 0;
  }
  start() {
    this.timestampStart = performance.now();
  }
  getDurationMs() {
    return this.totalDurationMs;
  }
  getLongestFrameMs() {
    return this.sprites.reduce((ms, sprite) => {
      return sprite.duration > ms ? sprite.duration : ms;
    }, 0);
  }
  getLongestFrameIndex() {
    let ms = 0;
    return this.sprites.reduce((ind, sprite, i) => {
      if (sprite.duration > ms) {
        ms = sprite.duration;
        return i;
      } else {
        return ind;
      }
    }, 0);
  }
  getDurationToIndex(i) {
    if (i >= this.sprites.length) {
      return this.totalDurationMs;
    } else {
      return this.sprites[i]?.durationUpToNow ?? 0;
    }
  }
  addSprite({ name, duration, offsetX, offsetY, opacity }) {
    this.sprites.push({
      name: name || '',
      timestampBegin: this.totalDurationMs,
      timestampEnd: this.totalDurationMs + (duration ?? 0),
      duration: duration ?? 0,
      durationUpToNow: this.totalDurationMs,
      offsetX: offsetX || 0,
      offsetY: offsetY || 0,
      opacity,
      hasPlayedSound: false,
    });
    this.totalDurationMs += duration ?? 0;
  }
  getAnimIndex(timestampNow) {
    let lastIndex = 0;
    let leftI = this.currentSpriteIndex;
    let rightI = this.sprites.length - 1;
    while (leftI <= rightI) {
      const midI = leftI + Math.floor((rightI - leftI) / 2);
      lastIndex = midI;
      const { timestampEnd, timestampBegin } = this.sprites[midI];
      const beginTime = (timestampBegin || 0) + this.timestampStart;
      const endTime = (timestampEnd || 0) + this.timestampStart;
      if (timestampNow < endTime && timestampNow > beginTime) {
        return midI;
      }
      if (timestampNow >= endTime) {
        leftI = midI + 1;
      } else {
        rightI = midI - 1;
      }
    }
    return lastIndex;
  }
  update() {
    const now = performance.now();
    if (this.currentSpriteIndex === this.sprites.length - 1) {
      if (this.loop && now - this.timestampStart > this.totalDurationMs) {
        const newStart = this.timestampStart + this.totalDurationMs;
        this.reset();
        this.start();
        if (now - newStart < this.totalDurationMs) {
          this.timestampStart = newStart;
        }
      }
    }
    this.currentSpriteIndex = this.getAnimIndex(now);
    if (!this.loop) {
      if (now - this.timestampStart >= this.totalDurationMs) {
        this.done = true;
      }
    }
  }
  getSpriteName(i) {
    return this.sprites[i ?? this.currentSpriteIndex]?.name;
  }
  setCurrentSprite(i) {
    this.currentSpriteIndex = i;
  }
  isDone() {
    return this.done;
  }
}
const animationBuilders = {};
const createAnimationBuilder = (name, builder) => {
  animationBuilders[name] = builder;
};
const hasAnimation = animName => {
  if (animationBuilders[animName] || animName === 'invisible') {
    return true;
  } else {
    return false;
  }
};
const createAnimation = animName => {
  if (animName === 'invisible') {
    const anim = new Animation(false);
    anim.addSprite({ name: 'invisible', duration: 100 });
    return anim;
  }
  const builder = animationBuilders[animName];
  if (builder) {
    const anim = builder();
    anim.name = animName;
    anim.start();
    return anim;
  } else {
    throw new Error(`No animation exists which is named '${animName}'`);
  }
};
const confetti = [];
const gravity = 0.5;
const terminalVelocity = 5;
const drag = 0.075;
const colors = [
  { front: 'red', back: 'darkred' },
  { front: 'green', back: 'darkgreen' },
  { front: 'blue', back: 'darkblue' },
  { front: 'yellow', back: 'darkyellow' },
  { front: 'orange', back: 'darkorange' },
  { front: 'pink', back: 'darkpink' },
  { front: 'purple', back: 'darkpurple' },
  { front: 'turquoise', back: 'darkturquoise' },
];
const randomRange = (min, max) => Math.random() * (max - min) + min;
const initConfetti = (canvas, count) => {
  for (let i = 0; i < count; i++) {
    confetti.push({
      color: colors[Math.floor(randomRange(0, colors.length))],
      dimensions: {
        x: randomRange(10, 20),
        y: randomRange(10, 30),
      },
      position: {
        x: randomRange(0, canvas.width),
        y: canvas.height - 1,
      },
      rotation: randomRange(0, 2 * Math.PI),
      scale: {
        x: 1,
        y: 1,
      },
      velocity: {
        x: randomRange(-25, 25),
        y: randomRange(0, -50),
      },
    });
  }
};
const drawConfetti = (ctx, canvas) => {
  confetti.forEach((confetto, index) => {
    const width = confetto.dimensions.x * confetto.scale.x;
    const height = confetto.dimensions.y * confetto.scale.y;
    ctx.translate(confetto.position.x, confetto.position.y);
    ctx.rotate(confetto.rotation);
    confetto.velocity.x -= confetto.velocity.x * drag;
    confetto.velocity.y = Math.min(
      confetto.velocity.y + gravity,
      terminalVelocity
    );
    confetto.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();
    confetto.position.x += confetto.velocity.x;
    confetto.position.y += confetto.velocity.y;
    if (confetto.position.y >= canvas.height) confetti.splice(index, 1);
    if (confetto.position.x > canvas.width) confetto.position.x = 0;
    if (confetto.position.x < 0) confetto.position.x = canvas.width;
    confetto.scale.y = Math.cos(confetto.position.y * 0.1);
    ctx.fillStyle =
      confetto.scale.y > 0 ? confetto.color.front : confetto.color.back;
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  });
};
const getPrimaryFlowerRoof = state => {
  return state.flowerRoofs[0];
};
const getSecondaryFlowerRoofs = state => {
  return state.flowerRoofs.slice(1);
};
const getPrimaryFlashingArrows = state => {
  return state.flashingArrows.slice(6);
};
const getSecondaryFlashingArrowsForInd = (state, ind) => {
  return state.flashingArrows.slice(ind * 2, ind * 2 + 2);
};
const loadImagesAndSprites = async r => {
  const imagePaths = [
    'res/pin.png',
    'res/machine0Bg.png',
    'res/machine0Fg.png',
    'res/machine0Flowers.png',
    'res/spinner.png',
    'res/ball.png',
    'res/handle.png',
    'res/button.png',
    'res/buttonPressed.png',
    'res/interlace.png',
    'res/icon_start0.png',
    'res/icon_loading.png',
  ];
  for (let i = 0; i < PushIconStack.NUM_ICONS; i++) {
    imagePaths.push(`res/icon_fail${i}.png`);
    imagePaths.push(`res/icon_good${i}.png`);
  }
  const imageNames = imagePaths.map(path =>
    path.replace('res/', '').replace('.png', '')
  );
  const loadedSprites = await Promise.all(
    imagePaths.map(path => loadImageAsSprite(path))
  );
  loadedSprites.forEach((sprite, index) => {
    r.sprites[imageNames[index]] = sprite;
  });
  const flashingArrowSprites = await loadImageAsSprites(
    'res/flashingArrows.png',
    13,
    15
  );
  flashingArrowSprites.forEach((sprite, index) => {
    r.sprites[`flashingArrow_${index}`] = sprite;
  });
  const dullArrowSprites = await loadImageAsSprites(
    'res/dullArrows.png',
    13,
    15
  );
  dullArrowSprites.forEach((sprite, index) => {
    r.sprites[`dullArrow_${index}`] = sprite;
  });
  const flowerRoofSprites = await loadImageAsSprites(
    'res/flowerRoof.png',
    37,
    30
  );
  flowerRoofSprites.forEach((sprite, index) => {
    r.sprites[`flowerRoof_${index}`] = sprite;
  });
  const ballGetSprites = await loadImageAsSprites('res/ballGet.png', 9, 6);
  ballGetSprites.forEach((sprite, index) => {
    r.sprites[`ballGet_${index}`] = sprite;
  });
  const shootArrowSprites = await loadImageAsSprites(
    'res/shootArrow.png',
    50,
    44
  );
  shootArrowSprites.forEach((sprite, index) => {
    r.sprites[`shootArrow_${index}`] = sprite;
  });
  const iconLoadingAnimSprites = await loadImageAsSprites(
    'res/icon_loading_anim.png',
    36,
    36
  );
  iconLoadingAnimSprites.forEach((sprite, index) => {
    r.sprites[`iconLoadingAnim_${index}`] = sprite;
  });
  const iconFail5AnimSprites = await loadImageAsSprites(
    'res/icon_fail5_anim.png',
    36,
    36
  );
  iconFail5AnimSprites.forEach((sprite, index) => {
    r.sprites[`iconFail5Anim_${index}`] = sprite;
  });
};
const loadAnimations = async () => {
  createAnimationBuilder('icon_start0', () => {
    const anim = new Animation(true);
    anim.name = 'icon_start0';
    anim.addSprite({ name: 'icon_start0', duration: 1000 });
    return anim;
  });
  for (let i = 0; i < PushIconStack.NUM_ICONS; i++) {
    createAnimationBuilder(`icon_fail${i}`, () => {
      const anim = new Animation(true);
      anim.name = `icon_fail${i}`;
      anim.addSprite({ name: `icon_fail${i}`, duration: 1000 });
      return anim;
    });
    createAnimationBuilder(`icon_good${i}`, () => {
      const anim = new Animation(true);
      anim.name = `icon_good${i}`;
      anim.addSprite({ name: `icon_good${i}`, duration: 1000 });
      return anim;
    });
  }
  createAnimationBuilder('icon_loading', () => {
    const anim = new Animation(true);
    anim.name = 'icon_loading';
    for (let i = 0; i < 4; i++) {
      anim.addSprite({ name: `iconLoadingAnim_${i}`, duration: 300 });
    }
    return anim;
  });
  createAnimationBuilder('icon_fail5', () => {
    const anim = new Animation(true);
    anim.name = 'icon_fail5';
    for (let i = 0; i < 2; i++) {
      anim.addSprite({ name: `iconFail5Anim_${i}`, duration: 300 });
    }
    return anim;
  });
  createAnimationBuilder('shootArrow', () => {
    const anim = new Animation(true);
    anim.name = 'shootArrow';
    anim.addSprite({ name: 'shootArrow_0', duration: 700 });
    anim.addSprite({ name: 'shootArrow_1', duration: 700 });
    return anim;
  });
  createAnimationBuilder('shootArrow2', () => {
    const anim = new Animation(true);
    anim.name = 'shootArrow2';
    anim.addSprite({ name: 'shootArrow_1', duration: 700 });
    anim.addSprite({ name: 'shootArrow_0', duration: 700 });
    return anim;
  });
  createAnimationBuilder('flowerRoofOpen', () => {
    const anim = new Animation(false);
    anim.name = 'flowerRoofOpen';
    anim.addSprite({ name: 'flowerRoof_0', duration: 100 });
    anim.addSprite({ name: 'flowerRoof_1', duration: 100 });
    anim.addSprite({ name: 'flowerRoof_2', duration: 100 });
    anim.addSprite({ name: 'flowerRoof_4', duration: 100 });
    return anim;
  });
  createAnimationBuilder('flowerRoofClose', () => {
    const anim = new Animation(false);
    anim.name = 'flowerRoofClose';
    anim.addSprite({ name: 'flowerRoof_5', duration: 100 });
    anim.addSprite({ name: 'flowerRoof_6', duration: 100 });
    anim.addSprite({ name: 'flowerRoof_7', duration: 100 });
    anim.addSprite({ name: 'flowerRoof_8', duration: 100 });
    return anim;
  });
  createAnimationBuilder('flashingArrow0', () => {
    const anim = new Animation(true);
    anim.name = 'flashingArrow0';
    anim.addSprite({ name: 'flashingArrow_0', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_1', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_2', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_3', duration: 100 });
    return anim;
  });
  createAnimationBuilder('flashingArrow1', () => {
    const anim = new Animation(true);
    anim.name = 'flashingArrow1';
    anim.addSprite({ name: 'flashingArrow_1', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_2', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_3', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_0', duration: 100 });
    return anim;
  });
  createAnimationBuilder('flashingArrow2', () => {
    const anim = new Animation(true);
    anim.name = 'flashingArrow2';
    anim.addSprite({ name: 'flashingArrow_2', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_3', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_0', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_1', duration: 100 });
    return anim;
  });
  createAnimationBuilder('flashingArrow3', () => {
    const anim = new Animation(true);
    anim.addSprite({ name: 'flashingArrow_3', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_0', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_1', duration: 100 });
    anim.addSprite({ name: 'flashingArrow_2', duration: 100 });
    return anim;
  });
  createAnimationBuilder('dullArrow', () => {
    const anim = new Animation(true);
    anim.loop = false;
    anim.addSprite({ name: 'dullArrow_3', duration: 100 });
    anim.addSprite({ name: 'dullArrow_2', duration: 100 });
    anim.addSprite({ name: 'dullArrow_1', duration: 100 });
    anim.addSprite({ name: 'dullArrow_0', duration: 100 });
    return anim;
  });
  createAnimationBuilder('ballGet', () => {
    const anim = new Animation(true);
    anim.loop = false;
    anim.addSprite({ name: 'ballGet_0', duration: 100 });
    anim.addSprite({ name: 'ballGet_1', duration: 100 });
    anim.addSprite({ name: 'ballGet_2', duration: 100 });
    anim.addSprite({ name: 'ballGet_3', duration: 100 });
    anim.addSprite({ name: 'ballGet_4', duration: 100 });
    return anim;
  });
};
const createMachineIntoState = (machine, state, tinyPhysics) => {
  for (const line of machine.lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const edgePoint = line[i];
      const nextEdgePoint = line[i + 1];
      state.edges.push(
        new Edge(
          edgePoint[0],
          edgePoint[1],
          nextEdgePoint[0],
          nextEdgePoint[1],
          tinyPhysics
        )
      );
    }
  }
  for (const flower of machine.flowers) {
    for (let i = 0; i < flower.length - 1; i++) {
      const flowerPoint = flower[i];
      const nextFlowerPoint = flower[i + 1];
      state.edges.push(
        new Edge(
          flowerPoint[0],
          flowerPoint[1],
          nextFlowerPoint[0],
          nextFlowerPoint[1],
          tinyPhysics
        )
      );
    }
  }
  for (const roof of machine.flower_roofs) {
    const flowerRoof = new FlowerRoof(roof);
    state.flowerRoofs.push(flowerRoof);
    state.flowerSensors.push(
      new FlowerSensor(roof[1][0], roof[1][1] + 15, flowerRoof)
    );
    if (state.flowerSensors.length === 3) {
      state.flowerSensors[state.flowerSensors.length - 1].y += 10;
    }
  }
  for (const arm of machine.arms) {
    const armPoints = arm;
    const segArm = new ArmSegment(armPoints, tinyPhysics);
    state.armSegments.push(segArm);
    state.spinners.push(
      new Spinner(armPoints[0][0], armPoints[0][1] - 10, segArm)
    );
  }
  for (const pin of machine.pins) {
    for (let i = 0; i < pin.length; i++) {
      const pinPoint = pin[i];
      state.pins.push(new Pin(pinPoint[0], pinPoint[1], tinyPhysics));
    }
  }
  state.flashingArrows.push(new FlashingArrow(0, 223, 210, -45));
  state.flashingArrows.push(new FlashingArrow(0, 223 - 30, 210, 180 + 45));
  state.flashingArrows.push(new FlashingArrow(0, 272, 180, -60));
  state.flashingArrows.push(new FlashingArrow(0, 272 - 27, 180, 180 + 60));
  state.flashingArrows.push(new FlashingArrow(0, 320, 210, -45));
  state.flashingArrows.push(new FlashingArrow(0, 320 - 30, 210, 180 + 45));
  state.flashingArrows.push(new FlashingArrow(0, 276, 100, -45));
  state.flashingArrows.push(new FlashingArrow(1, 276 + 9, 100 - 11, -45));
  state.flashingArrows.push(
    new FlashingArrow(2, 276 + 9 * 2, 100 - 11 * 2, -45)
  );
  state.flashingArrows.push(
    new FlashingArrow(3, 276 + 9 * 3, 100 - 11 * 3, -45)
  );
  state.flashingArrows.push(new FlashingArrow(0, 276 - 37, 100, 180 + 45));
  state.flashingArrows.push(
    new FlashingArrow(1, 276 - 37 - 9, 100 - 11, 180 + 45)
  );
  state.flashingArrows.push(
    new FlashingArrow(2, 276 - 37 - 9 * 2, 100 - 11 * 2, 180 + 45)
  );
  state.flashingArrows.push(
    new FlashingArrow(3, 276 - 37 - 9 * 3, 100 - 11 * 3, 180 + 45)
  );
  const primaryFlashingArrows = getPrimaryFlashingArrows(state);
  for (const arrow of primaryFlashingArrows) {
    arrow.isFlashing = false;
  }
};
const calcDist = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};
class GameManager {
  r;
  tinyPhysics;
  state = new State();
  renderWidth = 390;
  renderHeight = 300;
  isGameComplete = false;
  constructor() {
    const canvas = createCanvas(this.renderWidth, this.renderHeight);
    const div = document.getElementById('game-canvas');
    if (div) {
      div.appendChild(canvas);
    }
    this.r = new Renderer(canvas);
    this.tinyPhysics = new TinyPhysics(
      this.r.context,
      canvas.width,
      canvas.height
    );
    initConfetti(canvas, 100);
  }
  async load() {
    await loadImagesAndSprites(this.r);
    await loadAnimations();
  }
  start() {
    this.state.pachinkoBalls = [];
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
    this.state.iconAnim = createAnimation('icon_start0');
    this.loop();
  }
  loop() {
    const physicsStep = 1 / 60;
    let prevTime = 0;
    const _updateLoop = () => {
      this.update(physicsStep);
      this.update(physicsStep);
      this.update(physicsStep);
      this.update(physicsStep);
    };
    const _renderLoop = currentTime => {
      const timeSinceLastUpdate = currentTime - prevTime;
      prevTime = currentTime;
      this.draw(timeSinceLastUpdate);
      requestAnimationFrame(_renderLoop);
    };
    setInterval(_updateLoop, 1000 / 60);
    requestAnimationFrame(_renderLoop);
  }
  isCollidingWithFlowerSensor(ball, flowerSensor) {
    return (
      calcDist(ball.point.x, ball.point.y, flowerSensor.x, flowerSensor.y) <
      flowerSensor.radius + ball.point.radius
    );
  }
  update(physicsStep) {
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
  draw(dt) {
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
        pachinkoBall.point.x - 5,
        pachinkoBall.point.y - 5
      );
    }
    timerUpdate(this.state.iconTimer, dt);
    if (timerIsComplete(this.state.iconTimer)) {
      const icon = this.state.iconStack.shift();
      if (icon) {
        timerStart(this.state.iconTimer);
        this.state.iconAnim = createAnimation(icon);
        this.state.iconAnim.start();
      } else {
        this.state.iconAnim = createAnimation('icon_start0');
        this.state.iconAnim.start();
      }
    }
    if (this.isGameComplete) {
      if (this.state.iconAnim?.name !== 'icon_loading') {
        this.state.iconAnim = createAnimation('icon_loading');
        this.state.iconAnim.start();
      }
    }
    if (this.state.iconAnim) {
      this.r.drawAnimation(
        this.state.iconAnim,
        this.renderWidth - 36 - 7,
        6,
        0
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
    if (this.state.showConfetti) {
      drawConfetti(this.r.context, this.r.canvas);
    }
  }
}
function normalize(x, a, b, c, d) {
  return c + ((x - a) * (d - c)) / (b - a);
}
const handleShootClick = game => {
  game.state.shootPressed = false;
  if (game.isGameComplete || game.state.numReserveBalls <= 0) {
    return;
  }
  const buckets = [
    [14000, 15500],
    [14500, 15500],
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
const Machine0 = {
  lines: [
    [
      [100, 246 - 7],
      [159, 300 - 3],
    ],
    [
      [115, 225 - 3],
      [170, 300 - 3],
    ],
    [
      [229, 14],
      [221, 15],
      [209, 17],
      [196, 20],
      [185, 24],
      [177, 28],
      [169, 33],
      [161, 40],
      [154, 47],
      [148, 55],
      [142, 65],
      [137, 74],
      [133, 83],
      [129, 93],
      [126, 101],
      [124, 107],
      [123, 111],
      [122, 115],
      [121, 119],
      [120, 123],
      [119, 128],
      [118, 133],
      [117, 139],
      [116, 147],
      [115, 162],
      [116, 177],
      [118, 189],
      [122, 203],
      [130, 222],
      [137, 235],
      [144, 246],
      [196, 298],
    ],
    [
      [148 + 25, 55],
      [142 + 25, 65],
      [137 + 25, 74],
      [133 + 25, 83],
      [129 + 25, 93],
      [126 + 25, 101],
      [124 + 25, 107],
      [123 + 25, 111],
      [122 + 25, 115],
      [121 + 25, 119],
      [120 + 25, 123],
      [119 + 25, 128],
      [118 + 25, 133],
      [117 + 25, 139],
      [116 + 25, 147],
      [115 + 25, 162],
      [116 + 25, 177],
      [118 + 25, 189],
      [122 + 25, 203],
      [130 + 25, 222],
      [137 + 25, 235],
      [144 + 25, 246],
      [196 + 25, 298],
    ],
    [
      [229 - 15, 2],
      [240 - 15, 3],
      [264 - 15, 4],
      [292 - 15, 5],
      [302 - 15, 6],
      [309 - 15, 7],
      [317 - 15, 9],
      [324 - 15, 11],
      [331 - 15, 14],
      [336 - 15, 17],
      [340 - 15, 19],
      [345 - 15, 22],
      [349 - 15, 26],
      [353 - 15, 30],
      [357 - 15, 36],
      [361 - 15, 40],
      [365 - 15, 46],
      [368 - 15, 51],
      [371 - 15, 56],
      [374 - 15, 61],
      [376 - 15, 66],
      [378 - 15, 73],
      [380 - 15, 82],
      [382 - 15, 89],
      [383 - 15, 99],
      [385 - 15, 111],
      [387 - 15, 129],
      [388 - 15, 139],
      [387 - 15, 150],
      [386 - 15, 161],
      [384 - 15, 174],
      [382 - 15, 186],
      [379 - 15, 198],
      [377 - 15, 209],
      [373 - 15, 217],
      [369 - 15, 225],
      [364 - 15, 233],
      [360 - 15, 239],
      [356 - 15, 243],
      [352 - 15, 248],
      [349 - 15, 251],
      [344 - 15, 255],
      [339 - 15, 258],
      [334 - 15, 261],
      [328 - 15, 264],
      [322 - 15, 267],
      [311 - 15, 269],
      [299 - 15, 271],
      [291 - 15, 272],
      [264 - 15, 273],
      [241 - 15, 274],
      [228 - 15, 275],
    ],
  ],
  pins: [
    [
      [168, 125],
      [171, 171],
      [180, 139],
      [195 - 16, 74],
      [196, 223],
      [203, 139],
      [204, 208],
      [207 - 16, 88],
      [215, 125],
      [223, 179],
      [224, 208],
      [230 - 16, 88],
      [232, 223],
      [232, 153],
      [236, 38],
      [239, 190],
      [240, 114],
      [242 - 16, 74],
      [251, 204],
      [252, 139],
      [252, 100],
      [263, 51],
      [264, 171],
      [275, 139],
      [275, 100],
      [277, 204],
      [286, 38],
      [287, 114],
      [289, 190],
      [294, 221],
      [294, 152],
      [294 + 6, 74],
      [302, 206],
      [305, 179],
      [306 + 6, 88],
      [308, 125],
      [320, 139],
      [322, 206],
      [329 + 6, 88],
      [330, 221],
      [341 + 6, 74],
      [343, 139],
      [354, 170],
      [355, 125],
    ],
  ],
  flowers: [
    [
      [252, 124],
      [254, 130],
      [259, 133],
      [268, 133],
      [273, 130],
      [275, 124],
    ],
    [
      [203, 235],
      [205, 241],
      [210, 244],
      [219, 244],
      [224, 241],
      [226, 235],
    ],
    [
      [251, 214],
      [253, 220],
      [258, 223],
      [270, 223],
      [275, 220],
      [277, 214],
    ],
    [
      [301, 234],
      [303, 240],
      [308, 243],
      [317, 243],
      [322, 240],
      [324, 234],
    ],
  ],
  flower_roofs: [
    [
      [248, 124],
      [263, 110],
      [279, 124],
    ],
    [
      [199, 235],
      [214, 221],
      [230, 235],
    ],
    [
      [247, 204],
      [264, 190],
      [282, 204],
    ],
    [
      [297, 234],
      [312, 220],
      [328, 234],
    ],
  ],
  arms: [
    [
      [192, 147],
      [192, 130],
      [192, 115],
    ],
    [
      [219 - 16, 97],
      [219 - 16, 80],
      [219 - 16, 65],
    ],
    [
      [318 + 6, 96],
      [318 + 6, 79],
      [318 + 6, 64],
    ],
    [
      [332, 147],
      [332, 130],
      [332, 115],
    ],
  ],
};
const getScoreTarget = () => {
  const params = window.location.search.split('?')[1];
  const paramsObj = new URLSearchParams(params);
  const scoreTarget = paramsObj.get('scoreTarget') ?? '15000';
  return parseInt(scoreTarget);
};
const loadImageAsSprite = async path => {
  const image = new Image();
  image.src = path;
  await image.decode();
  return {
    image,
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };
};
const loadImageAsSprites = async (path, spriteWidth, spriteHeight) => {
  const image = new Image();
  image.src = path;
  await image.decode();
  const sprites = [];
  const spritesPerRow = Math.floor(image.width / spriteWidth);
  const rows = Math.floor(image.height / spriteHeight);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < spritesPerRow; col++) {
      sprites.push({
        image,
        x: col * spriteWidth,
        y: row * spriteHeight,
        width: spriteWidth,
        height: spriteHeight,
      });
    }
  }
  return sprites;
};
const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
const getCanvasContext = canvas => {
  return canvas.getContext('2d');
};
class Renderer {
  canvas;
  context;
  sprites = {};
  debug = false;
  mouseX = 0;
  mouseY = 0;
  constructor(canvas) {
    this.canvas = canvas;
    const context = getCanvasContext(canvas);
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.context = context;
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
    });
  }
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  drawLine(x1, y1, x2, y2, width, color) {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.strokeStyle = color;
    this.context.lineWidth = width;
    this.context.stroke();
  }
  drawRect(x, y, width, height, color) {
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    this.context.fillStyle = color;
    this.context.fill();
  }
  drawCircle(x, y, radius, color) {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, 2 * Math.PI);
    this.context.fillStyle = color;
    this.context.fill();
  }
  drawText(text, x, y, color) {
    this.context.fillStyle = color;
    this.context.font = '16px Arial';
    this.context.fillText(text, x, y);
  }
  drawTextEx(text, x, y, color, font) {
    this.context.fillStyle = color;
    this.context.font = font;
    this.context.fillText(text, x, y);
  }
  drawSprite(sprite, x, y) {
    this.context.drawImage(
      sprite.image,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      x,
      y,
      sprite.width,
      sprite.height
    );
  }
  drawSpriteRotated(sprite, x, y, degrees) {
    const radians = (degrees * Math.PI) / 180;
    this.context.save();
    this.context.translate(x + sprite.width / 2, y + sprite.height / 2);
    this.context.rotate(radians);
    this.context.drawImage(
      sprite.image,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height
    );
    this.context.restore();
  }
  drawAnimation(animation, x, y, degrees) {
    animation.update();
    const spriteName = animation.getSpriteName();
    const sprite = this.sprites[spriteName];
    if (sprite) {
      if (degrees !== undefined) {
        this.drawSpriteRotated(sprite, x, y, degrees);
      } else {
        this.drawSprite(sprite, x, y);
      }
    }
  }
  drawFlashingArrow(arrow) {
    if (arrow.isFlashing) {
      this.drawAnimation(arrow.flashingAnim, arrow.x, arrow.y, arrow.angle);
    } else {
      this.drawAnimation(arrow.dullAnim, arrow.x, arrow.y, arrow.angle);
    }
  }
  drawMouseCoordinates() {
    const x = Math.round(this.mouseX);
    const y = Math.round(this.mouseY);
    this.drawText(`(${x}, ${y})`, 10, 100, 'white');
  }
  drawPachinkoBall(ball) {
    this.drawCircle(ball.point.x, ball.point.y, ball.point.radius, 'red');
  }
  drawPin(pin) {
    this.drawSprite(this.sprites.pin, pin.slope.x1, pin.slope.y1);
  }
  drawArmSegment(armSegment) {
    for (const arm of armSegment.arms) {
      this.drawLine(arm.p1.x, arm.p1.y, arm.p2.x, arm.p2.y, 1, 'green');
    }
    for (const point of armSegment.points) {
      this.drawCircle(point.x, point.y, point.radius, 'lightgreen');
    }
  }
  drawFlowerSensor(flowerSensor) {
    this.drawCircle(
      flowerSensor.x,
      flowerSensor.y,
      flowerSensor.radius,
      'blue'
    );
  }
  drawSpinner(spinner) {
    this.drawSpriteRotated(
      this.sprites.spinner,
      spinner.x - 13,
      spinner.y - 13,
      spinner.angle
    );
  }
  drawFlowerRoof(flowerRoof) {
    if (flowerRoof.active) {
      this.drawAnimation(
        flowerRoof.activeAnim,
        flowerRoof.x - 18,
        flowerRoof.y - 15
      );
    } else {
      this.drawAnimation(
        flowerRoof.inactiveAnim,
        flowerRoof.x - 18,
        flowerRoof.y - 15
      );
    }
  }
  drawAnimatedParticle(particle) {
    this.drawAnimation(particle.anim, particle.x, particle.y);
  }
}
class Removable {
  removeFlag;
  constructor() {
    this.removeFlag = false;
  }
  shouldRemove() {
    return this.removeFlag;
  }
}
class PachinkoBall extends Removable {
  point;
  constructor(x, y, tinyPhysics) {
    super();
    this.point = new Point(x, y, false);
    this.point.radius = 4;
    this.point.damping = 0.991;
    tinyPhysics.add(this.point);
  }
  remove(tinyPhysics) {
    tinyPhysics.remove(this.point);
  }
}
class Pin {
  slope;
  constructor(x, y, tinyPhysics) {
    this.slope = new Slope(x - 2, y + 1, x + 2, y - 1);
    tinyPhysics.add(this.slope);
  }
  remove(tinyPhysics) {
    tinyPhysics.remove(this.slope);
  }
}
class ArmSegment {
  points = [];
  arms = [];
  constructor(points, tinyPhysics) {
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
  remove(tinyPhysics) {
    for (const point of this.points) {
      tinyPhysics.remove(point);
    }
    for (const arm of this.arms) {
      tinyPhysics.remove(arm);
    }
  }
}
class Edge {
  slope;
  constructor(x1, y1, x2, y2, tinyPhysics) {
    this.slope = new Slope(x1, y1, x2, y2);
    tinyPhysics.add(this.slope);
  }
  remove(tinyPhysics) {
    tinyPhysics.remove(this.slope);
  }
}
class FlowerRoof {
  x;
  y;
  activeAnim;
  inactiveAnim;
  pointList;
  active;
  edges = [];
  constructor(pointList) {
    this.x = pointList[1][0];
    this.y = pointList[1][1];
    this.activeAnim = createAnimation('flowerRoofOpen');
    this.inactiveAnim = createAnimation('flowerRoofClose');
    this.pointList = pointList;
  }
  activate(state, tinyPhysics) {
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
  deactivate(state, tinyPhysics) {
    this.active = false;
    this.inactiveAnim.start();
    for (const edge of this.edges) {
      edge.remove(tinyPhysics);
      state.edges.splice(state.edges.indexOf(edge), 1);
    }
  }
}
class FlashingArrow {
  flashingAnim;
  dullAnim;
  x;
  y;
  angle;
  index;
  isFlashing;
  constructor(index, x, y, angle) {
    this.x = x;
    this.y = y;
    this.flashingAnim = createAnimation('flashingArrow' + index);
    this.dullAnim = createAnimation('dullArrow');
    this.angle = angle;
    this.isFlashing = true;
    this.index = index;
  }
}
class Spinner {
  x;
  y;
  angle;
  arm;
  rotationVx;
  spinDirection;
  startingAngle;
  constructor(x, y, arm) {
    this.x = x;
    this.y = y;
    this.arm = arm;
    this.angle = 0;
    this.startingAngle = 0;
    this.rotationVx = 0;
    this.spinDirection = 1;
  }
}
class FlowerSensor {
  x;
  y;
  flowerRoof;
  contactTimer;
  isContacting;
  radius;
  ball;
  constructor(x, y, flowerRoof) {
    this.x = x;
    this.y = y;
    this.flowerRoof = flowerRoof;
    this.contactTimer = createTimer(500);
    this.isContacting = false;
    this.radius = 5;
  }
}
class AnimatedParticle {
  x;
  y;
  anim;
  timer;
  constructor(x, y, animName, durationMs) {
    this.x = x;
    this.y = y;
    this.anim = createAnimation(animName);
    this.timer = createTimer(durationMs);
  }
}
class AutomatedAction {
  timer;
  action;
  constructor(action, ms) {
    this.timer = createTimer(ms);
    this.action = action;
  }
  update(dt) {
    timerUpdate(this.timer, dt);
  }
  isComplete() {
    return timerIsComplete(this.timer);
  }
}
class State {
  actions = [];
  parallelActions = [];
  pachinkoBalls = [];
  edges = [];
  pins = [];
  armSegments = [];
  flowerRoofs = [];
  flowerSensors = [];
  flashingArrows = [];
  spinners = [];
  animatedParticles = [];
  reserveBalls = [];
  numReserveBalls = 20;
  score = 0;
  showConfetti = false;
  uiShootArrow0;
  uiShootArrow1;
  shootPressed = false;
  iconStack = [];
  iconTimer = createTimer(2000);
  iconAnim;
  handle = {
    x: 45,
    y: 265,
    rotationDeg: 0,
    maxRotationDeg: 30,
  };
}
const enqueueAction = (state, action, ms) => {
  state.actions.push(new AutomatedAction(action, ms));
};
const addParallelAction = (state, action, ms) => {
  state.parallelActions.push(new AutomatedAction(action, ms));
};
const updateStateActions = (state, dt) => {
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
  for (let i = 0; i < state.parallelActions.length; i++) {
    const automatedAction = state.parallelActions[i];
    automatedAction.update(dt);
    if (automatedAction.isComplete()) {
      if (automatedAction.action) {
        automatedAction.action.execute(state);
      }
      state.parallelActions.splice(i, 1);
      i--;
    }
  }
};
const createTimer = duration => {
  return {
    t: 0,
    duration: Math.max(0, duration),
  };
};
const timerStart = (timer, duration) => {
  timer.t = 0;
  if (duration !== undefined) {
    timer.duration = duration;
  }
};
const timerIsComplete = timer => {
  return timer.t >= timer.duration;
};
const timerIsRunning = timer => {
  return timer.t < timer.duration;
};
const timerGetPercentComplete = timer => {
  if (timer.duration === 0) {
    return 1;
  }
  return timer.t / timer.duration;
};
const timerUpdate = (timer, dt) => {
  if (timerIsComplete(timer)) {
    return;
  }
  timer.t += dt;
  if (timerIsComplete(timer)) {
    timer.t = timer.duration;
    return;
  }
};
class TinyPhysics {
  ctx;
  points;
  arms;
  slopes;
  gravity;
  solverIterations;
  canvasWidth;
  canvasHeight;
  constructor(ctx, canvasWidth, canvasHeight) {
    this.ctx = ctx;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.points = [];
    this.arms = [];
    this.slopes = [];
    this.gravity = 100.3;
    this.solverIterations = 10;
  }
  updateCanvasDimensions(newWidth, newHeight) {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
  }
  add(obj) {
    if (obj.type === 'arm') {
      this.arms.push(obj);
    } else if (obj.type === 'point') {
      this.points.push(obj);
    } else {
      this.slopes.push(obj);
    }
  }
  remove(obj) {
    if (obj.type === 'arm') {
      this.arms = this.arms.filter(a => a !== obj);
    } else if (obj.type === 'point') {
      this.points = this.points.filter(p => p !== obj);
    } else {
      this.slopes = this.slopes.filter(s => s !== obj);
    }
  }
  getClosestPointOnLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return { x: x1, y: y1 };
    }
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    let closestX, closestY;
    if (t < 0) {
      closestX = x1;
      closestY = y1;
    } else if (t > 1) {
      closestX = x2;
      closestY = y2;
    } else {
      closestX = x1 + t * dx;
      closestY = y1 + t * dy;
    }
    return { x: closestX, y: closestY };
  }
  run(dt) {
    for (const p of this.points) {
      if (!p.fixed) {
        const prevX = p.oldX;
        const prevY = p.oldY;
        p.oldX = p.x;
        p.oldY = p.y;
        p.x = p.x + (p.x - prevX) * p.damping + p.ax * dt * dt;
        p.y = p.y + (p.y - prevY) * p.damping + (p.ay + this.gravity) * dt * dt;
      } else {
        p.oldX = p.x;
        p.oldY = p.y;
      }
    }
    for (const p of this.points) {
      if (!p.fixed) {
        const prev_dx = p.x - p.oldX;
        const prev_dy = p.y - p.oldY;
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.oldX = p.x + prev_dx * p.bounce;
        } else if (p.x + p.radius > this.canvasWidth) {
          p.x = this.canvasWidth - p.radius;
          p.oldX = p.x + prev_dx * p.bounce;
        }
        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.oldY = p.y + prev_dy * p.bounce;
        } else if (p.y + p.radius > this.canvasHeight) {
          p.y = this.canvasHeight - p.radius;
          p.oldY = p.y + prev_dy * p.bounce;
        }
      }
    }
    for (let iter = 0; iter < this.solverIterations; iter++) {
      for (const a of this.arms) {
        const p1 = a.p1;
        const p2 = a.p2;
        const dxArm = p2.x - p1.x;
        const dyArm = p2.y - p1.y;
        const distanceArmSquared = dxArm * dxArm + dyArm * dyArm;
        if (distanceArmSquared < 1e-9) continue;
        const distanceArm = Math.sqrt(distanceArmSquared);
        const error = a.armLength - distanceArm;
        const percent = error / distanceArm / 2;
        const offsetX = dxArm * percent;
        const offsetY = dyArm * percent;
        if (!p1.fixed) {
          p1.x -= offsetX;
          p1.y -= offsetY;
        }
        if (!p2.fixed) {
          p2.x += offsetX;
          p2.y += offsetY;
        }
      }
      for (const p of this.points) {
        if (!p.fixed) {
          for (const s of this.slopes) {
            let pushCount = 0;
            const maxPushes = 10;
            while (this.circleLineCollision(p, s) && pushCount < maxPushes) {
              const closestPoint = this.getClosestPointOnLineSegment(
                p.x,
                p.y,
                s.x1,
                s.y1,
                s.x2,
                s.y2
              );
              const vecQPx = p.x - closestPoint.x;
              const vecQPy = p.y - closestPoint.y;
              const distQP = Math.sqrt(vecQPx * vecQPx + vecQPy * vecQPy);
              let penetration = p.radius - distQP;
              if (penetration > -1e-9) {
                if (penetration < 0) penetration = 0;
                let pushNx, pushNy;
                if (distQP < 1e-9) {
                  pushNx = Math.cos(s.surfaceNormal);
                  pushNy = Math.sin(s.surfaceNormal);
                  penetration = p.radius;
                } else {
                  pushNx = vecQPx / distQP;
                  pushNy = vecQPy / distQP;
                }
                if (penetration > 1e-9) {
                  const vx_incident = p.x - p.oldX;
                  const vy_incident = p.y - p.oldY;
                  const v_dot_N = vx_incident * pushNx + vy_incident * pushNy;
                  p.x += pushNx * penetration;
                  p.y += pushNy * penetration;
                  if (v_dot_N < 0) {
                    const restitution = p.bounce;
                    const new_vx =
                      vx_incident - (1 + restitution) * v_dot_N * pushNx;
                    const new_vy =
                      vy_incident - (1 + restitution) * v_dot_N * pushNy;
                    p.oldX = p.x - new_vx;
                    p.oldY = p.y - new_vy;
                  }
                } else {
                  break;
                }
              } else {
                break;
              }
              pushCount++;
            }
          }
        }
      }
      this.handlePointCollisions();
    }
  }
  handlePointCollisions() {
    const points = this.points;
    const numPoints = points.length;
    for (let i = 0; i < numPoints; i++) {
      const p1 = points[i];
      for (let j = i + 1; j < numPoints; j++) {
        const p2 = points[j];
        if (p1.fixed && p2.fixed) {
          continue;
        }
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distanceSquared = dx * dx + dy * dy;
        const sumRadii = p1.radius + p2.radius;
        const sumRadiiSquared = sumRadii * sumRadii;
        if (distanceSquared < sumRadiiSquared) {
          const distance = Math.sqrt(distanceSquared);
          let normalX;
          let normalY;
          if (distance < 1e-9) {
            normalX = 1;
            normalY = 0;
          } else {
            normalX = dx / distance;
            normalY = dy / distance;
          }
          const overlap = sumRadii - (distance < 1e-9 ? 0 : distance);
          if (overlap <= 0) continue;
          if (p1.fixed) {
            p2.x += overlap * normalX;
            p2.y += overlap * normalY;
          } else if (p2.fixed) {
            p1.x -= overlap * normalX;
            p1.y -= overlap * normalY;
          } else {
            const halfOverlap = overlap * 0.5;
            p1.x -= halfOverlap * normalX;
            p1.y -= halfOverlap * normalY;
            p2.x += halfOverlap * normalX;
            p2.y += halfOverlap * normalY;
          }
        }
      }
    }
  }
  render() {
    for (const p of this.points) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'black';
      this.ctx.fill();
    }
    for (const a of this.arms) {
      this.ctx.beginPath();
      this.ctx.moveTo(a.p1.x, a.p1.y);
      this.ctx.lineTo(a.p2.x, a.p2.y);
      this.ctx.strokeStyle = 'red';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    for (const s of this.slopes) {
      this.ctx.beginPath();
      this.ctx.moveTo(s.x1, s.y1);
      this.ctx.lineTo(s.x2, s.y2);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = 'black';
      this.ctx.stroke();
    }
  }
  circleLineCollision(circle, line) {
    let v1 = {
      x: line.x2 - line.x1,
      y: line.y2 - line.y1,
    };
    let v2 = {
      x: line.x1 - circle.x,
      y: line.y1 - circle.y,
    };
    let b = (v1.x * v2.x + v1.y * v2.y) * -2;
    v1 = { x: line.x2 - line.x1, y: line.y2 - line.y1 };
    v2 = { x: line.x1 - circle.x, y: line.y1 - circle.y };
    b = (v1.x * v2.x + v1.y * v2.y) * -2;
    const c = 2 * (v1.x * v1.x + v1.y * v1.y);
    const d = Math.sqrt(
      b * b -
        2 * c * (v2.x * v2.x + v2.y * v2.y - circle.radius * circle.radius)
    );
    if (isNaN(d)) {
      return false;
    }
    const u1 = (b - d) / c;
    const u2 = (b + d) / c;
    if ((u1 <= 1 && u1 >= 0) || (u2 <= 1 && u2 >= 0)) {
      return true;
    }
    return false;
  }
}
class Point {
  x;
  y;
  oldX;
  oldY;
  ax;
  ay;
  fixed;
  damping;
  radius;
  type;
  bounce = 0.7;
  constructor(x, y, fixed = false) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.ax = 0;
    this.ay = 0;
    this.fixed = fixed;
    this.damping = 0.99;
    this.radius = 10;
    this.type = 'point';
  }
}
class Arm {
  p1;
  p2;
  armLength;
  type;
  constructor(p1, p2, armLength) {
    this.p1 = p1;
    this.p2 = p2;
    this.armLength = armLength;
    this.type = 'arm';
  }
}
class Slope {
  x1;
  y1;
  x2;
  y2;
  surfaceNormal;
  type;
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.surfaceNormal =
      Math.atan2(this.y2 - this.y1, this.x2 - this.x1) - Math.PI * 0.5;
    this.type = 'slope';
  }
}
{
  TinyPhysics, Point, Arm, Slope;
}
