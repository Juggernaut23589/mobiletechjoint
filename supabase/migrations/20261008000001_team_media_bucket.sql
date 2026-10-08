-- Public bucket for team-profile portraits uploaded from the staff
-- dashboard's "Manage team blog" module (see staff-team-blog.ts). Mirrors
-- the existing public "product-media" bucket.
insert into storage.buckets (id, name, public)
values ('team-media', 'team-media', true)
on conflict (id) do nothing;
