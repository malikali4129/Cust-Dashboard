-- University Dashboard schema
-- Public read access, authenticated write access.

create extension if not exists "uuid-ossp";

create table if not exists announcements (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    content text not null,
    priority text not null default 'normal' check (priority in ('normal', 'high')),
    date timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists assignments (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    subject text,
    description text not null,
    deadline timestamptz not null,
    status text not null default 'pending' check (status in ('pending', 'completed')),
    created_at timestamptz not null default now()
);

create table if not exists deadlines (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    category text,
    date timestamptz not null,
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    created_at timestamptz not null default now()
);

create table if not exists quizzes (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    subject text,
    date timestamptz not null,
    duration integer not null check (duration > 0),
    total_marks integer,
    created_at timestamptz not null default now()
);

create table if not exists settings (
    id integer primary key default 1,
    dashboard_timezone text not null default 'Asia/Karachi',
    last_updated timestamptz not null default now()
);

alter table settings
    add column if not exists dashboard_timezone text;

alter table settings
    add column if not exists last_updated timestamptz default now();

update settings
set dashboard_timezone = 'Asia/Karachi';

alter table settings
    alter column dashboard_timezone set default 'Asia/Karachi';

alter table settings
    alter column dashboard_timezone set not null;

alter table settings
    alter column last_updated set default now();

insert into settings (id, dashboard_timezone, last_updated)
values (1, 'Asia/Karachi', now())
on conflict (id) do nothing;

alter table announcements enable row level security;
alter table assignments enable row level security;
alter table deadlines enable row level security;
alter table quizzes enable row level security;
alter table settings enable row level security;

drop policy if exists "public read announcements" on announcements;
drop policy if exists "public read assignments" on assignments;
drop policy if exists "public read deadlines" on deadlines;
drop policy if exists "public read quizzes" on quizzes;
drop policy if exists "public read settings" on settings;
drop policy if exists "authenticated write announcements" on announcements;
drop policy if exists "authenticated write assignments" on assignments;
drop policy if exists "authenticated write deadlines" on deadlines;
drop policy if exists "authenticated write quizzes" on quizzes;
drop policy if exists "authenticated update settings" on settings;

create policy "public read announcements" on announcements
for select using (true);

create policy "public read assignments" on assignments
for select using (true);

create policy "public read deadlines" on deadlines
for select using (true);

create policy "public read quizzes" on quizzes
for select using (true);

create policy "public read settings" on settings
for select using (true);

create policy "authenticated write announcements" on announcements
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated write assignments" on assignments
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated write deadlines" on deadlines
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated write quizzes" on quizzes
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated update settings" on settings
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create index if not exists idx_announcements_date on announcements (date desc);
create index if not exists idx_assignments_deadline on assignments (deadline asc);
create index if not exists idx_deadlines_date on deadlines (date asc);
create index if not exists idx_quizzes_date on quizzes (date asc);

-- Feedback table
create table if not exists feedback (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    suggestion text not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    created_at timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "public read feedback" on feedback;
drop policy if exists "public insert feedback" on feedback;
drop policy if exists "authenticated delete feedback" on feedback;

create policy "public read feedback" on feedback
for select using (true);

create policy "public insert feedback" on feedback
for insert with check (true);

create policy "authenticated delete feedback" on feedback
for delete using (auth.role() = 'authenticated');

create index if not exists idx_feedback_created_at on feedback (created_at desc);
