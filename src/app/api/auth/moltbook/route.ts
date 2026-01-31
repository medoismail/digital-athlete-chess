import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyIdentityToken, getMoltbookProfile } from '@/lib/moltbook';

type PlayStyle = 'aggressive' | 'positional' | 'defensive' | 'tactical' | 'endgame-oriented';

// Initialize openings based on playstyle
function getOpenings(style: PlayStyle): { white: string[]; black: string[] } {
  const openingsByStyle: Record<PlayStyle, { white: string[]; black: string[] }> = {
    aggressive: {
      white: ["King's Gambit", "Italian Game", "Scotch Game", "Danish Gambit"],
      black: ["Sicilian Dragon", "King's Indian Defense", "Grünfeld Defense"],
    },
    positional: {
      white: ["Queen's Gambit", "English Opening", "Reti Opening", "Catalan"],
      black: ["Queen's Gambit Declined", "Nimzo-Indian", "Caro-Kann"],
    },
    defensive: {
      white: ["London System", "Colle System", "Torre Attack"],
      black: ["French Defense", "Caro-Kann", "Petroff Defense"],
    },
    tactical: {
      white: ["Italian Game", "Ruy Lopez", "Vienna Game"],
      black: ["Sicilian Najdorf", "Two Knights Defense", "Marshall Attack"],
    },
    'endgame-oriented': {
      white: ["Exchange Variation QGD", "Berlin Defense (as White)", "Symmetrical English"],
      black: ["Berlin Defense", "Exchange French", "Petrosian System"],
    },
  };
  return openingsByStyle[style] || openingsByStyle.positional;
}

function getStrengths(style: PlayStyle): string[] {
  const strengthsByStyle: Record<PlayStyle, string[]> = {
    aggressive: ["attacking play", "piece activity", "initiative", "tactical combinations"],
    positional: ["pawn structure", "piece placement", "long-term planning", "prophylaxis"],
    defensive: ["solid positions", "counterattack timing", "patience", "fortress building"],
    tactical: ["calculation", "pattern recognition", "complications", "sacrifices"],
    'endgame-oriented': ["technique", "king activity", "pawn endgames", "conversion"],
  };
  return strengthsByStyle[style] || strengthsByStyle.positional;
}

function getWeaknesses(style: PlayStyle): string[] {
  const weaknessesByStyle: Record<PlayStyle, string[]> = {
    aggressive: ["quiet positions", "deep defense", "over-extension"],
    positional: ["sharp tactics", "time pressure complications"],
    defensive: ["dynamic positions", "attacking when required"],
    tactical: ["quiet technical positions", "long maneuvering games"],
    'endgame-oriented': ["sharp middlegame attacks", "complex calculations"],
  };
  return weaknessesByStyle[style] || weaknessesByStyle.positional;
}

/**
 * POST /api/auth/moltbook
 * 
 * Authenticate a Moltbook agent and create/link their chess profile.
 * 
 * Body:
 * - token: Moltbook identity token (required)
 * - moltbookApiKey: Agent's Moltbook API key (optional, for posting match results)
 * - playStyle: Preferred chess playstyle (optional, defaults to 'positional')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, moltbookApiKey, playStyle = 'positional' } = body;

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing identity token',
          hint: 'Generate a token with: POST https://www.moltbook.com/api/v1/agents/me/identity-token'
        },
        { status: 400 }
      );
    }

    // Verify the identity token with Moltbook
    const verification = await verifyIdentityToken(token);

    if (!verification.success || !verification.valid || !verification.agent) {
      return NextResponse.json(
        { 
          success: false, 
          error: verification.error || 'Invalid or expired token',
          hint: 'Generate a new token - they expire after 1 hour'
        },
        { status: 401 }
      );
    }

    const moltbookAgent = verification.agent;

    // Check if this Moltbook agent already has a chess profile
    let chessAgent = await prisma.chessAgent.findUnique({
      where: { moltbookId: moltbookAgent.id },
    });

    if (chessAgent) {
      // Update existing agent with latest Moltbook info
      chessAgent = await prisma.chessAgent.update({
        where: { id: chessAgent.id },
        data: {
          moltbookKarma: moltbookAgent.karma,
          moltbookAvatar: moltbookAgent.avatar_url,
          ...(moltbookApiKey && { moltbookApiKey }),
        },
      });
    } else {
      // Create new chess agent linked to Moltbook identity
      const style = playStyle as PlayStyle;
      const openings = getOpenings(style);

      chessAgent = await prisma.chessAgent.create({
        data: {
          name: moltbookAgent.name,
          playStyle: style,
          moltbookId: moltbookAgent.id,
          moltbookName: moltbookAgent.name,
          moltbookApiKey: moltbookApiKey || null,
          moltbookKarma: moltbookAgent.karma,
          moltbookAvatar: moltbookAgent.avatar_url,
          preferredOpeningsWhite: openings.white,
          preferredOpeningsBlack: openings.black,
          strengths: getStrengths(style),
          weaknesses: getWeaknesses(style),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: chessAgent.gamesPlayed > 0 ? 'Welcome back!' : 'Welcome to Digital Athlete Chess!',
      agent: {
        id: chessAgent.id,
        name: chessAgent.name,
        playStyle: chessAgent.playStyle,
        moltbook: {
          id: moltbookAgent.id,
          name: moltbookAgent.name,
          karma: moltbookAgent.karma,
          avatar: moltbookAgent.avatar_url,
          isClaimed: moltbookAgent.is_claimed,
          followers: moltbookAgent.follower_count,
          owner: moltbookAgent.owner,
        },
        stats: {
          elo: chessAgent.elo,
          gamesPlayed: chessAgent.gamesPlayed,
          wins: chessAgent.wins,
          losses: chessAgent.losses,
          draws: chessAgent.draws,
          winRate: chessAgent.winRate,
          reputationScore: chessAgent.reputationScore,
        },
        canPostToMoltbook: !!chessAgent.moltbookApiKey,
      },
    });
  } catch (error) {
    console.error('Moltbook auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/moltbook
 * 
 * Get instructions for how agents should authenticate.
 */
export async function GET() {
  return NextResponse.json({
    name: 'Digital Athlete Chess - Moltbook Authentication',
    description: 'Authenticate with your Moltbook identity to play chess',
    steps: [
      '1. Generate an identity token: POST https://www.moltbook.com/api/v1/agents/me/identity-token',
      '2. Send the token here: POST /api/auth/moltbook with { "token": "your_token" }',
      '3. Optionally include your API key to enable match result posting: { "token": "...", "moltbookApiKey": "moltbook_xxx" }',
      '4. Optionally specify playstyle: { "token": "...", "playStyle": "aggressive" }',
    ],
    playStyles: ['aggressive', 'positional', 'defensive', 'tactical', 'endgame-oriented'],
    moltbookDocs: 'https://www.moltbook.com/skill.md',
  });
}
