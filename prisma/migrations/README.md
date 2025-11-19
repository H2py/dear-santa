## Migrations note

- Slot uniqueness enforced via `@@unique([treeId, slotIndex])` in `Ornament`.
- Uses Supabase connection strings; `DATABASE_URL`/`DIRECT_URL` must be set before running `pnpm prisma:migrate`.
