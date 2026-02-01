import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Chess } from 'chess.js';
import { createAgentBrain } from '@/lib/chess-agent-brain';

// Minimum time between moves (in milliseconds)
const MIN_MOVE_INTERVAL = 4000; // 4 seconds
const MAX_MOVES = 150; // Maximum moves before forced draw

/**
 * Process a move for a live match (autonomous agent thinking)
 * Called when spectators are watching
 */
async function processAutonomousMove(match: any): Promise<any> {
  const game = new Chess(match.currentFen);
  
  // Check if game is over
  if (game.isGameOver()) {
    return await finalizeMatch(match, game);
  }

  // Force draw if too many moves (prevent endless games)
  if (match.moveCount >= MAX_MOVES) {
    return await finalizeMatch(match, game, { forcedDraw: true });
  }

  // Check if enough time has passed since last move
  let moveHistory: any[] = [];
  try {
    moveHistory = match.moveHistory ? JSON.parse(match.moveHistory) : [];
  } catch {
    moveHistory = [];
  }

  if (moveHistory.length > 0) {
    const lastMoveTime = new Date(moveHistory[moveHistory.length - 1].timestamp).getTime();
    const timeSinceLastMove = Date.now() - lastMoveTime;
    
    if (timeSinceLastMove < MIN_MOVE_INTERVAL) {
      // Not enough time has passed, return current state
      return null;
    }
  }

  // Determine whose turn it is
  const isWhiteTurn = game.turn() === 'w';
  const currentAgent = isWhiteTurn ? match.whiteAgent : match.blackAgent;

  // Create agent brain and think (training improves decision making)
  const brain = createAgentBrain({
    name: currentAgent.name,
    playStyle: currentAgent.playStyle,
    elo: currentAgent.elo,
    strengths: currentAgent.strengths || [],
    weaknesses: currentAgent.weaknesses || [],
    tacticalScore: currentAgent.tacticalScore,
    positionalScore: currentAgent.positionalScore,
    endgameScore: currentAgent.endgameScore,
    openingScore: currentAgent.openingScore,
    trainingLevel: currentAgent.trainingLevel,
  });

  const thinking = brain.think(match.currentFen);

  if (!thinking.chosenMove) {
    return null;
  }

  // Make the move
  const moveResult = game.move(thinking.chosenMove);
  if (!moveResult) {
    console.error(`Invalid move: ${thinking.chosenMove}`);
    return null;
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

  // Check if game is over after this move
  if (game.isGameOver()) {
    return await finalizeMatch(
      { ...match, currentFen: game.fen() }, 
      game, 
      { moveHistory: JSON.stringify(moveHistory), moveCount, pgn: game.pgn() }
    );
  }

  // Update match with new position
  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      currentFen: game.fen(),
      pgn: game.pgn(),
      moveCount,
      moveHistory: JSON.stringify(moveHistory),
    },
  });

  return { ...updatedMatch, moveHistory };
}

/**
 * Finalize a completed match
 */
async function finalizeMatch(match: any, game: Chess, extraData?: any) {
  let result: string;
  let resultReason: string;
  let winnerAgentId: string | null = null;

  if (extraData?.forcedDraw) {
    result = 'draw';
    resultReason = 'move_limit';
  } else if (game.isCheckmate()) {
    const whiteWins = game.turn() === 'b';
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
  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      ...extraData,
      status: 'completed',
      result,
      resultReason,
      winnerAgentId,
      completedAt: new Date(),
      currentFen: game.fen(),
      pgn: game.pgn(),
    },
  });

  // Update agent stats
  if (result === 'white_win') {
    await Promise.all([
      prisma.chessAgent.update({
        where: { id: match.whiteAgentId },
        data: { gamesPlayed: { increment: 1 }, wins: { increment: 1 }, elo: { increment: 16 } },
      }),
      prisma.chessAgent.update({
        where: { id: match.blackAgentId },
        data: { gamesPlayed: { increment: 1 }, losses: { increment: 1 }, elo: { decrement: 16 } },
      }),
    ]);
  } else if (result === 'black_win') {
    await Promise.all([
      prisma.chessAgent.update({
        where: { id: match.blackAgentId },
        data: { gamesPlayed: { increment: 1 }, wins: { increment: 1 }, elo: { increment: 16 } },
      }),
      prisma.chessAgent.update({
        where: { id: match.whiteAgentId },
        data: { gamesPlayed: { increment: 1 }, losses: { increment: 1 }, elo: { decrement: 16 } },
      }),
    ]);
  } else {
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

  return updatedMatch;
}

/**
 * GET /api/matches/[id]
 * Get match details
 * - Public: Basic preview (players, pool, timing)
 * - Bettors: Full details including live moves
 * - Also triggers autonomous agent moves for live matches
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
            trainingLevel: true,
            tacticalScore: true,
            positionalScore: true,
            endgameScore: true,
            openingScore: true,
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
            trainingLevel: true,
            tacticalScore: true,
            positionalScore: true,
            endgameScore: true,
            openingScore: true,
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

    // If match is live, process autonomous agent move
    let currentMatch = match;
    if (match.status === 'live') {
      try {
        const updatedMatch = await processAutonomousMove(match);
        if (updatedMatch) {
          // Re-fetch the match with updated data
          const refreshedMatch = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
              whiteAgent: {
                select: {
                  id: true, name: true, elo: true, playStyle: true, moltbookAvatar: true,
                  wins: true, losses: true, draws: true, reputationScore: true,
                  preferredOpeningsWhite: true, preferredOpeningsBlack: true,
                  strengths: true, weaknesses: true,
                  trainingLevel: true, tacticalScore: true, positionalScore: true,
                  endgameScore: true, openingScore: true,
                },
              },
              blackAgent: {
                select: {
                  id: true, name: true, elo: true, playStyle: true, moltbookAvatar: true,
                  wins: true, losses: true, draws: true, reputationScore: true,
                  preferredOpeningsWhite: true, preferredOpeningsBlack: true,
                  strengths: true, weaknesses: true,
                  trainingLevel: true, tacticalScore: true, positionalScore: true,
                  endgameScore: true, openingScore: true,
                },
              },
              bets: {
                select: { bettorAddress: true, supportedSide: true, amount: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
              },
            },
          });
          if (refreshedMatch) {
            currentMatch = refreshedMatch;
          }
        }
      } catch (error) {
        console.error('Error processing autonomous move:', error);
        // Continue with original match data
      }
    }

    // Check if requester is a bettor
    const isBettor = bettorAddress 
      ? currentMatch.bets.some(b => b.bettorAddress.toLowerCase() === bettorAddress.toLowerCase())
      : false;

    // Check spectator code
    const spectatorCode = searchParams.get('code');
    const hasSpectatorAccess = spectatorCode && currentMatch.spectatorCode 
      ? spectatorCode === currentMatch.spectatorCode 
      : false;

    // Match is completed - everyone can see full details
    const isCompleted = currentMatch.status === 'completed';

    // Calculate odds
    const whiteOdds = currentMatch.totalPool > 0 
      ? (currentMatch.totalPool / Math.max(currentMatch.whitePool, 0.01)).toFixed(2)
      : '1.00';
    const blackOdds = currentMatch.totalPool > 0 
      ? (currentMatch.totalPool / Math.max(currentMatch.blackPool, 0.01)).toFixed(2)
      : '1.00';

    // Base response (public preview)
    const response: any = {
      success: true,
      match: {
        id: currentMatch.id,
        status: currentMatch.status,
        white: {
          id: currentMatch.whiteAgent.id,
          name: currentMatch.whiteAgent.name,
          elo: currentMatch.whiteAgent.elo,
          playStyle: currentMatch.whiteAgent.playStyle,
          avatar: currentMatch.whiteAgent.moltbookAvatar,
          record: `${currentMatch.whiteAgent.wins}W-${currentMatch.whiteAgent.losses}L-${currentMatch.whiteAgent.draws}D`,
          reputation: currentMatch.whiteAgent.reputationScore,
          strengths: currentMatch.whiteAgent.strengths,
          weaknesses: currentMatch.whiteAgent.weaknesses,
        },
        black: {
          id: currentMatch.blackAgent.id,
          name: currentMatch.blackAgent.name,
          elo: currentMatch.blackAgent.elo,
          playStyle: currentMatch.blackAgent.playStyle,
          avatar: currentMatch.blackAgent.moltbookAvatar,
          record: `${currentMatch.blackAgent.wins}W-${currentMatch.blackAgent.losses}L-${currentMatch.blackAgent.draws}D`,
          reputation: currentMatch.blackAgent.reputationScore,
          strengths: currentMatch.blackAgent.strengths,
          weaknesses: currentMatch.blackAgent.weaknesses,
        },
        pool: {
          total: currentMatch.totalPool,
          white: currentMatch.whitePool,
          black: currentMatch.blackPool,
          whiteOdds,
          blackOdds,
          bettorCount: currentMatch.bets.length,
        },
        timing: {
          bettingEndsAt: currentMatch.bettingEndsAt,
          startedAt: currentMatch.startedAt,
          completedAt: currentMatch.completedAt,
          timeUntilStart: currentMatch.status === 'betting'
            ? Math.max(0, new Date(currentMatch.bettingEndsAt).getTime() - Date.now())
            : null,
        },
        createdAt: currentMatch.createdAt,
      },
      access: {
        isBettor,
        hasSpectatorAccess,
        canViewLive: isBettor || isCompleted || hasSpectatorAccess,
      },
    };

    // Add game data if bettor, spectator, or completed
    if (isBettor || isCompleted || hasSpectatorAccess) {
      // Parse move history
      let moveHistory: any[] = [];
      try {
        moveHistory = (currentMatch as any).moveHistory ? JSON.parse((currentMatch as any).moveHistory) : [];
      } catch {
        moveHistory = [];
      }

      response.match.game = {
        currentFen: currentMatch.currentFen,
        moveCount: currentMatch.moveCount,
        pgn: currentMatch.pgn,
        moveHistory,
      };
      
      // Add recent bets (anonymized amounts)
      response.match.recentBets = currentMatch.bets.slice(0, 10).map(b => ({
        side: b.supportedSide,
        amount: b.amount,
        time: b.createdAt,
      }));
    }

    // Add result if completed
    if (isCompleted) {
      response.match.result = {
        winner: currentMatch.result,
        reason: currentMatch.resultReason,
        winnerAgentId: currentMatch.winnerAgentId,
      };
    }

    // If bettor, show their bet
    if (isBettor && bettorAddress) {
      const userBet = currentMatch.bets.find(
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
