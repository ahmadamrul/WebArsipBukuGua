alter table public.comics
  add column if not exists cover_storage_path text;

notify pgrst, 'reload schema';
