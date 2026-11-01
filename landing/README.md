# ChronoSync website

This is the standalone marketing website for `domain.com`. The React application in the repository root is deployed separately to `app.domain.com`. This project has its own package manifest, lockfile, assets, environment, and Vite build. It imports no application source or authentication services.

## Local development

Run `npm ci` and `npm run dev` in this folder. The website runs at `http://127.0.0.1:5173`. In a second terminal, run `npm run dev` in the repository root; the application and its real `/demo` route run at `http://127.0.0.1:5174`.

The default development URLs already connect those two servers. Set `VITE_CHRONOSYNC_APP_URL` if the app runs elsewhere. Without the app server, the rest of the website works, but the interactive demo cannot load.

## Separate deployment

| Project | Root directory | Build | Output | Domain |
| --- | --- | --- | --- | --- |
| Website | `landing` | `npm run build` | `dist` | `domain.com` |
| Application | repository root | `npm run build` | `dist` | `app.domain.com` |

The current Vercel projects use these URLs until custom domains are chosen:

- Website: `chronosync-website` → https://chronosync-website.vercel.app (root: `landing`).
- Application: `chronosync` → https://chronosync-lovat.vercel.app (repository root).

Both projects connect to `palyikris/chronosync` and build the production branch independently with Node.js 24. Their public URL environment variables point at each other.

Set `VITE_CHRONOSYNC_APP_URL=https://app.your-domain.com` on the **website** deployment. Set `VITE_MARKETING_SITE_URL=https://your-domain.com` on the **application** deployment. Use the exact scheme and host that will serve the site, including `www` if applicable. Both values are public build-time configuration; rebuild after changing them. The reserved `example.com` defaults are placeholders until a domain is chosen.

The app owns the `/demo` route and uses its actual timesheet, review, and billing components with fictional data. The website embeds that route across origins and accepts messages only from its own iframe at the configured app origin. The application accepts parent messages only from the configured website origin; a query parameter cannot add another allowed origin. No cross-origin API access is needed.

Pricing and the contact recipient remain placeholders. `VITE_MARKETING_CONTACT_EMAIL` can enable the email draft workflow later; while empty, the form only previews the request locally.

## Design and verification

The hero and notebook-to-laptop sequence lead into a Three.js Sync engine, a document workbench, sculptural pricing, an indexed FAQ, and an assembled-clock finale. Geometry shares sage enamel, ivory paper, and brushed metal. Scroll motion is reversible; the motion toggle and reduced-motion setting show completed, static compositions. Distant scenes release their WebGL contexts, and settled scenes stop drawing frames.

Run `npm run build` and `npm test` in this folder. The app's `node --test tests/marketing-ui/*.test.mjs` checks the real demo transport, origin restrictions, and protocol compatibility. The responsive review harness is `/tests/marketing-ui/`; the manual journey is in `tests/marketing-ui/README.md`.
