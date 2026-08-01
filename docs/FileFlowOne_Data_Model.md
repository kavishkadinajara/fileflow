# FileFlowOne — Data Model & Privacy-by-Design Schema

**Database:** PostgreSQL (via Supabase) · **Security:** Row-Level Security on every table · **Design rule:** *document content is never stored — only metadata, scores, and (opt-in) shareable results.*

---

## 1. Design principle: privacy-by-design at the schema level

FileFlowOne's core promise is that the user's file does not leave their machine. A naïve "conversion history" feature would break that promise by storing the document. This schema is deliberately built so that **the privacy guarantee is enforced by what the tables physically cannot hold**, not by a policy we ask people to trust:

- `conversion_history` stores a filename, format pair, byte size and timestamp — **never the file bytes or its text.**
- `ats_scans` stores the computed scores and a one-way hash of the job description — **never the CV, never the JD text.**
- Only `shared_results` holds actual output, and only when the user explicitly opts in; every such row carries a mandatory `expires_at` and is purged automatically.

This turns a potential weakness (adding a database to a privacy-first product) into a demonstrable strength: a *data-minimisation-compliant schema* (GDPR Art. 5(1)(c)).

---

## 2. Entity-Relationship Diagram

`style_templates` already exists (the style gallery + community sharing feature, defined in `schema.sql`); the other six tables are added by the data layer (`schema_data_layer.sql`). The full model:

```
                              ┌─────────────────────────┐
                              │      auth.users         │  (Supabase-managed)
                              │─────────────────────────│
                              │ id            uuid  PK   │
                              │ email         text       │
                              └────────────┬────────────┘
                                           │ 1
       ┌──────────────────┬────────────────┼────────────────┬──────────────────┬──────────────────┐
       │ N                │ N              │ N              │ N                │ N
┌──────▼────────┐ ┌───────▼───────┐ ┌──────▼────────┐ ┌─────▼─────────┐ ┌──────▼────────────┐
│ style_templates│ │ user_presets  │ │conversion_hist│ │  ats_scans    │ │  shared_results   │
│───────────────│ │───────────────│ │───────────────│ │───────────────│ │───────────────────│
│ id        PK  │ │ id        PK  │ │ id        PK  │ │ id        PK  │ │ id         PK     │
│ user_id   FK  │ │ user_id   FK  │ │ user_id   FK  │ │ user_id   FK  │ │ user_id    FK?    │
│ name      text│ │ name      text│ │ source_format │ │ resume_name   │ │ format     text   │
│ description   │ │ from_format   │ │ target_format │ │ jd_hash ch(64)│ │ content    bytea  │
│ category      │ │ to_format     │ │ source_name   │ │ overall   int │ │ size_bytes int    │
│ tags    text[]│ │ options  jsonb│ │ size_bytes    │ │ score_keyword │ │ created_at tstz   │
│ config   jsonb│ │ is_default    │ │ status        │ │ score_skills  │ │ expires_at tstz ◀─│ auto-purge
│ is_public bool│ │ use_count int │ │ duration_ms   │ │ score_similar.│ │ views      int    │
│ fork_count int│ │ created_at    │ │ created_at    │ │ score_format  │ └───────────────────┘
│ forked_from ◀─┐ │ updated_at    │ └───────────────┘ │ created_at    │
│ created_at    ││└───────────────┘                   └───────┬───────┘
│ updated_at    ││                                            │ 1
└───────┬───────┘│                                            │ N
        └────────┘ self-ref (a fork              ┌────────────▼──────────┐
        1:N        points to its source)         │   ats_scan_skills     │ (junction / 3NF)
                                                  │───────────────────────│
                                                  │ id        PK          │
                                                  │ scan_id   FK          │
                                                  │ skill     text        │
                                                  │ matched   bool        │ true = in CV,
                                                  │ category  text        │ false = missing gap
                                                  └───────────────────────┘
```

**Cardinalities**

| Relationship | Type | Meaning |
|---|---|---|
| `users → style_templates` | 1 : N | A user owns many style templates (public or private) |
| `style_templates → style_templates` | 1 : N (self-ref, nullable) | A forked template points back to its source via `forked_from` |
| `users → user_presets` | 1 : N | A user saves many conversion presets |
| `users → conversion_history` | 1 : N | A user has many past conversion records |
| `users → ats_scans` | 1 : N | A user runs many résumé scans over time |
| `ats_scans → ats_scan_skills` | 1 : N | One scan yields many matched/missing skill rows |
| `users → shared_results` | 1 : N (nullable FK) | Anonymous shares allowed → `user_id` may be null |

---

## 3. Normalization

The model is in **Third Normal Form (3NF)**:

- **1NF** — every column is atomic. Matched/missing skills are *not* crammed into a comma-separated string on `ats_scans`; each skill is its own row in `ats_scan_skills`.
- **2NF** — no partial dependencies (all tables use a single-column surrogate `uuid` primary key, so the question doesn't arise on composite keys).
- **3NF** — no transitive dependencies. A skill's `category` is an attribute of the skill row, not derived through another non-key column.

The `ats_scan_skills` junction table is the deliberate normalization showpiece: it makes the query *"which skills has this user been missing across their last five scans?"* a simple indexed join + aggregate, instead of parsing serialized blobs.

---

## 4. The five features, mapped to tables

| Feature | Table(s) | CRUD surface |
|---|---|---|
| **Saved conversion presets** | `user_presets` | Create / Read (list) / Update (rename, edit options, set default) / Delete |
| **Conversion history** | `conversion_history` | Create (on each job) / Read (list, filter by format) / Delete (clear one / clear all) |
| **ATS scoring history + improvement tracking** | `ats_scans`, `ats_scan_skills` | Create (transactional: header + skill rows) / Read (timeline, per-scan detail) / Delete (cascade) |
| **Usage analytics (admin)** | aggregate over `conversion_history` | Read-only `GROUP BY` queries (most-popular formats, daily volume) |
| **Shareable links** | `shared_results` | Create (opt-in) / Read (by UUID, if not expired) / auto-Delete (TTL purge) |

---

## 5. Showpiece queries (the "depth" an examiner looks for)

**ATS improvement over time** — the headline analytics query:

```sql
select created_at::date as day, overall
from public.ats_scans
where user_id = auth.uid()
order by created_at;
-- → drives the "62% → 89%" progress chart
```

**Persistent skill gaps across a user's recent scans** — the junction-table join:

```sql
select s.skill, count(*) as times_missing
from public.ats_scan_skills s
join public.ats_scans a on a.id = s.scan_id
where a.user_id = auth.uid()
  and s.matched = false
group by s.skill
order by times_missing desc
limit 10;
```

**Most popular conversion formats** — the admin analytics aggregate:

```sql
select source_format, target_format, count(*) as runs
from public.conversion_history
group by source_format, target_format
order by runs desc;
```

---

## 6. Transactions & integrity

- **Atomic ATS scan write.** A scan and its (often 20–40) skill rows are inserted in a single transaction via a `record_ats_scan(...)` Postgres function — if any skill row fails, the whole scan rolls back, so there is never a header without its details.
- **Cascade deletes.** `ats_scan_skills.scan_id` → `ON DELETE CASCADE`; deleting a user (or a scan) cleans up children automatically. Every `user_id` FK is `ON DELETE CASCADE` so a deleted account leaves no orphans.
- **Constraints enforce invariants.** Scores are `check (… between 0 and 100)`; preset names `check (length between 1 and 80)`; a share row must have `expires_at > created_at`.

---

## 7. Access control (Row-Level Security)

Every table has RLS enabled. The policy shape mirrors the existing `style_templates` table:

- A user can `select / insert / update / delete` **only rows where `user_id = auth.uid()`**.
- `shared_results` adds one public-read policy: anyone may `select` a row **by id** *if* `expires_at > now()` — that is what makes a share link work without exposing the rest of the table.
- Admin analytics run through a `security definer` function that returns **only aggregates** (counts), never row-level user data.

---

## 8. Automatic expiry of shared results (TTL)

Shared results are the one place real content is stored, so they self-destruct:

```sql
-- Purge expired shares. Scheduled via pg_cron (Supabase) every 15 min.
create or replace function public.purge_expired_shares()
returns void language sql security definer set search_path = public as $$
  delete from public.shared_results where expires_at < now();
$$;
```

A user-facing share therefore has a hard upper bound on how long it can exist — the privacy promise holds even for the opt-in feature.

---

*This data layer is intentionally small and disciplined. Its contribution is not the number of tables but the design rule running through all of them: store the least that makes the feature work, enforce it in the schema, and let Row-Level Security and TTL purging do the rest.*
