# Gardenal Dominó - AI Coding Agent Instructions

## Project Overview
A Next.js 13 web app for tracking dominó games among condominium friends, with Firebase Firestore backend. **Critical rule**: In dominó, reaching 100 points means you **WIN**.

## Architecture

### Tech Stack
- **Frontend**: Next.js 13 (Pages Router), React 18, TypeScript
- **Backend**: Next.js API routes (Node.js)
- **Database**: Firestore (Firebase Admin SDK)
- **Auth**: Custom JWT with HttpOnly cookies + bcrypt hashing
- **Styling**: Tailwind CSS 3.4 with mobile-first design
- **Deploy**: Heroku (configured via `Procfile`)

### Data Model (types/models.ts)
- **User**: `{ email, name?, role: "admin"|"user", passwordHash, lisaCount? }`
- **Game**: `{ createdBy, teamA: [uid, uid], teamB: [uid, uid], rounds[], teamA_total, teamB_total, finished: boolean, winnerTeam?: "A"|"B", lisa?: uid[], finishedAt? }`
- **Round**: `{ roundNumber, teamA_points, teamB_points, recordedAt, recordedBy }`

### Authentication Flow
1. Login via `/api/auth/login` - auto-appends `@gardenal.com` if email lacks `@`
2. JWT stored in `gardenal_token` HttpOnly cookie (1-day expiry)
3. All protected API routes call `getCurrentUser(req)` from [lib/auth.ts](lib/auth.ts)
4. Token format: `base64url(payload).hmac-sha256-signature` (custom, not standard JWT library)
5. Password hashing: SHA-256 via `hashPassword()` (note: not bcrypt despite package.json listing it)

### Firebase Connection
- Singleton pattern in [lib/firebaseAdmin.ts](lib/firebaseAdmin.ts)
- Tries `./credenciais.json` first, falls back to env vars
- **Important**: `FIREBASE_PRIVATE_KEY` must have `\n` replaced with actual newlines via `.replace(/\\n/g, '\n')`
- Always use `FirebaseConnection.getInstance().db` for Firestore access

## Game Logic Rules

### Creating Games
- Requires exactly 4 distinct players (2 per team)
- Validates all users exist in Firestore
- **Critical validation**: Players cannot be in multiple active games simultaneously (checked via `finished === false` query)
- Returns enriched response with player names fetched from users collection

### Adding Rounds ([pages/api/games/[id]/rounds.ts](pages/api/games/[id]/rounds.ts))
- Uses Firestore transactions to prevent race conditions
- Accepts `teamA_points` and `teamB_points` (empty treated as 0)
- Auto-calculates cumulative totals (`teamA_total`, `teamB_total`)
- **Does NOT auto-finish** - requires manual confirmation via finish endpoint

### Finishing Games
- Manual process via `/api/games/[id]/finish` endpoint
- Requires at least one team to have ≥100 points
- **Winner is the team that REACHED 100 points first**
- **Lisa detection**: Loser has exactly 0 points when winner reaches 100+
  - Lisa players are from the **winning** team (who made the opponent stay at 0)
  - Stored in `game.lisa[]` array of user IDs
- Sets `finished: true`, `winnerTeam: "A"|"B"`, `finishedAt: Timestamp`
- UI shows confirmation modal with current scores before finalizing
- Cannot add rounds to finished games (transaction throws error)

### Deleting Rounds ([pages/api/games/[id]/rounds/[roundNumber].ts](pages/api/games/[id]/rounds/[roundNumber].ts))
- Only allowed on active games (`finished === false`)
- Removes round by index, renumbers remaining rounds sequentially
- Recalculates `teamA_total` and `teamB_total` after deletion

## Code Patterns

### API Routes Structure
```typescript
// Standard pattern in all /api routes
import { getCurrentUser } from "@/lib/auth";
import FirebaseConnection from "@/lib/firebaseAdmin";
const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  // ... route logic
}
```

### Firestore Queries
- Always check `.exists` on document snapshots before accessing `.data()`
- Use transactions (`db.runTransaction()`) for updates involving calculations
- Query active games: `db.collection("games").where("finished", "==", false).get()`
- User lookup by email: `db.collection("users").where("email", "==", email).limit(1).get()`

### Component Conventions
- UI components in [components/ui/](components/ui/) follow consistent props pattern:
  - `variant` prop for styling variations (e.g., Button: "primary"|"secondary"|"danger"|"ghost")
  - `className` prop merged via `cn()` utility from [lib/utils.ts](lib/utils.ts)
  - TypeScript interfaces extending native HTML element props
- Layout uses `useAuth()` hook from [lib/useAuth.ts](lib/useAuth.ts) for client-side auth state
- Mobile-first: Menu hamburger <640px, fixed sidebar ≥1024px

### Styling with Tailwind
- Custom colors defined but **not yet applied** in [tailwind.config.js](tailwind.config.js) (default blue still in use)
- Semantic colors in [DESIGN.md](DESIGN.md): `primary` (red #E20407), `secondary` (blue #0F3B75), accents (beige/brown)
- Use `cn()` from [lib/utils.ts](lib/utils.ts) (tailwind-merge + clsx) for conditional classes

## Development Workflows

### Local Setup
```bash
npm install
# Set env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, JWT_SECRET, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD
npm run dev  # Starts on localhost:3000
```

### Seeding Admin User
```bash
npm run seed-admin  # Uses ts-node to run scripts/seed-admin.ts
```
- Creates admin from `DEFAULT_ADMIN_EMAIL`/`DEFAULT_ADMIN_PASSWORD` env vars
- Skips if email already exists
- Default users array in script is **empty** by design (populate manually if needed)

### Build & Deploy
```bash
npm run build
npm start  # Production server on PORT env var (default 3000)
```
- Heroku auto-builds via `heroku-postbuild` script in [package.json](package.json)
- Image optimization disabled in [next.config.js](next.config.js) for Heroku compatibility

## Key Files Reference
- **Auth logic**: [lib/auth.ts](lib/auth.ts) - JWT signing, password hashing, user verification
- **Firestore setup**: [lib/firebaseAdmin.ts](lib/firebaseAdmin.ts) - Singleton DB connection
- **Data types**: [types/models.ts](types/models.ts) - TypeScript interfaces for User/Game/Round
- **Game creation**: [pages/api/games/index.ts](pages/api/games/index.ts) - POST creates game, validates players
- **Round management**: [pages/api/games/[id]/rounds.ts](pages/api/games/[id]/rounds.ts) - POST adds round (no auto-finish)
- **Game finishing**: [pages/api/games/[id]/finish.ts](pages/api/games/[id]/finish.ts) - POST manually finishes game with validation
- **User role management**: [pages/api/admin/users/[id]/role.ts](pages/api/admin/users/[id]/role.ts) - PUT promotes/demotes users (admin only)
- **Layout/navigation**: [components/Layout.tsx](components/Layout.tsx) - Responsive sidebar/menu
- **Modal component**: [components/ui/Modal.tsx](components/ui/Modal.tsx) - Reusable modal for confirmations

## Common Pitfalls
1. **Game finish logic**: Team that reaches 100+ points WINS (not loses)
2. **Lisa detection**: Winner reaches 100+ AND loser has exactly 0 points
3. **Firestore timestamps**: Use `admin.firestore.Timestamp.now()`, not `new Date()`
4. **Auth tokens**: Custom format, not standard JWT library - don't try to use `jsonwebtoken` package
5. **Player validation**: Always check for active games before creating new ones
6. **Email auto-completion**: Login API auto-appends `@gardenal.com` if missing
7. **Manual finish only**: Games no longer auto-finish - must use finish endpoint with confirmation
8. **Role changes**: Users cannot change their own role, only other users (prevents accidental lockout)
