create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_url text,
  source_name text,
  cover_url text,
  cover_storage_path text,
  favorite boolean not null default false,
  genre text,
  collection text,
  progress integer not null default 0,
  history text,
  rating integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  normalized_title text,
  note text,
  reading_status text not null default 'wantToRead',
  priority integer,
  standalone boolean,
  deleted_at timestamptz,
  revision bigint not null default 0
);

create table if not exists public.comic_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  comic_id uuid not null references public.comics (id) on delete cascade,
  label text,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.library_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text,
  kind text not null default 'collection',
  created_at timestamptz not null default now()
);

create table if not exists public.library_genres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.library_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.library_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.comic_labels (
  comic_id uuid not null references public.comics (id) on delete cascade,
  label_id uuid not null references public.library_labels (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comic_id, label_id, user_id)
);

create table if not exists public.reading_progresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  comic_id uuid not null references public.comics (id) on delete cascade,
  chapter_label text,
  page_index integer not null default 0,
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

alter table public.comics
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists cover_url text,
  add column if not exists cover_storage_path text,
  add column if not exists favorite boolean not null default false,
  add column if not exists genre text,
  add column if not exists collection text,
  add column if not exists progress integer not null default 0,
  add column if not exists history text,
  add column if not exists rating integer not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists normalized_title text,
  add column if not exists note text,
  add column if not exists reading_status text default 'wantToRead',
  add column if not exists priority integer,
  add column if not exists standalone boolean,
  add column if not exists deleted_at timestamptz,
  add column if not exists revision bigint not null default 0;

update public.comics
set reading_status = 'wantToRead'
where reading_status is null;

alter table public.comics
  alter column reading_status set default 'wantToRead',
  alter column reading_status set not null;

alter table public.comics
  alter column rating set default 0;

update public.comics
set rating = 0
where rating is null;

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

alter table public.comic_sources
  add column if not exists label text,
  add column if not exists created_at timestamptz not null default now();

alter table public.library_labels
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column name set not null,
  add column if not exists normalized_name text,
  add column if not exists kind text not null default 'collection',
  add column if not exists created_at timestamptz not null default now();

alter table public.library_genres
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column name set not null,
  add column if not exists normalized_name text,
  add column if not exists created_at timestamptz not null default now();

alter table public.library_tags
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column name set not null,
  add column if not exists normalized_name text,
  add column if not exists created_at timestamptz not null default now();

alter table public.library_collections
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column name set not null,
  add column if not exists normalized_name text,
  add column if not exists created_at timestamptz not null default now();

alter table public.comic_labels
  alter column user_id set not null,
  add column if not exists created_at timestamptz not null default now();

alter table public.reading_progresses
  add column if not exists chapter_label text,
  add column if not exists page_index integer not null default 0,
  add column if not exists note text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

-- Flutter databases may require device_id, while the web app identifies rows by user_id.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_progresses'
      and column_name = 'device_id'
  ) then
    alter table public.reading_progresses alter column device_id drop not null;
  end if;
end
$$;

alter table public.profiles enable row level security;
alter table public.comics enable row level security;
alter table public.comic_sources enable row level security;
alter table public.library_labels enable row level security;
alter table public.library_genres enable row level security;
alter table public.library_tags enable row level security;
alter table public.library_collections enable row level security;
alter table public.comic_labels enable row level security;
alter table public.reading_progresses enable row level security;
alter table storage.objects enable row level security;

drop policy if exists "profiles own row" on public.profiles;
drop policy if exists "comics own rows" on public.comics;
drop policy if exists "sources own rows" on public.comic_sources;
drop policy if exists "labels own rows" on public.library_labels;
drop policy if exists "genres own rows" on public.library_genres;
drop policy if exists "tags own rows" on public.library_tags;
drop policy if exists "collections own rows" on public.library_collections;
drop policy if exists "comic labels own rows" on public.comic_labels;
drop policy if exists "progress own rows" on public.reading_progresses;
drop policy if exists "cover objects own rows" on storage.objects;

create policy "profiles own row" on public.profiles
for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "comics own rows" on public.comics
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sources own rows" on public.comic_sources
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "labels own rows" on public.library_labels
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "genres own rows" on public.library_genres
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tags own rows" on public.library_tags
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "collections own rows" on public.library_collections
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "comic labels own rows" on public.comic_labels
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "progress own rows" on public.reading_progresses
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "cover objects own rows" on storage.objects
for all
to authenticated
using (
  bucket_id = 'covers'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'covers'
  and auth.uid()::text = split_part(name, '/', 1)
);

create index if not exists comics_user_updated_idx on public.comics (user_id, updated_at desc);
create index if not exists comic_sources_user_idx on public.comic_sources (user_id, created_at desc);
create index if not exists labels_user_name_idx on public.library_labels (user_id, name);
create index if not exists genres_user_name_idx on public.library_genres (user_id, name);
create index if not exists tags_user_name_idx on public.library_tags (user_id, name);
create index if not exists collections_user_name_idx on public.library_collections (user_id, name);
create index if not exists comic_labels_user_idx on public.comic_labels (user_id, comic_id);
create index if not exists progress_user_updated_idx on public.reading_progresses (user_id, updated_at desc);
