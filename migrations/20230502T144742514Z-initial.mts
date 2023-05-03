import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('nonces')
    .addColumn('nonce', 'varchar', (col) => col.notNull())
    .addColumn('used_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();

  await db.schema
    .createTable('invites')
    .addColumn('domain', 'varchar', (col) => col.notNull())
    .addColumn('owner', 'varchar', (col) => col.notNull())
    .addColumn('invite_code', 'varchar', (col) => col.notNull())
    .addColumn('chain_id', 'numeric', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('nonces').execute();
  await db.schema.dropTable('invites').execute();
}
