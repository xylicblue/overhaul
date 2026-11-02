-- Keep daily screening schedules complete for newly approved entities and
-- expose a service-only due-work queue for the future production connector.

begin;

create or replace function public.schedule_entity_monitoring_screenings_on_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.entity_monitoring_screening_schedule(
      application_id, screening_type, vendor, cadence, next_due_at
    ) values
      (new.id, 'sanctions', 'sumsub', 'daily_and_each_transaction', now()),
      (new.id, 'pep', 'sumsub', 'daily', now()),
      (new.id, 'adverse_media', 'sumsub', 'daily', now())
    on conflict(application_id, screening_type, vendor) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_schedule_entity_monitoring_screenings_on_approval
  on public.entity_applications;
create trigger trg_schedule_entity_monitoring_screenings_on_approval
  after insert or update of status on public.entity_applications
  for each row execute function public.schedule_entity_monitoring_screenings_on_approval();

create or replace function public.service_entity_monitoring_screenings_due(
  p_limit integer default 100
)
returns table(
  schedule_id uuid,
  application_id uuid,
  entity_legal_name text,
  screening_type text,
  vendor text,
  cadence text,
  last_run_at timestamptz,
  next_due_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_limit not between 1 and 500 then raise exception 'invalid limit' using errcode = '22023'; end if;
  return query
  select schedule.id, schedule.application_id, application.entity_legal_name,
         schedule.screening_type, schedule.vendor, schedule.cadence,
         schedule.last_run_at, schedule.next_due_at
  from public.entity_monitoring_screening_schedule schedule
  join public.entity_applications application on application.id = schedule.application_id
  where application.status = 'approved' and schedule.next_due_at <= now()
  order by schedule.next_due_at, schedule.id
  limit p_limit;
end;
$$;

revoke execute on function public.schedule_entity_monitoring_screenings_on_approval()
  from public, anon, authenticated;
revoke execute on function public.service_entity_monitoring_screenings_due(integer)
  from public, anon, authenticated;
grant execute on function public.service_entity_monitoring_screenings_due(integer)
  to service_role;

notify pgrst, 'reload schema';
commit;
