-- Migration: Add generate_unique_invite_code function
-- This function generates an 8-character invite code and ensures it's unique

CREATE OR REPLACE FUNCTION generate_unique_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  LOOP
    -- Generate 8-character code
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM friend_groups WHERE invite_code = result) THEN
      RETURN result;
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique invite code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;
