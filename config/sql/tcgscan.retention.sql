-- TCGScan: distinct real users split by how recently they last signed in.
-- Cohort = non-anonymous, non-excluded users who ever touched a TCGScan table.
-- Sign-in is project-wide (shared auth with Michi-Maker), so "active" means the
-- user signed in to the ecosystem, attributed to TCGScan by their activity.
with {{EXCLUDED_CTE}},
u as (
  select user_id as uid from public.scan_events
  union select user_id from public.saved_cards
  union select user_id from public.collections
  union select user_id from public.portfolio_entries
  union select owner_id from public.user_cards where source = 'scan'
),
cohort as (
  select a.last_sign_in_at
  from u join auth.users a on a.id = u.uid
  where not coalesce(a.is_anonymous, false)
    and u.uid not in (select id from excluded_users)
)
select count(*)::int as total,
  count(*) filter (where last_sign_in_at >= now() - interval '7 days')::int as active_7,
  count(*) filter (where last_sign_in_at >= now() - interval '14 days')::int as active_14,
  count(*) filter (where last_sign_in_at >= now() - interval '30 days')::int as active_30
from cohort
