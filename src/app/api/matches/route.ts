import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/matches
 * List all matches with public preview info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // betting, live, completed
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        whiteAgent: {
          select: {
            id: true,
            name: true,
            elo: true,
            playStyle: true,
            moltbookAvatar: true,
            wins: true,
            losses: true,
            draws: true,
          },
        },
        blackAgent: {
          select: {
            id: true,
            name: true,
            elo: true,
            playStyle: true,
            moltbookAvatar: true,
            wins: true,
            losses: true,
            draws: true,
          },
        },
        _count: {
          select: { bets: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // betting first, then live, then completed
        { bettingEndsAt: 'asc' },
      ],
      take: limit,
    });

    // Format for public preview (no game moves, just metadata)
    const formattedMatches = matches.map((match) => ({
      id: match.id,
      status: match.status,
      white: {
        id: match.whiteAgent.id,
        name: match.whiteAgent.name,
        elo: match.whiteAgent.elo,
        playStyle: match.whiteAgent.playStyle,
        avatar: match.whiteAgent.moltbookAvatar,
        record: `${match.whiteAgent.wins}W-${match.whiteAgent.losses}L-${match.whiteAgent.draws}D`,
      },
      black: {
        id: match.blackAgent.id,
        name: match.blackAgent.name,
        elo: match.blackAgent.elo,
        playStyle: match.blackAgent.playStyle,
        avatar: match.blackAgent.moltbookAvatar,
        record: `${match.blackAgent.wins}W-${match.blackAgent.losses}L-${match.blackAgent.draws}D`,
      },
      pool: {
        total: match.totalPool,
        white: match.whitePool,
        black: match.blackPool,
        bettorCount: match._count.bets,
      },
      timing: {
        bettingEndsAt: match.bettingEndsAt,
        startedAt: match.startedAt,
        completedAt: match.completedAt,
        timeUntilStart: match.status === 'betting' 
          ? Math.max(0, new Date(match.bettingEndsAt).getTime() - Date.now())
          : null,
      },
      result: match.status === 'completed' ? {
        winner: match.result,
        reason: match.resultReason,
      } : null,
      createdAt: match.createdAt,
    }));

    return NextResponse.json({
      success: true,
      matches: formattedMatches,
    });
  } catch (error) {
    console.error('Matches API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matches
 * Create a new match (admin/system only for now)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { whiteAgentId, blackAgentId } = body;

    if (!whiteAgentId || !blackAgentId) {
      return NextResponse.json(
        { error: 'Both whiteAgentId and blackAgentId are required' },
        { status: 400 }
      );
    }

    if (whiteAgentId === blackAgentId) {
      return NextResponse.json(
        { error: 'An agent cannot play against itself' },
        { status: 400 }
      );
    }

    // Verify both agents exist
    const [whiteAgent, blackAgent] = await Promise.all([
      prisma.chessAgent.findUnique({ where: { id: whiteAgentId } }),
      prisma.chessAgent.findUnique({ where: { id: blackAgentId } }),
    ]);

    if (!whiteAgent || !blackAgent) {
      return NextResponse.json(
        { error: 'One or both agents not found' },
        { status: 404 }
      );
    }

    // Check neither agent is in an active match
    const activeMatch = await prisma.match.findFirst({
      where: {
        status: { in: ['betting', 'live'] },
        OR: [
          { whiteAgentId: { in: [whiteAgentId, blackAgentId] } },
          { blackAgentId: { in: [whiteAgentId, blackAgentId] } },
        ],
      },
    });

    if (activeMatch) {
      return NextResponse.json(
        { error: 'One or both agents are already in an active match' },
        { status: 400 }
      );
    }

    // Create match with 1 hour betting window
    const bettingEndsAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const match = await prisma.match.create({
      data: {
        whiteAgentId,
        blackAgentId,
        status: 'betting',
        bettingEndsAt,
      },
      include: {
        whiteAgent: {
          select: { id: true, name: true, elo: true, playStyle: true },
        },
        blackAgent: {
          select: { id: true, name: true, elo: true, playStyle: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        status: match.status,
        white: match.whiteAgent,
        black: match.blackAgent,
        bettingEndsAt: match.bettingEndsAt,
        message: `Betting window open for 1 hour. Match starts at ${bettingEndsAt.toISOString()}`,
      },
    });
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
