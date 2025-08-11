import postgres from 'postgres';
import * as schema from './schema';
declare const sql: postgres.Sql<{}>;
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export declare function checkDatabaseHealth(): Promise<boolean>;
export declare function closeDatabaseConnection(): Promise<void>;
export type Database = typeof db;
export { sql };
//# sourceMappingURL=connection.d.ts.map