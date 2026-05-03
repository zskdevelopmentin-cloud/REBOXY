# REBOXY - Architecture Upgrade Notes

## What was completed
1. **Prisma ORM & Database:** Migrated from Supabase BaaS to Prisma with a local SQLite database (`dev.db`). This guarantees you can run the app locally without cloud dependencies.
2. **JWT Authentication:** Replaced Supabase Auth with custom edge-compatible JWT (`jose`) and secure HTTP-only cookies.
3. **Next.js Middleware:** Implemented `middleware.ts` to protect routes and inject `x-user-id`, `x-user-role`, and `x-company-id` headers for downstream API routes.
4. **Backend API:** Built scalable Next.js App Router API routes:
   - `/api/auth/login`
   - `/api/auth/me`
   - `/api/auth/logout`
   - `/api/dashboard`
   - `/api/companies`
   - `/api/sync/ping`
   - `/api/sync/push`
   - `/api/reports/sales`
5. **Database Seeding:** Created a comprehensive `prisma/seed.ts` script that populated the SQLite database with companies, users (roles: SUPER_ADMIN, ADMIN, SALES_STAFF), ledgers, inventory, and vouchers.
6. **External Connector:** Created the `reboxy-connector/` module with simulated Tally XML/ODBC logic and API push mechanics to the new backend.
7. **Context Overhaul:** Updated `BizContext.tsx` to communicate securely with the new Next.js API endpoints rather than localStorage/Supabase.

## What still needs manual setup / Next Steps
1. **Frontend UI Replacement:** The `BizContext` now exposes `dashboardData` instead of raw `data`. You will need to update `src/app/page.tsx` and the individual report pages (e.g., `src/app/reports/sales/page.tsx`) to read from the API or `dashboardData` instead of the legacy `data.vouchers` array.
2. **PWA:** To enable PWA features properly, update `next.config.ts` with the `@ducanh2912/next-pwa` plugin.
3. **Production Database:** Before deploying to Vercel, change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`. Then provide a Neon or Supabase PostgreSQL `DATABASE_URL` in your Vercel Environment Variables and run `npx prisma db push`.

## How to run locally
1. `npm install` (dependencies are already installed!)
2. `npm run dev`
3. Log in with the seeded credentials:
   - Super Admin: `admin@reboxy.local` / `REBOXY@2026`
   - Staff: `staff@reboxy.local` / `REBOXY@2026`

## How to deploy
1. Push your code to GitHub.
2. Import the project into Vercel.
3. Add `DATABASE_URL` and `JWT_SECRET` to the environment variables.
4. (Optional) Update your `package.json` build script to `prisma generate && next build` to ensure the Prisma client is built during deployment.

## How to connect real Tally later
1. Open `reboxy-connector/tally-xml-service.js`.
2. Replace the simulated `setTimeout` logic with a real HTTP POST request to `http://localhost:9000` (Tally's default XML port).
3. The XML payload is already demonstrated in the comments.
4. Run `node index.js` from the `reboxy-connector` folder on the Windows machine where Tally ERP 9 / Tally Prime is running.
