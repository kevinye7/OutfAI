/**
 * Next.js instrumentation hook — runs once at server startup (not on hot reload).
 * Responsibilities:
 *   1. Ensure BetterAuth database schema exists (idempotent CREATE TABLE IF NOT EXISTS).
 *   2. Seed the dev test account (username: test / password: test) if it doesn't exist.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  await migrateBetterAuth();

  if (process.env.NODE_ENV === "development") {
    await seedTestUser();
  }
}

async function migrateBetterAuth() {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id"               TEXT      NOT NULL PRIMARY KEY,
        "name"             TEXT      NOT NULL,
        "email"            TEXT      NOT NULL,
        "emailVerified"    BOOLEAN   NOT NULL DEFAULT false,
        "image"            TEXT,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP NOT NULL DEFAULT now(),
        "username"         TEXT,
        "displayUsername"  TEXT,
        CONSTRAINT "user_email_key"    UNIQUE ("email"),
        CONSTRAINT "user_username_key" UNIQUE ("username")
      );

      CREATE TABLE IF NOT EXISTS "session" (
        "id"          TEXT      NOT NULL PRIMARY KEY,
        "expiresAt"   TIMESTAMP NOT NULL,
        "token"       TEXT      NOT NULL,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "ipAddress"   TEXT,
        "userAgent"   TEXT,
        "userId"      TEXT      NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "session_token_key" UNIQUE ("token")
      );

      CREATE TABLE IF NOT EXISTS "account" (
        "id"                     TEXT      NOT NULL PRIMARY KEY,
        "accountId"              TEXT      NOT NULL,
        "providerId"             TEXT      NOT NULL,
        "userId"                 TEXT      NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken"            TEXT,
        "refreshToken"           TEXT,
        "idToken"                TEXT,
        "accessTokenExpiresAt"   TIMESTAMP,
        "refreshTokenExpiresAt"  TIMESTAMP,
        "scope"                  TEXT,
        "password"               TEXT,
        "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "verification" (
        "id"          TEXT      NOT NULL PRIMARY KEY,
        "identifier"  TEXT      NOT NULL,
        "value"       TEXT      NOT NULL,
        "expiresAt"   TIMESTAMP NOT NULL,
        "createdAt"   TIMESTAMP DEFAULT now(),
        "updatedAt"   TIMESTAMP DEFAULT now()
      );
    `);
    console.log("[startup] BetterAuth schema ready");
  } catch (err) {
    console.error("[startup] Schema migration failed:", err);
  } finally {
    await pool.end();
  }
}

async function seedTestUser() {
  try {
    const { auth } = await import("./lib/auth");
    await auth.api.signUpEmail({
      body: {
        email: "test@outfai.local",
        password: "test",
        name: "Test User",
        username: "test",
      },
    });
    console.log(
      "[startup] Test account ready — username: test  password: test"
    );
  } catch {
    // User already exists on subsequent starts — that's fine.
  }
}
