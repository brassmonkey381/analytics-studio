-- TCGScan account roster for report hover: the real accounts behind the counts.
with {{EXCLUDED_CTE}},
u as (
  select user_id as uid from public.scan_events
  union select user_id from public.saved_cards
  union select user_id from public.collections
  union select user_id from public.portfolio_entries
  union select owner_id from public.user_cards where source = 'scan'
)
select coalesce(a.email, '(no email)') as email, a.last_sign_in_at, a.created_at
from u join auth.users a on a.id = u.uid
where not coalesce(a.is_anonymous, false)
  and u.uid not in (select id from excluded_users)
order by a.last_sign_in_at desc nulls last
