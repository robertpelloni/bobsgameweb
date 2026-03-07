export type EasingFn = (t: number, b: number, c: number, d: number) => number;

export const Easing = {
  linear(t: number, b: number, c: number, d: number): number {
    return (c * t) / d + b;
  },

  easeInQuad(t: number, b: number, c: number, d: number): number {
    t /= d;
    return c * t * t + b;
  },

  easeOutQuad(t: number, b: number, c: number, d: number): number {
    t /= d;
    return -c * t * (t - 2) + b;
  },

  easeInOutQuad(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
  },

  easeInCubic(t: number, b: number, c: number, d: number): number {
    t /= d;
    return c * t * t * t + b;
  },

  easeOutCubic(t: number, b: number, c: number, d: number): number {
    t /= d;
    t--;
    return c * (t * t * t + 1) + b;
  },

  easeInOutCubic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t * t + b;
    t -= 2;
    return (c / 2) * (t * t * t + 2) + b;
  },

  easeInQuart(t: number, b: number, c: number, d: number): number {
    t /= d;
    return c * t * t * t * t + b;
  },

  easeOutQuart(t: number, b: number, c: number, d: number): number {
    t /= d;
    t--;
    return -c * (t * t * t * t - 1) + b;
  },

  easeInOutQuart(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t * t * t + b;
    t -= 2;
    return (-c / 2) * (t * t * t * t - 2) + b;
  },

  easeInQuint(t: number, b: number, c: number, d: number): number {
    t /= d;
    return c * t * t * t * t * t + b;
  },

  easeOutQuint(t: number, b: number, c: number, d: number): number {
    t /= d;
    t--;
    return c * (t * t * t * t * t + 1) + b;
  },

  easeInOutQuint(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t * t * t * t + b;
    t -= 2;
    return (c / 2) * (t * t * t * t * t + 2) + b;
  },

  easeInSine(t: number, b: number, c: number, d: number): number {
    return -c * Math.cos((t / d) * (Math.PI / 2)) + c + b;
  },

  easeOutSine(t: number, b: number, c: number, d: number): number {
    return c * Math.sin((t / d) * (Math.PI / 2)) + b;
  },

  easeInOutSine(t: number, b: number, c: number, d: number): number {
    return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1) + b;
  },

  easeInExpo(t: number, b: number, c: number, d: number): number {
    return t === 0 ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
  },

  easeOutExpo(t: number, b: number, c: number, d: number): number {
    return t === d ? b + c : c * (-Math.pow(2, (-10 * t) / d) + 1) + b;
  },

  easeInOutExpo(t: number, b: number, c: number, d: number): number {
    if (t === 0) return b;
    if (t === d) return b + c;
    t /= d / 2;
    if (t < 1) return (c / 2) * Math.pow(2, 10 * (t - 1)) + b;
    t--;
    return (c / 2) * (-Math.pow(2, -10 * t) + 2) + b;
  },

  easeInCirc(t: number, b: number, c: number, d: number): number {
    t /= d;
    return -c * (Math.sqrt(1 - t * t) - 1) + b;
  },

  easeOutCirc(t: number, b: number, c: number, d: number): number {
    t /= d;
    t--;
    return c * Math.sqrt(1 - t * t) + b;
  },

  easeInOutCirc(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return (-c / 2) * (Math.sqrt(1 - t * t) - 1) + b;
    t -= 2;
    return (c / 2) * (Math.sqrt(1 - t * t) + 1) + b;
  },

  easeInElastic(t: number, b: number, c: number, d: number, a: number = 0): number {
    if (t === 0) return b;
    t /= d;
    if (t === 1) return b + c;
    const p = d * 0.3;
    let s: number;
    if (a < Math.abs(c)) {
      a = c;
      s = p / 4;
    } else {
      s = (p / (2 * Math.PI)) * Math.asin(c / a);
    }
    t--;
    return -(a * Math.pow(2, 10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p)) + b;
  },

  easeOutElastic(t: number, b: number, c: number, d: number, a: number = 0): number {
    if (t === 0) return b;
    t /= d;
    if (t === 1) return b + c;
    const p = d * 0.3;
    let s: number;
    if (a < Math.abs(c)) {
      a = c;
      s = p / 4;
    } else {
      s = (p / (2 * Math.PI)) * Math.asin(c / a);
    }
    return a * Math.pow(2, -10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) + c + b;
  },

  easeInOutElastic(t: number, b: number, c: number, d: number, a: number = 0): number {
    if (t === 0) return b;
    t /= d / 2;
    if (t === 2) return b + c;
    const p = d * 0.45;
    let s: number;
    if (a < Math.abs(c)) {
      a = c;
      s = p / 4;
    } else {
      s = (p / (2 * Math.PI)) * Math.asin(c / a);
    }
    if (t < 1) {
      t--;
      return -0.5 * (a * Math.pow(2, 10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p)) + b;
    }
    t--;
    return a * Math.pow(2, -10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) * 0.5 + c + b;
  },

  easeInBack(t: number, b: number, c: number, d: number, s: number = 1.70158): number {
    t /= d;
    return c * t * t * ((s + 1) * t - s) + b;
  },

  easeOutBack(t: number, b: number, c: number, d: number, s: number = 1.70158): number {
    t = t / d - 1;
    return c * (t * t * ((s + 1) * t + s) + 1) + b;
  },

  easeInOutBack(t: number, b: number, c: number, d: number, s: number = 1.70158): number {
    t /= d / 2;
    s *= 1.525;
    if (t < 1) return (c / 2) * (t * t * ((s + 1) * t - s)) + b;
    t -= 2;
    return (c / 2) * (t * t * ((s + 1) * t + s) + 2) + b;
  },

  easeInBounce(t: number, b: number, c: number, d: number): number {
    return c - Easing.easeOutBounce(d - t, 0, c, d) + b;
  },

  easeOutBounce(t: number, b: number, c: number, d: number): number {
    t /= d;
    if (t < 1 / 2.75) {
      return c * (7.5625 * t * t) + b;
    } else if (t < 2 / 2.75) {
      t -= 1.5 / 2.75;
      return c * (7.5625 * t * t + 0.75) + b;
    } else if (t < 2.5 / 2.75) {
      t -= 2.25 / 2.75;
      return c * (7.5625 * t * t + 0.9375) + b;
    } else {
      t -= 2.625 / 2.75;
      return c * (7.5625 * t * t + 0.984375) + b;
    }
  },

  easeInOutBounce(t: number, b: number, c: number, d: number): number {
    if (t < d / 2) return Easing.easeInBounce(t * 2, 0, c, d) * 0.5 + b;
    return Easing.easeOutBounce(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
  },
} as const;

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return lerp(outMin, outMax, normalize(value, inMin, inMax));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
