-- Michi-Maker: distinct real users split by how recently they last signed in.
-- Cohort = non-anonymous, non-excluded users who ever touched a Michi table.
-- Sign-in is project-wide (shared auth with TCGScan), so "active" means the
-- user signed in to the ecosystem, attributed to Michi-Maker by their activity.
with {{EXCLUDED_CTE}},
u as (
  select owner_id as uid from public.binders
  union select owner_id from public.saved_slices
  union select user_id from public.binder_likes
  union select voter_id from public.profile_upvotes
  union select user_id from public.print_events
  union select copied_by from public.binder_reshares
  union select owner_id from public.contest_entries
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
