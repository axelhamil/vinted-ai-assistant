import { randomBytes } from "node:crypto";
import { Client } from "pg";

export const TEST_DATABASE_PREFIX = "vinted_test_";
export const TEMPLATE_DATABASE = `${TEST_DATABASE_PREFIX}template`;

const DEFAULT_ADMIN_URL =
  "postgresql://postgres:postgres@127.0.0.1:5445/postgres";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TEST_DATABASE_NAME = /^vinted_test_[a-z0-9_]+$/;
const CLONE_DATABASE_NAME = /^vinted_test_[a-f0-9]{12}$/;
const SYSTEM_DATABASES = new Set(["postgres", "template0", "template1"]);
const CONNECT_TIMEOUT_MS = 2000;
const DEFAULT_POSTGRES_PORT = 5432;
const OBJECT_IN_USE = "55006";
const UNDEFINED_DATABASE = "3D000";
const CLONE_ATTEMPTS = 20;
const CLONE_RETRY_DELAY_MS = 250;
const TEMPLATE_LOCK = 20261005;

const REMOTE_REFUSAL =
  "TEST_DATABASE_URL must point to a local Postgres (localhost, 127.0.0.1 or [::1]) and carry no query string. Refusing to run the database tests.";
const INVALID_URL = "TEST_DATABASE_URL is not a valid URL. Fix it and retry.";
const NOT_A_CLONE =
  "DATABASE_URL does not point to a clone of the test template, so no database connection is handed out. A database test only runs through the database run, which gives each file its own clone: from the package folder, bun --config=../../bunfig.db.toml test <file>.";
const FOREIGN_CONNECTION =
  "A database test tried to open a connection to a database that is not its own clone, so the connection is refused. A database test takes its connection from @packages/testing/clone-database and its rows from the factories of its package only.";
const MISSING_TEMPLATE =
  "The test template database is missing. Two concurrent database test runs are not supported: wait for the other run to end and retry.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const { code } = error as { code?: unknown };

  return typeof code === "string" ? code : undefined;
}

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(INVALID_URL);
  }
}

export function resolveAdminUrl(
  raw: string | undefined = process.env.TEST_DATABASE_URL,
): URL {
  const url = parseUrl(raw && raw.length > 0 ? raw : DEFAULT_ADMIN_URL);

  if (url.search.length > 0) throw new Error(REMOTE_REFUSAL);
  if (!LOCAL_HOSTS.has(url.hostname)) throw new Error(REMOTE_REFUSAL);

  return url;
}

export function assertTestDatabaseName(name: string): void {
  if (TEST_DATABASE_NAME.test(name)) return;

  throw new Error(
    `Refusing to touch database "${name}": test databases must start with ${TEST_DATABASE_PREFIX}.`,
  );
}

export function assertCloneUrl(
  raw: string | undefined = process.env.DATABASE_URL,
  admin: URL = resolveAdminUrl(),
): void {
  if (!raw || !URL.canParse(raw)) throw new Error(NOT_A_CLONE);

  const url = new URL(raw);
  const name = url.pathname.slice(1);

  if (url.search.length > 0) throw new Error(NOT_A_CLONE);
  if (url.host !== admin.host) throw new Error(NOT_A_CLONE);
  if (!CLONE_DATABASE_NAME.test(name)) throw new Error(NOT_A_CLONE);
}

interface ConnectionTarget {
  host: string;
  port: number;
  database?: string;
}

type Connect = typeof Client.prototype.connect;

export function assertRunConnection(
  target: ConnectionTarget,
  clone: string,
  admin: URL = resolveAdminUrl(),
): void {
  const adminHost = admin.hostname.replace(/^\[|\]$/g, "");
  const adminPort = Number(admin.port || DEFAULT_POSTGRES_PORT);
  const allowed = [admin.pathname.slice(1), TEMPLATE_DATABASE, clone];
  const onTestServer = target.host === adminHost && target.port === adminPort;

  if (onTestServer && allowed.includes(target.database ?? "")) return;

  throw new Error(FOREIGN_CONNECTION);
}

export function refuseConnectionsOutside(clone: string): () => void {
  const connect = Client.prototype.connect;

  function guardedConnect(this: Client, callback?: (error: Error) => void) {
    try {
      assertRunConnection(this, clone);
    } catch (error) {
      const refusal = error instanceof Error ? error : new Error(String(error));
      if (!callback) return Promise.reject(refusal);

      queueMicrotask(() => callback(refusal));

      return;
    }

    return Reflect.apply(connect, this, callback ? [callback] : []);
  }

  Client.prototype.connect = guardedConnect as Connect;

  return () => {
    Client.prototype.connect = connect;
  };
}

export function foreignDatabases(names: string[]): string[] {
  return names.filter(
    (name) => !SYSTEM_DATABASES.has(name) && !TEST_DATABASE_NAME.test(name),
  );
}

export function assertDedicatedServer(names: string[]): void {
  const foreign = foreignDatabases(names);
  if (foreign.length === 0) return;

  const listed = foreign.map((name) => `"${name}"`).join(", ");

  throw new Error(
    `This Postgres holds ${listed}, which the database tests did not create. They only run on the dedicated test server: start it with "docker compose up -d --wait postgres-test" and leave TEST_DATABASE_URL unset.`,
  );
}

export function cloneName(): string {
  return `${TEST_DATABASE_PREFIX}${randomBytes(6).toString("hex")}`;
}

export function urlForDatabase(name: string): string {
  assertTestDatabaseName(name);

  const url = resolveAdminUrl();
  url.pathname = `/${name}`;

  return url.toString();
}

export async function connectAdmin(): Promise<Client> {
  const url = resolveAdminUrl();
  const client = new Client({
    connectionString: url.toString(),
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });

  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Postgres is not reachable at ${url.host}. Start it with "docker compose up -d --wait postgres-test" and retry. (${sqlState(error) ?? "connection failed"})`,
    );
  }

  try {
    const { rows } = await client.query<{ datname: string }>(
      "SELECT datname FROM pg_database",
    );

    assertDedicatedServer(rows.map(({ datname }) => datname));
  } catch (error) {
    await client.end();
    throw error;
  }

  return client;
}

export async function createDatabase(
  admin: Client,
  name: string,
  template?: string,
): Promise<void> {
  assertTestDatabaseName(name);
  if (template) assertTestDatabaseName(template);

  const statement = template
    ? `CREATE DATABASE "${name}" TEMPLATE "${template}"`
    : `CREATE DATABASE "${name}"`;

  for (let attempt = 1; ; attempt++) {
    try {
      await admin.query(statement);

      return;
    } catch (error) {
      const code = sqlState(error);

      if (code === UNDEFINED_DATABASE) throw new Error(MISSING_TEMPLATE);
      if (code !== OBJECT_IN_USE || attempt >= CLONE_ATTEMPTS) throw error;

      await sleep(CLONE_RETRY_DELAY_MS);
    }
  }
}

export async function dropDatabase(admin: Client, name: string): Promise<void> {
  assertTestDatabaseName(name);

  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

export async function dropStaleDatabases(admin: Client): Promise<void> {
  const { rows } = await admin.query<{ datname: string }>(
    "SELECT datname FROM pg_database WHERE datname LIKE 'vinted\\_test\\_%'",
  );

  for (const { datname } of rows) await dropDatabase(admin, datname);
}

export async function withTemplateLock<T>(
  admin: Client,
  work: () => Promise<T>,
): Promise<T> {
  await admin.query("SELECT pg_advisory_lock($1)", [TEMPLATE_LOCK]);

  try {
    return await work();
  } finally {
    await admin.query("SELECT pg_advisory_unlock($1)", [TEMPLATE_LOCK]);
  }
}

export interface TestDatabase {
  name: string;
  url: string;
  drop(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const name = cloneName();
  const admin = await connectAdmin();

  try {
    await withTemplateLock(admin, () =>
      createDatabase(admin, name, TEMPLATE_DATABASE),
    );
  } finally {
    await admin.end();
  }

  return {
    name,
    url: urlForDatabase(name),
    async drop() {
      const cleanup = await connectAdmin();

      try {
        await dropDatabase(cleanup, name);
      } finally {
        await cleanup.end();
      }
    },
  };
}
