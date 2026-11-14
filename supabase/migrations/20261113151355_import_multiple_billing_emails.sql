-- Import only into existing clients. SECURITY INVOKER retains the billing RLS
-- policies and module-aware company-admin check; no client or pricing writes.
create or replace function public.import_client_billing_details(p_company_id uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $import$
declare
  item jsonb;
  incoming jsonb;
  original jsonb;
  patch jsonb;
  result jsonb := '[]'::jsonb;
  changed jsonb;
  key text;
  value text;
  incoming_emails text[];
  saved_emails text[];
  added_emails text[];
  client_uuid uuid;
  current_profile public.client_billing_profiles%rowtype;
  next_profile public.client_billing_profiles%rowtype;
  created_count integer;
  created_profile boolean;
  failure_code text;
begin
  if auth.uid() is null or p_company_id is null or
    p_company_id is distinct from private.current_billing_admin_company_id() then
    raise exception 'Company billing admin access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 100 then
    raise exception 'Provide between 1 and 100 import rows' using errcode = '22023';
  end if;
  if (select count(distinct row->>'client_id') from jsonb_array_elements(p_rows) row) <> jsonb_array_length(p_rows) then
    raise exception 'Each client may appear only once per batch' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p_rows) loop
    -- A subtransaction isolates a rejected row while retaining valid results.
    begin
      client_uuid := (item->>'client_id')::uuid;
      incoming := item->'data';
      if jsonb_typeof(incoming) is distinct from 'object' or incoming = '{}'::jsonb then
        raise exception 'Invalid data' using errcode = '22023';
      end if;
      if not exists(select 1 from public.clients c where c.id = client_uuid and c.company_id = p_company_id) then
        raise exception 'Client not found' using errcode = 'P0002';
      end if;
      incoming_emails := array[]::text[];
      for key, value in select k, incoming->>k from jsonb_object_keys(incoming) k loop
        if key not in ('billing_name','billing_country_code','billing_postal_code','billing_city','billing_address',
          'tax_subject','tax_number','eu_vat_number','group_tax_number','billing_email','payment_method','payment_term_days')
          or value is null or btrim(value) = '' then
          raise exception 'Unsupported or empty field' using errcode = '22023';
        end if;
        if key = 'billing_email' then
          if jsonb_typeof(incoming->key) <> 'string' then
            raise exception 'Invalid email' using errcode = '22023';
          end if;
          incoming_emails := regexp_split_to_array(btrim(value), '[[:space:]]*,[[:space:]]*');
          if exists (select 1 from unnest(incoming_emails) as email
            where length(email) > 255 or
              email !~ $email$^[^[:space:]<>@,;:"()\\]+@[^[:space:]<>@,;:"()\\]+\.[^[:space:]<>@,;:"()\\]+$$email$) then
            raise exception 'Invalid email' using errcode = '22023';
          end if;
        elsif key in ('tax_subject','payment_term_days') then
          if jsonb_typeof(incoming->key) <> 'number' or value !~ '^-?[0-9]+$' then
            raise exception 'Expected integer' using errcode = '22023';
          end if;
          if (key = 'tax_subject' and value::integer not in (-1,0,1,6,7)) or
            (key = 'payment_term_days' and value::integer not between 0 and 365) then
            raise exception 'Invalid integer' using errcode = '22023';
          end if;
        else
          if jsonb_typeof(incoming->key) <> 'string' or length(value) > (case key
            when 'billing_country_code' then 2 when 'billing_postal_code' then 32
            when 'billing_city' then 120 when 'tax_number' then 32 when 'eu_vat_number' then 32
            when 'group_tax_number' then 32 when 'payment_method' then 64 else 255 end) then
            raise exception 'Invalid text' using errcode = '22023';
          end if;
          incoming := jsonb_set(incoming, array[key], to_jsonb(btrim(value)));
        end if;
      end loop;
      if incoming ? 'billing_country_code' and incoming->>'billing_country_code' !~ '^[A-Z]{2}$' then
        raise exception 'Invalid country' using errcode = '22023';
      end if;
      select * into current_profile from public.client_billing_profiles
        where client_id = client_uuid and company_id = p_company_id for update;
      created_profile := false;
      if not found then
        insert into public.client_billing_profiles(client_id, company_id)
          values (client_uuid, p_company_id) on conflict (client_id) do nothing;
        get diagnostics created_count = row_count;
        created_profile := created_count = 1;
        -- A concurrent regular save may have won the insert. Read its values
        -- under the same row lock before deciding which fields are still empty.
        select * into strict current_profile from public.client_billing_profiles
          where client_id = client_uuid and company_id = p_company_id for update;
      end if;
      original := to_jsonb(current_profile);
      patch := '{}'::jsonb;
      changed := '[]'::jsonb;
      -- Merge addresses under the same row lock used for the fill-only fields.
      if cardinality(incoming_emails) > 0 then
        saved_emails := string_to_array(coalesce(current_profile.billing_email, ''), ',');
        select array_agg(email order by position) into added_emails
        from (
          select distinct on (lower(email)) email, position
          from unnest(incoming_emails) with ordinality as source(email, position)
          where not exists (select 1 from unnest(saved_emails) as saved where lower(btrim(saved)) = lower(email))
          order by lower(email), position
        ) as additions;
        if added_emails is not null then
          patch := jsonb_build_object('billing_email',
            concat_ws(',', nullif(btrim(current_profile.billing_email), ''), array_to_string(added_emails, ',')));
          changed := jsonb_build_array('billing_email');
        end if;
      end if;
      for key, value in select k, incoming->>k from jsonb_object_keys(incoming - 'billing_email') k loop
        if not created_profile and key in ('billing_country_code','tax_subject','tax_number','eu_vat_number','group_tax_number')
          and nullif(btrim(original->>key), '') is not null and
          (case when key = 'tax_subject' then original->>key <> value else
            regexp_replace(upper(original->>key), '[^A-Z0-9]', '', 'g') <>
            regexp_replace(upper(value), '[^A-Z0-9]', '', 'g') end) then
          raise exception 'Identity conflict' using errcode = 'PT409';
        end if;
        if (created_profile or nullif(btrim(original->>key), '') is null) and original->key is distinct from incoming->key then
          patch := patch || jsonb_build_object(key, incoming->key);
          changed := changed || to_jsonb(key);
        end if;
      end loop;
      select * into next_profile from jsonb_populate_record(null::public.client_billing_profiles, original || patch);
      if next_profile.tax_subject = -1 and
        coalesce(nullif(btrim(next_profile.tax_number), ''), nullif(btrim(next_profile.eu_vat_number), ''),
          nullif(btrim(next_profile.group_tax_number), '')) is not null then
        raise exception 'Private recipient with business identifiers' using errcode = 'PT409';
      end if;
      if nullif(btrim(next_profile.group_tax_number), '') is not null and
        (next_profile.tax_subject is distinct from 1 or next_profile.group_tax_number !~ '^[0-9]{8}-5-[0-9]{2}$'
          or coalesce(next_profile.tax_number, '') !~ '^[0-9]{8}-4-[0-9]{2}$') then
        raise exception 'Inconsistent VAT group' using errcode = 'PT409';
      end if;
      if patch <> '{}'::jsonb then
        update public.client_billing_profiles set
          billing_name = next_profile.billing_name, billing_country_code = next_profile.billing_country_code,
          billing_postal_code = next_profile.billing_postal_code, billing_city = next_profile.billing_city,
          billing_address = next_profile.billing_address, tax_subject = next_profile.tax_subject,
          tax_number = next_profile.tax_number, eu_vat_number = next_profile.eu_vat_number,
          group_tax_number = next_profile.group_tax_number, billing_email = next_profile.billing_email,
          payment_method = next_profile.payment_method, payment_term_days = next_profile.payment_term_days
        where client_id = client_uuid and company_id = p_company_id;
      end if;
      result := result || jsonb_build_array(jsonb_build_object('client_id', client_uuid,
        'status', case when patch = '{}'::jsonb then 'unchanged' else 'updated' end, 'fields', changed));
    exception
      when sqlstate 'PT409' or data_exception or integrity_constraint_violation or no_data_found then
        failure_code := case sqlstate when 'PT409' then 'identity_conflict' when 'P0002' then 'client_not_found' else 'invalid_data' end;
        result := result || jsonb_build_array(jsonb_build_object('client_id', item->>'client_id',
          'status', 'failed', 'fields', '[]'::jsonb, 'error_code', failure_code));
    end;
  end loop;
  return result;
end;
$import$;

revoke all on function public.import_client_billing_details(uuid,jsonb) from public, anon;
grant execute on function public.import_client_billing_details(uuid,jsonb) to authenticated;
comment on function public.import_client_billing_details(uuid,jsonb) is
  'Fill empty billing fields and append distinct billing emails for existing clients. Client, pricing, delivery and automation settings are preserved.';
