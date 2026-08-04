-- Coverage for the shared TCGScan/Michi-Maker project, after exclusions.
-- The apps call signInAnonymously on first visit, so auth.users is dominated
-- by guest sessions; this separates real accounts from guests and reports how
-- many rows the exclusion rules removed.
with {{EXCLUDED_CTE}},
ft as (
  select p.id, coalesce(u.is_anonymous, false) as guest,
    (p.id in (select id from excluded_users)) as ex,
    least(
      coalesce((select min(created_at) from public.scan_events e where e.user_id = p.id), 'infinity'::timestamptz),
      coalesce((select min(added_at) from public.saved_cards s where s.user_id = p.id), 'infinity'::timestamptz),
      coalesce((select min(created_at) from public.collections c where c.user_id = p.id), 'infinity'::timestamptz)
    ) as tcg,
    least(
      coalesce((select min(created_at) from public.binders b where b.owner_id = p.id), 'infinity'::timestamptz),
      coalesce((select min(created_at) from public.saved_slices l where l.owner_id = p.id), 'infinity'::timestamptz)
    ) as michi
  from public.profiles p
  left join auth.users u on u.id = p.id
)
select
  count(*) filter (where not guest and not ex)::int as registered,
  count(*) filter (where guest and not ex)::int as guest_sessions,
  count(*) filter (where ex)::int as excluded,
  count(*) filter (where not guest and not ex and tcg = 'infinity' and michi = 'infinity')::int as no_activity
from ft
