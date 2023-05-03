import { ColumnType, Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';

interface NoncesTable {
  nonce: string;
  // used_at: ColumnType<Date, string | undefined, never>;
  used_at: ColumnType<string, string | undefined, never>;
}

interface InvitesTable {
  // Columns that are generated by the database should be marked
  // using the `Generated` type. This way they are automatically
  // made optional in inserts and updates.
  // id: Generated<number>

  domain: string;
  owner: string;
  invite_code: string;
  chain_id: number;

  // If the column is nullable in the database, make its type nullable.
  // Don't use optional properties. Optionality is always determined
  // automatically by Kysely.
  // last_name: string | null

  // You can specify a different type for each operation (select, insert and
  // update) using the `ColumnType<SelectType, InsertType, UpdateType>`
  // wrapper. Here we define a column `modified_at` that is selected as
  // a `Date`, can optionally be provided as a `string` in inserts and
  // can never be updated:
  // created_at: ColumnType<Date, string | undefined, never>;
  created_at: ColumnType<string, string | undefined, never>;
}

// Keys of this interface are table names.
interface Database {
  nonces: NoncesTable;
  invites: InvitesTable;
}

// You'd create one of these when you start your app.
const db = new Kysely<Database>({
  // Use MysqlDialect for MySQL and SqliteDialect for SQLite.
  dialect: new SqliteDialect({
    database: new Database('stems-ens-db.sqlite'),
  }),
});

// Nonces
async function clearNonces() {
  const olderThanDate = new Date();
  olderThanDate.setHours(olderThanDate.getHours() - 12); // older than 12h
  const deletedNonces = await db
    .deleteFrom('nonces')
    .where(
      'used_at',
      '<',
      olderThanDate.toISOString().replace('T', ' ').slice(0, 19)
    )
    .execute();
  console.log('clearing old nonces from store:', deletedNonces.length);
}
clearNonces();
setInterval(() => {
  clearNonces();
}, 60 * 60 * 1000); // 1 hour

export default db;