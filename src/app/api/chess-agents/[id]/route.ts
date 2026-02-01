import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/chess-agents/[id]
 * Get chess agent profile and stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.chessAgent.findUnique({
      where: { id: params.id },
      include: {
        matchesAsWhite: {
          where: { status: 'completed' },
          select: {
            id: true,
            result: true,
            resultReason: true,
            completedAt: true,
            blackAgent: { select: { name: true, elo: true } },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
        matchesAsBlack: {
          where: { status: 'completed' },
          select: {
            id: true,
            result: true,
            resultReason: true,
            completedAt: true,
            whiteAgent: { select: { name: true, elo: true } },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Format recent matches
    const recentMatches = [
      ...agent.matchesAsWhite.map(m => ({
        id: m.id,
        playedAs: 'white',
        opponent: m.blackAgent.name,
        opponentElo: m.blackAgent.elo,
        result: m.result === 'white_win' ? 'win' : m.result === 'black_win' ? 'loss' : 'draw',
        resultReason: m.resultReason,
        completedAt: m.completedAt,
      })),
      ...agent.matchesAsBlack.map(m => ({
        id: m.id,
        playedAs: 'black',
        opponent: m.whiteAgent.name,
        opponentElo: m.whiteAgent.elo,
        result: m.result === 'black_win' ? 'win' : m.result === 'white_win' ? 'loss' : 'draw',
        resultReason: m.resultReason,
        completedAt: m.completedAt,
      })),
    ].sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 10);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        playStyle: agent.playStyle,
        avatar: agent.moltbookAvatar,
        
        // Stats
        elo: agent.elo,
        gamesPlayed: agent.gamesPlayed,
        wins: agent.wins,
        losses: agent.losses,
        draws: agent.draws,
        winRate: agent.gamesPlayed > 0 ? ((agent.wins / agent.gamesPlayed) * 100).toFixed(1) : '0',
        currentStreak: agent.currentStreak,
        longestWinStreak: agent.longestWinStreak,
        
        // Training
        trainingLevel: agent.trainingLevel,
        trainingXP: agent.trainingXP,
        skills: {
          tactical: agent.tacticalScore,
          positional: agent.positionalScore,
          endgame: agent.endgameScore,
          opening: agent.openingScore,
          overall: Math.round((agent.tacticalScore + agent.positionalScore + agent.endgameScore + agent.openingScore) / 4),
        },
        gamesAnalyzed: agent.gamesAnalyzed,
        
        // Identity
        strengths: agent.strengths,
        weaknesses: agent.weaknesses,
        
        // Ownership
        claimed: !!agent.ownerAddress && !agent.ownerAddress.match(/^[a-f0-9]{32}$/), // Not a claim token
        
        createdAt: agent.createdAt,
      },
      recentMatches,
    });

  } catch (error) {
    console.error('Chess agent fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
