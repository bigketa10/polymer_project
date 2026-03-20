# Tech Stack

## Frontend
- **Next.js 16** (App Router) with React 19
- **TypeScript 5**
- **Tailwind CSS v4** for styling
- **shadcn/ui** components (Radix UI primitives) in `app/components/ui/`
- **lucide-react** for icons
- `clsx` + `tailwind-merge` via `cn()` utility in `app/lib/utils.ts`

## Backend
- **Convex** — real-time database, serverless functions, and file storage
  - All backend logic lives in `app/convex/` as `query` and `mutation` functions
  - Schema defined in `app/convex/schema.ts`
  - Generated types in `app/convex/_generated/`
  - Access via `useQuery` / `useMutation` hooks from `convex/react`

## Auth
- **Clerk** (`@clerk/nextjs`) integrated with Convex via `ConvexProviderWithClerk`
- Auth identity accessed in Convex handlers via `ctx.auth.getUserIdentity()`
- `identity.subject` is the canonical user ID throughout the app

## Environment Variables
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL (required)
- `CLERK_FRONTEND_API_URL` — used in `convex/auth.config.js`

## Common Commands

All commands run from the `app/` directory:

```bash
npm run dev      # Start Next.js dev server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

Convex dev server (run separately, also from `app/`):
```bash
npx convex dev   # Starts Convex backend and watches for changes
```
