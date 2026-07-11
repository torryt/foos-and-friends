// Career games-played milestones that earn a badge
export const BADGE_MILESTONES = [50, 100, 250, 500, 1000] as const

export type BadgeMilestone = (typeof BADGE_MILESTONES)[number]

// Badges a player has earned for their career games count
export function getEarnedBadges(matchesPlayed: number): BadgeMilestone[] {
  return BADGE_MILESTONES.filter((milestone) => matchesPlayed >= milestone)
}

// The next milestone to work toward, or null when all badges are earned
export function getNextMilestone(matchesPlayed: number): BadgeMilestone | null {
  return BADGE_MILESTONES.find((milestone) => matchesPlayed < milestone) ?? null
}

// The milestone crossed by going from `before` to `after` games, or null.
// Returns the highest milestone crossed if a correction ever jumps several at once.
export function getCrossedMilestone(before: number, after: number): BadgeMilestone | null {
  const crossed = BADGE_MILESTONES.filter((milestone) => before < milestone && after >= milestone)
  return crossed.length > 0 ? crossed[crossed.length - 1] : null
}
