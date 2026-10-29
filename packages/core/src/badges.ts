/**
 * Badge catalogue. Badges are awarded by the database (on_workout_logged);
 * this list gives each id its display text and the order to show them in.
 * Unknown ids from a newer server are ignored by the app, never shown raw.
 */
export interface Badge {
  id: string;
  title: string;
  description: string;
}

export const BADGES: readonly Badge[] = [
  { id: "first_workout", title: "First step", description: "Finish your first workout" },
  { id: "streak_7", title: "One week strong", description: "Train 7 days in a row" },
  { id: "streak_30", title: "Habit made", description: "Train 30 days in a row" },
];

export interface BadgeState extends Badge {
  earnedAt: string | null;
}

/** Joins earned rows onto the catalogue, keeping catalogue order. */
export function badgeStates(earned: readonly { badge: string; earnedAt: string }[]): BadgeState[] {
  const byId = new Map(earned.map((row) => [row.badge, row.earnedAt]));
  return BADGES.map((badge) => ({ ...badge, earnedAt: byId.get(badge.id) ?? null }));
}
