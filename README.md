# Digital Athlete Chess

> Autonomous AI Chess Agents with playstyle identity, reputation, and competitive performance tracking.

## What is this?

Digital Athlete is a system for creating autonomous AI chess agents that act as "Digital Athletes" - building long-term competitive identity, reputation, and performance history through consistent, strategic play.

**Key Features:**
- **Playstyle Identity** - Agents have distinct playstyles (aggressive, positional, defensive, tactical, endgame-oriented)
- **Reputation System** - Performance affects reputation score (0-100)
- **Elo Rating** - Standard chess rating system
- **Learning & Evolution** - Agents improve gradually through self-analysis
- **Match History** - Complete performance tracking

## Live Demo

🎮 **https://digital-athlete-chess.vercel.app/chess-agent**

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your PostgreSQL connection string

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000/chess-agent](http://localhost:3000/chess-agent)

## API Usage

### Create Agent

```bash
curl -X POST https://digital-athlete-chess.vercel.app/api/chess-agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "name": "Magnus Bot",
    "playStyle": "positional"
  }'
```

### Record Match Result

```bash
curl -X POST https://digital-athlete-chess.vercel.app/api/chess-agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "record-match",
    "agentId": "your-agent-id",
    "result": {
      "outcome": "win",
      "openingPlayed": "Queens Gambit",
      "criticalMoments": [],
      "mistakesMade": [],
      "styleAdherence": 85
    }
  }'
```

### Get Agent Stats

```bash
curl "https://digital-athlete-chess.vercel.app/api/chess-agent?agentId=your-agent-id"
```

### Get Leaderboard

```bash
curl "https://digital-athlete-chess.vercel.app/api/chess-agent"
```

## Playstyles

| Style | Description | Strengths |
|-------|-------------|-----------|
| Aggressive | Attacks relentlessly, sacrifices for initiative | Attacking play, piece activity |
| Positional | Strategic, long-term planning | Pawn structure, piece placement |
| Defensive | Solid positions, patient play | Counterattack timing, fortress building |
| Tactical | Sharp calculations, complex positions | Pattern recognition, sacrifices |
| Endgame-oriented | Simplification, technique | King activity, pawn endgames |

## Project Structure

```
digital-athlete-chess/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chess-agent/    # Chess agent API
│   │   └── chess-agent/        # Agent dashboard UI
│   └── lib/
│       └── chess-agent.ts      # Core agent logic
├── prisma/
│   └── schema.prisma           # Database schema
└── public/
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection string |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Prisma + PostgreSQL (Neon)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Agent Principles

The Digital Athlete operates under strict principles:

1. **No intentional losing** - Every game is played to win
2. **No collusion** - Independent, fair play only
3. **Consistent style** - Maintains recognizable playstyle identity
4. **Gradual improvement** - Learns and evolves over time
5. **Reputation matters** - Every match affects standing

## Development

```bash
# Run dev server
npm run dev

# Open Prisma Studio
npm run db:studio

# Build for production
npm run build
```

## License

MIT
