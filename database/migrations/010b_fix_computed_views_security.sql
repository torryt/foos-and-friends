-- Migration 010b: Fix Computed Views Security
-- This fixes the SECURITY DEFINER issue flagged by Supabase security advisor.
-- Views now use SECURITY INVOKER to respect RLS policies of underlying tables.

-- Recreate player_stats_computed with security_invoker
DROP VIEW IF EXISTS player_stats_computed;
CREATE VIEW player_stats_computed
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.name,
  compute_player_global_ranking(p.id) as ranking,
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  p.avatar,
  p.department,
  p.group_id,
  p.created_by,
  p.created_at,
  p.updated_at
FROM players p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer as matches_played,
    SUM(CASE
      WHEN (m.team1_player1_id = p.id OR m.team1_player2_id = p.id)
           AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = p.id OR m.team2_player2_id = p.id)
           AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN (m.team1_player1_id = p.id OR m.team1_player2_id = p.id)
           AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = p.id OR m.team2_player2_id = p.id)
           AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses
  FROM matches m
  WHERE m.team1_player1_id = p.id
    OR m.team1_player2_id = p.id
    OR m.team2_player1_id = p.id
    OR m.team2_player2_id = p.id
) stats ON true;

COMMENT ON VIEW player_stats_computed IS 'Computed player global statistics from match history (security_invoker enabled)';

-- Recreate player_season_stats_computed with security_invoker
DROP VIEW IF EXISTS player_season_stats_computed;
CREATE VIEW player_season_stats_computed
WITH (security_invoker = true)
AS
SELECT
  pss.id,
  pss.player_id,
  pss.season_id,
  compute_player_season_ranking(pss.player_id, pss.season_id) as ranking,
  COALESCE(stats.matches_played, 0) as matches_played,
  COALESCE(stats.wins, 0) as wins,
  COALESCE(stats.losses, 0) as losses,
  COALESCE(stats.goals_for, 0) as goals_for,
  COALESCE(stats.goals_against, 0) as goals_against,
  pss.created_at,
  pss.updated_at
FROM player_season_stats pss
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer as matches_played,
    SUM(CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id)
           AND m.team1_score > m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id)
           AND m.team2_score > m.team1_score THEN 1
      ELSE 0
    END)::integer as wins,
    SUM(CASE
      WHEN (m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id)
           AND m.team1_score < m.team2_score THEN 1
      WHEN (m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id)
           AND m.team2_score < m.team1_score THEN 1
      ELSE 0
    END)::integer as losses,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team1_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team2_score
      ELSE 0
    END)::integer as goals_for,
    SUM(CASE
      WHEN m.team1_player1_id = pss.player_id OR m.team1_player2_id = pss.player_id THEN m.team2_score
      WHEN m.team2_player1_id = pss.player_id OR m.team2_player2_id = pss.player_id THEN m.team1_score
      ELSE 0
    END)::integer as goals_against
  FROM matches m
  WHERE m.season_id = pss.season_id
    AND (m.team1_player1_id = pss.player_id
      OR m.team1_player2_id = pss.player_id
      OR m.team2_player1_id = pss.player_id
      OR m.team2_player2_id = pss.player_id)
) stats ON true;

COMMENT ON VIEW player_season_stats_computed IS 'Computed player season statistics from match history (security_invoker enabled)';

-- Re-grant permissions
GRANT SELECT ON player_season_stats_computed TO authenticated;
GRANT SELECT ON player_stats_computed TO authenticated;
