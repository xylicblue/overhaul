-- ============================================================================
-- Entity-only onboarding, phase 1.
--
-- Implements Steps 0, 1, 1a and 2 of the AML/ATF onboarding specification.
-- Sumsub screening, automated tier assignment, EDD execution, wallet screening,
-- risk scoring, compliance approval and on-chain allowlisting are intentionally
-- outside this migration.
--
-- All supporting documents are stored in a private Storage bucket. Browser
-- access is limited to the authenticated primary contact's own folder and all
-- mutations require an aal2 session. Service-role compliance tooling can still
-- access every record when the review portal is added.
-- ============================================================================

begin;

create table if not exists public.entity_applications (
  id                                uuid primary key default gen_random_uuid(),
  primary_contact_user_id           uuid not null unique,
  status                            text not null default 'draft'
                                      check (status in ('draft','in_progress','submitted','under_review','approved','rejected')),
  onboarding_step                   smallint not null default 0 check (onboarding_step between 0 and 3),
  primary_contact_legal_name        text,
  primary_contact_phone             text,
  entity_legal_name                 text,
  registered_address               text,
  business_address                 text,
  business_address_same            boolean not null default true,
  incorporation_date               date,
  incorporation_place              text,
  listed_on_stock_exchange         boolean not null default false,
  stock_exchange_name              text,
  corporate_identification_number  text,
  entity_type                       text,
  entity_type_other                 text,
  entity_phone                      text,
  crypto_wallet_addresses           text[] not null default '{}',
  isic_division                     text,
  directors_and_officers            text[] not null default '{}',
  source_of_funds                   text,
  is_financial_institution          boolean not null default false,
  financial_institution_type        text,
  regulatory_registration_number   text,
  competent_authority               text,
  submitted_at                      timestamptz,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

create table if not exists public.entity_connected_persons (
  id                   uuid primary key default gen_random_uuid(),
  application_id       uuid not null references public.entity_applications(id) on delete cascade,
  roles                text[] not null default '{}',
  ownership_percent    numeric(5,2) check (ownership_percent is null or (ownership_percent >= 0 and ownership_percent <= 100)),
  control_description  text,
  full_name            text,
  phone                 text,
  email                 text,
  residential_address  text,
  date_of_birth         date,
  tax_identification_number text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.entity_onboarding_documents (
  id                   uuid primary key default gen_random_uuid(),
  application_id       uuid not null references public.entity_applications(id) on delete cascade,
  connected_person_id  uuid references public.entity_connected_persons(id) on delete cascade,
  uploaded_by           uuid not null,
  category              text not null check (category in (
    'proof_business_address',
    'articles_of_incorporation',
    'certificate_good_standing',
    'bank_statement',
    'source_of_funds',
    'aml_program_certificate',
    'aml_atf_sanctions_policy',
    'regulatory_licence',
    'connected_person_government_id'
  )),
  original_filename    text not null,
  storage_path         text not null unique,
  mime_type            text,
  size_bytes           bigint check (size_bytes is null or size_bytes >= 0),
  created_at           timestamptz not null default now(),
  check (
    (category = 'connected_person_government_id' and connected_person_id is not null)
    or
    (category <> 'connected_person_government_id' and connected_person_id is null)
  )
);

create index if not exists entity_connected_persons_application_idx
  on public.entity_connected_persons(application_id);
create index if not exists entity_onboarding_documents_application_idx
  on public.entity_onboarding_documents(application_id);
create index if not exists entity_onboarding_documents_person_idx
  on public.entity_onboarding_documents(connected_person_id)
  where connected_person_id is not null;

create or replace function public.touch_entity_onboarding_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Submission is a security boundary for the staged trading gate. Validate the
-- full record in Postgres so a caller cannot bypass required fields by issuing
-- a direct REST update that marks an incomplete shell as submitted.
create or replace function public.validate_entity_application_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_document_count integer;
  connected_person_count integer;
begin
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;

  if nullif(btrim(new.primary_contact_legal_name), '') is null
     or nullif(btrim(new.primary_contact_phone), '') is null
     or nullif(btrim(new.entity_legal_name), '') is null
     or nullif(btrim(new.registered_address), '') is null
     or nullif(btrim(new.business_address), '') is null
     or new.incorporation_date is null
     or nullif(btrim(new.incorporation_place), '') is null
     or nullif(btrim(new.corporate_identification_number), '') is null
     or nullif(btrim(new.entity_type), '') is null
     or nullif(btrim(new.entity_phone), '') is null
     or nullif(btrim(new.isic_division), '') is null
     or nullif(btrim(new.source_of_funds), '') is null
     or cardinality(new.crypto_wallet_addresses) = 0
     or cardinality(new.directors_and_officers) = 0 then
    raise exception 'Entity application is incomplete' using errcode = '23514';
  end if;

  if new.entity_type = 'other' and nullif(btrim(new.entity_type_other), '') is null then
    raise exception 'Other entity type must be specified' using errcode = '23514';
  end if;
  if new.listed_on_stock_exchange and nullif(btrim(new.stock_exchange_name), '') is null then
    raise exception 'Stock exchange must be specified' using errcode = '23514';
  end if;
  if new.is_financial_institution and (
    nullif(btrim(new.financial_institution_type), '') is null
    or nullif(btrim(new.regulatory_registration_number), '') is null
    or nullif(btrim(new.competent_authority), '') is null
  ) then
    raise exception 'Financial institution details are incomplete' using errcode = '23514';
  end if;

  select count(distinct d.category) into required_document_count
  from public.entity_onboarding_documents d
  where d.application_id = new.id
    and d.connected_person_id is null
    and d.category = any(array[
      'proof_business_address', 'articles_of_incorporation',
      'certificate_good_standing', 'bank_statement', 'source_of_funds',
      'aml_program_certificate', 'aml_atf_sanctions_policy'
    ]);
  if required_document_count < 7 then
    raise exception 'Required entity documents are incomplete' using errcode = '23514';
  end if;
  if new.is_financial_institution and not exists (
    select 1 from public.entity_onboarding_documents d
    where d.application_id = new.id
      and d.connected_person_id is null
      and d.category = 'regulatory_licence'
  ) then
    raise exception 'Regulatory licence document is required' using errcode = '23514';
  end if;

  select count(*) into connected_person_count
  from public.entity_connected_persons p
  where p.application_id = new.id;
  if connected_person_count = 0 then
    raise exception 'At least one connected person is required' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.entity_connected_persons p
    where p.application_id = new.id
      and (
        cardinality(p.roles) = 0
        or nullif(btrim(p.full_name), '') is null
        or nullif(btrim(p.phone), '') is null
        or nullif(btrim(p.email), '') is null
        or nullif(btrim(p.residential_address), '') is null
        or p.date_of_birth is null
        or nullif(btrim(p.tax_identification_number), '') is null
        or ('beneficial_owner' = any(p.roles) and p.ownership_percent is null)
        or not exists (
          select 1 from public.entity_onboarding_documents d
          where d.application_id = new.id
            and d.connected_person_id = p.id
            and d.category = 'connected_person_government_id'
        )
      )
  ) then
    raise exception 'Connected person information or identification is incomplete' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.entity_onboarding_documents d
    where d.application_id = new.id
      and not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'entity-onboarding-documents'
          and o.name = d.storage_path
      )
  ) then
    raise exception 'One or more document objects are missing' using errcode = '23514';
  end if;

  new.submitted_at = coalesce(new.submitted_at, now());
  new.onboarding_step = 3;
  return new;
end;
$$;

drop trigger if exists trg_entity_applications_updated_at on public.entity_applications;
create trigger trg_entity_applications_updated_at
  before update on public.entity_applications
  for each row execute function public.touch_entity_onboarding_updated_at();

drop trigger if exists trg_entity_connected_persons_updated_at on public.entity_connected_persons;
create trigger trg_entity_connected_persons_updated_at
  before update on public.entity_connected_persons
  for each row execute function public.touch_entity_onboarding_updated_at();

drop trigger if exists trg_validate_entity_application_submission on public.entity_applications;
create trigger trg_validate_entity_application_submission
  before update on public.entity_applications
  for each row execute function public.validate_entity_application_submission();

alter table public.entity_applications enable row level security;
alter table public.entity_connected_persons enable row level security;
alter table public.entity_onboarding_documents enable row level security;

drop policy if exists "Primary contact reads entity application" on public.entity_applications;
create policy "Primary contact reads entity application"
  on public.entity_applications for select to authenticated
  using (primary_contact_user_id = auth.uid());

drop policy if exists "Primary contact creates entity application" on public.entity_applications;
create policy "Primary contact creates entity application"
  on public.entity_applications for insert to authenticated
  with check (
    primary_contact_user_id = auth.uid()
    and status in ('draft','in_progress')
    and public.is_aal2()
  );

drop policy if exists "Primary contact updates entity application" on public.entity_applications;
create policy "Primary contact updates entity application"
  on public.entity_applications for update to authenticated
  using (
    primary_contact_user_id = auth.uid()
    and status in ('draft','in_progress')
    and public.is_aal2()
  )
  with check (
    primary_contact_user_id = auth.uid()
    and status in ('draft','in_progress','submitted')
    and public.is_aal2()
  );

drop policy if exists "Primary contact reads connected persons" on public.entity_connected_persons;
create policy "Primary contact reads connected persons"
  on public.entity_connected_persons for select to authenticated
  using (exists (
    select 1 from public.entity_applications a
    where a.id = application_id and a.primary_contact_user_id = auth.uid()
  ));

drop policy if exists "Primary contact creates connected persons" on public.entity_connected_persons;
create policy "Primary contact creates connected persons"
  on public.entity_connected_persons for insert to authenticated
  with check (public.is_aal2() and exists (
    select 1 from public.entity_applications a
    where a.id = application_id
      and a.primary_contact_user_id = auth.uid()
      and a.status in ('draft','in_progress')
  ));

drop policy if exists "Primary contact updates connected persons" on public.entity_connected_persons;
create policy "Primary contact updates connected persons"
  on public.entity_connected_persons for update to authenticated
  using (public.is_aal2() and exists (
    select 1 from public.entity_applications a
    where a.id = application_id and a.primary_contact_user_id = auth.uid()
  ))
  with check (public.is_aal2() and exists (
    select 1 from public.entity_applications a
    where a.id = application_id
      and a.primary_contact_user_id = auth.uid()
      and a.status in ('draft','in_progress')
  ));

drop policy if exists "Primary contact deletes connected persons" on public.entity_connected_persons;
create policy "Primary contact deletes connected persons"
  on public.entity_connected_persons for delete to authenticated
  using (public.is_aal2() and exists (
    select 1 from public.entity_applications a
    where a.id = application_id
      and a.primary_contact_user_id = auth.uid()
      and a.status in ('draft','in_progress')
  ));

drop policy if exists "Primary contact reads onboarding documents" on public.entity_onboarding_documents;
create policy "Primary contact reads onboarding documents"
  on public.entity_onboarding_documents for select to authenticated
  using (uploaded_by = auth.uid() and exists (
    select 1 from public.entity_applications a
    where a.id = application_id and a.primary_contact_user_id = auth.uid()
  ));

drop policy if exists "Primary contact records onboarding documents" on public.entity_onboarding_documents;
create policy "Primary contact records onboarding documents"
  on public.entity_onboarding_documents for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and storage_path like auth.uid()::text || '/%'
    and public.is_aal2()
    and exists (
      select 1 from public.entity_applications a
      where a.id = application_id
        and a.primary_contact_user_id = auth.uid()
        and a.status in ('draft','in_progress')
    )
  );

drop policy if exists "Primary contact removes onboarding documents" on public.entity_onboarding_documents;
create policy "Primary contact removes onboarding documents"
  on public.entity_onboarding_documents for delete to authenticated
  using (
    uploaded_by = auth.uid()
    and public.is_aal2()
    and exists (
      select 1 from public.entity_applications a
      where a.id = application_id
        and a.primary_contact_user_id = auth.uid()
        and a.status in ('draft','in_progress')
    )
  );

revoke all on public.entity_applications from anon;
revoke all on public.entity_connected_persons from anon;
revoke all on public.entity_onboarding_documents from anon;
grant select, insert, update on public.entity_applications to authenticated;
grant select, insert, update, delete on public.entity_connected_persons to authenticated;
grant select, insert, delete on public.entity_onboarding_documents to authenticated;

-- Private document bucket. The size and MIME restrictions are enforced again
-- in the browser so users receive an immediate, useful validation message.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entity-onboarding-documents',
  'entity-onboarding-documents',
  false,
  15728640,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Entity applicants read own document objects" on storage.objects;
create policy "Entity applicants read own document objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'entity-onboarding-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Entity applicants upload own document objects" on storage.objects;
create policy "Entity applicants upload own document objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'entity-onboarding-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_aal2()
  );

drop policy if exists "Entity applicants delete own document objects" on storage.objects;
create policy "Entity applicants delete own document objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'entity-onboarding-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_aal2()
  );

notify pgrst, 'reload schema';

commit;
