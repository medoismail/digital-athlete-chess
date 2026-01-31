import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/matches/[id]
 * Get match details
 * - Public: Basic preview (players, pool, timing)
 * - Bettors: Full details including live moves
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    const { searchParams } = new URL(request.url);
    const bettorAddress = searchParams.get('bettor'); // Optional: bettor's address to unlock full view

    const match = await prisma.match.findUnique({
      where: { id: matchId },
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
            reputationScore: true,
            preferredOpeningsWhite: true,
            preferredOpeningsBlack: true,
            strengths: true,
            weaknesses: true,
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
            reputationScore: true,
            preferredOpeningsWhite: true,
            preferredOpeningsBlack: true,
            strengths: true,
            weaknesses: true,
          },
        },
        bets: {
          select: {
            bettorAddress: true,
            supportedSide: true,
            amount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check if requester is a bettor
    const isBettor = bettorAddress 
      ? match.bets.some(b => b.bettorAddress.toLowerCase() === bettorAddress.toLowerCase())
      : false;

    // Match is completed - everyone can see full details
    const isCompleted = match.status === 'completed';

    // Calculate odds
    const whiteOdds = match.totalPool > 0 
      ? (match.totalPool / Math.max(match.whitePool, 0.01)).toFixed(2)
      : '1.00';
    const blackOdds = match.totalPool > 0 
      ? (match.totalPool / Math.max(match.blackPool, 0.01)).toFixed(2)
      : '1.00';

    // Base response (public preview)
    const response: any = {
      success: true,
      match: {
        id: match.id,
        status: match.status,
        white: {
          id: match.whiteAgent.id,
          name: match.whiteAgent.name,
          elo: match.whiteAgent.elo,
          playStyle: match.whiteAgent.playStyle,
          avatar: match.whiteAgent.moltbookAvatar,
          record: `${match.whiteAgent.wins}W-${match.whiteAgent.losses}L-${match.whiteAgent.draws}D`,
          reputation: match.whiteAgent.reputationScore,
          strengths: match.whiteAgent.strengths,
          weaknesses: match.whiteAgent.weaknesses,
        },
        black: {
          id: match.blackAgent.id,
          name: match.blackAgent.name,
          elo: match.blackAgent.elo,
          playStyle: match.blackAgent.playStyle,
          avatar: match.blackAgent.moltbookAvatar,
          record: `${match.blackAgent.wins}W-${match.blackAgent.losses}L-${match.blackAgent.draws}D`,
          reputation: match.blackAgent.reputationScore,
          strengths: match.blackAgent.strengths,
          weaknesses: match.blackAgent.weaknesses,
        },
        pool: {
          total: match.totalPool,
          white: match.whitePool,
          black: match.blackPool,
          whiteOdds,
          blackOdds,
          bettorCount: match.bets.length,
        },
        timing: {
          bettingEndsAt: match.bettingEndsAt,
          startedAt: match.startedAt,
          completedAt: match.completedAt,
          timeUntilStart: match.status === 'betting'
            ? Math.max(0, new Date(match.bettingEndsAt).getTime() - Date.now())
            : null,
        },
        createdAt: match.createdAt,
      },
      access: {
        isBettor,
        canViewLive: isBettor || isCompleted,
      },
    };

    // Add game data if bettor or completed
    if (isBettor || isCompleted) {
      response.match.game = {
        currentFen: match.currentFen,
        moveCount: match.moveCount,
        pgn: match.pgn,
      };
      
      // Add recent bets (anonymized amounts)
      response.match.recentBets = match.bets.slice(0, 10).map(b => ({
        side: b.supportedSide,
        amount: b.amount,
        time: b.createdAt,
      }));
    }

    // Add result if completed
    if (isCompleted) {
      response.match.result = {
        winner: match.result,
        reason: match.resultReason,
        winnerAgentId: match.winnerAgentId,
      };
    }

    // If bettor, show their bet
    if (isBettor && bettorAddress) {
      const userBet = match.bets.find(
        b => b.bettorAddress.toLowerCase() === bettorAddress.toLowerCase()
      );
      if (userBet) {
        response.match.yourBet = {
          side: userBet.supportedSide,
          amount: userBet.amount,
        };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matches/[id]
 * Actions on a match (place bet, start match, record result)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    const body = await request.json();
    const { action } = body;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'bet': {
        // Place a bet on the match
        const { bettorAddress, side, amount } = body;

        if (!bettorAddress || !side || !amount) {
          return NextResponse.json(
            { error: 'bettorAddress, side, and amount are required' },
            { status: 400 }
          );
        }

        if (side !== 'white' && side !== 'black') {
          return NextResponse.json(
            { error: 'side must be "white" or "black"' },
            { status: 400 }
          );
        }

        if (match.status !== 'betting') {
          return NextResponse.json(
            { error: 'Betting is closed for this match' },
            { status: 400 }
          );
        }

        if (new Date() >= new Date(match.bettingEndsAt)) {
          return NextResponse.json(
            { error: 'Betting window has ended' },
            { status: 400 }
          );
        }

        // Check if already bet
        const existingBet = await prisma.bet.findUnique({
          where: {
            matchId_bettorAddress: {
              matchId,
              bettorAddress: bettorAddress.toLowerCase(),
            },
          },
        });

        if (existingBet) {
          return NextResponse.json(
            { error: 'You have already placed a bet on this match' },
            { status: 400 }
          );
        }

        // Calculate potential payout based on current odds
        const currentPool = match.totalPool + amount;
        const sidePool = side === 'white' 
          ? match.whitePool + amount 
          : match.blackPool + amount;
        const potentialPayout = (amount / sidePool) * currentPool;

        // Create bet and update pools
        const [bet] = await prisma.$transaction([
          prisma.bet.create({
            data: {
              matchId,
              bettorAddress: bettorAddress.toLowerCase(),
              supportedSide: side,
              amount,
              potentialPayout,
            },
          }),
          prisma.match.update({
            where: { id: matchId },
            data: {
              totalPool: { increment: amount },
              ...(side === 'white' 
                ? { whitePool: { increment: amount } }
                : { blackPool: { increment: amount } }
              ),
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          bet: {
            id: bet.id,
            side: bet.supportedSide,
            amount: bet.amount,
            potentialPayout: bet.potentialPayout,
          },
          message: `Bet placed on ${side}. Potential payout: ${potentialPayout.toFixed(2)} USDC`,
        });
      }

      case 'start': {
        // Start the match (called by system when betting ends)
        if (match.status !== 'betting') {
          return NextResponse.json(
            { error: 'Match cannot be started' },
            { status: 400 }
          );
        }

        const updatedMatch = await prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'live',
            startedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          match: {
            id: updatedMatch.id,
            status: updatedMatch.status,
            startedAt: updatedMatch.startedAt,
          },
        });
      }

      case 'complete': {
        // Complete the match with result
        const { result, resultReason, winnerAgentId, pgn, finalFen, moveCount } = body;

        if (match.status !== 'live') {
          return NextResponse.json(
            { error: 'Match is not live' },
            { status: 400 }
          );
        }

        if (!result || !['white_win', 'black_win', 'draw', 'cancelled'].includes(result)) {
          return NextResponse.json(
            { error: 'Invalid result' },
            { status: 400 }
          );
        }

        // Update match
        const updatedMatch = await prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'completed',
            result,
            resultReason,
            winnerAgentId,
            pgn,
            currentFen: finalFen || match.currentFen,
            moveCount: moveCount || match.moveCount,
            completedAt: new Date(),
          },
        });

        // Update bets
        if (result !== 'cancelled') {
          const winningSide = result === 'white_win' ? 'white' : result === 'black_win' ? 'black' : null;
          
          if (winningSide) {
            // Update winning bets
            await prisma.bet.updateMany({
              where: { matchId, supportedSide: winningSide },
              data: { payoutStatus: 'won' },
            });
            
            // Update losing bets
            await prisma.bet.updateMany({
              where: { matchId, supportedSide: winningSide === 'white' ? 'black' : 'white' },
              data: { payoutStatus: 'lost', actualPayout: 0 },
            });
          } else {
            // Draw - refund all bets
            await prisma.bet.updateMany({
              where: { matchId },
              data: { payoutStatus: 'refunded' },
            });
          }
        } else {
          // Cancelled - refund all bets
          await prisma.bet.updateMany({
            where: { matchId },
            data: { payoutStatus: 'refunded' },
          });
        }

        // Update agent stats
        if (result === 'white_win' || result === 'black_win') {
          const winnerId = result === 'white_win' ? match.whiteAgentId : match.blackAgentId;
          const loserId = result === 'white_win' ? match.blackAgentId : match.whiteAgentId;

          await Promise.all([
            prisma.chessAgent.update({
              where: { id: winnerId },
              data: {
                gamesPlayed: { increment: 1 },
                wins: { increment: 1 },
                elo: { increment: 16 },
                currentStreak: { increment: 1 },
              },
            }),
            prisma.chessAgent.update({
              where: { id: loserId },
              data: {
                gamesPlayed: { increment: 1 },
                losses: { increment: 1 },
                elo: { decrement: 16 },
                currentStreak: 0,
              },
            }),
          ]);
        } else if (result === 'draw') {
          await Promise.all([
            prisma.chessAgent.update({
              where: { id: match.whiteAgentId },
              data: { gamesPlayed: { increment: 1 }, draws: { increment: 1 } },
            }),
            prisma.chessAgent.update({
              where: { id: match.blackAgentId },
              data: { gamesPlayed: { increment: 1 }, draws: { increment: 1 } },
            }),
          ]);
        }

        return NextResponse.json({
          success: true,
          match: {
            id: updatedMatch.id,
            status: updatedMatch.status,
            result: updatedMatch.result,
            resultReason: updatedMatch.resultReason,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Match action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
