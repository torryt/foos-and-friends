import { useEffect, useState } from 'react'
import { PositionIcon } from '@/components/PositionIcon'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { Match, Player } from '@/types'

interface EditMatchDialogProps {
  match: Match | null
  players: Player[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    matchId: string,
    updates: {
      team1Player1Id: string
      team1Player2Id: string
      team2Player1Id: string
      team2Player2Id: string
      score1: number
      score2: number
    },
  ) => void
}

interface PlayerSelectProps {
  value: string
  onChange: (value: string) => void
  position: 'attacker' | 'defender'
  label: string
  players: Player[]
}

const PlayerSelect = ({ value, onChange, position, label, players }: PlayerSelectProps) => (
  <div className="space-y-2">
    <Label className="flex items-center gap-2">
      <PositionIcon position={position} size={14} />
      {label}
    </Label>
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {players.map((player) => (
        <option key={player.id} value={player.id}>
          {player.avatar} {player.name}
        </option>
      ))}
    </select>
  </div>
)

export const EditMatchDialog = ({
  match,
  players,
  open,
  onOpenChange,
  onSave,
}: EditMatchDialogProps) => {
  const [team1Player1Id, setTeam1Player1Id] = useState('')
  const [team1Player2Id, setTeam1Player2Id] = useState('')
  const [team2Player1Id, setTeam2Player1Id] = useState('')
  const [team2Player2Id, setTeam2Player2Id] = useState('')
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)

  // Update state when match changes
  useEffect(() => {
    if (match) {
      setTeam1Player1Id(match.team1[0].id)
      setTeam1Player2Id(match.team1[1].id)
      setTeam2Player1Id(match.team2[0].id)
      setTeam2Player2Id(match.team2[1].id)
      setScore1(match.score1)
      setScore2(match.score2)
    }
  }, [match])

  const handleSave = () => {
    if (!match) return

    // Validate all players are different
    const selectedPlayers = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id]
    if (new Set(selectedPlayers).size !== 4) {
      alert('All players must be different')
      return
    }

    onSave(match.id, {
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      score1,
      score2,
    })
    onOpenChange(false)
  }

  if (!match) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Match</DialogTitle>
          <DialogDescription>
            Modify the match details. Warning: Changing results will recalculate all ELO scores from
            this match forward.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-blue-700 mb-2">Team 1</h3>
              <div className="grid grid-cols-2 gap-4">
                <PlayerSelect
                  value={team1Player1Id}
                  onChange={setTeam1Player1Id}
                  position="attacker"
                  label="Attacker"
                  players={players}
                />
                <PlayerSelect
                  value={team1Player2Id}
                  onChange={setTeam1Player2Id}
                  position="defender"
                  label="Defender"
                  players={players}
                />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-purple-700 mb-2">Team 2</h3>
              <div className="grid grid-cols-2 gap-4">
                <PlayerSelect
                  value={team2Player1Id}
                  onChange={setTeam2Player1Id}
                  position="attacker"
                  label="Attacker"
                  players={players}
                />
                <PlayerSelect
                  value={team2Player2Id}
                  onChange={setTeam2Player2Id}
                  position="defender"
                  label="Defender"
                  players={players}
                />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Scores</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team 1 Score</Label>
                  <Input
                    type="number"
                    value={score1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScore1(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Team 2 Score</Label>
                  <Input
                    type="number"
                    value={score2}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScore2(Number(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
