import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL (port 5432) dipakai oleh prisma CLI (db push, migrate)
    // DATABASE_URL (port 6543) dipakai oleh app runtime (Netlify)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
