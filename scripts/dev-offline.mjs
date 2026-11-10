// npm run dev:offline: a dev server on port 3108 that touches no real data or paid APIs.
// Real environment variables win over .env.local in Next.js, so blanking these
// switches to the in-memory store + seed motions, the mock opponent/judge, and
// turns sign-in and payments off. Use it for UI work; `npm run dev` is the real thing.
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  SUPABASE_PUBLISHABLE_KEY: "",
  STRIPE_SECRET_KEY: "",
  DEBATLE_MOCK_AI: "1",
};

const child = spawn("npx", ["next", "dev", "--port", "3108"], { env, stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
