# Apex Stay

White-label apartment discovery and management for one independent business per installation. Each buyer deploys a separate application with its own PostgreSQL database, Vercel Blob store, hostname, staff accounts, and provider credentials. This project does not implement shared multi-tenant access.

## Application structure

- `app/` — public website, responsive admin workspace, and Next.js route handlers.
- `app/api/listings/` and `app/api/enquiries/` — public read/search and enquiry endpoints.
- `app/api/admin/` — authenticated listing, enquiry, content, settings, staff, audit, and upload endpoints.
- `lib/auth.ts` — database-backed sessions, role checks, and database-backed rate limiting.
- `lib/validation.ts` — server-side request schemas.
- `lib/settings.ts` — white-label configuration and defaults.
- `prisma/schema.prisma` and `prisma/migrations/` — PostgreSQL data model and schema history.

The relational model stores users and sessions; listings and ordered photos; enquiries and assignments; business/brand settings; editable pages; audit events; and rate-limit windows. Listing drafts, archived records, and rented/sold records are excluded from public listing queries.

## Requirements

- Node.js 20.9 or newer (Node 22 LTS is recommended).
- A PostgreSQL database. A Vercel Marketplace Neon/Postgres database is a convenient Vercel deployment choice.
- A Vercel project, or another Node.js host that supports the Next.js App Router.

## Install locally

1. Clone or extract this source package and create `.env` from `.env.example` before installing dependencies. Configure `DATABASE_URL` and `DIRECT_URL` with the buyer's PostgreSQL provider connection strings.
2. Run `npm ci` in the project directory.
3. Create a PostgreSQL database. Use its pooled connection for `DATABASE_URL` and its direct, non-pooled connection for `DIRECT_URL`. URL-encode special characters in database passwords.
4. Apply the schema with `npm run db:deploy`.
5. Run `npm run dev` and open `http://localhost:3000`.
6. Visit `/admin/login`. If there is no owner yet and `SETUP_SECRET` is configured, the page shows the one-time owner setup form. Enter the same setup secret, choose an email, and create a password of at least 12 characters.
7. Remove `SETUP_SECRET` from the environment after creating the first owner. A second owner cannot be set up through this flow.

The database must be reachable and migrated before the first owner setup. The application intentionally does not contain a default admin password or seeded listings.

## Environment variables and external services

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL runtime connection. Prefer the provider's pooled/serverless URL. |
| `DIRECT_URL` | Yes for schema migration | Direct PostgreSQL connection used by Prisma migration commands. |
| `SETUP_SECRET` | First owner only | Private, one-time secret to authorize the first owner creation. Use a cryptographically random value and remove it after setup. |
| `SITE_URL` | Recommended | Canonical site origin used for canonical and social metadata. |
| `BLOB_READ_WRITE_TOKEN` | Optional for upload | Vercel Blob token; image upload returns a clear configuration error until present. |
| `RESEND_API_KEY` | Optional for email | Resend API key. |
| `RESEND_FROM` | Optional for email | Verified sender identity in Resend. The business contact email must also be set in Brand & Business settings. |

Photos require Vercel Blob in this version. Create a Blob store in the buyer's own Vercel project and set its token. Uploads are limited to 4 MB to stay below Vercel Functions' request-body limit; file type and image signatures are checked. No local or public upload directory is used. Email is not required: enquiries are stored in PostgreSQL and remain visible in the admin inbox without an email provider. If configured, Resend notification failures are logged and never reported as sent.

No map provider is used. The detail page shows the provided address and does not render a fake map. Coordinates may be stored for a future configured provider.

## Vercel deployment

1. Push the source to the buyer's own private or public Git repository and import that repository into Vercel. Deploy each buyer's copy as its own Vercel project.
2. Provision a PostgreSQL database through the Vercel Marketplace or an external PostgreSQL provider. Configure `DATABASE_URL` and `DIRECT_URL` in Vercel for Preview and Production as appropriate.
3. Add a unique, high-entropy `SETUP_SECRET` for the initial owner setup. Add `SITE_URL` with the final HTTPS origin.
4. Set `BLOB_READ_WRITE_TOKEN` from the buyer's Blob store if listing photo uploads are needed. Set `RESEND_API_KEY` and `RESEND_FROM` only if email notifications are wanted.
5. Deploy. From a controlled environment with the production database variables, run `npm run db:deploy` to apply migrations. Do not run schema migrations against production from an untrusted preview deployment.
6. Open `/admin/login`, create the first owner, and remove `SETUP_SECRET` from Vercel's environment settings. Redeploy after changing environment variables.
7. Add the custom domain in Vercel's project settings and follow Vercel's DNS/HTTPS instructions. Set `SITE_URL` to that HTTPS domain.

Build command: `npm run build`. Install command: `npm ci`. Output and routing are handled by Next.js; no custom Vercel build output directory is needed.

## Backups and updates

- Back up PostgreSQL with the provider's point-in-time recovery or `pg_dump` and keep backups outside the project repository.
- Listing photos live in the buyer's Blob store. Back them up separately using the provider's supported export/copy process and retain the listing/photo URLs or a URL-to-object inventory.
- To restore, restore PostgreSQL first, restore the buyer's Blob objects at their original public URLs (or update the stored photo URLs), configure the same private environment values, and redeploy.
- Before an update, take a database backup, review the release notes, test the update with a restored staging database, and run `npm run db:deploy` once against the intended database. Keep a rollback-ready database backup and the previous deployment.
- Never put `.env`, database dumps, customer uploads, or production records in a distributable release.

## Verification commands

```sh
npm ci
npm run db:generate
npm run lint
npx tsc --noEmit
npm run build
```

The build checks compilation and prerendering, not live database credentials, database migrations, provider delivery, or real user flows. Those need to be exercised against a buyer's configured PostgreSQL and service accounts.

## Current limitations to understand before selling

- Image upload depends on Vercel Blob; email delivery depends on Resend. Neither service is simulated.
- There is no map widget, social login, end-user account system, or server-side favourite storage. Favourites are stored only in the visitor's browser.
- Public page management covers the five supplied About, Contact, FAQ, Privacy, and Terms pages; there is no arbitrary page builder or configurable FAQ collection yet.
- CSV listing export and a validation preview are available in the listing dashboard. Imports are limited to 500 rows per batch, exclude photos, and require uploaded photos to be added separately.
- Staff account creation/deactivation and listing/enquiry role checks are implemented. Password reset, MFA, per-manager custom permissions, and account invitation emails are not included.
- Currency settings change the denomination displayed for saved listing amounts; they do not convert prices. Review and update every listing amount before changing the business currency.
- The sample Privacy and Terms page copy is starter text, not legal advice. Each buyer must review and replace it for its jurisdiction and actual practices.
- The app uses externally hosted Unsplash hero photography as a decorative default. Replace it with buyer-owned or properly licensed photography before production use. No commercial font files are bundled.
- The application has not been end-to-end tested against a live Vercel PostgreSQL/Blob/Resend deployment in this workspace. Follow the test/report notes supplied with the release and verify the buyer's own services before launch.
