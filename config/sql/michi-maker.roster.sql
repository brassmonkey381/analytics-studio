-- Michi-Maker account roster for report hover: the real accounts behind the counts.
with {{EXCLUDED_CTE}},
u as (
  select owner_id as uid from public.binders
  union select owner_id from public.saved_slices
  union select user_id from public.binder_likes
  union select voter_id from public.profile_upvotes
  union select user_id from public.print_events
  union select copied_by from public.binder_reshares
  union select owner_id from public.contest_entries
)
select coalesce(a.email, '(no email)') as email, a.last_sign_in_at, a.created_at
from u join auth.users a on a.id = u.uid
where not coalesce(a.is_anonymous, false)
  and u.uid not in (select id from excluded_users)
order by a.last_sign_in_at desc nulls last
