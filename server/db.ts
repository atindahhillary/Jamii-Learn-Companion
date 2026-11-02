const SCHEMA = `
create table if not exists communities (id serial primary key, name text not null, county text not null, unique (name, county));
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone_hash text unique not null, phone_enc text not null,
  secret_hash text, role text not null default 'learner' check (role in ('learner','admin')),
  community_id int references communities(id), village text, audience text not null default 'herder',
  lang text not null default 'sw', consent_ai boolean not null default false, consent_share boolean not null default false,
  consent_at timestamptz, intake_step int not null default 0, wa_opted_in boolean not null default false,
  failed int not null default 0, locked_until timestamptz, created_at timestamptz not null default now());
create table if not exists sessions (token_hash text primary key, user_id uuid not null references users(id) on delete cascade, expires_at timestamptz not null);
create table if not exists messages (
  id bigserial primary key, user_id uuid not null references users(id) on delete cascade,
  channel text not null, role text not null, expert text, body text not null, source text,
  flagged boolean not null default false, flag_reason text, resolved boolean not null default false,
  created_at timestamptz not null default now());
create table if not exists insights (
  id bigserial primary key, user_id uuid not null references users(id) on delete cascade, community_id int,
  body text not null, theme text not null, kind text not null, sentiment int not null default 0,
  shareable boolean not null default false, created_at timestamptz not null default now());
create table if not exists progress (
  user_id uuid not null references users(id) on delete cascade, module_id text not null,
  score int, updated_at timestamptz not null default now(), primary key (user_id, module_id));
create table if not exists circles (id serial primary key, name text not null, topic text not null, community_id int);
create table if not exists circle_members (circle_id int references circles(id) on delete cascade, user_id uuid references users(id) on delete cascade, primary key (circle_id, user_id));
create table if not exists posts (
  id bigserial primary key, circle_id int not null references circles(id) on delete cascade,
  user_id uuid references users(id) on delete cascade, is_bot boolean not null default false,
  body text not null, hidden boolean not null default false, created_at timestamptz not null default now());
create table if not exists wa_links (code_hash text primary key, user_id uuid not null references users(id) on delete cascade, expires_at timestamptz not null);
create table if not exists wa_seen (id text primary key, at timestamptz not null default now());
create table if not exists rate (key text primary key, count int not null, window_start timestamptz not null);
create table if not exists audit (id bigserial primary key, actor uuid, action text not null, detail text, at timestamptz not null default now());
create index if not exists messages_user on messages(user_id, id);
create index if not exists insights_comm on insights(community_id);
create index if not exists posts_circle on posts(circle_id, id);
`;

type Exec = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
let ready: Promise<Exec> | null = null;

async function connect(): Promise<Exec> {
  let run: Exec;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import("pg");
    // TLS stays verified: providers with a private CA supply it in DATABASE_CA.
    const ca = process.env.DATABASE_CA;
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}) });
    run = (s, p) => pool.query(s, p as any[]);
    await pool.query(SCHEMA);
  } else {
    // PGlite gives local dev and tests real Postgres with no account or Docker.
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite(process.env.PGLITE_DIR || undefined);
    await db.exec(SCHEMA);
    run = (s, p) => db.query(s, p as any[]) as Promise<{ rows: any[] }>;
  }
  return run;
}

export async function q<R = any>(sql: string, params: unknown[] = []): Promise<R[]> {
  ready ??= connect();
  return (await (await ready)(sql, params)).rows as R[];
}
