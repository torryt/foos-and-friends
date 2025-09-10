-- Step 4: Create Updated Matches Table
-- Execute this fourth in Supabase SQL Editor

CREATE TABLE matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  team1_player1_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team1_player2_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team2_player1_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team2_player2_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team1_score integer NOT NULL,
  team2_score integer NOT NULL,
  match_date date DEFAULT CURRENT_DATE NOT NULL,
  match_time time DEFAULT CURRENT_TIME NOT NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT valid_scores CHECK (team1_score >= 0 AND team2_score >= 0),
  CONSTRAINT different_players CHECK (
    team1_player1_id != team1_player2_id AND
    team1_player1_id != team2_player1_id AND
    team1_player1_id != team2_player2_id AND
    team1_player2_id != team2_player1_id AND
    team1_player2_id != team2_player2_id AND
    team2_player1_id != team2_player2_id
  )
);

-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- RLS Policy for matches
CREATE POLICY "Users can manage group matches" ON matches
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );