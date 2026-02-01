import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Chess } from 'chess.js';

/**
 * Training Level Thresholds
 */
const TRAINING_LEVELS = {
  beginner: { minXP: 0, maxElo: 1400 },
  intermediate: { minXP: 500, maxElo: 1700 },
  advanced: { minXP: 2000, maxElo: 2000 },
  master: { minXP: 5000, maxElo: 3000 },
};

/**
 * Calculate training level from XP
 */
function getTrainingLevel(xp: number): string {
  if (xp >= TRAINING_LEVELS.master.minXP) return 'master';
  if (xp >= TRAINING_LEVELS.advanced.minXP) return 'advanced';
  if (xp >= TRAINING_LEVELS.intermediate.minXP) return 'intermediate';
  return 'beginner';
}

/**
 * Analyze a game and extract lessons
 */
function analyzeGame(pgn: string, agentColor: 'white' | 'black', result: string): {
  lessons: string[];
  xpGained: number;
  skillImprovements: {
    tactical: number;
    positional: number;
    endgame: number;
    opening: number;
  };
} {
  const game = new Chess();
  const lessons: string[] = [];
  let xpGained = 10; // Base XP for analyzing a game
  
  const skillImprovements = {
    tactical: 0,
    positional: 0,
    endgame: 0,
    opening: 0,
  };

  try {
    game.loadPgn(pgn);
  } catch {
    return { lessons: ['Unable to parse game'], xpGained: 5, skillImprovements };
  }

  const history = game.history({ verbose: true });
  const totalMoves = history.length;
  
  // Analyze opening (first 10 moves)
  const openingMoves = history.slice(0, 20);
  let developedPieces = 0;
  let earlyQueenMove = false;
  let castled = false;
  
  openingMoves.forEach((move, i) => {
    const isAgentMove = (i % 2 === 0 && agentColor === 'white') || (i % 2 === 1 && agentColor === 'black');
    if (!isAgentMove) return;
    
    if (['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1])) {
      developedPieces++;
    }
    if (move.piece === 'q' && i < 10) {
      earlyQueenMove = true;
    }
    if (move.san === 'O-O' || move.san === 'O-O-O') {
      castled = true;
    }
  });

  if (developedPieces >= 3) {
    lessons.push('Good piece development in the opening');
    skillImprovements.opening += 2;
    xpGained += 5;
  }
  if (earlyQueenMove) {
    lessons.push('Lesson: Avoid moving the queen too early');
    skillImprovements.opening += 1;
  }
  if (castled) {
    lessons.push('Good: Castled for king safety');
    skillImprovements.opening += 2;
    xpGained += 3;
  } else if (totalMoves > 20) {
    lessons.push('Lesson: Castle early to protect your king');
  }

  // Analyze tactics
  let captures = 0;
  let checks = 0;
  let sacrifices = 0;

  history.forEach((move, i) => {
    const isAgentMove = (i % 2 === 0 && agentColor === 'white') || (i % 2 === 1 && agentColor === 'black');
    if (!isAgentMove) return;

    if (move.captured) captures++;
    if (move.san.includes('+')) checks++;
    if (move.san.includes('#')) {
      lessons.push('Achieved checkmate!');
      skillImprovements.tactical += 5;
      xpGained += 20;
    }
  });

  if (checks >= 3) {
    lessons.push('Active piece play with multiple checks');
    skillImprovements.tactical += 2;
    xpGained += 5;
  }

  // Analyze result
  const won = (result === 'white_win' && agentColor === 'white') || 
              (result === 'black_win' && agentColor === 'black');
  const lost = (result === 'white_win' && agentColor === 'black') || 
               (result === 'black_win' && agentColor === 'white');

  if (won) {
    lessons.push('Victory! Reinforcing winning patterns');
    xpGained += 15;
    skillImprovements.tactical += 1;
    skillImprovements.positional += 1;
  } else if (lost) {
    lessons.push('Defeat analyzed: Identifying improvement areas');
    xpGained += 10; // Still learn from losses
    // Identify what went wrong based on game length
    if (totalMoves < 30) {
      lessons.push('Lesson: Lost quickly - review opening preparation');
      skillImprovements.opening += 2;
    } else if (totalMoves > 60) {
      lessons.push('Lesson: Lost in endgame - study endgame techniques');
      skillImprovements.endgame += 2;
    } else {
      lessons.push('Lesson: Lost in middlegame - improve tactical awareness');
      skillImprovements.tactical += 2;
    }
  } else {
    lessons.push('Draw achieved - solid defensive play');
    skillImprovements.positional += 1;
    xpGained += 8;
  }

  // Endgame analysis (if game went long)
  if (totalMoves > 50) {
    lessons.push('Endgame experience gained');
    skillImprovements.endgame += 2;
    xpGained += 5;
  }

  return { lessons, xpGained, skillImprovements };
}

/**
 * POST /api/agents/[id]/train
 * Train an agent by analyzing its games
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const body = await request.json();
    const { action } = body;

    const agent = await prisma.chessAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'analyze_games': {
        // Find completed matches for this agent
        const matches = await prisma.match.findMany({
          where: {
            status: 'completed',
            OR: [
              { whiteAgentId: agentId },
              { blackAgentId: agentId },
            ],
          },
          orderBy: { completedAt: 'desc' },
          take: 10, // Analyze last 10 games
        });

        if (matches.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No completed games to analyze yet. Play some matches first!',
            training: null,
          });
        }

        let totalXP = 0;
        const allLessons: string[] = [];
        const totalImprovements = {
          tactical: 0,
          positional: 0,
          endgame: 0,
          opening: 0,
        };

        // Analyze each game
        for (const match of matches) {
          if (!match.pgn) continue;
          
          const agentColor = match.whiteAgentId === agentId ? 'white' : 'black';
          const analysis = analyzeGame(match.pgn, agentColor, match.result || 'draw');
          
          totalXP += analysis.xpGained;
          allLessons.push(...analysis.lessons);
          totalImprovements.tactical += analysis.skillImprovements.tactical;
          totalImprovements.positional += analysis.skillImprovements.positional;
          totalImprovements.endgame += analysis.skillImprovements.endgame;
          totalImprovements.opening += analysis.skillImprovements.opening;
        }

        // Update agent
        const newXP = agent.trainingXP + totalXP;
        const newLevel = getTrainingLevel(newXP);
        
        // Cap skills at 100
        const newTactical = Math.min(100, agent.tacticalScore + totalImprovements.tactical);
        const newPositional = Math.min(100, agent.positionalScore + totalImprovements.positional);
        const newEndgame = Math.min(100, agent.endgameScore + totalImprovements.endgame);
        const newOpening = Math.min(100, agent.openingScore + totalImprovements.opening);

        // Get unique lessons (last 20)
        const existingLessons = agent.lessonsLearned || [];
        const allLessonsSet = new Set([...allLessons, ...existingLessons]);
        const combinedLessons = Array.from(allLessonsSet).slice(0, 20);

        const updatedAgent = await prisma.chessAgent.update({
          where: { id: agentId },
          data: {
            trainingXP: newXP,
            trainingLevel: newLevel,
            gamesAnalyzed: agent.gamesAnalyzed + matches.length,
            lessonsLearned: combinedLessons,
            tacticalScore: newTactical,
            positionalScore: newPositional,
            endgameScore: newEndgame,
            openingScore: newOpening,
            lastTrainedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: `Analyzed ${matches.length} games`,
          training: {
            gamesAnalyzed: matches.length,
            xpGained: totalXP,
            totalXP: newXP,
            level: newLevel,
            levelProgress: getLevelProgress(newXP),
            lessonsLearned: allLessons,
            skillImprovements: totalImprovements,
            currentSkills: {
              tactical: newTactical,
              positional: newPositional,
              endgame: newEndgame,
              opening: newOpening,
            },
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: analyze_games' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Training error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/[id]/train
 * Get training status and stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.chessAgent.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        trainingLevel: true,
        trainingXP: true,
        gamesAnalyzed: true,
        lessonsLearned: true,
        tacticalScore: true,
        positionalScore: true,
        endgameScore: true,
        openingScore: true,
        lastTrainedAt: true,
        elo: true,
        gamesPlayed: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      training: {
        level: agent.trainingLevel,
        xp: agent.trainingXP,
        levelProgress: getLevelProgress(agent.trainingXP),
        nextLevel: getNextLevel(agent.trainingLevel),
        xpToNextLevel: getXPToNextLevel(agent.trainingXP),
        gamesAnalyzed: agent.gamesAnalyzed,
        gamesAvailable: agent.gamesPlayed - agent.gamesAnalyzed,
        skills: {
          tactical: agent.tacticalScore,
          positional: agent.positionalScore,
          endgame: agent.endgameScore,
          opening: agent.openingScore,
          overall: Math.round((agent.tacticalScore + agent.positionalScore + agent.endgameScore + agent.openingScore) / 4),
        },
        recentLessons: agent.lessonsLearned.slice(0, 5),
        lastTrainedAt: agent.lastTrainedAt,
      },
    });
  } catch (error) {
    console.error('Get training error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getLevelProgress(xp: number): number {
  if (xp >= TRAINING_LEVELS.master.minXP) return 100;
  if (xp >= TRAINING_LEVELS.advanced.minXP) {
    return Math.round(((xp - TRAINING_LEVELS.advanced.minXP) / (TRAINING_LEVELS.master.minXP - TRAINING_LEVELS.advanced.minXP)) * 100);
  }
  if (xp >= TRAINING_LEVELS.intermediate.minXP) {
    return Math.round(((xp - TRAINING_LEVELS.intermediate.minXP) / (TRAINING_LEVELS.advanced.minXP - TRAINING_LEVELS.intermediate.minXP)) * 100);
  }
  return Math.round((xp / TRAINING_LEVELS.intermediate.minXP) * 100);
}

function getNextLevel(currentLevel: string): string | null {
  const levels = ['beginner', 'intermediate', 'advanced', 'master'];
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

function getXPToNextLevel(xp: number): number {
  if (xp >= TRAINING_LEVELS.master.minXP) return 0;
  if (xp >= TRAINING_LEVELS.advanced.minXP) return TRAINING_LEVELS.master.minXP - xp;
  if (xp >= TRAINING_LEVELS.intermediate.minXP) return TRAINING_LEVELS.advanced.minXP - xp;
  return TRAINING_LEVELS.intermediate.minXP - xp;
}
