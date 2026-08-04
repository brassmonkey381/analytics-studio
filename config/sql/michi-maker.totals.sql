-- Users who ever touched Michi-Maker features: real accounts vs anonymous
-- guest sessions, with excluded (ours/QA/automated) counted separately so the
-- exclusion is visible rather than silent.
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
c as (
  select u.uid, coalesce(a.is_anonymous, false) as guest,
         (u.uid in (select id from excluded_users)) as ex
  from u left join auth.users a on a.id = u.uid
)
select
  count(*) filter (where not guest and not ex)::int as total_users,
  count(*) filter (where guest and not ex)::int as guest_users,
  count(*) filter (where ex)::int as excluded_users
from c
