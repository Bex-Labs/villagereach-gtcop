// How a country's OVERALL level is worked out from its five thematic area levels.
// Rule: the average of the areas, rounded to the nearest whole level.
// (To confirm with VillageReach. If the rule changes, change it here only: every page follows.)

export const MAX_LEVEL = 4;

// Average of the area levels, to one decimal place (e.g. 2.6). null if there are none.
export function averageLevel(levels) {
  const nums = (levels ?? []).filter((l) => typeof l === "number");
  if (nums.length === 0) return null;
  const total = nums.reduce((sum, l) => sum + l, 0);
  return Math.round((total / nums.length) * 10) / 10;
}

// The whole level (1 to 4) for an average, rounded to the nearest level (2.5 and above → 3).
export function levelFromAverage(avg) {
  if (avg == null) return null;
  return Math.min(MAX_LEVEL, Math.max(1, Math.round(avg)));
}