begin;

create table if not exists public.entity_wallet_ownership_challenges (
  id                    uuid primary key default gen_random_uuid(),
  application_id        uuid not null references public.entity_applications(id) on delete cascade,
  wallet_address        text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  chain_id              bigint not null default 11155111 check (chain_id > 0),
  message               text not null,
  message_hash          text not null check (message_hash ~ '^[0-9a-f]{64}$'),
  requested_by          uuid not null references auth.users(id) on delete restrict,
  expires_at            timestamptz not null,
  consumed_at           timestamptz,
  created_at            timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists entity_wallet_ownership_challenges_lookup_idx
  on public.entity_wallet_ownership_challenges(application_id, wallet_address, created_at desc);

create table if not exists public.entity_wallet_ownership_proofs (
  id                    uuid primary key default gen_random_uuid(),
  application_id        uuid not null references public.entity_applications(id) on delete cascade,
  wallet_address        text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  chain_id              bigint not null default 11155111 check (chain_id > 0),
  proof_method          text not null check (proof_method in (
                          'eoa_signature', 'eip1271_signature',
                          'custodian_confirmation', 'test_transaction'
                        )),
  status                text not null check (status in ('verified', 'pending_review', 'rejected', 'superseded')),
  challenge_id          uuid references public.entity_wallet_ownership_challenges(id) on delete set null,
  evidence              jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  submitted_by          uuid not null references auth.users(id) on delete restrict,
  verified_at           timestamptz,
  reviewed_by           uuid references auth.users(id) on delete restrict,
  reviewed_at           timestamptz,
  review_rationale      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (application_id, wallet_address),
  check ((status = 'verified' and verified_at is not null) or status <> 'verified'),
  check ((status in ('rejected', 'verified') and reviewed_by is not null and proof_method in ('custodian_confirmation', 'test_transaction'))
         or proof_method in ('eoa_signature', 'eip1271_signature')
         or status = 'pending_review')
);

create index if not exists entity_wallet_ownership_proofs_status_idx
  on public.entity_wallet_ownership_proofs(status, created_at desc);

create table if not exists public.entity_wallet_ownership_events (
  id                    uuid primary key default gen_random_uuid(),
  application_id        uuid not null references public.entity_applications(id) on delete cascade,
  proof_id              uuid references public.entity_wallet_ownership_proofs(id) on delete set null,
  wallet_address        text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  event_type            text not null,
  actor_id              uuid not null references auth.users(id) on delete restrict,
  details               jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at            timestamptz not null default now()
);

create index if not exists entity_wallet_ownership_events_application_idx
  on public.entity_wallet_ownership_events(application_id, created_at desc);

create or replace function public.touch_entity_wallet_ownership_proof()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.wallet_address := lower(new.wallet_address);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_entity_wallet_ownership_proof on public.entity_wallet_ownership_proofs;
create trigger trg_touch_entity_wallet_ownership_proof
  before insert or update on public.entity_wallet_ownership_proofs
  for each row execute function public.touch_entity_wallet_ownership_proof();

create or replace function public.reject_entity_wallet_ownership_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Wallet ownership audit events are immutable' using errcode = '55000';
end;
$$;

drop trigger if exists trg_entity_wallet_ownership_events_immutable on public.entity_wallet_ownership_events;
create trigger trg_entity_wallet_ownership_events_immutable
  before update or delete on public.entity_wallet_ownership_events
  for each row execute function public.reject_entity_wallet_ownership_event_mutation();

create or replace function public.require_entity_wallet_ownership_before_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare wallet text;
begin
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;

  foreach wallet in array new.crypto_wallet_addresses loop
    wallet := lower(btrim(wallet));
    if not exists (
      select 1
      from public.entity_wallet_ownership_proofs proof
      where proof.application_id = new.id
        and proof.wallet_address = wallet
        and proof.status in ('verified', 'pending_review')
    ) then
      raise exception 'Ownership evidence is required for wallet % before submission', wallet
        using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_require_entity_wallet_ownership_before_submission on public.entity_applications;
create trigger trg_require_entity_wallet_ownership_before_submission
  before update on public.entity_applications
  for each row execute function public.require_entity_wallet_ownership_before_submission();

alter table public.entity_wallet_ownership_challenges enable row level security;
alter table public.entity_wallet_ownership_proofs enable row level security;
alter table public.entity_wallet_ownership_events enable row level security;

drop policy if exists "Applicants read own wallet ownership proofs" on public.entity_wallet_ownership_proofs;
create policy "Applicants read own wallet ownership proofs"
  on public.entity_wallet_ownership_proofs for select to authenticated
  using (exists (
    select 1 from public.entity_applications application
    where application.id = application_id
      and application.primary_contact_user_id = (select auth.uid())
  ));

drop policy if exists "Admins read wallet ownership proofs" on public.entity_wallet_ownership_proofs;
create policy "Admins read wallet ownership proofs"
  on public.entity_wallet_ownership_proofs for select to authenticated
  using (public.is_admin() and public.is_aal2());

drop policy if exists "Applicants read own wallet ownership events" on public.entity_wallet_ownership_events;
create policy "Applicants read own wallet ownership events"
  on public.entity_wallet_ownership_events for select to authenticated
  using (exists (
    select 1 from public.entity_applications application
    where application.id = application_id
      and application.primary_contact_user_id = (select auth.uid())
  ));

drop policy if exists "Admins read wallet ownership events" on public.entity_wallet_ownership_events;
create policy "Admins read wallet ownership events"
  on public.entity_wallet_ownership_events for select to authenticated
  using (public.is_admin() and public.is_aal2());

revoke all on public.entity_wallet_ownership_challenges from public, anon, authenticated;
revoke all on public.entity_wallet_ownership_proofs from public, anon, authenticated;
revoke all on public.entity_wallet_ownership_events from public, anon, authenticated;
grant select on public.entity_wallet_ownership_proofs to authenticated;
grant select on public.entity_wallet_ownership_events to authenticated;
grant select, insert, update, delete on public.entity_wallet_ownership_challenges to service_role;
grant select, insert, update, delete on public.entity_wallet_ownership_proofs to service_role;
grant select, insert on public.entity_wallet_ownership_events to service_role;

revoke execute on function public.require_entity_wallet_ownership_before_submission() from public, anon, authenticated;
revoke execute on function public.reject_entity_wallet_ownership_event_mutation() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
