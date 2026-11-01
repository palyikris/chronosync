const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (progress: number, start: number, end: number) => {
  const value = clamp((progress - start) / (end - start));
  return value * value * (3 - 2 * value);
};

/** Shared timing keeps the 3D minute hand and its screen-space extension aligned. */
export function getClockSweepState(progress: number) {
  const ticks = smooth(progress, 0.07, 0.115) + smooth(progress, 0.17, 0.215);
  const sweep = smooth(progress, 0.3, 0.9);
  return {
    settle: smooth(progress, 0.12, 0.28),
    sweep,
    minuteAngle: -Math.PI / 3 + ticks * Math.PI / 6 + sweep * Math.PI * 2,
    extension: smooth(progress, 0.29, 0.42),
    handOpacity: smooth(progress, 0.265, 0.3) * (1 - smooth(progress, 0.9, 0.965)),
  };
}

/** Keep the unswept part of the hero. The real notebook preview sits beneath it. */
export function getRemainingClockSector(width: number, height: number, x: number, y: number, sweep: number) {
  if (sweep <= 0) return "none";
  if (sweep >= 1) return "polygon(0 0, 0 0, 0 0)";
  const radius = Math.max(Math.hypot(x, y), Math.hypot(width - x, y),
    Math.hypot(x, height - y), Math.hypot(width - x, height - y)) + 40;
  const start = -Math.PI / 2 + sweep * Math.PI * 2;
  const end = Math.PI * 1.5;
  const segments = Math.max(2, Math.ceil((1 - sweep) * 64));
  const points = [`${x.toFixed(2)}px ${y.toFixed(2)}px`];
  for (let i = 0; i <= segments; i++) {
    const angle = start + (end - start) * i / segments;
    points.push(`${(x + Math.cos(angle) * radius).toFixed(2)}px ${(y + Math.sin(angle) * radius).toFixed(2)}px`);
  }
  return `polygon(${points.join(",")})`;
}
