-- Who changed what, and when, across the staff dashboard: product edits,
-- stock adjustments, order status changes, refunds, expenses, delivery
-- pricing, and team/permission changes. staff_name is a snapshot so the
-- trail stays readable even if the staff account is later removed.
create table staff_activity_log (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff_profiles (id) on delete set null,
  staff_name text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index staff_activity_log_created_at_idx on staff_activity_log (created_at desc);
create index staff_activity_log_entity_idx on staff_activity_log (entity_type, entity_id, created_at desc);
create index staff_activity_log_staff_idx on staff_activity_log (staff_id, created_at desc);

-- Default-deny: no anon/authenticated policies. Written and read only via
-- the service client after an explicit staff session check.
alter table staff_activity_log enable row level security;
