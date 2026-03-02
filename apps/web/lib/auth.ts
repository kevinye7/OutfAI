import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  // Fall back to legacy NEXTAUTH_* vars so existing .env.local files keep working
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000",
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
    // Allow short passwords so the dev "test/test" account works
    minPasswordLength: 1,
  },
  plugins: [username()],
});
