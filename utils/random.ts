// Simple pseudo-random number generator
export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
export const randomInt = (min: number, max: number) => Math.floor(randomRange(min, max));

export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Simplified 2D Noise (Value Noise)
export class SimpleNoise {
  size: number;
  values: number[];

  constructor(size: number = 256) {
    this.size = size;
    this.values = new Array(size * size).fill(0).map(() => Math.random());
  }

  get(x: number, y: number): number {
    const X = Math.floor(x) & (this.size - 1);
    const Y = Math.floor(y) & (this.size - 1);
    return this.values[X + Y * this.size];
  }

  // Bilinear interpolation noise
  noise(x: number, y: number): number {
    const xf = Math.floor(x);
    const yf = Math.floor(y);
    const u = x - xf;
    const v = y - yf;
    
    // Smoothstep
    const su = u * u * (3 - 2 * u);
    const sv = v * v * (3 - 2 * v);

    const aa = this.get(xf, yf);
    const ab = this.get(xf, yf + 1);
    const ba = this.get(xf + 1, yf);
    const bb = this.get(xf + 1, yf + 1);

    const lerp1 = aa + su * (ba - aa);
    const lerp2 = ab + su * (bb - ab);

    return lerp1 + sv * (lerp2 - lerp1);
  }

  // Fractal Brownian Motion
  fbm(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    
    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value;
  }
}