-- The Flutter client writes device_id, while authenticated web rows are scoped by user_id.
-- Keep the column for cross-client compatibility but allow web-created progress rows.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_progresses'
      and column_name = 'device_id'
  ) then
    alter table public.reading_progresses
      alter column device_id set default 'web';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_progresses'
      and column_name = 'client_updated_at'
  ) then
    alter table public.reading_progresses
      alter column client_updated_at set default now();
  end if;
end
$$;
