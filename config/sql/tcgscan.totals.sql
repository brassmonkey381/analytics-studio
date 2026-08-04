-- Users who ever touched TCGScan features: real accounts vs anonymous guest
-- sessions, with excluded (ours/QA/automated) counted separately so the
-- exclusion is visible rather than silent.
-- The user set comes from activitySources in config/apps.json, the same list
-- that drives DAU and last-seen, so the three can never disagree.
with {{EXCLUDED_CTE}},
u as (
  {{ACTIVITY_USERS}}
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
