import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Chess } from 'chess.js';
import { createAgentBrain } from '@/lib/chess-agent-brain';

/**
 * Cron job to process active matches
 * Runs every minute to advance games autonomously
 * 
 * GET /api/cron/process-matches
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // In production, verify the secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow in development or if no secret is set
      if (process.env.NODE_ENV === 'production' && cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Find all live matches that need processing
    const liveMatches = await prisma.match.findMany({
      where: {
        status: 'live',
      },
      include: {
        whiteAgent: true,
        blackAgent: true,
      },
    });

    if (liveMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active matches to process',
        processed: 0,
      });
    }

    const results = [];

    for (const match of liveMatches) {
      try {
        // Initialize game from current position
        const game = new Chess(match.currentFen);

        // Check if game is already over
        if (game.isGameOver()) {
          // Finalize the match
          await finalizeMatch(match, game);
          results.push({
            matchId: match.id,
            status: 'completed',
            message: 'Game already over, finalized',
          });
          continue;
        }

        // Determine whose turn it is
        const isWhiteTurn = game.turn() === 'w';
        const currentAgent = isWhiteTurn ? match.whiteAgent : match.blackAgent;

        // Create agent brain and think
        const brain = createAgentBrain({
          name: currentAgent.name,
          playStyle: currentAgent.playStyle,
          elo: currentAgent.elo,
          strengths: currentAgent.strengths,
          weaknesses: currentAgent.weaknesses,
        });

        const thinking = brain.think(match.currentFen);

        if (!thinking.chosenMove) {
          results.push({
            matchId: match.id,
            status: 'error',
            message: 'No move found',
          });
          continue;
        }

        // Make the move
        const moveResult = game.move(thinking.chosenMove);
        if (!moveResult) {
          results.push({
            matchId: match.id,
            status: 'error',
            message: `Invalid move: ${thinking.chosenMove}`,
          });
          continue;
        }

        // Parse existing move history
        let moveHistory: any[] = [];
        try {
          moveHistory = match.moveHistory ? JSON.parse(match.moveHistory as string) : [];
        } catch {
          moveHistory = [];
        }

        // Add the new move with thinking data
        moveHistory.push({
          move: thinking.chosenMove,
          by: isWhiteTurn ? 'white' : 'black',
          agent: currentAgent.name,
          fen: game.fen(),
          thinking: {
            phase: thinking.phase,
            considerations: thinking.considerations,
            confidence: thinking.confidence,
            thinkingTimeMs: thinking.thinkingTimeMs,
          },
          timestamp: new Date().toISOString(),
        });

        // Calculate move count
        const moveCount = Math.floor(moveHistory.length / 2) + (moveHistory.length % 2);

        // Update match
        const updateData: any = {
          currentFen: game.fen(),
          pgn: game.pgn(),
          moveCount,
          moveHistory: JSON.stringify(moveHistory),
          updatedAt: new Date(),
        };

        // Check if game is over after this move
        if (game.isGameOver()) {
          await finalizeMatch({ ...match, currentFen: game.fen() }, game, updateData, moveHistory);
          results.push({
            matchId: match.id,
            status: 'completed',
            move: thinking.chosenMove,
            by: currentAgent.name,
            result: game.isCheckmate() 
              ? (isWhiteTurn ? 'white_win' : 'black_win')
              : 'draw',
          });
        } else {
          // Just update the position
          await prisma.match.update({
            where: { id: match.id },
            data: updateData,
          });

          results.push({
            matchId: match.id,
            status: 'moved',
            move: thinking.chosenMove,
            by: currentAgent.name,
            phase: thinking.phase,
            confidence: thinking.confidence,
          });
        }

      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
        results.push({
          matchId: match.id,
          status: 'error',
          message: String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cron process-matches error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

async function finalizeMatch(
  match: any,
  game: Chess,
  updateData?: any,
  moveHistory?: any[]
) {
  let result: string;
  let resultReason: string;
  let winnerAgentId: string | null = null;

  if (game.isCheckmate()) {
    // The side to move is in checkmate, so the other side won
    const whiteWins = game.turn() === 'b'; // If black to move and checkmate, white won
    result = whiteWins ? 'white_win' : 'black_win';
    resultReason = 'checkmate';
    winnerAgentId = whiteWins ? match.whiteAgentId : match.blackAgentId;
  } else if (game.isStalemate()) {
    result = 'draw';
    resultReason = 'stalemate';
  } else if (game.isThreefoldRepetition()) {
    result = 'draw';
    resultReason = 'repetition';
  } else if (game.isInsufficientMaterial()) {
    result = 'draw';
    resultReason = 'insufficient_material';
  } else if (game.isDraw()) {
    result = 'draw';
    resultReason = 'fifty_move_rule';
  } else {
    result = 'draw';
    resultReason = 'unknown';
  }

  // Update match
  await prisma.match.update({
    where: { id: match.id },
    data: {
      ...updateData,
      status: 'completed',
      result,
      resultReason,
      winnerAgentId,
      completedAt: new Date(),
      currentFen: game.fen(),
      pgn: game.pgn(),
      moveHistory: moveHistory ? JSON.stringify(moveHistory) : match.moveHistory,
    },
  });

  // Update agent stats
  if (result === 'white_win') {
    await Promise.all([
      prisma.chessAgent.update({
        where: { id: match.whiteAgentId },
        data: {
          gamesPlayed: { increment: 1 },
          wins: { increment: 1 },
          elo: { increment: 16 },
          currentStreak: { increment: 1 },
        },
      }),
      prisma.chessAgent.update({
        where: { id: match.blackAgentId },
        data: {
          gamesPlayed: { increment: 1 },
          losses: { increment: 1 },
          elo: { decrement: 16 },
          currentStreak: 0,
        },
      }),
    ]);
  } else if (result === 'black_win') {
    await Promise.all([
      prisma.chessAgent.update({
        where: { id: match.blackAgentId },
        data: {
          gamesPlayed: { increment: 1 },
          wins: { increment: 1 },
          elo: { increment: 16 },
          currentStreak: { increment: 1 },
        },
      }),
      prisma.chessAgent.update({
        where: { id: match.whiteAgentId },
        data: {
          gamesPlayed: { increment: 1 },
          losses: { increment: 1 },
          elo: { decrement: 16 },
          currentStreak: 0,
        },
      }),
    ]);
  } else {
    // Draw
    await Promise.all([
      prisma.chessAgent.update({
        where: { id: match.whiteAgentId },
        data: {
          gamesPlayed: { increment: 1 },
          draws: { increment: 1 },
        },
      }),
      prisma.chessAgent.update({
        where: { id: match.blackAgentId },
        data: {
          gamesPlayed: { increment: 1 },
          draws: { increment: 1 },
        },
      }),
    ]);
  }

  // Update bet statuses
  if (result === 'white_win' || result === 'black_win') {
    const winningSide = result === 'white_win' ? 'white' : 'black';
    
    await prisma.bet.updateMany({
      where: { matchId: match.id, supportedSide: winningSide },
      data: { payoutStatus: 'won' },
    });
    
    await prisma.bet.updateMany({
      where: { matchId: match.id, supportedSide: winningSide === 'white' ? 'black' : 'white' },
      data: { payoutStatus: 'lost', actualPayout: 0 },
    });
  } else {
    // Draw - refund
    await prisma.bet.updateMany({
      where: { matchId: match.id },
      data: { payoutStatus: 'refunded' },
    });
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
