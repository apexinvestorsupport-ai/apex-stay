# Third-party dependencies and licenses

The following direct dependencies are declared by this application. Check each package's published license and current notice file when preparing a release; transitive dependencies have their own licenses and notices in the installed package tree and lockfile.

| Package | Use | License |
| --- | --- | --- |
| `next` | React framework and server/API routing | MIT |
| `react`, `react-dom` | User interface runtime | MIT |
| `@prisma/client`, `@prisma/adapter-pg`, `prisma` | PostgreSQL ORM, driver adapter, and schema migrations | Apache-2.0 |
| `@vercel/blob` | Optional Vercel-hosted image storage | Apache-2.0 |
| `pg` | PostgreSQL driver used by Prisma's driver adapter | MIT |
| `bcryptjs` | Password hashing | MIT |
| `zod` | Request and form validation | MIT |
| `papaparse` | CSV parsing and listing import preview | MIT |
| `lucide-react` | Interface icon components | ISC |
| `tailwindcss`, `@tailwindcss/turbopack` | CSS processing and Next.js integration | MIT |
| `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/pg`, `@types/papaparse` | Type checking and declarations | Apache-2.0 / MIT (see package notices) |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` | Linting | MIT |

The lockfile contains transitive packages. For a release, preserve `package-lock.json`, review the licenses for the exact locked dependency tree with an approved license scanner, and include any notices required by those packages. No bundled stock photography or commercial font files are included. The default homepage uses a remote Unsplash image URL; verify its license and replace it with buyer-authorized imagery before deployment.
