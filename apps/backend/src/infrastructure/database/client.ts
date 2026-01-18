import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

const DATABASE_PATH = process.env.DATABASE_PATH || './data/vinted-ai.db'

const sqlite = new Database(DATABASE_PATH)

// Enable WAL mode for better concurrent performance
sqlite.exec('PRAGMA journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

export { sqlite }
