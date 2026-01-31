import { Chess, Move } from 'chess.js';

/**
 * Chess Agent Brain
 * Autonomous decision-making for chess agents based on their playstyle
 */

export interface AgentPersonality {
  name: string;
  playStyle: 'aggressive' | 'positional' | 'defensive' | 'tactical' | 'endgame-oriented';
  elo: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ThinkingProcess {
  phase: string;
  considerations: string[];
  evaluation: string;
  chosenMove: string;
  confidence: number;
  thinkingTimeMs: number;
}

// Playstyle characteristics that influence decision-making
const PLAYSTYLE_TRAITS = {
  aggressive: {
    preferAttacks: 0.9,
    preferCaptures: 0.8,
    preferChecks: 0.9,
    preferCenterControl: 0.5,
    preferKingSafety: 0.3,
    preferPawnAdvance: 0.7,
    riskTolerance: 0.8,
    thinkingStyle: 'I seek attacking chances and tactical shots.',
  },
  positional: {
    preferAttacks: 0.4,
    preferCaptures: 0.5,
    preferChecks: 0.5,
    preferCenterControl: 0.9,
    preferKingSafety: 0.7,
    preferPawnAdvance: 0.4,
    riskTolerance: 0.3,
    thinkingStyle: 'I build long-term advantages through piece placement.',
  },
  defensive: {
    preferAttacks: 0.3,
    preferCaptures: 0.4,
    preferChecks: 0.4,
    preferCenterControl: 0.6,
    preferKingSafety: 0.95,
    preferPawnAdvance: 0.3,
    riskTolerance: 0.2,
    thinkingStyle: 'I prioritize solid structure and king safety.',
  },
  tactical: {
    preferAttacks: 0.7,
    preferCaptures: 0.75,
    preferChecks: 0.85,
    preferCenterControl: 0.6,
    preferKingSafety: 0.5,
    preferPawnAdvance: 0.5,
    riskTolerance: 0.6,
    thinkingStyle: 'I look for combinations and forcing sequences.',
  },
  'endgame-oriented': {
    preferAttacks: 0.5,
    preferCaptures: 0.6,
    preferChecks: 0.5,
    preferCenterControl: 0.7,
    preferKingSafety: 0.6,
    preferPawnAdvance: 0.8,
    riskTolerance: 0.4,
    thinkingStyle: 'I aim for favorable endgames and pawn promotion.',
  },
};

const CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export class ChessAgentBrain {
  private personality: AgentPersonality;
  private traits: typeof PLAYSTYLE_TRAITS.aggressive;

  constructor(personality: AgentPersonality) {
    this.personality = personality;
    this.traits = PLAYSTYLE_TRAITS[personality.playStyle] || PLAYSTYLE_TRAITS.tactical;
  }

  /**
   * Think about the position and decide on a move
   * Returns the thinking process and chosen move
   */
  think(fen: string): ThinkingProcess {
    const startTime = Date.now();
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) {
      return {
        phase: 'No legal moves',
        considerations: [],
        evaluation: 'Game over',
        chosenMove: '',
        confidence: 0,
        thinkingTimeMs: Date.now() - startTime,
      };
    }

    const considerations: string[] = [];
    const phase = this.identifyGamePhase(game);
    considerations.push(`Game phase: ${phase}`);
    considerations.push(this.traits.thinkingStyle);

    // Evaluate all moves
    const evaluatedMoves = moves.map(move => {
      const score = this.evaluateMove(game, move);
      return { move, score };
    });

    // Sort by score
    evaluatedMoves.sort((a, b) => b.score - a.score);

    // Add top considerations
    const topMoves = evaluatedMoves.slice(0, 3);
    topMoves.forEach((em, i) => {
      considerations.push(`Option ${i + 1}: ${em.move.san} (score: ${em.score.toFixed(2)})`);
    });

    // Select move with some controlled randomness based on elo
    const selectedMove = this.selectMove(evaluatedMoves);
    
    // Calculate confidence based on score difference
    const confidence = Math.min(0.95, 0.5 + (selectedMove.score / 10));

    // Simulate thinking time based on position complexity
    const thinkingTimeMs = this.calculateThinkingTime(game, evaluatedMoves);

    return {
      phase,
      considerations,
      evaluation: `Selected ${selectedMove.move.san} with confidence ${(confidence * 100).toFixed(0)}%`,
      chosenMove: selectedMove.move.san,
      confidence,
      thinkingTimeMs,
    };
  }

  private identifyGamePhase(game: Chess): string {
    const fen = game.fen();
    const pieces = fen.split(' ')[0];
    const pieceCount = (pieces.match(/[pnbrqkPNBRQK]/g) || []).length;
    
    if (pieceCount > 24) return 'Opening';
    if (pieceCount > 14) return 'Middlegame';
    return 'Endgame';
  }

  private evaluateMove(game: Chess, move: Move): number {
    let score = Math.random() * 0.5; // Small random factor

    // Checkmate is always best
    game.move(move);
    if (game.isCheckmate()) {
      game.undo();
      return 1000;
    }
    
    // Check is good
    if (game.isCheck()) {
      score += 2 * this.traits.preferChecks;
    }
    game.undo();

    // Captures
    if (move.captured) {
      const captureValue = PIECE_VALUES[move.captured] || 1;
      const pieceValue = PIECE_VALUES[move.piece] || 1;
      
      // Good capture (taking higher value piece)
      if (captureValue >= pieceValue) {
        score += captureValue * this.traits.preferCaptures;
      } else {
        // Trade or sacrifice
        score += (captureValue * 0.5) * this.traits.preferCaptures;
      }
    }

    // Center control
    if (CENTER_SQUARES.includes(move.to)) {
      score += this.traits.preferCenterControl;
    }

    // Castling (king safety)
    if (move.san === 'O-O' || move.san === 'O-O-O') {
      score += 2 * this.traits.preferKingSafety;
    }

    // Pawn advancement
    if (move.piece === 'p') {
      const rank = parseInt(move.to[1]);
      const isWhite = game.turn() === 'w';
      const advancement = isWhite ? rank - 2 : 7 - rank;
      score += (advancement / 6) * this.traits.preferPawnAdvance;
      
      // Promotion potential
      if ((isWhite && rank >= 6) || (!isWhite && rank <= 3)) {
        score += 1.5 * this.traits.preferPawnAdvance;
      }
    }

    // Piece development in opening
    const phase = this.identifyGamePhase(game);
    if (phase === 'Opening') {
      if (['n', 'b'].includes(move.piece)) {
        const startRank = game.turn() === 'w' ? '1' : '8';
        if (move.from[1] === startRank) {
          score += 1; // Develop pieces
        }
      }
    }

    // Attacking moves (moves toward enemy king)
    if (this.traits.preferAttacks > 0.5) {
      // Simplified: moves to advanced ranks are considered more attacking
      const rank = parseInt(move.to[1]);
      const isWhite = game.turn() === 'w';
      const attackValue = isWhite ? rank / 8 : (9 - rank) / 8;
      score += attackValue * this.traits.preferAttacks * 0.5;
    }

    return score;
  }

  private selectMove(evaluatedMoves: { move: Move; score: number }[]): { move: Move; score: number } {
    // Higher elo = more likely to pick the best move
    // Lower elo = more randomness
    const eloFactor = Math.min(1, this.personality.elo / 2000);
    
    // Weight toward top moves based on elo
    if (Math.random() < eloFactor * 0.8) {
      // Pick from top 2 moves
      return evaluatedMoves[Math.floor(Math.random() * Math.min(2, evaluatedMoves.length))];
    } else if (Math.random() < 0.7) {
      // Pick from top 5 moves
      return evaluatedMoves[Math.floor(Math.random() * Math.min(5, evaluatedMoves.length))];
    } else {
      // Occasional suboptimal move (human-like)
      return evaluatedMoves[Math.floor(Math.random() * Math.min(10, evaluatedMoves.length))];
    }
  }

  private calculateThinkingTime(game: Chess, evaluatedMoves: { move: Move; score: number }[]): number {
    // Base thinking time: 2-5 seconds
    let baseTime = 2000 + Math.random() * 3000;
    
    // More time for complex positions (many similar-scored moves)
    const topScores = evaluatedMoves.slice(0, 5).map(m => m.score);
    const scoreVariance = this.calculateVariance(topScores);
    if (scoreVariance < 0.5) {
      baseTime += 2000; // Close decisions take longer
    }

    // More time in middlegame
    const phase = this.identifyGamePhase(game);
    if (phase === 'Middlegame') {
      baseTime *= 1.3;
    }

    // Check situations require quick response
    if (game.isCheck()) {
      baseTime *= 0.7;
    }

    return Math.floor(baseTime);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

/**
 * Create a brain for an agent
 */
export function createAgentBrain(agent: {
  name: string;
  playStyle: string;
  elo: number;
  strengths: string[];
  weaknesses: string[];
}): ChessAgentBrain {
  return new ChessAgentBrain({
    name: agent.name,
    playStyle: agent.playStyle as AgentPersonality['playStyle'],
    elo: agent.elo,
    strengths: agent.strengths,
    weaknesses: agent.weaknesses,
  });
}
