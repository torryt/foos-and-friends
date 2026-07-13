-- Migration 029: Evaluate auth.uid() once per statement in RLS policies
--
-- Supabase's performance advisor (auth_rls_initplan) flags every policy that
-- calls auth.uid() bare: Postgres re-evaluates the function for EACH ROW the
-- query scans. Wrapping it as (select auth.uid()) turns it into an InitPlan
-- evaluated once per statement. On the computed views/functions that scan a
-- whole group's match history this was measured as a ~2x multiplier.
--
-- Semantics are UNCHANGED — every policy below is the exact prod definition
-- (pg_policies, 2026-07-13) with only the (select ...) wrapper added.
-- ALTER POLICY is used so there is no window where a policy doesn't exist.

-- ===== friend_groups =====

ALTER POLICY anyone_creates_groups ON friend_groups
  WITH CHECK (
    created_by = (SELECT auth.uid()) AND owner_id = (SELECT auth.uid())
  );

ALTER POLICY owners_manage_groups ON friend_groups
  USING (owner_id = (SELECT auth.uid()));

ALTER POLICY users_see_visible_groups ON friend_groups
  USING (
    owner_id = (SELECT auth.uid())
    OR (SELECT auth.uid()) = ANY (visible_to_users)
  );

-- ===== group_join_requests =====

ALTER POLICY users_see_own_join_requests ON group_join_requests
  USING (user_id = (SELECT auth.uid()));

-- ===== group_memberships =====

ALTER POLICY owners_manage_all_memberships ON group_memberships
  USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE friend_groups.id = group_memberships.group_id
        AND friend_groups.owner_id = (SELECT auth.uid())
    )
  );

ALTER POLICY users_see_own_memberships ON group_memberships
  USING (user_id = (SELECT auth.uid()));

-- ===== matches =====

ALTER POLICY users_manage_group_matches ON matches
  USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE friend_groups.id = matches.group_id
        AND (
          friend_groups.owner_id = (SELECT auth.uid())
          OR (SELECT auth.uid()) = ANY (friend_groups.visible_to_users)
        )
    )
  );

-- ===== players =====

ALTER POLICY users_manage_group_players ON players
  USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE friend_groups.id = players.group_id
        AND (
          friend_groups.owner_id = (SELECT auth.uid())
          OR (SELECT auth.uid()) = ANY (friend_groups.visible_to_users)
        )
    )
  );

-- ===== season_trophies =====

ALTER POLICY users_view_group_trophies ON season_trophies
  USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE friend_groups.id = season_trophies.group_id
        AND (
          friend_groups.owner_id = (SELECT auth.uid())
          OR (SELECT auth.uid()) = ANY (friend_groups.visible_to_users)
        )
    )
  );

-- ===== seasons =====

ALTER POLICY group_owners_manage_seasons ON seasons
  USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE friend_groups.id = seasons.group_id
        AND friend_groups.owner_id = (SELECT auth.uid())
    )
  );

ALTER POLICY users_view_group_seasons ON seasons
  USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE friend_groups.id = seasons.group_id
        AND (
          friend_groups.owner_id = (SELECT auth.uid())
          OR (SELECT auth.uid()) = ANY (friend_groups.visible_to_users)
        )
    )
  );

-- ===== ROLLBACK INSTRUCTIONS =====
-- Re-run the same ALTER POLICY statements with (SELECT auth.uid()) replaced
-- by bare auth.uid() (definitions in 00_drop_and_create.sql, 008, 021, 023).
