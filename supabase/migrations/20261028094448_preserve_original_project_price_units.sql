alter table public.project_pricing
  add column original_currency text check (original_currency ~ '^[A-Z]{3}$'),
  add column original_unit text check (btrim(original_unit) <> '');

-- Preserve the imported fee's denomination when the current rate is edited.
update public.project_pricing
set original_currency = currency, original_unit = unit
where original_fee is not null or original_fee_text is not null;
