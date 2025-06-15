export interface Timer {
  t: number;
  duration: number;
}

export const createTimer = (duration: number): Timer => {
  return {
    t: 0,
    duration: Math.max(0, duration),
  };
};

export const timerStart = (timer: Timer, duration?: number) => {
  timer.t = 0;
  if (duration !== undefined) {
    timer.duration = duration;
  }
};

export const timerIsComplete = (timer: Timer) => {
  return timer.t >= timer.duration;
};

export const timerIsRunning = (timer: Timer) => {
  return timer.t < timer.duration;
};

export const timerGetPercentComplete = (timer: Timer) => {
  if (timer.duration === 0) {
    return 1;
  }

  return timer.t / timer.duration;
};

export const timerUpdate = (timer: Timer, dt: number) => {
  if (timerIsComplete(timer)) {
    return;
  }
  timer.t += dt;
  if (timerIsComplete(timer)) {
    timer.t = timer.duration;
    return;
  }
};
