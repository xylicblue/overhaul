-- ============================================================================
-- Complete the confirmed entity live-monitoring controls.
--
-- This migration is additive and off-chain. It does not modify an audited
-- contract. Transaction rules remain in shadow mode until Compliance elects
-- to apply a reversible account restriction through the admin portal.
-- ============================================================================

begin;

alter table public.entity_monitoring_profile_changes
  alter column resulting_expected_deposits drop not null;
alter table public.entity_monitoring_profile_changes
  drop constraint if exists entity_monitoring_profile_changes_resulting_expected_deposits_check;
alter table public.entity_monitoring_profile_changes
  add constraint entity_monitoring_profile_changes_resulting_expected_deposits_check
  check (resulting_expected_deposits is null or resulting_expected_deposits > 0);

alter table public.entity_monitoring_alerts
  add column if not exists response_due_at timestamptz,
  add column if not exists sla_policy text;

alter table public.entity_account_restrictions
  drop constraint if exists entity_account_restrictions_restriction_type_check;
alter table public.entity_account_restrictions
  add constraint entity_account_restrictions_restriction_type_check
  check (restriction_type in (
    'all_activity', 'close_only', 'trading', 'open_position', 'close_position',
    'margin_change', 'collateral_deposit', 'collateral_withdrawal'
  ));

create table if not exists public.entity_compliance_staff_roles (
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('compliance_officer')),
  active        boolean not null default true,
  rationale     text not null check (char_length(btrim(rationale)) between 1 and 5000),
  assigned_by   uuid not null references auth.users(id) on delete restrict,
  assigned_at   timestamptz not null default now(),
  revoked_by    uuid references auth.users(id) on delete restrict,
  revoked_at    timestamptz,
  primary key (user_id, role)
);

create table if not exists public.entity_compliance_staff_role_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete restrict,
  role          text not null,
  active        boolean not null,
  rationale     text not null,
  actor_id      uuid not null references auth.users(id) on delete restrict,
  created_at    timestamptz not null default now()
);

create table if not exists public.entity_monitoring_vendor_status (
  vendor          text primary key,
  availability    text not null default 'unavailable'
    check (availability in ('available', 'unavailable', 'recovering')),
  last_success_at timestamptz,
  last_result_at  timestamptz,
  outage_started_at timestamptz,
  last_error      text,
  updated_at      timestamptz not null default now()
);

create table if not exists public.entity_monitoring_screening_schedule (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references public.entity_applications(id) on delete cascade,
  screening_type     text not null check (screening_type in ('sanctions', 'pep', 'adverse_media')),
  vendor             text not null,
  cadence            text not null default 'daily' check (cadence in ('daily', 'daily_and_each_transaction')),
  last_run_at        timestamptz,
  last_result_status text,
  next_due_at        timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (application_id, screening_type, vendor)
);

create index if not exists entity_monitoring_screening_schedule_due_idx
  on public.entity_monitoring_screening_schedule(next_due_at);

create table if not exists public.entity_monitoring_screening_results (
  id                  uuid primary key default gen_random_uuid(),
  application_id      uuid not null references public.entity_applications(id) on delete restrict,
  connected_person_id uuid references public.entity_connected_persons(id) on delete set null,
  screening_type      text not null check (screening_type in ('sanctions', 'pep', 'adverse_media')),
  vendor              text not null,
  result_status       text not null check (result_status in ('clear', 'possible_match', 'confirmed_match', 'unavailable')),
  provider_reference  text,
  lists_checked       text[] not null default '{}',
  used_last_available boolean not null default false,
  evidence            jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  observed_at         timestamptz not null,
  created_at          timestamptz not null default now()
);

create index if not exists entity_monitoring_screening_results_application_idx
  on public.entity_monitoring_screening_results(application_id, observed_at desc);

create table if not exists public.entity_monitoring_actions (
  id                  uuid primary key default gen_random_uuid(),
  application_id      uuid not null references public.entity_applications(id) on delete restrict,
  alert_id             uuid references public.entity_monitoring_alerts(id) on delete set null,
  action_type          text not null check (action_type in (
    'internal_review', 'request_edd', 'block_transaction', 'block_client',
    'warning_email', 'freeze_close_only', 'offboard'
  )),
  action_state         text not null check (action_state in ('proposed', 'active', 'revoked', 'completed')),
  source               text not null check (source in ('rule', 'manual', 'vendor_screening')),
  rationale            text not null check (char_length(btrim(rationale)) between 1 and 5000),
  evidence             jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  parent_action_id     uuid references public.entity_monitoring_actions(id) on delete restrict,
  actor_id             uuid references auth.users(id) on delete restrict,
  created_at           timestamptz not null default now()
);

create index if not exists entity_monitoring_actions_application_idx
  on public.entity_monitoring_actions(application_id, created_at desc);

create or replace function public.entity_monitoring_add_business_days_utc(
  p_start timestamptz,
  p_days integer
)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
declare
  result timestamptz := p_start;
  added integer := 0;
begin
  while added < p_days loop
    result := result + interval '1 day';
    if extract(isodow from result at time zone 'UTC') < 6 then added := added + 1; end if;
  end loop;
  return result;
end;
$$;

create or replace function public.set_entity_monitoring_alert_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.response_due_at is null then
    if new.alert_type in ('sanctions_match', 'sanctioned_jurisdiction') then
      new.response_due_at := new.occurred_at + interval '24 hours';
      new.sla_policy := 'Sanctions-related alert: review within 24 hours';
    else
      new.response_due_at := public.entity_monitoring_add_business_days_utc(new.occurred_at, 3);
      new.sla_policy := 'Other monitoring alert: review within 3 business days (UTC weekdays)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_entity_monitoring_alert_deadline on public.entity_monitoring_alerts;
create trigger trg_set_entity_monitoring_alert_deadline
  before insert on public.entity_monitoring_alerts
  for each row execute function public.set_entity_monitoring_alert_deadline();

update public.entity_monitoring_alerts
set response_due_at = case
      when alert_type in ('sanctions_match', 'sanctioned_jurisdiction') then occurred_at + interval '24 hours'
      else public.entity_monitoring_add_business_days_utc(occurred_at, 3)
    end,
    sla_policy = case
      when alert_type in ('sanctions_match', 'sanctioned_jurisdiction') then 'Sanctions-related alert: review within 24 hours'
      else 'Other monitoring alert: review within 3 business days (UTC weekdays)'
    end
where response_due_at is null;

create or replace function public.entity_monitoring_is_compliance_officer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entity_compliance_staff_roles assignment
    where assignment.user_id = auth.uid()
      and assignment.role = 'compliance_officer'
      and assignment.active
  );
$$;

create or replace function public.admin_set_entity_compliance_officer(
  p_user_id uuid,
  p_active boolean,
  p_rationale text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare active_officers integer;
begin
  if auth.uid() is null or not public.is_admin() or not public.is_aal2() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if nullif(btrim(p_rationale), '') is null then raise exception 'A rationale is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and is_admin) then
    raise exception 'The Compliance Officer must be an administrator' using errcode = '23514';
  end if;
  select count(*) into active_officers from public.entity_compliance_staff_roles
  where role = 'compliance_officer' and active;
  if active_officers > 0 and not public.entity_monitoring_is_compliance_officer() then
    raise exception 'Only the current Compliance Officer may change this assignment' using errcode = '42501';
  end if;

  insert into public.entity_compliance_staff_roles (
    user_id, role, active, rationale, assigned_by, assigned_at, revoked_by, revoked_at
  ) values (
    p_user_id, 'compliance_officer', p_active, btrim(p_rationale), auth.uid(), now(),
    case when p_active then null else auth.uid() end,
    case when p_active then null else now() end
  ) on conflict (user_id, role) do update set
    active = excluded.active,
    rationale = excluded.rationale,
    assigned_by = excluded.assigned_by,
    assigned_at = excluded.assigned_at,
    revoked_by = excluded.revoked_by,
    revoked_at = excluded.revoked_at;

  insert into public.entity_compliance_staff_role_events(user_id, role, active, rationale, actor_id)
  values (p_user_id, 'compliance_officer', p_active, btrim(p_rationale), auth.uid());
end;
$$;

-- Only the five workbook factors through row 25 contribute to the numeric
-- transactional score. Pattern, jurisdiction and screening rules are alerts.
update public.entity_monitoring_rules
set implementation_status = 'implemented',
    implementation_note = coalesce(implementation_note, 'Evaluated from confirmed collateral events in shadow mode.')
where rule_key in (
  'purpose_expected_deposits', 'rapid_deposit_withdrawal', 'withdrawal_own_median',
  'withdrawal_balance_share', 'large_transaction', 'structuring_30_days',
  'frequent_material_withdrawals'
);

update public.entity_monitoring_rules
set risk_score = null
where rule_key in (
  'sanctioned_jurisdiction', 'fatf_grey_jurisdiction', 'fatf_black_jurisdiction',
  'purpose_expected_deposits', 'rapid_deposit_withdrawal', 'withdrawal_own_median',
  'withdrawal_balance_share', 'large_transaction', 'structuring_30_days',
  'frequent_material_withdrawals', 'balance_limit', 'cash_in_30_limit',
  'cash_out_30_limit', 'cash_in_90_limit', 'cash_out_90_limit',
  'sanctions_match', 'pep_match', 'adverse_media_match', 'third_party_routing'
);

create or replace function public.evaluate_entity_monitoring_event_patterns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  model public.entity_monitoring_model_versions%rowtype;
  application public.entity_applications%rowtype;
  rule_record public.entity_monitoring_rules%rowtype;
  did_trigger boolean;
  observed jsonb;
  volume_30 numeric;
  count_window bigint;
  total_window numeric;
  prior_median numeric;
  matching_deposit public.entity_monitoring_events%rowtype;
  pre_withdrawal_balance numeric;
  multiplier numeric;
begin
  select * into model from public.entity_monitoring_model_versions
  where status = 'active' order by version desc limit 1;
  if not found then return new; end if;
  select * into application from public.entity_applications where id = new.application_id;
  multiplier := model.capacity_multiplier * model.compliance_threshold_factor;

  for rule_record in
    select * from public.entity_monitoring_rules
    where model_version_id = model.id and enabled
      and rule_key in (
        'purpose_expected_deposits', 'rapid_deposit_withdrawal', 'withdrawal_own_median',
        'withdrawal_balance_share', 'large_transaction', 'structuring_30_days',
        'frequent_material_withdrawals'
      )
  loop
    did_trigger := false;
    observed := jsonb_build_object('event_type', new.event_type, 'amount_usd', new.amount_usd);

    if rule_record.rule_key = 'purpose_expected_deposits' and application.expected_monthly_deposits_usd is not null then
      select coalesce(sum(amount_usd), 0) into volume_30
      from public.entity_monitoring_events
      where application_id = new.application_id and event_type = 'collateral_withdrawal'
        and occurred_at > new.occurred_at - interval '30 days' and occurred_at <= new.occurred_at;
      did_trigger := volume_30 >= application.expected_monthly_deposits_usd
        * case application.account_purpose when 'hedging' then 2 else 3 end * multiplier;
      observed := observed || jsonb_build_object('cash_out_30_usd', volume_30, 'account_purpose', application.account_purpose,
        'expected_monthly_deposits_usd', application.expected_monthly_deposits_usd);
    elsif rule_record.rule_key = 'rapid_deposit_withdrawal' and new.event_type = 'collateral_withdrawal' then
      select * into matching_deposit from public.entity_monitoring_events candidate
      where candidate.application_id = new.application_id and candidate.event_type = 'collateral_deposit'
        and candidate.amount_usd >= 10000 * multiplier
        and candidate.amount_usd >= greatest(coalesce(candidate.account_equity_usd, candidate.amount_usd), 0) * 0.70
        and candidate.occurred_at >= new.occurred_at - interval '24 hours'
        and candidate.occurred_at <= new.occurred_at
        and new.amount_usd >= candidate.amount_usd
      order by candidate.occurred_at desc limit 1;
      did_trigger := found;
      observed := observed || jsonb_build_object('matching_deposit_event_id', matching_deposit.id);
    elsif rule_record.rule_key = 'withdrawal_own_median' and new.event_type = 'collateral_withdrawal' then
      select percentile_cont(0.5) within group (order by amount_usd) into prior_median
      from public.entity_monitoring_events
      where application_id = new.application_id and event_type = 'collateral_withdrawal'
        and id <> new.id and occurred_at >= new.occurred_at - interval '90 days' and occurred_at < new.occurred_at;
      did_trigger := prior_median is not null and new.amount_usd >= 25000 * multiplier and new.amount_usd >= prior_median * 7;
      observed := observed || jsonb_build_object('prior_90_day_median_usd', prior_median);
    elsif rule_record.rule_key = 'withdrawal_balance_share' and new.event_type = 'collateral_withdrawal' then
      pre_withdrawal_balance := greatest(coalesce(new.account_equity_usd, 0) + new.amount_usd, new.amount_usd);
      did_trigger := new.amount_usd >= 10000 * multiplier and new.amount_usd >= pre_withdrawal_balance * 0.70;
      observed := observed || jsonb_build_object('pre_withdrawal_balance_usd', pre_withdrawal_balance);
    elsif rule_record.rule_key = 'large_transaction' then
      did_trigger := new.event_type in ('collateral_deposit', 'collateral_withdrawal')
        and new.amount_usd >= 50000 * multiplier;
    elsif rule_record.rule_key = 'structuring_30_days' then
      select count(*), coalesce(sum(amount_usd), 0) into count_window, total_window
      from public.entity_monitoring_events
      where application_id = new.application_id
        and event_type in ('collateral_deposit', 'collateral_withdrawal')
        and amount_usd >= 40000 * multiplier and amount_usd < 50000 * multiplier
        and occurred_at > new.occurred_at - interval '30 days' and occurred_at <= new.occurred_at;
      did_trigger := count_window >= 3;
      observed := observed || jsonb_build_object('qualifying_count_30_days', count_window, 'qualifying_total_usd', total_window);
    elsif rule_record.rule_key = 'frequent_material_withdrawals' and new.event_type = 'collateral_withdrawal' then
      select count(*), coalesce(sum(amount_usd), 0) into count_window, total_window
      from public.entity_monitoring_events
      where application_id = new.application_id and event_type = 'collateral_withdrawal'
        and occurred_at > new.occurred_at - interval '1 day' and occurred_at <= new.occurred_at;
      did_trigger := count_window >= 4 and total_window >= 25000 * multiplier;
      observed := observed || jsonb_build_object('withdrawal_count_24_hours', count_window, 'withdrawal_total_usd', total_window);
    end if;

    insert into public.entity_monitoring_rule_evaluations(event_id, rule_id, application_id, triggered, observed_values)
    values (new.id, rule_record.id, new.application_id, did_trigger, observed)
    on conflict (event_id, rule_id) do nothing;

    if did_trigger then
      insert into public.entity_monitoring_alerts(
        application_id, source, alert_type, title, description, severity,
        external_reference, evidence, occurred_at
      ) values (
        new.application_id, 'transaction_monitoring', rule_record.rule_key, rule_record.title,
        'Shadow monitoring detected this rule. Configured consequence: ' || rule_record.consequence || '. No automatic restriction was applied.',
        case when rule_record.consequence ilike '%block%' or rule_record.consequence ilike '%stop%' then 'high' else 'medium' end,
        new.id::text || ':' || rule_record.rule_key,
        jsonb_build_object('operation_mode', model.operation_mode, 'rule_parameters', rule_record.parameters,
          'observed_values', observed, 'event_id', new.id), new.occurred_at
      );
      insert into public.entity_monitoring_actions(
        application_id, action_type, action_state, source, rationale, evidence
      ) values (
        new.application_id,
        case
          when rule_record.consequence ilike '%EDD%' then 'request_edd'
          when rule_record.consequence ilike '%warning email%' then 'warning_email'
          when rule_record.consequence ilike '%block client%' then 'block_client'
          when rule_record.consequence ilike '%block%' or rule_record.consequence ilike '%stop transaction%' then 'block_transaction'
          else 'internal_review'
        end,
        'proposed', 'rule', 'Automatically proposed by shadow rule ' || rule_record.rule_key || '; Compliance decision required.', observed
      );
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_evaluate_entity_monitoring_event_patterns on public.entity_monitoring_events;
create trigger trg_evaluate_entity_monitoring_event_patterns
  after insert on public.entity_monitoring_events
  for each row execute function public.evaluate_entity_monitoring_event_patterns();

create or replace function public.service_entity_monitoring_wallets_due(
  p_limit integer default 50,
  p_interval_minutes integer default 15
)
returns table(application_id uuid, wallet_address text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_limit not between 1 and 500 or p_interval_minutes not between 1 and 1440 then raise exception 'invalid refresh request' using errcode = '22023'; end if;
  return query
  select candidate.id, candidate.wallet_address
  from (
    select distinct on (application.id)
      application.id,
      lower(btrim(wallet.address)) as wallet_address,
      latest.created_at as last_snapshot_at
    from public.entity_applications application
    cross join lateral unnest(application.crypto_wallet_addresses) wallet(address)
    left join lateral (
      select snapshot.created_at from public.entity_live_risk_snapshots snapshot
      where snapshot.application_id = application.id order by snapshot.revision desc limit 1
    ) latest on true
    where application.status = 'approved' and wallet.address ~* '^0x[0-9a-f]{40}$'
    order by application.id, latest.created_at nulls first, lower(btrim(wallet.address))
  ) candidate
  where candidate.last_snapshot_at is null
     or candidate.last_snapshot_at < now() - make_interval(mins => p_interval_minutes)
  order by candidate.last_snapshot_at nulls first
  limit p_limit;
end;
$$;

create or replace function public.service_recalculate_entity_live_risk(
  p_wallet_address text,
  p_account_equity_usd numeric,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.entity_applications%rowtype;
  model public.entity_monitoring_model_versions%rowtype;
  assessment public.entity_risk_assessments%rowtype;
  windows integer[] := array[30,60,90,180,360];
  multipliers numeric[] := array[1,1.5,2,3,5];
  i integer;
  in_volume numeric; out_volume numeric; in_count bigint; out_count bigint;
  in_volume_score numeric := 0; out_volume_score numeric := 0; in_count_score numeric := 0; out_count_score numeric := 0;
  equity numeric; aum_score numeric; transactional_score numeric; composed_score numeric; band text;
  observations jsonb := '{}'::jsonb; factor_scores jsonb; revision_number integer; effective_multiplier numeric;
  has_trade boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  select candidate.* into application from public.entity_applications candidate
  where candidate.status = 'approved' and exists (
    select 1 from unnest(candidate.crypto_wallet_addresses) wallet(address)
    where lower(btrim(wallet.address)) = lower(btrim(p_wallet_address))
  );
  if not found then return jsonb_build_object('recorded', false, 'reason', 'wallet_not_mapped'); end if;

  select exists(select 1 from public.entity_monitoring_events where application_id = application.id and event_type = 'trade') into has_trade;
  if has_trade then
    if p_account_equity_usd is null then raise exception 'Effective account equity is required after the first trade' using errcode = '22023'; end if;
    equity := greatest(p_account_equity_usd, 0);
  else
    select greatest(coalesce(sum(case when event_type = 'collateral_deposit' then amount_usd when event_type = 'collateral_withdrawal' then -amount_usd else 0 end), 0), 0)
    into equity from public.entity_monitoring_events where application_id = application.id and occurred_at <= p_observed_at;
  end if;

  select * into model from public.entity_monitoring_model_versions where status = 'active' order by version desc limit 1;
  select * into assessment from public.entity_risk_assessments where application_id = application.id order by revision desc limit 1;
  effective_multiplier := model.capacity_multiplier * model.compliance_threshold_factor;
  for i in 1..array_length(windows, 1) loop
    select coalesce(sum(amount_usd),0), count(*) into in_volume,in_count from public.entity_monitoring_events
      where application_id=application.id and event_type='collateral_deposit' and occurred_at > p_observed_at-make_interval(days=>windows[i]) and occurred_at<=p_observed_at;
    select coalesce(sum(amount_usd),0), count(*) into out_volume,out_count from public.entity_monitoring_events
      where application_id=application.id and event_type='collateral_withdrawal' and occurred_at > p_observed_at-make_interval(days=>windows[i]) and occurred_at<=p_observed_at;
    in_volume_score := greatest(in_volume_score, public.entity_monitoring_score_volume(in_volume, multipliers[i]*effective_multiplier));
    out_volume_score := greatest(out_volume_score, public.entity_monitoring_score_volume(out_volume, multipliers[i]*effective_multiplier));
    in_count_score := greatest(in_count_score, public.entity_monitoring_score_count(in_count, multipliers[i]*effective_multiplier));
    out_count_score := greatest(out_count_score, public.entity_monitoring_score_count(out_count, multipliers[i]*effective_multiplier));
    observations := observations || jsonb_build_object(windows[i]::text,jsonb_build_object('cash_in_volume',in_volume,'cash_in_count',in_count,'cash_out_volume',out_volume,'cash_out_count',out_count));
  end loop;
  aum_score := case when equity < 25000*effective_multiplier then 1 when equity < 75000*effective_multiplier then 3 else 10 end;
  transactional_score := round(((aum_score*.10+in_volume_score*.15+in_count_score*.15+out_volume_score*.15+out_count_score*.15)/.70)::numeric,4);
  if assessment.id is not null then
    composed_score := round((assessment.effective_score*model.onboarding_weight+transactional_score*model.transaction_weight)::numeric,4);
    band := case when composed_score<=model.low_score_max then 'low' when composed_score<=model.medium_score_max then 'medium' else 'high' end;
  end if;
  factor_scores := jsonb_build_object('aum',aum_score,'cash_in_volume',in_volume_score,'cash_in_count',in_count_score,'cash_out_volume',out_volume_score,'cash_out_count',out_count_score);
  perform pg_advisory_xact_lock(hashtextextended(application.id::text,0));
  select coalesce(max(revision),0)+1 into revision_number from public.entity_live_risk_snapshots where application_id=application.id;
  insert into public.entity_live_risk_snapshots(application_id,model_version_id,revision,calculation_state,onboarding_assessment_id,onboarding_score,transactional_score,composed_score,final_band,factor_scores,factor_observations)
  values(application.id,model.id,revision_number,case when assessment.id is null then 'missing_onboarding' when has_trade then 'composed' else 'onboarding_only' end,assessment.id,assessment.effective_score,transactional_score,composed_score,band,factor_scores,observations||jsonb_build_object('account_equity_usd',equity,'equity_basis',case when has_trade then 'effective_account_equity' else 'net_deposited_collateral' end,'scheduled_recalculation',true));
  return jsonb_build_object('recorded',true,'application_id',application.id,'revision',revision_number,'transactional_score',transactional_score,'composed_score',composed_score,'final_band',band);
end;
$$;

create or replace function public.service_record_entity_monitoring_screening_result(
  p_application_id uuid,
  p_screening_type text,
  p_vendor text,
  p_result_status text,
  p_observed_at timestamptz,
  p_connected_person_id uuid default null,
  p_provider_reference text default null,
  p_lists_checked text[] default '{}',
  p_used_last_available boolean default false,
  p_evidence jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare result_id uuid; alert_key text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.entity_monitoring_screening_results(application_id,connected_person_id,screening_type,vendor,result_status,provider_reference,lists_checked,used_last_available,evidence,observed_at)
  values(p_application_id,p_connected_person_id,p_screening_type,lower(btrim(p_vendor)),p_result_status,nullif(btrim(p_provider_reference),''),coalesce(p_lists_checked,'{}'),p_used_last_available,coalesce(p_evidence,'{}'),p_observed_at)
  returning id into result_id;
  insert into public.entity_monitoring_vendor_status(vendor,availability,last_success_at,last_result_at,outage_started_at,last_error)
  values(lower(btrim(p_vendor)),'available',p_observed_at,p_observed_at,null,null)
  on conflict(vendor) do update set availability='available',last_success_at=excluded.last_success_at,last_result_at=excluded.last_result_at,outage_started_at=null,last_error=null,updated_at=now();
  update public.entity_monitoring_screening_schedule set last_run_at=p_observed_at,last_result_status=p_result_status,next_due_at=p_observed_at+interval '1 day',updated_at=now()
  where application_id=p_application_id and screening_type=p_screening_type and vendor=lower(btrim(p_vendor));
  if p_result_status in ('possible_match','confirmed_match') then
    alert_key := case p_screening_type when 'sanctions' then 'sanctions_match' when 'pep' then 'pep_match' else 'adverse_media_match' end;
    insert into public.entity_monitoring_alerts(application_id,connected_person_id,source,alert_type,title,description,severity,external_reference,evidence,occurred_at)
    values(p_application_id,p_connected_person_id,'vendor_screening',alert_key,initcap(replace(p_screening_type,'_',' '))||' screening match',
      case when p_result_status='possible_match' then 'Vendor returned a possible match. Compliance confirmation is required before final disposition.' else 'Vendor returned a confirmed match. Review the configured action and evidence.' end,
      case when p_screening_type='sanctions' then 'critical' else 'high' end,result_id::text,coalesce(p_evidence,'{}')||jsonb_build_object('lists_checked',coalesce(p_lists_checked,'{}'),'provider_reference',p_provider_reference),p_observed_at);
  end if;
  return result_id;
end;
$$;

create or replace function public.service_mark_entity_monitoring_vendor_unavailable(
  p_vendor text,
  p_error text,
  p_observed_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.entity_monitoring_vendor_status(vendor,availability,outage_started_at,last_error,last_result_at)
  values(lower(btrim(p_vendor)),'unavailable',p_observed_at,left(p_error,5000),p_observed_at)
  on conflict(vendor) do update set availability='unavailable',outage_started_at=coalesce(public.entity_monitoring_vendor_status.outage_started_at,excluded.outage_started_at),last_error=excluded.last_error,last_result_at=excluded.last_result_at,updated_at=now();
end;
$$;

insert into public.entity_monitoring_vendor_status(vendor,availability)
values ('sumsub','unavailable') on conflict(vendor) do nothing;

insert into public.entity_monitoring_screening_schedule(application_id,screening_type,vendor,cadence,next_due_at)
select application.id, screening.screening_type, 'sumsub', screening.cadence, now()
from public.entity_applications application
cross join (values ('sanctions','daily_and_each_transaction'),('pep','daily'),('adverse_media','daily')) screening(screening_type,cadence)
where application.status='approved'
on conflict(application_id,screening_type,vendor) do nothing;

create or replace function public.current_entity_transaction_permissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare restrictions text[]; reason text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if public.is_admin() then
    return jsonb_build_object('open_position',true,'close_position',true,'margin_change',true,'collateral_deposit',true,'collateral_withdrawal',true,'reasons','{}'::jsonb);
  end if;
  select coalesce(array_agg(distinct restriction.restriction_type),'{}'), string_agg(distinct restriction.rationale,'; ')
  into restrictions,reason
  from public.entity_memberships membership join public.entity_account_restrictions restriction on restriction.application_id=membership.application_id and restriction.status='active'
  where membership.user_id=auth.uid() and membership.status='active';
  return jsonb_build_object(
    'open_position', not (restrictions && array['all_activity','close_only','trading','open_position']),
    'close_position', not (restrictions && array['all_activity','trading','close_position']),
    'margin_change', not (restrictions && array['all_activity','close_only','margin_change']),
    'collateral_deposit', not (restrictions && array['all_activity','close_only','collateral_deposit']),
    'collateral_withdrawal', not (restrictions && array['all_activity','close_only','collateral_withdrawal']),
    'reason',reason,
    'restrictions',to_jsonb(restrictions)
  );
end;
$$;

create or replace function public.admin_set_entity_account_restriction(
  p_application_id uuid,
  p_restriction_type text,
  p_active boolean,
  p_rationale text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() or not public.is_aal2() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_restriction_type not in ('all_activity','close_only','trading','open_position','close_position','margin_change','collateral_deposit','collateral_withdrawal') then raise exception 'Unknown restriction type' using errcode='22023'; end if;
  if nullif(btrim(p_rationale),'') is null then raise exception 'A rationale is required' using errcode='22023'; end if;
  if p_active then
    insert into public.entity_account_restrictions(application_id,restriction_type,rationale,created_by)
    values(p_application_id,p_restriction_type,btrim(p_rationale),auth.uid())
    on conflict(application_id,restriction_type) where status='active' do update set rationale=excluded.rationale;
  else
    update public.entity_account_restrictions set status='revoked',revoked_by=auth.uid(),revoked_at=now(),revocation_note=btrim(p_rationale)
    where application_id=p_application_id and restriction_type=p_restriction_type and status='active';
  end if;
  insert into public.entity_monitoring_actions(application_id,action_type,action_state,source,rationale,actor_id)
  values(p_application_id,case when p_restriction_type='close_only' then 'freeze_close_only' when p_restriction_type in ('all_activity','trading') then 'block_client' else 'block_transaction' end,case when p_active then 'active' else 'revoked' end,'manual',btrim(p_rationale),auth.uid());
end;
$$;

create or replace function public.entity_activity_is_restricted(p_user_id uuid,p_activity text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.entity_memberships membership join public.entity_account_restrictions restriction on restriction.application_id=membership.application_id and restriction.status='active'
    where membership.user_id=p_user_id and membership.status='active' and (
      restriction.restriction_type='all_activity' or restriction.restriction_type=p_activity
      or (restriction.restriction_type='trading' and p_activity in ('open_position','close_position'))
      or (restriction.restriction_type='close_only' and p_activity in ('open_position','margin_change','collateral_deposit','collateral_withdrawal'))
    )
  );
$$;

create or replace function public.admin_update_entity_monitoring_profile(p_application_id uuid,p_account_purpose text,p_expected_monthly_deposits_usd numeric,p_rationale text)
returns void language plpgsql security definer set search_path='' as $$
declare application public.entity_applications%rowtype;
begin
  if auth.uid() is null or not public.is_admin() or not public.is_aal2() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_account_purpose not in ('hedging','trading') then raise exception 'Select Hedging or Trading' using errcode='22023'; end if;
  if p_expected_monthly_deposits_usd is not null and p_expected_monthly_deposits_usd<=0 then raise exception 'Expected monthly deposits must be greater than zero when supplied' using errcode='22023'; end if;
  if nullif(btrim(p_rationale),'') is null then raise exception 'A rationale is required' using errcode='22023'; end if;
  select * into application from public.entity_applications where id=p_application_id for update;
  if not found then raise exception 'Entity application not found' using errcode='P0002'; end if;
  insert into public.entity_monitoring_profile_changes(application_id,previous_account_purpose,resulting_account_purpose,previous_expected_deposits,resulting_expected_deposits,rationale,changed_by)
  values(application.id,application.account_purpose,p_account_purpose,application.expected_monthly_deposits_usd,p_expected_monthly_deposits_usd,btrim(p_rationale),auth.uid());
  update public.entity_applications set account_purpose=p_account_purpose,expected_monthly_deposits_usd=p_expected_monthly_deposits_usd,updated_at=now() where id=application.id;
end;
$$;

create or replace function public.admin_revise_entity_monitoring_thresholds(p_capacity_step integer,p_compliance_threshold_factor numeric,p_rationale text,p_approval_reference text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare current_model public.entity_monitoring_model_versions%rowtype; new_model_id uuid; new_version integer; new_capacity_multiplier numeric;
begin
  if auth.uid() is null or not public.is_admin() or not public.is_aal2() or not public.entity_monitoring_is_compliance_officer() then raise exception 'Only the registered Compliance Officer may revise monitoring thresholds' using errcode='42501'; end if;
  if p_capacity_step not between 1 and 11 then raise exception 'Capacity step must be between 1 and 11' using errcode='22023'; end if;
  if p_compliance_threshold_factor is null or p_compliance_threshold_factor<=0 or p_compliance_threshold_factor>1 then raise exception 'Compliance threshold factor must be greater than zero and no more than one' using errcode='22023'; end if;
  if nullif(btrim(p_rationale),'') is null then raise exception 'A rationale is required' using errcode='22023'; end if;
  new_capacity_multiplier:=case p_capacity_step when 1 then 1 when 2 then 1 when 3 then 1.18321595661992 when 4 then 1.67332005306815 when 5 then 2.36643191323985 when 6 then 2.89827534923789 when 7 then 3.74165738677394 when 8 then 4.58257569495584 when 9 then 5.29150262212918 when 10 then 8.36660026534076 when 11 then 11.8321595661992 end;
  perform pg_advisory_xact_lock(hashtextextended('entity-monitoring-model',0));
  select * into current_model from public.entity_monitoring_model_versions where status='active' order by version desc limit 1 for update;
  if current_model.capacity_step=p_capacity_step and current_model.compliance_threshold_factor=p_compliance_threshold_factor then raise exception 'The requested monitoring thresholds are already active' using errcode='23514'; end if;
  select coalesce(max(version),0)+1 into new_version from public.entity_monitoring_model_versions;
  update public.entity_monitoring_model_versions set status='retired' where id=current_model.id;
  insert into public.entity_monitoring_model_versions(version,name,status,operation_mode,source_document,rationale,onboarding_weight,transaction_weight,low_score_max,medium_score_max,capacity_step,capacity_multiplier,compliance_threshold_factor,window_multipliers,created_by,activated_by,activated_at)
  values(new_version,current_model.name,'active','shadow',current_model.source_document,btrim(p_rationale),current_model.onboarding_weight,current_model.transaction_weight,current_model.low_score_max,current_model.medium_score_max,p_capacity_step,new_capacity_multiplier,p_compliance_threshold_factor,current_model.window_multipliers,auth.uid(),auth.uid(),now()) returning id into new_model_id;
  insert into public.entity_monitoring_rules(model_version_id,rule_key,title,category,domain,execution_moment,consequence,enforcement_mode,enabled,implementation_status,risk_score,parameters,implementation_note)
  select new_model_id,rule_key,title,category,domain,execution_moment,consequence,case when enabled then 'shadow' else 'disabled' end,enabled,implementation_status,risk_score,parameters,implementation_note from public.entity_monitoring_rules where model_version_id=current_model.id;
  insert into public.entity_monitoring_model_changes(previous_model_version_id,resulting_model_version_id,previous_capacity_step,resulting_capacity_step,previous_threshold_factor,resulting_threshold_factor,rationale,approval_reference,changed_by)
  values(current_model.id,new_model_id,current_model.capacity_step,p_capacity_step,current_model.compliance_threshold_factor,p_compliance_threshold_factor,btrim(p_rationale),nullif(btrim(p_approval_reference),''),auth.uid());
  return new_version;
end;
$$;

create or replace function public.admin_entity_live_monitoring_context(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.is_admin() or not public.is_aal2() then raise exception 'forbidden' using errcode='42501'; end if;
  return jsonb_build_object(
    'can_manage_thresholds',public.entity_monitoring_is_compliance_officer(),
    'compliance_roles',coalesce((select jsonb_agg(to_jsonb(role_row)) from public.entity_compliance_staff_roles role_row where active),'[]'::jsonb),
    'model',(select to_jsonb(model) from public.entity_monitoring_model_versions model where status='active' order by version desc limit 1),
    'rules',coalesce((select jsonb_agg(to_jsonb(rule) order by rule.category,rule.title) from public.entity_monitoring_rules rule join public.entity_monitoring_model_versions model on model.id=rule.model_version_id and model.status='active'),'[]'::jsonb),
    'latest_risk',(select to_jsonb(snapshot) from public.entity_live_risk_snapshots snapshot where application_id=p_application_id order by revision desc limit 1),
    'risk_history',coalesce((select jsonb_agg(to_jsonb(history) order by history.revision desc) from (select * from public.entity_live_risk_snapshots where application_id=p_application_id order by revision desc limit 50) history),'[]'::jsonb),
    'recent_events',coalesce((select jsonb_agg(to_jsonb(event_row) order by event_row.occurred_at desc) from (select * from public.entity_monitoring_events where application_id=p_application_id order by occurred_at desc limit 50) event_row),'[]'::jsonb),
    'triggered_evaluations',coalesce((select jsonb_agg(jsonb_build_object('id',evaluation.id,'event_id',evaluation.event_id,'rule_key',rule.rule_key,'title',rule.title,'consequence',rule.consequence,'enforcement_mode',rule.enforcement_mode,'observed_values',evaluation.observed_values,'evaluated_at',evaluation.evaluated_at) order by evaluation.evaluated_at desc) from public.entity_monitoring_rule_evaluations evaluation join public.entity_monitoring_rules rule on rule.id=evaluation.rule_id where evaluation.application_id=p_application_id and evaluation.triggered),'[]'::jsonb),
    'profile_changes',coalesce((select jsonb_agg(to_jsonb(change_row) order by change_row.created_at desc) from public.entity_monitoring_profile_changes change_row where change_row.application_id=p_application_id),'[]'::jsonb),
    'model_changes',coalesce((select jsonb_agg(to_jsonb(change_row) order by change_row.created_at desc) from public.entity_monitoring_model_changes change_row),'[]'::jsonb),
    'screening_schedule',coalesce((select jsonb_agg(to_jsonb(schedule) order by schedule.screening_type) from public.entity_monitoring_screening_schedule schedule where schedule.application_id=p_application_id),'[]'::jsonb),
    'screening_results',coalesce((select jsonb_agg(to_jsonb(result_row) order by result_row.observed_at desc) from (select * from public.entity_monitoring_screening_results where application_id=p_application_id order by observed_at desc limit 50) result_row),'[]'::jsonb),
    'vendor_status',coalesce((select jsonb_agg(to_jsonb(vendor_row) order by vendor_row.vendor) from public.entity_monitoring_vendor_status vendor_row),'[]'::jsonb),
    'actions',coalesce((select jsonb_agg(to_jsonb(action_row) order by action_row.created_at desc) from (select * from public.entity_monitoring_actions where application_id=p_application_id order by created_at desc limit 100) action_row),'[]'::jsonb)
  );
end;
$$;

alter table public.entity_compliance_staff_roles enable row level security;
alter table public.entity_compliance_staff_role_events enable row level security;
alter table public.entity_monitoring_vendor_status enable row level security;
alter table public.entity_monitoring_screening_schedule enable row level security;
alter table public.entity_monitoring_screening_results enable row level security;
alter table public.entity_monitoring_actions enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['entity_compliance_staff_roles','entity_compliance_staff_role_events','entity_monitoring_vendor_status','entity_monitoring_screening_schedule','entity_monitoring_screening_results','entity_monitoring_actions'] loop
    execute format('drop policy if exists "Admins read entity monitoring controls" on public.%I',table_name);
    execute format('create policy "Admins read entity monitoring controls" on public.%I for select to authenticated using (public.is_admin() and public.is_aal2())',table_name);
    execute format('revoke all on public.%I from public,anon,authenticated',table_name);
    execute format('grant select on public.%I to authenticated',table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['entity_compliance_staff_role_events','entity_monitoring_screening_results','entity_monitoring_actions'] loop
    execute format('drop trigger if exists %I on public.%I','trg_'||table_name||'_immutable',table_name);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.reject_entity_monitoring_evidence_mutation()','trg_'||table_name||'_immutable',table_name);
  end loop;
end $$;

revoke execute on function public.entity_monitoring_add_business_days_utc(timestamptz,integer) from public,anon,authenticated;
revoke execute on function public.set_entity_monitoring_alert_deadline() from public,anon,authenticated;
revoke execute on function public.evaluate_entity_monitoring_event_patterns() from public,anon,authenticated;
revoke execute on function public.entity_monitoring_is_compliance_officer() from public,anon;
revoke execute on function public.admin_set_entity_compliance_officer(uuid,boolean,text) from public,anon;
revoke execute on function public.service_entity_monitoring_wallets_due(integer,integer) from public,anon,authenticated;
revoke execute on function public.service_recalculate_entity_live_risk(text,numeric,timestamptz) from public,anon,authenticated;
revoke execute on function public.service_record_entity_monitoring_screening_result(uuid,text,text,text,timestamptz,uuid,text,text[],boolean,jsonb) from public,anon,authenticated;
revoke execute on function public.service_mark_entity_monitoring_vendor_unavailable(text,text,timestamptz) from public,anon,authenticated;
revoke execute on function public.current_entity_transaction_permissions() from public,anon;
grant execute on function public.entity_monitoring_is_compliance_officer() to authenticated,service_role;
grant execute on function public.admin_set_entity_compliance_officer(uuid,boolean,text) to authenticated;
grant execute on function public.service_entity_monitoring_wallets_due(integer,integer) to service_role;
grant execute on function public.service_recalculate_entity_live_risk(text,numeric,timestamptz) to service_role;
grant execute on function public.service_record_entity_monitoring_screening_result(uuid,text,text,text,timestamptz,uuid,text,text[],boolean,jsonb) to service_role;
grant execute on function public.service_mark_entity_monitoring_vendor_unavailable(text,text,timestamptz) to service_role;
grant execute on function public.current_entity_transaction_permissions() to authenticated,service_role;

notify pgrst, 'reload schema';
commit;
