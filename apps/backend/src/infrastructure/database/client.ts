import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const DATABASE_PATH = process.env.DATABASE_PATH || './data/vinted-ai.db'

const sqlite: DatabaseType = new Database(DATABASE_PATH)

// Enable WAL mode for better concurrent performance
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

export { sqlite }
