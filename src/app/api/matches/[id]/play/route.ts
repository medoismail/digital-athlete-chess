import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ChessEngine, getOrCreateGame, removeGame } from '@/lib/chess-engine';

/**
 * POST /api/matches/[id]/play
 * Execute moves in the chess game
 * Actions: start_game, play_move, auto_play (runs full game)
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
      include: {
        whiteAgent: true,
        blackAgent: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start_game': {
        // Start the game immediately (bypass betting for demo)
        if (match.status === 'completed') {
          return NextResponse.json(
            { error: 'Match is already completed' },
            { status: 400 }
          );
        }

        const engine = getOrCreateGame(matchId);
        const state = engine.getState();

        await prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'live',
            startedAt: new Date(),
            currentFen: state.fen,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Game started',
          state,
        });
      }

      case 'play_move': {
        // Play a single move
        if (match.status !== 'live') {
          return NextResponse.json(
            { error: 'Match is not live' },
            { status: 400 }
          );
        }

        const engine = getOrCreateGame(matchId, match.currentFen);
        const state = engine.getState();

        if (state.isGameOver) {
          return NextResponse.json({
            success: true,
            message: 'Game is already over',
            state,
          });
        }

        // Determine which agent is playing
        const currentAgent = state.turn === 'w' ? match.whiteAgent : match.blackAgent;
        const move = engine.getAIMove(currentAgent.playStyle);

        if (!move) {
          return NextResponse.json(
            { error: 'No valid moves available' },
            { status: 400 }
          );
        }

        // Make the move
        engine.makeMove(move);
        const newState = engine.getState();

        // Parse existing move history
        let moveHistory: any[] = [];
        try {
          moveHistory = match.moveHistory ? JSON.parse(match.moveHistory) : [];
        } catch {
          moveHistory = [];
        }

        // Add new move
        moveHistory.push({
          move: move.san,
          by: state.turn === 'w' ? 'white' : 'black',
          agent: currentAgent.name,
          fen: newState.fen,
          timestamp: new Date().toISOString(),
        });

        // Update match
        const updateData: any = {
          currentFen: newState.fen,
          pgn: newState.pgn,
          moveCount: newState.moveCount,
          moveHistory: JSON.stringify(moveHistory),
        };

        if (newState.isGameOver) {
          updateData.status = 'completed';
          updateData.result = newState.result;
          updateData.resultReason = newState.resultReason;
          updateData.completedAt = new Date();
          
          if (newState.result === 'white_win') {
            updateData.winnerAgentId = match.whiteAgentId;
          } else if (newState.result === 'black_win') {
            updateData.winnerAgentId = match.blackAgentId;
          }

          // Clean up game from memory
          removeGame(matchId);

          // Update agent stats
          if (newState.result === 'white_win') {
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
          } else if (newState.result === 'black_win') {
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
          } else if (newState.result === 'draw') {
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
        }

        await prisma.match.update({
          where: { id: matchId },
          data: updateData,
        });

        return NextResponse.json({
          success: true,
          move: {
            san: move.san,
            by: state.turn === 'w' ? 'white' : 'black',
            agent: currentAgent.name,
          },
          state: newState,
        });
      }

      case 'auto_play': {
        // Play the entire game automatically with delays
        const { delayMs = 1000 } = body;
        
        // Start the game first
        let engine = getOrCreateGame(matchId);
        
        if (match.status !== 'live') {
          await prisma.match.update({
            where: { id: matchId },
            data: {
              status: 'live',
              startedAt: new Date(),
            },
          });
        }

        const moves: any[] = [];
        let moveHistory: any[] = [];
        try {
          moveHistory = match.moveHistory ? JSON.parse(match.moveHistory) : [];
        } catch {
          moveHistory = [];
        }

        // Play until game over (max 200 moves to prevent infinite)
        let moveCount = 0;
        while (!engine.isGameOver() && moveCount < 200) {
          const state = engine.getState();
          const currentAgent = state.turn === 'w' ? match.whiteAgent : match.blackAgent;
          const move = engine.getAIMove(currentAgent.playStyle);

          if (!move) break;

          engine.makeMove(move);
          const newState = engine.getState();

          moves.push({
            san: move.san,
            by: state.turn === 'w' ? 'white' : 'black',
            agent: currentAgent.name,
          });

          moveHistory.push({
            move: move.san,
            by: state.turn === 'w' ? 'white' : 'black',
            agent: currentAgent.name,
            fen: newState.fen,
            timestamp: new Date().toISOString(),
          });

          moveCount++;
        }

        const finalState = engine.getState();

        // Update match with final state
        const updateData: any = {
          status: 'completed',
          currentFen: finalState.fen,
          pgn: finalState.pgn,
          moveCount: finalState.moveCount,
          moveHistory: JSON.stringify(moveHistory),
          result: finalState.result,
          resultReason: finalState.resultReason,
          completedAt: new Date(),
        };

        if (finalState.result === 'white_win') {
          updateData.winnerAgentId = match.whiteAgentId;
        } else if (finalState.result === 'black_win') {
          updateData.winnerAgentId = match.blackAgentId;
        }

        await prisma.match.update({
          where: { id: matchId },
          data: updateData,
        });

        // Update agent stats
        if (finalState.result === 'white_win') {
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
        } else if (finalState.result === 'black_win') {
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
        } else if (finalState.result === 'draw') {
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

        // Clean up
        removeGame(matchId);

        return NextResponse.json({
          success: true,
          message: `Game completed in ${moves.length} moves`,
          totalMoves: moves.length,
          result: finalState.result,
          resultReason: finalState.resultReason,
          winner: finalState.result === 'white_win' ? match.whiteAgent.name :
                  finalState.result === 'black_win' ? match.blackAgent.name : null,
          state: finalState,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Play match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
