-- Users who ever touched TCGScan features: real accounts vs anonymous guest
-- sessions, with excluded (ours/QA/automated) counted separately so the
-- exclusion is visible rather than silent.
with {{EXCLUDED_CTE}},
u as (
  select user_id as uid from public.scan_events
  union select user_id from public.saved_cards
  union select user_id from public.collections
  union select user_id from public.portfolio_entries
  union select owner_id from public.user_cards where source = 'scan'
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
