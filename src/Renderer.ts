import { Animation } from './Animation';
import {
  Pin,
  PachinkoBall,
  ArmSegment,
  FlashingArrow,
  Spinner,
  FlowerRoof,
  FlowerSensor,
  AnimatedParticle,
} from './State';

export interface Sprite {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const loadImageAsSprite = async (path: string): Promise<Sprite> => {
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

export const loadImageAsSprites = async (
  path: string,
  spriteWidth: number,
  spriteHeight: number
): Promise<Sprite[]> => {
  const image = new Image();
  image.src = path;
  await image.decode();

  const sprites: Sprite[] = [];
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

export const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const getCanvasContext = (canvas: HTMLCanvasElement) => {
  return canvas.getContext('2d');
};

export class Renderer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  sprites: Record<string, Sprite> = {};
  debug = false;
  mouseX: number = 0;
  mouseY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = getCanvasContext(canvas);
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.context = context;

    // Add mouse move listener
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
    });
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    color: string
  ) {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.strokeStyle = color;
    this.context.lineWidth = width;
    this.context.stroke();
  }

  drawRect(x: number, y: number, width: number, height: number, color: string) {
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    this.context.fillStyle = color;
    this.context.fill();
  }

  drawCircle(x: number, y: number, radius: number, color: string) {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, 2 * Math.PI);
    this.context.fillStyle = color;
    this.context.fill();
  }

  drawText(text: string, x: number, y: number, color: string) {
    this.context.fillStyle = color;
    this.context.font = '16px Arial';
    this.context.fillText(text, x, y);
  }

  drawTextEx(text: string, x: number, y: number, color: string, font: string) {
    this.context.fillStyle = color;
    this.context.font = font;
    this.context.fillText(text, x, y);
  }

  drawSprite(sprite: Sprite, x: number, y: number) {
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

  drawSpriteRotated(sprite: Sprite, x: number, y: number, degrees: number) {
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

  drawAnimation(animation: Animation, x: number, y: number, degrees?: number) {
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

  drawFlashingArrow(arrow: FlashingArrow) {
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

  drawPachinkoBall(ball: PachinkoBall) {
    this.drawCircle(ball.point.x, ball.point.y, ball.point.radius, 'red');
  }

  drawPin(pin: Pin) {
    this.drawSprite(this.sprites.pin, pin.slope.x1, pin.slope.y1);
  }

  drawArmSegment(armSegment: ArmSegment) {
    for (const arm of armSegment.arms) {
      this.drawLine(arm.p1.x, arm.p1.y, arm.p2.x, arm.p2.y, 1, 'green');
    }
    for (const point of armSegment.points) {
      this.drawCircle(point.x, point.y, point.radius, 'lightgreen');
    }
  }

  drawFlowerSensor(flowerSensor: FlowerSensor) {
    this.drawCircle(
      flowerSensor.x,
      flowerSensor.y,
      flowerSensor.radius,
      'blue'
    );
  }

  drawSpinner(spinner: Spinner) {
    this.drawSpriteRotated(
      this.sprites.spinner,
      spinner.x - 13, // centered
      spinner.y - 13,
      spinner.angle
    );
  }

  drawFlowerRoof(flowerRoof: FlowerRoof) {
    if (flowerRoof.active) {
      this.drawAnimation(
        flowerRoof.activeAnim, // centered
        flowerRoof.x - 18,
        flowerRoof.y - 15
      );
    } else {
      this.drawAnimation(
        flowerRoof.inactiveAnim, // centered
        flowerRoof.x - 18,
        flowerRoof.y - 15
      );
    }
  }

  drawAnimatedParticle(particle: AnimatedParticle) {
    this.drawAnimation(particle.anim, particle.x, particle.y);
  }
}
