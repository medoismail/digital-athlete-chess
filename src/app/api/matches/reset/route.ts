import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/matches/reset
 * Cancel all active matches and reset for fresh start
 */
export async function POST(request: NextRequest) {
  try {
    // Find all active matches
    const activeMatches = await prisma.match.findMany({
      where: {
        status: { in: ['betting', 'live'] },
      },
    });

    // Cancel them all
    await prisma.match.updateMany({
      where: {
        status: { in: ['betting', 'live'] },
      },
      data: {
        status: 'completed',
        result: 'draw',
        resultReason: 'cancelled',
        completedAt: new Date(),
      },
    });

    // Refund any bets
    for (const match of activeMatches) {
      await prisma.bet.updateMany({
        where: { matchId: match.id },
        data: { payoutStatus: 'refunded' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cancelled ${activeMatches.length} active matches`,
      cancelledMatches: activeMatches.map(m => m.id),
    });
  } catch (error) {
    console.error('Reset matches error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
