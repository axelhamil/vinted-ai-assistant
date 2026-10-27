import { describe, expect, it } from "bun:test";
import { Client, Pool } from "pg";
import {
  assertCloneUrl,
  assertDedicatedServer,
  assertRunConnection,
  assertTestDatabaseName,
  foreignDatabases,
  refuseConnectionsOutside,
  resolveAdminUrl,
} from "./test-database";

async function rejectionOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return "";
}

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return "";
}

describe("the test database guard", () => {
  it("refuses a remote host, a host smuggled in the query string, and never prints the url", () => {
    const refused = [
      "postgresql://admin:s3cret@db.example.com:5445/postgres",
      "postgresql://admin:s3cret@localhost.evil.com:5445/postgres",
      "postgresql://admin:s3cret@10.0.0.5:5445/postgres",
      "postgresql://admin:s3cret@localhost:5445/postgres?host=db.example.com",
      "postgresql://admin:s3cret@localhost:5445/postgres?hostaddr=10.0.0.5",
    ];

    const messages = refused.map((url) =>
      messageOf(() => resolveAdminUrl(url)),
    );

    const printed = messages.join("\n");
    expect(
      messages.filter((message) => message.includes("local Postgres")),
    ).toHaveLength(5);
    expect(printed).not.toContain("s3cret");
    expect(printed).not.toContain("evil.com");
    expect(printed).not.toContain("db.example.com");
    expect(printed).not.toContain("10.0.0.5");
  });

  it("accepts the local hosts and the default url", () => {
    const accepted = [
      "postgresql://u:p@localhost:5445/postgres",
      "postgresql://u:p@127.0.0.1:5445/postgres",
      "postgresql://u:p@[::1]:5445/postgres",
      "",
    ];

    const hosts = accepted.map((url) => resolveAdminUrl(url).hostname);

    expect(hosts).toEqual(["localhost", "127.0.0.1", "[::1]", "127.0.0.1"]);
  });

  it("refuses to touch a database without the test prefix", () => {
    const foreign = [
      "vinted",
      "vinted_rehearsal",
      'vinted_test_x"; DROP DATABASE postgres; --',
    ];
    const owned = ["vinted_test_template", "vinted_test_0123456789ab"];

    const refusals = foreign.map((name) =>
      messageOf(() => assertTestDatabaseName(name)),
    );
    const acceptances = owned.map((name) =>
      messageOf(() => assertTestDatabaseName(name)),
    );

    expect(
      refusals.filter((message) => message.includes("vinted_test_")),
    ).toHaveLength(3);
    expect(acceptances).toEqual(["", ""]);
  });

  it("hands out a connection only to a clone of the template on the test server", () => {
    const testServer = resolveAdminUrl("");
    const refused = [
      undefined,
      "",
      "not a url",
      "postgresql://unit:unit@127.0.0.1:1/never_connected",
      "postgresql://postgres:postgres@127.0.0.1:5445/postgres",
      "postgresql://postgres:postgres@127.0.0.1:5445/vinted_test_template",
      "postgresql://postgres:postgres@127.0.0.1:5445/vinted_test_0123456789ab?host=db.example.com",
      "postgresql://postgres:postgres@127.0.0.1:6543/vinted_test_0123456789ab",
      "postgresql://postgres:s3cret@db.example.com:5445/vinted_test_0123456789ab",
    ];
    const clone =
      "postgresql://postgres:postgres@127.0.0.1:5445/vinted_test_0123456789ab";

    const refusals = refused.map((url) =>
      messageOf(() => assertCloneUrl(url, testServer)),
    );
    const acceptance = messageOf(() => assertCloneUrl(clone, testServer));

    const printed = refusals.join("\n");
    expect(
      refusals.filter((message) => message.includes("not point to a clone")),
    ).toHaveLength(9);
    expect(printed).not.toContain("s3cret");
    expect(printed).not.toContain("db.example.com");
    expect(acceptance).toBe("");
  });

  it("opens a connection only to the clone of the run, the template and the admin database of the test server", () => {
    const testServer = resolveAdminUrl("");
    const clone = "vinted_test_0123456789ab";
    const onTestServer = { host: "127.0.0.1", port: 5445 };
    const refused = [
      { ...onTestServer, database: "vinted_test_ba9876543210" },
      { ...onTestServer, database: "vinted" },
      { ...onTestServer, database: undefined },
      { host: "127.0.0.1", port: 5432, database: clone },
      { host: "db.example.com", port: 5445, database: clone },
    ];
    const accepted = [
      { ...onTestServer, database: clone },
      { ...onTestServer, database: "vinted_test_template" },
      { ...onTestServer, database: "postgres" },
    ];

    const refusals = refused.map((target) =>
      messageOf(() => assertRunConnection(target, clone, testServer)),
    );
    const acceptances = accepted.map((target) =>
      messageOf(() => assertRunConnection(target, clone, testServer)),
    );

    expect(
      refusals.filter((message) => message.includes("not its own clone")),
    ).toHaveLength(5);
    expect(refusals.join("\n")).not.toContain("db.example.com");
    expect(acceptances).toEqual(["", "", ""]);
  });

  it("refuses at connect time a client or a pool that a database test opens outside its clone", async () => {
    const foreign =
      "postgresql://postgres:s3cret@127.0.0.1:5445/vinted_test_ba9876543210";
    const client = new Client({ connectionString: foreign });
    const pool = new Pool({ connectionString: foreign });
    const restore = refuseConnectionsOutside("vinted_test_0123456789ab");

    const fromClient = await rejectionOf(() => client.connect());
    const fromPool = await rejectionOf(() => pool.query("select 1"));
    restore();
    await pool.end();

    expect(fromClient).toContain("not its own clone");
    expect(fromPool).toContain("not its own clone");
    expect(`${fromClient}${fromPool}`).not.toContain("s3cret");
  });

  it("refuses a server that holds a database the tests did not create", () => {
    const dedicated = [
      "postgres",
      "template0",
      "template1",
      "vinted_test_template",
      "vinted_test_0123456789ab",
    ];
    const shared = [...dedicated, "vinted", "afterlive"];

    const foreign = foreignDatabases(shared);
    const refusal = messageOf(() => assertDedicatedServer(shared));
    const acceptance = messageOf(() => assertDedicatedServer(dedicated));

    expect(foreign).toEqual(["vinted", "afterlive"]);
    expect(refusal).toContain('"vinted", "afterlive"');
    expect(refusal).toContain("docker compose up -d --wait postgres-test");
    expect(acceptance).toBe("");
  });
});
