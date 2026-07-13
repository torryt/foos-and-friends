-- Complete Database Reset Script — LOCAL/DEV ONLY, never run against production.
--
-- Drops the entire public schema, then recreates it empty with the standard
-- Supabase grants. Afterwards, run migrations/001_initial_schema.sql to
-- recreate the full schema (tables, views, functions, RLS policies, grants).

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- Now run: migrations/001_initial_schema.sql
