export function getXPRequiredForLevel(level: number) {
  if (level <= 10) return Math.floor(45 + level * 18);
  if (level <= 30) return Math.floor(180 + Math.pow(level - 10, 1.45) * 55);
  if (level <= 60) return Math.floor(900 + Math.pow(level - 30, 1.55) * 95);
  if (level <= 90) return Math.floor(3200 + Math.pow(level - 60, 1.65) * 160);
  return Math.floor(9500 + Math.pow(level - 90, 1.85) * 420);
}

export function buildCumulativeXPTable(maxLevel: number) {
  const thresholds = Array.from({ length: maxLevel + 2 }, () => 0);
  for (let level = 2; level < thresholds.length; level += 1) {
    thresholds[level] = thresholds[level - 1] + getXPRequiredForLevel(level - 1);
  }
  return thresholds;
}
