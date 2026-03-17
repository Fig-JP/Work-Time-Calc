export interface Badge {
  id: string;
  label: string;
  threshold: number;
  type: "hours" | "days";
  icon: string;
}

const HOUR_STEP = 5;
const HOUR_MAX = 150;
const DAY_MAX = 31;

export const HOUR_BADGES: Badge[] = Array.from(
  { length: HOUR_MAX / HOUR_STEP },
  (_, i) => {
    const hours = (i + 1) * HOUR_STEP;
    return {
      id: `hours_${hours}`,
      label: `${hours}h`,
      threshold: hours * 60,
      type: "hours",
      icon: "clock",
    };
  }
);

export const DAY_BADGES: Badge[] = Array.from({ length: DAY_MAX }, (_, i) => {
  const days = i + 1;
  return {
    id: `days_${days}`,
    label: `${days}日`,
    threshold: days,
    type: "days",
    icon: "calendar",
  };
});

export function getEarnedBadges(
  totalWorkMinutes: number,
  totalWorkDays: number
): Set<string> {
  const earned = new Set<string>();
  for (const b of HOUR_BADGES) {
    if (totalWorkMinutes >= b.threshold) earned.add(b.id);
  }
  for (const b of DAY_BADGES) {
    if (totalWorkDays >= b.threshold) earned.add(b.id);
  }
  return earned;
}

export function getNextBadge(
  badges: Badge[],
  earned: Set<string>
): Badge | null {
  return badges.find((b) => !earned.has(b.id)) ?? null;
}
