import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Generate a random spectator code
function generateSpectatorCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/demo/setup
 * Create demo agents and start a real match
 */
export async function POST(request: NextRequest) {
  try {
    // Create or find demo agents
    let agent1 = await prisma.chessAgent.findFirst({
      where: { name: 'Magnus-9000' },
    });

    let agent2 = await prisma.chessAgent.findFirst({
      where: { name: 'DeepBlue-X' },
    });

    if (!agent1) {
      agent1 = await prisma.chessAgent.create({
        data: {
          name: 'Magnus-9000',
          playStyle: 'aggressive',
          elo: 1650,
          strengths: ['Opening theory', 'Tactical combinations', 'Attacking play'],
          weaknesses: ['Endgame precision', 'Quiet positions'],
          preferredOpeningsWhite: ["King's Indian Attack", 'Sicilian Dragon'],
          preferredOpeningsBlack: ['Sicilian Defense', 'King\'s Indian Defense'],
        },
      });
    }

    if (!agent2) {
      agent2 = await prisma.chessAgent.create({
        data: {
          name: 'DeepBlue-X',
          playStyle: 'positional',
          elo: 1580,
          strengths: ['Positional understanding', 'Endgame technique', 'Pawn structures'],
          weaknesses: ['Sharp tactical positions', 'Time pressure'],
          preferredOpeningsWhite: ['Queen\'s Gambit', 'English Opening'],
          preferredOpeningsBlack: ['Queen\'s Gambit Declined', 'Caro-Kann'],
        },
      });
    }

    // Check if there's already an active match between them
    const existingMatch = await prisma.match.findFirst({
      where: {
        status: { in: ['betting', 'live'] },
        OR: [
          { whiteAgentId: agent1.id, blackAgentId: agent2.id },
          { whiteAgentId: agent2.id, blackAgentId: agent1.id },
        ],
      },
    });

    if (existingMatch) {
      return NextResponse.json({
        success: true,
        message: 'Match already exists',
        agents: { white: agent1, black: agent2 },
        match: {
          id: existingMatch.id,
          status: existingMatch.status,
          spectatorCode: existingMatch.spectatorCode,
          watchUrl: `/matches/${existingMatch.id}?code=${existingMatch.spectatorCode}`,
        },
      });
    }

    // Create a new match with spectator code (skip betting)
    const spectatorCode = generateSpectatorCode();

    const match = await prisma.match.create({
      data: {
        whiteAgentId: agent1.id,
        blackAgentId: agent2.id,
        status: 'live',
        bettingEndsAt: new Date(),
        startedAt: new Date(),
        spectatorCode,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demo match created! Use the spectator code to watch.',
      agents: {
        white: { id: agent1.id, name: agent1.name, elo: agent1.elo, playStyle: agent1.playStyle },
        black: { id: agent2.id, name: agent2.name, elo: agent2.elo, playStyle: agent2.playStyle },
      },
      match: {
        id: match.id,
        status: match.status,
        spectatorCode,
        watchUrl: `/matches/${match.id}?code=${spectatorCode}`,
      },
    });
  } catch (error) {
    console.error('Demo setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/demo/setup
 * Get current demo state
 */
export async function GET() {
  try {
    const agents = await prisma.chessAgent.findMany({
      where: {
        name: { in: ['Magnus-9000', 'DeepBlue-X'] },
      },
    });

    const activeMatch = await prisma.match.findFirst({
      where: {
        status: { in: ['betting', 'live'] },
      },
      include: {
        whiteAgent: { select: { name: true, elo: true, playStyle: true } },
        blackAgent: { select: { name: true, elo: true, playStyle: true } },
      },
    });

    return NextResponse.json({
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        elo: a.elo,
        playStyle: a.playStyle,
        gamesPlayed: a.gamesPlayed,
        wins: a.wins,
        losses: a.losses,
      })),
      activeMatch: activeMatch ? {
        id: activeMatch.id,
        status: activeMatch.status,
        white: activeMatch.whiteAgent,
        black: activeMatch.blackAgent,
        spectatorCode: activeMatch.spectatorCode,
        watchUrl: `/matches/${activeMatch.id}?code=${activeMatch.spectatorCode}`,
      } : null,
    });
  } catch (error) {
    console.error('Demo status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
