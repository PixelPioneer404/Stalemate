# Stalemate (MERN)

Production-structured full-stack chess web app with an **authoritative server model**.

## Highlights

- Server-authoritative move validation via `chess.js` only.
- Real-time multiplayer with Socket.io and invite-code matchmaking.
- Local practice mode with legal move highlighting, check state, and move history timeline.
- MongoDB persistence with TTL cleanup using `expiresAt`.
- Room controls: cancel room, resign, abort, draw request/accept.
- Tailwind-based responsive dark UI with minimal motion and clean hierarchy.

## Architecture

- `client/`: React UI layers (`components`, `pages`, `hooks`, `utils`).
- `server/`: Express API + Socket handlers (`controllers`, `models`, `routes`, `sockets`, `utils`).
- `chess.js` is used on the server for all multiplayer move validation and game state transitions.

## Runtime Variables

- `server/.env` (see `server/.env.example`)
- `client/.env` (optional overrides)

## Commands

- `npm run dev`: single-origin development on `http://localhost:3000` (server + client)
- `npm run build`: production client build
- `npm run start`: serve built app + API + sockets on `http://localhost:3000`
- `npm run lint`: lint server + client
