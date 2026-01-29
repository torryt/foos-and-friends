-- Migration 013: Fix Function Search Paths
--
-- This fixes the "Function Search Path Mutable" security warning.
-- All functions should have an immutable search_path to prevent
-- attackers from hijacking function behavior via schema manipulation.
--
-- Setting search_path = 'public' makes it immutable while still allowing
-- functions to reference tables without schema prefixes (which they do).

-- Fix compute_player_season_ranking
ALTER FUNCTION public.compute_player_season_ranking(uuid, uuid)
  SET search_path = 'public';

-- Fix compute_player_global_ranking
ALTER FUNCTION public.compute_player_global_ranking(uuid)
  SET search_path = 'public';

-- Fix create_friend_group
ALTER FUNCTION public.create_friend_group(text, text)
  SET search_path = 'public';

-- Fix delete_group_with_cascade
ALTER FUNCTION public.delete_group_with_cascade(uuid, uuid)
  SET search_path = 'public';

-- Fix end_season_and_create_new
ALTER FUNCTION public.end_season_and_create_new(uuid, text, text)
  SET search_path = 'public';

-- Fix generate_invite_code
ALTER FUNCTION public.generate_invite_code()
  SET search_path = 'public';

-- Fix get_group_by_invite_code
ALTER FUNCTION public.get_group_by_invite_code(text)
  SET search_path = 'public';

-- Fix join_group_by_invite_code
ALTER FUNCTION public.join_group_by_invite_code(text, uuid)
  SET search_path = 'public';

-- Fix leave_group
ALTER FUNCTION public.leave_group(uuid, uuid)
  SET search_path = 'public';

-- Fix update_group_visibility (if it exists with this signature)
DO $$
BEGIN
  -- Try to alter the function, ignore if it doesn't exist with expected signature
  BEGIN
    ALTER FUNCTION public.update_group_visibility(uuid, boolean)
      SET search_path = 'public';
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'update_group_visibility not found with expected signature, skipping';
  END;
END $$;

-- Fix user_is_group_member
ALTER FUNCTION public.user_is_group_member(uuid, uuid)
  SET search_path = 'public';

-- Verification: Check that all functions now have search_path set
DO $$
DECLARE
  func_record record;
  func_count integer := 0;
BEGIN
  FOR func_record IN
    SELECT p.proname, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    -- Check if search_path is set in proconfig
    IF func_record.proconfig IS NULL OR
       NOT EXISTS (
         SELECT 1 FROM unnest(func_record.proconfig) AS config
         WHERE config LIKE 'search_path=%'
       ) THEN
      func_count := func_count + 1;
      RAISE NOTICE 'Function % still has mutable search_path', func_record.proname;
    END IF;
  END LOOP;

  IF func_count > 0 THEN
    RAISE NOTICE 'Warning: % functions still have mutable search_path', func_count;
  ELSE
    RAISE NOTICE 'All public functions now have immutable search_path';
  END IF;
END $$;
