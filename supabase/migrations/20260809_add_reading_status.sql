alter table public.comics
  add column if not exists reading_status text default 'wantToRead';

update public.comics
set reading_status = 'wantToRead'
where reading_status is null;

alter table public.comics
  alter column reading_status set default 'wantToRead',
  alter column reading_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comics_reading_status_check'
  ) then
    alter table public.comics
      add constraint comics_reading_status_check
      check (reading_status in ('wantToRead', 'reading', 'completed', 'dropped'));
  end if;
end $$;
