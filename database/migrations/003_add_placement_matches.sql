-- Adds a per-group "placement matches" threshold: players are hidden from
-- ranking tables (season and all-time) until they've played at least this
-- many matches in that scope. Filtering happens client-side against the
-- existing matches_played figures already returned by
-- get_group_player_stats() and the player_season_stats_*_computed views, so
-- no changes to ranking/ELO computation are needed here.
--
-- To apply against a Supabase project: run this file's SQL via the Supabase
-- SQL editor (or `supabase db push` / your usual migration runner) against
-- the target database. Safe to run on production — additive, backward
-- compatible (defaults every existing group to 0, i.e. feature off).

ALTER TABLE public.friend_groups
  ADD COLUMN placement_matches integer DEFAULT 0 NOT NULL;

ALTER TABLE public.friend_groups
  ADD CONSTRAINT friend_groups_placement_matches_check
    CHECK (placement_matches >= 0 AND placement_matches <= 50);
