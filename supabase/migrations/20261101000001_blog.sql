-- Full blog system — product writeups/reviews and upcoming-product
-- previews, managed from the staff dashboard's "Blog" screen. Separate
-- from team_members' "bio" style free-text: a post's body can mix
-- paragraphs with images, embedded video, and link buttons (see
-- src/lib/blog.ts's parseBlogBody for the line-prefix syntax:
-- IMAGE: / VIDEO: / LINK: on their own line, blank-line-separated
-- blocks otherwise treated as a paragraph — same "plain text, documented
-- convention" approach team_members.bio and curates already use, rather
-- than a markdown dependency or a rich-text editor).
create type blog_post_type as enum ('review', 'upcoming', 'article');

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  excerpt text not null default '',
  cover_image_url text,
  post_type blog_post_type not null default 'article',
  author_name text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_status_published_idx on blog_posts (status, published_at desc);
create trigger trg_blog_posts_updated_at before update on blog_posts
  for each row execute function set_updated_at();

alter table blog_posts enable row level security;
create policy "public can read published blog posts"
  on blog_posts for select
  to anon
  using (status = 'published');

insert into storage.buckets (id, name, public) values ('blog-media', 'blog-media', true)
  on conflict (id) do nothing;
