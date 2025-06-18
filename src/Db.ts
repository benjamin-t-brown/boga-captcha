import { Machine0 } from './Machines';
import { loadImageAsSprite, loadImageAsSprites, Renderer } from './Renderer';
import { TinyPhysics } from './TinyPhysics';
import {
  ArmSegment,
  Edge,
  FlashingArrow,
  FlowerRoof,
  FlowerSensor,
  Pin,
  Spinner,
  State,
} from './State';
import { Animation, createAnimationBuilder } from './Animation';
import { PushIconStack } from './Actions';

export const getPrimaryFlowerRoof = (state: State) => {
  return state.flowerRoofs[0];
};

export const getSecondaryFlowerRoofs = (state: State) => {
  return state.flowerRoofs.slice(1);
};

export const getPrimaryFlashingArrows = (state: State) => {
  return state.flashingArrows.slice(6);
};

export const getSecondaryFlashingArrowsForInd = (state: State, ind: number) => {
  return state.flashingArrows.slice(ind * 2, ind * 2 + 2);
};

export const loadImagesAndSprites = async (r: Renderer) => {
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

export const loadAnimations = async () => {
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

export const createMachineIntoState = (
  machine: typeof Machine0,
  state: State,
  tinyPhysics: TinyPhysics
) => {
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
    const flowerRoof = new FlowerRoof(roof as [number, number][]);
    state.flowerRoofs.push(flowerRoof);
    state.flowerSensors.push(
      new FlowerSensor(roof[1][0], roof[1][1] + 15, flowerRoof)
    );

    // middle bottom sensor is a bit lower
    if (state.flowerSensors.length === 3) {
      state.flowerSensors[state.flowerSensors.length - 1].y += 10;
    }
    // for (let i = 0; i < roof.length - 1; i++) {
    //   const roofPoint = roof[i];
    //   const nextRoofPoint = roof[i + 1];
    //   state.edges.push(
    //     new Edge(
    //       roofPoint[0],
    //       roofPoint[1],
    //       nextRoofPoint[0],
    //       nextRoofPoint[1],
    //       tinyPhysics
    //     )
    //   );
    // }
  }

  for (const arm of machine.arms) {
    const armPoints = arm;
    const segArm = new ArmSegment(armPoints as [number, number][], tinyPhysics);
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

  // VERY LAZY HACK: manually putting the ui stuff here
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
