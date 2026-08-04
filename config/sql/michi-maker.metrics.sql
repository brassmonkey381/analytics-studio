-- Michi-Maker: per-day DAU and new users, split into real accounts vs
-- anonymous guest sessions. Shares an auth pool with TCGScan, so both DAU and
-- signups are attributed by first-touch.
-- auth.users.is_anonymous is the authoritative guest flag; raw_app_meta_data
-- carries no 'provider' key for anonymous sign-ins.
with {{EXCLUDED_CTE}},
days as (
  select generate_series((current_date - ({{WINDOW}} - 1))::date, current_date, interval '1 day')::date as d
),
activity as (
  select owner_id as uid, updated_at as ts from public.binders where updated_at >= now() - interval '{{WINDOW}} days'
  union all select b.owner_id, p.updated_at from public.binder_pages p join public.binders b on b.id = p.binder_id
    where p.updated_at >= now() - interval '{{WINDOW}} days'
  union all select b.owner_id, s.updated_at from public.binder_slots s
    join public.binder_pages p on p.id = s.page_id join public.binders b on b.id = p.binder_id
    where s.updated_at >= now() - interval '{{WINDOW}} days'
  union all select owner_id, created_at from public.saved_slices where created_at >= now() - interval '{{WINDOW}} days'
  union all select user_id, created_at from public.binder_likes where created_at >= now() - interval '{{WINDOW}} days'
  union all select voter_id, created_at from public.profile_upvotes where created_at >= now() - interval '{{WINDOW}} days'
  union all select user_id, created_at from public.print_events where created_at >= now() - interval '{{WINDOW}} days'
  union all select copied_by, created_at from public.binder_reshares where created_at >= now() - interval '{{WINDOW}} days'
  union all select owner_id, created_at from public.contest_entries where created_at >= now() - interval '{{WINDOW}} days'
),
cls as (
  select a.uid, a.ts::date as d, coalesce(u.is_anonymous, false) as guest
  from activity a left join auth.users u on u.id = a.uid
  where a.uid not in (select id from excluded_users)
),
dau as (
  select d,
    count(distinct uid) filter (where not guest) as c,
    count(distinct uid) filter (where guest) as g
  from cls group by d
),
first_touch as (
  select p.id, p.created_at, coalesce(u.is_anonymous, false) as guest,
    least(
      coalesce((select min(created_at) from public.scan_events e where e.user_id = p.id), 'infinity'::timestamptz),
      coalesce((select min(added_at) from public.saved_cards s where s.user_id = p.id), 'infinity'::timestamptz),
      coalesce((select min(created_at) from public.collections c where c.user_id = p.id), 'infinity'::timestamptz)
    ) as tcg_first,
    least(
      coalesce((select min(created_at) from public.binders b where b.owner_id = p.id), 'infinity'::timestamptz),
      coalesce((select min(created_at) from public.saved_slices l where l.owner_id = p.id), 'infinity'::timestamptz)
    ) as michi_first
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.created_at >= now() - interval '{{WINDOW}} days'
    and p.id not in (select id from excluded_users)
),
newu as (
  select created_at::date as d,
    count(*) filter (where not guest) as c,
    count(*) filter (where guest) as g
  from first_touch
  where michi_first < tcg_first
  group by 1
)
select days.d::text as day,
  coalesce(dau.c, 0)::int as dau, coalesce(dau.g, 0)::int as dau_guest,
  coalesce(newu.c, 0)::int as new_users, coalesce(newu.g, 0)::int as new_guest
from days
left join dau on dau.d = days.d
left join newu on newu.d = days.d
order by days.d
