-- RULE 1: Trial can only be granted once per user.
-- Only set trial_ends_at when it is currently NULL.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, full_name, avatar_url, plan, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'starter',
    now() + interval '14 days'
  )
  on conflict (user_id) do update set
    trial_ends_at = case when public.profiles.trial_ends_at is null
      then now() + interval '14 days'
      else public.profiles.trial_ends_at
    end;
  return new;
end;
$$;
