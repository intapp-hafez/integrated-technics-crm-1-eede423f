insert into storage.buckets (id, name, public)
values ('career-resumes', 'career-resumes', true);

create policy "Career resumes are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'career-resumes' );

create policy "Anyone can upload a career resume."
  on storage.objects for insert
  with check ( bucket_id = 'career-resumes' );
