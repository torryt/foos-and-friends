-- Migration 018: Add Target Score Setting to Groups
-- Adds a per-group target score (points needed to win a game), used by the
-- score entry UI to pre-fill the winner's score and bound the loser's score.
-- Backwards-compatible: all existing groups default to 10.

ALTER TABLE friend_groups
  ADD COLUMN IF NOT EXISTS target_score integer
  NOT NULL
  DEFAULT 10
  CONSTRAINT friend_groups_target_score_check
  CHECK (target_score BETWEEN 1 AND 100);

COMMENT ON COLUMN friend_groups.target_score IS
  'Points needed to win a game in this group (e.g. 8 or 10)';

-- No RLS changes needed: the existing "owners_manage_groups" FOR ALL policy
-- already allows group owners to update friend_groups rows.
