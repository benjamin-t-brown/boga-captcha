interface PhysicsObject {
  type: string;
}

export interface CircleObject extends PhysicsObject {
  x: number;
  y: number;
  radius: number;
}

export interface LineObject {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  surfaceNormal: number;
}

class TinyPhysics {
  private ctx: CanvasRenderingContext2D;
  public points: Point[]; // Changed from private to public
  private arms: Arm[];
  private slopes: Slope[];
  private gravity: number;
  private solverIterations: number; // Renamed from iterations, and used for sub-steps
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.ctx = ctx;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.points = [];
    this.arms = [];
    this.slopes = [];
    // this.gravity = 1000.3; // Note: This is now an acceleration (e.g., pixels/dt^2 or pixels/second^2 if dt is in seconds). Its magnitude might need adjustment.
    this.gravity = 100.3;
    this.solverIterations = 10; // Number of iterations for constraint and collision solving per dt step
  }

  public updateCanvasDimensions(newWidth: number, newHeight: number): void {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
  }

  add(obj: PhysicsObject): void {
    if (obj.type === 'arm') {
      this.arms.push(obj as Arm);
    } else if (obj.type === 'point') {
      this.points.push(obj as Point);
    } else {
      this.slopes.push(obj as Slope);
    }
  }

  remove(obj: PhysicsObject): void {
    if (obj.type === 'arm') {
      this.arms = this.arms.filter(a => a !== obj);
    } else if (obj.type === 'point') {
      this.points = this.points.filter(p => p !== obj);
    } else {
      this.slopes = this.slopes.filter(s => s !== obj);
    }
  }

  private getClosestPointOnLineSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { x: number; y: number } {
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

  run(dt: number): void {
    // dt is the time delta for this simulation step
    // 1. Integrate: Update positions based on past positions, velocity, acceleration, and dt
    for (const p of this.points) {
      if (!p.fixed) {
        const prevX = p.oldX;
        const prevY = p.oldY;

        // Update old positions before calculating new ones for the current step
        p.oldX = p.x;
        p.oldY = p.y;

        // Verlet integration: x(t+dt) = x(t) + (x(t) - x(t-dt)) * damping + a(t) * dt^2
        // Ensure p.ax, p.ay, and this.gravity are scaled appropriately if they represent forces vs accelerations.
        // Assuming they are accelerations here.
        p.x = p.x + (p.x - prevX) * p.damping + p.ax * dt * dt;
        p.y = p.y + (p.y - prevY) * p.damping + (p.ay + this.gravity) * dt * dt;
      } else {
        // For fixed points, ensure oldX/Y are kept consistent with X/Y
        // This is important if a point becomes unfixed, (p.x - p.oldX) should be 0 initially.
        p.oldX = p.x;
        p.oldY = p.y;
      }
      // Resetting accelerations (ax, ay) per frame might be needed if they are impulses.
      // Current code assumes they are persistent or set externally before each run() call.
    }

    // --- Add Boundary Checks and Bouncing ---
    for (const p of this.points) {
      if (!p.fixed) {
        const prev_dx = p.x - p.oldX;
        const prev_dy = p.y - p.oldY;

        // Left boundary
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.oldX = p.x + prev_dx * p.bounce;
        }
        // Right boundary
        else if (p.x + p.radius > this.canvasWidth) {
          p.x = this.canvasWidth - p.radius;
          p.oldX = p.x + prev_dx * p.bounce;
        }

        // Top boundary
        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.oldY = p.y + prev_dy * p.bounce;
        }
        // Bottom boundary
        else if (p.y + p.radius > this.canvasHeight) {
          p.y = this.canvasHeight - p.radius;
          p.oldY = p.y + prev_dy * p.bounce;
        }
      }
    }
    // --- End Boundary Checks ---

    // 2. Iteratively solve constraints and collisions
    for (let iter = 0; iter < this.solverIterations; iter++) {
      // Arm constraints
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

      // Slope collisions
      for (const p of this.points) {
        if (!p.fixed) {
          for (const s of this.slopes) {
            let pushCount = 0;
            const maxPushes = 10;

            // The while loop helps resolve deeper penetrations over iterations if needed.
            // circleLineCollision determines if there's an overlap.
            while (this.circleLineCollision(p, s) && pushCount < maxPushes) {
              const closestPoint = this.getClosestPointOnLineSegment(
                p.x,
                p.y,
                s.x1,
                s.y1,
                s.x2,
                s.y2
              );

              const vecQPx = p.x - closestPoint.x; // Vector from closest point Q on segment to Point P's center
              const vecQPy = p.y - closestPoint.y;
              const distQP = Math.sqrt(vecQPx * vecQPx + vecQPy * vecQPy);

              let penetration = p.radius - distQP;

              // Only push if there's a positive penetration depth (or very close to zero due to float precision)
              if (penetration > -1e-9) {
                if (penetration < 0) penetration = 0; // Ensure penetration is not negative

                let pushNx, pushNy;
                if (distQP < 1e-9) {
                  // Circle center is (almost) on the closest point (e.g., on the line/endpoint itself)
                  // Push along the pre-calculated surface normal of the slope
                  pushNx = Math.cos(s.surfaceNormal);
                  pushNy = Math.sin(s.surfaceNormal);
                  penetration = p.radius; // If center is on the line, effective penetration is the full radius
                } else {
                  // Push direction is from the closest point on segment towards the circle's center
                  pushNx = vecQPx / distQP;
                  pushNy = vecQPy / distQP;
                }

                if (penetration > 1e-9) {
                  // Ensure we push by a meaningful amount
                  // Velocity of the point just before this collision response's push.
                  // p.x and p.y are currently the penetrating positions.
                  // p.oldX and p.oldY are from the start of the current 'run' step's Verlet integration (or previous solver iter).
                  const vx_incident = p.x - p.oldX;
                  const vy_incident = p.y - p.oldY;

                  // Project incident velocity onto the collision normal (pushNx, pushNy).
                  // This normal points from the line towards the circle's center.
                  // If v_dot_N < 0, the point is moving into the surface (against this normal).
                  const v_dot_N = vx_incident * pushNx + vy_incident * pushNy;

                  // Apply positional correction (push the point out of penetration)
                  p.x += pushNx * penetration;
                  p.y += pushNy * penetration;

                  // If the point was moving into the surface along the normal (v_dot_N < 0), apply bounce.
                  if (v_dot_N < 0) {
                    const restitution = p.bounce; // Use the point's bounce factor

                    // Calculate new velocity components after bounce:
                    // v_new = v_incident - (1 + restitution) * v_dot_N * Normal
                    const new_vx =
                      vx_incident - (1 + restitution) * v_dot_N * pushNx;
                    const new_vy =
                      vy_incident - (1 + restitution) * v_dot_N * pushNy;

                    // Update p.oldX and p.oldY to reflect this new velocity for the next Verlet step.
                    // p.x and p.y are now the corrected positions.
                    // So, p.x_corrected - p.oldX_new = new_vx  => p.oldX_new = p.x_corrected - new_vx
                    p.oldX = p.x - new_vx;
                    p.oldY = p.y - new_vy;
                  }
                  // If v_dot_N >= 0, the point is sliding or already moving away from this normal.
                  // The positional push has occurred. The velocity for the next step will be
                  // (p.x_corrected - p.oldX_original, p.y_corrected - p.oldY_original),
                  // which is the desired behavior for sliding without a bounce impulse here.
                } else {
                  // If penetration is not > 1e-9 after potential adjustment, no push/bounce needed for this iteration.
                  break;
                }
              } else {
                // If circleLineCollision was true, but calculated penetration is significantly negative,
                // it implies a discrepancy. Breaking here prevents potential bad pushes.
                // This might happen if circleLineCollision's math differs significantly from getClosestPointOnLineSegment's outcome.
                break;
              }
              pushCount++;
            }
          }
        }
      }

      // Point-to-Point collisions
      this.handlePointCollisions();
    }
  }

  private handlePointCollisions(): void {
    const points = this.points;
    const numPoints = points.length;

    for (let i = 0; i < numPoints; i++) {
      const p1 = points[i];
      for (let j = i + 1; j < numPoints; j++) {
        const p2 = points[j];

        // Skip collision check if both points are fixed
        if (p1.fixed && p2.fixed) {
          continue;
        }

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distanceSquared = dx * dx + dy * dy;
        const sumRadii = p1.radius + p2.radius;
        const sumRadiiSquared = sumRadii * sumRadii;

        if (distanceSquared < sumRadiiSquared) {
          // Collision detected
          const distance = Math.sqrt(distanceSquared);

          let normalX: number;
          let normalY: number;

          if (distance < 1e-9) {
            // Points are virtually at the same spot
            // Apply a default separation vector (e.g., along x-axis)
            // This prevents division by zero for normal calculation.
            normalX = 1;
            normalY = 0;
          } else {
            normalX = dx / distance;
            normalY = dy / distance;
          }

          // Calculate overlap: if distance is near 0, overlap is sumRadii.
          const overlap = sumRadii - (distance < 1e-9 ? 0 : distance);

          // This check is mostly a safeguard; overlap should be > 0 if distanceSquared < sumRadiiSquared
          if (overlap <= 0) continue;

          // Resolve collision by moving points apart
          if (p1.fixed) {
            // Only p2 moves
            p2.x += overlap * normalX;
            p2.y += overlap * normalY;
          } else if (p2.fixed) {
            // Only p1 moves
            p1.x -= overlap * normalX;
            p1.y -= overlap * normalY;
          } else {
            // Both points are movable
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

  render(): void {
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

  circleLineCollision(circle: CircleObject, line: LineObject): boolean {
    let v1: { x: number; y: number } = {
      x: line.x2 - line.x1,
      y: line.y2 - line.y1,
    };
    let v2: { x: number; y: number } = {
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

class Point implements PhysicsObject, CircleObject {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  ax: number;
  ay: number;
  fixed: boolean;
  damping: number;
  radius: number;
  type: string;
  public bounce: number = 0.7; // Default bounce factor (0 = no bounce, 1 = perfect bounce)

  constructor(x: number, y: number, fixed: boolean = false) {
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

class Arm implements PhysicsObject {
  p1: Point;
  p2: Point;
  armLength: number;
  type: string;

  constructor(p1: Point, p2: Point, armLength: number) {
    this.p1 = p1;
    this.p2 = p2;
    this.armLength = armLength;
    this.type = 'arm';
  }
}

class Slope implements PhysicsObject, LineObject {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  surfaceNormal: number;
  type: string;

  constructor(x1: number, y1: number, x2: number, y2: number) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.surfaceNormal =
      Math.atan2(this.y2 - this.y1, this.x2 - this.x1) - Math.PI * 0.5;
    this.type = 'slope';
  }
}

export { TinyPhysics, Point, Arm, Slope };
