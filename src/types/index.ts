export interface Player {
  id: number
  name: string
  ranking: number
  matchesPlayed: number
  wins: number
  losses: number
  avatar: string
  department: string
}

export interface Match {
  id: number
  team1: [Player, Player]
  team2: [Player, Player]
  score1: number
  score2: number
  date: string
  time: string
}
