import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Elo ranges for fair matchmaking
 */
const ELO_RANGES = {
  beginner: { min: 0, max: 1299 },
  intermediate: { min: 1300, max: 1599 },
  advanced: { min: 1600, max: 1899 },
  expert: { min: 1900, max: 2199 },
  master: { min: 2200, max: 9999 },
};

/**
 * Get Elo range for an agent
 */
function getEloRange(elo: number): { min: number; max: number; name: string } {
  if (elo >= ELO_RANGES.master.min) return { ...ELO_RANGES.master, name: 'Master' };
  if (elo >= ELO_RANGES.expert.min) return { ...ELO_RANGES.expert, name: 'Expert' };
  if (elo >= ELO_RANGES.advanced.min) return { ...ELO_RANGES.advanced, name: 'Advanced' };
  if (elo >= ELO_RANGES.intermediate.min) return { ...ELO_RANGES.intermediate, name: 'Intermediate' };
  return { ...ELO_RANGES.beginner, name: 'Beginner' };
}

// Generate spectator code
function generateSpectatorCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/matches/matchmaking
 * Find a fair opponent and create a match
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Get the requesting agent
    const agent = await prisma.chessAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent is already in a match
    const activeMatch = await prisma.match.findFirst({
      where: {
        status: { in: ['betting', 'live'] },
        OR: [
          { whiteAgentId: agentId },
          { blackAgentId: agentId },
        ],
      },
    });

    if (activeMatch) {
      return NextResponse.json({
        success: false,
        error: 'Agent is already in an active match',
        match: {
          id: activeMatch.id,
          status: activeMatch.status,
        },
      });
    }

    // Get Elo range for fair matching
    const eloRange = getEloRange(agent.elo);
    
    // Expand range slightly for more matches (+/- 100)
    const searchMin = Math.max(0, eloRange.min - 100);
    const searchMax = eloRange.max + 100;

    // Find available opponents in similar Elo range
    const availableOpponents = await prisma.chessAgent.findMany({
      where: {
        id: { not: agentId },
        elo: { gte: searchMin, lte: searchMax },
        // Not in active match
        AND: [
          {
            matchesAsWhite: {
              none: { status: { in: ['betting', 'live'] } },
            },
          },
          {
            matchesAsBlack: {
              none: { status: { in: ['betting', 'live'] } },
            },
          },
        ],
      },
      orderBy: {
        // Prefer opponents closest in Elo
        elo: 'asc',
      },
    });

    // Sort by closest Elo difference
    const sortedOpponents = availableOpponents.sort((a, b) => {
      return Math.abs(a.elo - agent.elo) - Math.abs(b.elo - agent.elo);
    });

    if (sortedOpponents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No available opponents in your Elo range',
        eloRange: {
          name: eloRange.name,
          min: eloRange.min,
          max: eloRange.max,
          agentElo: agent.elo,
        },
        suggestion: 'Try again later or wait for more agents to become available',
      });
    }

    // Pick the closest opponent
    const opponent = sortedOpponents[0];
    const eloDiff = Math.abs(opponent.elo - agent.elo);

    // Randomly assign colors
    const agentIsWhite = Math.random() > 0.5;
    const whiteAgent = agentIsWhite ? agent : opponent;
    const blackAgent = agentIsWhite ? opponent : agent;

    // Create match with spectator code
    const spectatorCode = generateSpectatorCode();
    
    const match = await prisma.match.create({
      data: {
        whiteAgentId: whiteAgent.id,
        blackAgentId: blackAgent.id,
        status: 'live', // Start immediately for bot vs bot
        bettingEndsAt: new Date(),
        startedAt: new Date(),
        spectatorCode,
      },
      include: {
        whiteAgent: {
          select: { id: true, name: true, elo: true, playStyle: true, trainingLevel: true },
        },
        blackAgent: {
          select: { id: true, name: true, elo: true, playStyle: true, trainingLevel: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Match created! ${whiteAgent.name} (${whiteAgent.elo}) vs ${blackAgent.name} (${blackAgent.elo})`,
      match: {
        id: match.id,
        status: match.status,
        white: match.whiteAgent,
        black: match.blackAgent,
        eloDifference: eloDiff,
        eloRange: eloRange.name,
        spectatorCode,
        watchUrl: `/matches/${match.id}?code=${spectatorCode}`,
      },
    });

  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/matches/matchmaking
 * Get matchmaking queue status and available opponents
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    // Get all agents grouped by Elo range
    const allAgents = await prisma.chessAgent.findMany({
      select: {
        id: true,
        name: true,
        elo: true,
        trainingLevel: true,
        gamesPlayed: true,
      },
      orderBy: { elo: 'desc' },
    });

    // Group by Elo range
    const ranges: Record<string, any[]> = {
      Master: [],
      Expert: [],
      Advanced: [],
      Intermediate: [],
      Beginner: [],
    };

    allAgents.forEach(agent => {
      const range = getEloRange(agent.elo);
      ranges[range.name].push(agent);
    });

    // If agentId provided, show potential opponents
    let potentialOpponents = null;
    if (agentId) {
      const agent = allAgents.find(a => a.id === agentId);
      if (agent) {
        const range = getEloRange(agent.elo);
        potentialOpponents = {
          agentElo: agent.elo,
          eloRange: range.name,
          opponents: ranges[range.name].filter(a => a.id !== agentId).slice(0, 10),
        };
      }
    }

    return NextResponse.json({
      success: true,
      eloRanges: {
        Master: { count: ranges.Master.length, range: '2200+' },
        Expert: { count: ranges.Expert.length, range: '1900-2199' },
        Advanced: { count: ranges.Advanced.length, range: '1600-1899' },
        Intermediate: { count: ranges.Intermediate.length, range: '1300-1599' },
        Beginner: { count: ranges.Beginner.length, range: '0-1299' },
      },
      totalAgents: allAgents.length,
      potentialOpponents,
    });

  } catch (error) {
    console.error('Matchmaking status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
