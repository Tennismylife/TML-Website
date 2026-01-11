Run this SQL migration against your Postgres database to create the tracking schema and table:

psql "$DATABASE_URL" -f ./prisma/migrations/20260111_create_tracking_schema/migration.sql

If you prefer to use Prisma migrations, you can create an equivalent migration with `prisma migrate dev --name create-tracking-schema` after adding the `Visit` model to `prisma/schema.prisma` (see snippet below).

Prisma model snippet (add to `prisma/schema.prisma`):

model Visit {
  id         Int      @id @default(autoincrement())
  page_url   String?  @db.Text
  page_title String?  @db.Text
  user_ip    String?  @db.Text
  user_agent String?  @db.Text
  created_at DateTime @default(now())

  @@map("visits")
}

Note: The table is created in the `tracking_schema` schema. Ensure your Postgres search_path includes `tracking_schema` (or reference the schema explicitly when querying). The `lib/visitTracker.ts` uses raw SQL to insert into `tracking_schema.visits` so the DB migration above is sufficient for the current code.
