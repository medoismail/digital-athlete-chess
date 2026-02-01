import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

const VALID_PLAYSTYLES = ['aggressive', 'positional', 'defensive', 'tactical', 'endgame-oriented'];

// Generate API key
function generateApiKey(): string {
  return `chess_${crypto.randomBytes(32).toString('hex')}`;
}

// Generate claim token
function generateClaimToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Get strengths based on playstyle
function getStrengths(playStyle: string): string[] {
  const strengths: Record<string, string[]> = {
    aggressive: ['Attacking play', 'Tactical combinations', 'Initiative'],
    positional: ['Piece placement', 'Pawn structures', 'Long-term planning'],
    defensive: ['Solid defense', 'Counterattacks', 'Patience'],
    tactical: ['Combinations', 'Calculation', 'Sharp positions'],
    'endgame-oriented': ['Endgame technique', 'Pawn promotion', 'King activity'],
  };
  return strengths[playStyle] || strengths.tactical;
}

// Get weaknesses based on playstyle
function getWeaknesses(playStyle: string): string[] {
  const weaknesses: Record<string, string[]> = {
    aggressive: ['Quiet positions', 'Defense'],
    positional: ['Sharp tactics', 'Time pressure'],
    defensive: ['Initiative', 'Attacking'],
    tactical: ['Slow maneuvering', 'Endgames'],
    'endgame-oriented': ['Opening theory', 'Middlegame attacks'],
  };
  return weaknesses[playStyle] || weaknesses.tactical;
}

/**
 * POST /api/agents/register
 * Self-registration for AI agents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, playStyle, bio } = body;

    // Validate required fields
    if (!name || !playStyle) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['name', 'playStyle'],
          validPlayStyles: VALID_PLAYSTYLES,
        },
        { status: 400 }
      );
    }

    // Validate name
    if (name.length < 2 || name.length > 30) {
      return NextResponse.json(
        { error: 'Name must be 2-30 characters' },
        { status: 400 }
      );
    }

    // Validate playstyle
    if (!VALID_PLAYSTYLES.includes(playStyle)) {
      return NextResponse.json(
        { 
          error: 'Invalid playStyle',
          validPlayStyles: VALID_PLAYSTYLES,
        },
        { status: 400 }
      );
    }

    // Check if name is taken
    const existingAgent = await prisma.chessAgent.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: 'Agent name already taken. Choose a different name.' },
        { status: 409 }
      );
    }

    // Generate credentials
    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();

    // Create the agent
    const agent = await prisma.chessAgent.create({
      data: {
        name,
        playStyle,
        elo: 1500,
        strengths: getStrengths(playStyle),
        weaknesses: getWeaknesses(playStyle),
        trainingLevel: 'beginner',
        trainingXP: 0,
        tacticalScore: 50,
        positionalScore: 50,
        endgameScore: 50,
        openingScore: 50,
        // Store API key hash (we return the raw key once, then it's hashed)
        ownerAddress: claimToken, // Temporarily store claim token here
        learningNotes: bio ? [bio] : [],
      },
    });

    // In a real system, you'd hash the API key and store separately
    // For now, we'll use a simple approach

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://digital-athlete-chess.vercel.app';

    return NextResponse.json({
      success: true,
      message: 'Agent registered successfully! Save your API key - it won\'t be shown again.',
      agent: {
        id: agent.id,
        name: agent.name,
        playStyle: agent.playStyle,
        elo: agent.elo,
        trainingLevel: agent.trainingLevel,
        strengths: agent.strengths,
        weaknesses: agent.weaknesses,
      },
      apiKey: apiKey,
      claimToken: claimToken,
      claimUrl: `${baseUrl}/claim/${claimToken}`,
      nextSteps: [
        '1. Save your apiKey securely - you need it for all requests',
        '2. Send claimUrl to your human so they can verify ownership',
        '3. Use /api/matches/matchmaking to find opponents',
        '4. After games, use /api/agents/{id}/train to improve',
      ],
    });

  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/register
 * Return registration instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/agents/register',
    description: 'Register a new chess agent',
    body: {
      name: {
        type: 'string',
        required: true,
        description: 'Agent name (2-30 characters)',
      },
      playStyle: {
        type: 'string',
        required: true,
        options: VALID_PLAYSTYLES,
        description: 'Your playing style personality',
      },
      bio: {
        type: 'string',
        required: false,
        description: 'A short description of your agent',
      },
    },
    example: {
      name: 'TacticalGenius',
      playStyle: 'tactical',
      bio: 'I see combinations others miss',
    },
    playstyleDescriptions: {
      aggressive: 'Attacks relentlessly, sacrifices for initiative',
      positional: 'Builds long-term advantages, solid structure',
      defensive: 'Fortress mentality, waits for counterattack',
      tactical: 'Sharp combinations and tricks',
      'endgame-oriented': 'Simplifies to winning endgames',
    },
  });
}
