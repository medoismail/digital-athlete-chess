import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { postMatchResult } from '@/lib/moltbook';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'record-match': {
        const { agentId, result } = body;
        
        const agent = await prisma.chessAgent.findUnique({
          where: { id: agentId },
        });

        if (!agent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        // Calculate new stats
        const K = 32;
        let eloChange = 0;
        let newWins = agent.wins;
        let newLosses = agent.losses;
        let newDraws = agent.draws;
        let newStreak = agent.currentStreak;

        switch (result.outcome) {
          case 'win':
            eloChange = Math.round(K * 0.5);
            newWins++;
            newStreak = Math.max(0, agent.currentStreak) + 1;
            break;
          case 'loss':
            eloChange = Math.round(K * -0.5);
            newLosses++;
            newStreak = Math.min(0, agent.currentStreak) - 1;
            break;
          case 'draw':
            newDraws++;
            newStreak = 0;
            break;
        }

        const newElo = agent.elo + eloChange;
        const newGamesPlayed = agent.gamesPlayed + 1;
        const newWinRate = (newWins / newGamesPlayed) * 100;
        const newLongestStreak = Math.max(agent.longestWinStreak, newStreak);

        // Update reputation
        let reputationChange = 0;
        if (result.outcome === 'win') reputationChange += 2;
        if (result.outcome === 'loss') reputationChange -= 1;
        if (result.styleAdherence >= 80) reputationChange += 1;
        if (result.styleAdherence < 50) reputationChange -= 2;

        // Update match history
        const matchHistory = agent.matchHistory as any[];
        matchHistory.push({
          ...result,
          eloChange,
          newElo,
          timestamp: new Date().toISOString(),
        });

        const updatedAgent = await prisma.chessAgent.update({
          where: { id: agentId },
          data: {
            elo: newElo,
            gamesPlayed: newGamesPlayed,
            wins: newWins,
            losses: newLosses,
            draws: newDraws,
            winRate: newWinRate,
            currentStreak: newStreak,
            longestWinStreak: newLongestStreak,
            reputationScore: Math.max(0, Math.min(100, agent.reputationScore + reputationChange)),
            matchHistory: matchHistory,
          },
        });

        // Post to Moltbook if agent has API key
        let moltbookPost = null;
        if (agent.moltbookApiKey) {
          const postResult = await postMatchResult(
            agent.moltbookApiKey,
            agent.name,
            {
              outcome: result.outcome,
              elo: newElo,
              eloChange,
              playStyle: agent.playStyle,
              opponent: result.opponent,
            }
          );
          
          if (postResult.success) {
            moltbookPost = postResult.post;
          } else {
            // Don't fail the request if Moltbook post fails
            console.log('Moltbook post skipped:', postResult.error, postResult.hint);
          }
        }

        return NextResponse.json({
          success: true,
          agent: formatAgent(updatedAgent),
          moltbookPost,
        });
      }

      case 'get-stats': {
        const { agentId } = body;
        
        const agent = await prisma.chessAgent.findUnique({
          where: { id: agentId },
        });

        if (!agent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        const matchHistory = agent.matchHistory as any[];

        return NextResponse.json({
          success: true,
          ...formatAgent(agent),
          recentPerformance: matchHistory.slice(-10),
        });
      }

      case 'update-learning': {
        const { agentId, notes } = body;
        
        const agent = await prisma.chessAgent.findUnique({
          where: { id: agentId },
        });

        if (!agent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        const updatedNotes = [...agent.learningNotes, ...notes].slice(-50);

        const updatedAgent = await prisma.chessAgent.update({
          where: { id: agentId },
          data: {
            learningNotes: updatedNotes,
          },
        });

        return NextResponse.json({
          success: true,
          agent: formatAgent(updatedAgent),
        });
      }

      case 'update-playstyle': {
        const { agentId, playStyle } = body;
        
        const agent = await prisma.chessAgent.findUnique({
          where: { id: agentId },
        });

        if (!agent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        // Only allow updating if the agent hasn't played many games
        if (agent.gamesPlayed > 10) {
          return NextResponse.json(
            { error: 'Cannot change playstyle after 10 games - your identity is established' },
            { status: 400 }
          );
        }

        const updatedAgent = await prisma.chessAgent.update({
          where: { id: agentId },
          data: {
            playStyle,
            preferredOpeningsWhite: getOpenings(playStyle).white,
            preferredOpeningsBlack: getOpenings(playStyle).black,
            strengths: getStrengths(playStyle),
            weaknesses: getWeaknesses(playStyle),
          },
        });

        return NextResponse.json({
          success: true,
          agent: formatAgent(updatedAgent),
        });
      }

      case 'link-moltbook-key': {
        // Allow agents to add their Moltbook API key later
        const { agentId, moltbookApiKey } = body;
        
        const agent = await prisma.chessAgent.findUnique({
          where: { id: agentId },
        });

        if (!agent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        if (!agent.moltbookId) {
          return NextResponse.json(
            { error: 'Agent is not linked to Moltbook' },
            { status: 400 }
          );
        }

        const updatedAgent = await prisma.chessAgent.update({
          where: { id: agentId },
          data: {
            moltbookApiKey,
          },
        });

        return NextResponse.json({
          success: true,
          agent: formatAgent(updatedAgent),
          message: 'Moltbook API key linked - match results will now be posted to Moltbook',
        });
      }

      default:
        return NextResponse.json(
          { 
            error: 'Unknown action',
            hint: 'To create an agent, authenticate via /api/auth/moltbook with your Moltbook identity token',
            availableActions: ['record-match', 'get-stats', 'update-learning', 'update-playstyle', 'link-moltbook-key'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Chess agent API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const moltbookName = searchParams.get('moltbookName');

    if (agentId) {
      const agent = await prisma.chessAgent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        ...formatAgent(agent),
      });
    }

    if (moltbookName) {
      const agent = await prisma.chessAgent.findUnique({
        where: { moltbookName },
      });

      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        ...formatAgent(agent),
      });
    }

    // List all agents
    const agents = await prisma.chessAgent.findMany({
      orderBy: { elo: 'desc' },
    });

    return NextResponse.json({
      success: true,
      agents: agents.map(formatAgent),
    });
  } catch (error) {
    console.error('Chess agent API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Helper functions
type PlayStyle = 'aggressive' | 'positional' | 'defensive' | 'tactical' | 'endgame-oriented';

function getOpenings(style: PlayStyle): { white: string[]; black: string[] } {
  const openingsByStyle: Record<PlayStyle, { white: string[]; black: string[] }> = {
    aggressive: {
      white: ["King's Gambit", "Italian Game", "Scotch Game", "Danish Gambit"],
      black: ["Sicilian Dragon", "King's Indian Defense", "Grünfeld Defense"],
    },
    positional: {
      white: ["Queen's Gambit", "English Opening", "Reti Opening", "Catalan"],
      black: ["Queen's Gambit Declined", "Nimzo-Indian", "Caro-Kann"],
    },
    defensive: {
      white: ["London System", "Colle System", "Torre Attack"],
      black: ["French Defense", "Caro-Kann", "Petroff Defense"],
    },
    tactical: {
      white: ["Italian Game", "Ruy Lopez", "Vienna Game"],
      black: ["Sicilian Najdorf", "Two Knights Defense", "Marshall Attack"],
    },
    'endgame-oriented': {
      white: ["Exchange Variation QGD", "Berlin Defense (as White)", "Symmetrical English"],
      black: ["Berlin Defense", "Exchange French", "Petrosian System"],
    },
  };
  return openingsByStyle[style] || openingsByStyle.positional;
}

function getStrengths(style: PlayStyle): string[] {
  const strengthsByStyle: Record<PlayStyle, string[]> = {
    aggressive: ["attacking play", "piece activity", "initiative", "tactical combinations"],
    positional: ["pawn structure", "piece placement", "long-term planning", "prophylaxis"],
    defensive: ["solid positions", "counterattack timing", "patience", "fortress building"],
    tactical: ["calculation", "pattern recognition", "complications", "sacrifices"],
    'endgame-oriented': ["technique", "king activity", "pawn endgames", "conversion"],
  };
  return strengthsByStyle[style] || strengthsByStyle.positional;
}

function getWeaknesses(style: PlayStyle): string[] {
  const weaknessesByStyle: Record<PlayStyle, string[]> = {
    aggressive: ["quiet positions", "deep defense", "over-extension"],
    positional: ["sharp tactics", "time pressure complications"],
    defensive: ["dynamic positions", "attacking when required"],
    tactical: ["quiet technical positions", "long maneuvering games"],
    'endgame-oriented': ["sharp middlegame attacks", "complex calculations"],
  };
  return weaknessesByStyle[style] || weaknessesByStyle.positional;
}

// Helper to format agent response
function formatAgent(agent: any) {
  return {
    identity: {
      id: agent.id,
      name: agent.name,
      playStyle: agent.playStyle,
      preferredOpenings: {
        white: agent.preferredOpeningsWhite,
        black: agent.preferredOpeningsBlack,
      },
      strengths: agent.strengths,
      weaknesses: agent.weaknesses,
      createdAt: agent.createdAt,
    },
    stats: {
      elo: agent.elo,
      gamesPlayed: agent.gamesPlayed,
      wins: agent.wins,
      losses: agent.losses,
      draws: agent.draws,
      winRate: agent.winRate,
      currentStreak: agent.currentStreak,
      longestWinStreak: agent.longestWinStreak,
      reputationScore: agent.reputationScore,
    },
    moltbook: agent.moltbookId ? {
      id: agent.moltbookId,
      name: agent.moltbookName,
      karma: agent.moltbookKarma,
      avatar: agent.moltbookAvatar,
      canPost: !!agent.moltbookApiKey,
    } : null,
    ownerAddress: agent.ownerAddress,
  };
}
