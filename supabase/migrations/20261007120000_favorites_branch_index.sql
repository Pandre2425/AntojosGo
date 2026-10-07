-- Covers favorites_branch_id_fkey (cascade on branch delete). The PK (user_id, branch_id) covers per-user lookups.
create index if not exists favorites_branch_id_idx on public.favorites (branch_id);
