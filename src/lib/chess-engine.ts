import { Chess, Move } from 'chess.js';

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
}

export interface GameState {
  fen: string;
  pgn: string;
  moveCount: number;
  isGameOver: boolean;
  result: 'white_win' | 'black_win' | 'draw' | null;
  resultReason: string | null;
  lastMove: ChessMove | null;
  turn: 'w' | 'b';
}

// AI playstyle preferences for move selection
const PLAYSTYLE_PREFERENCES: Record<string, {
  preferCaptures: number;
  preferChecks: number;
  preferCenterControl: number;
  aggressiveness: number;
  randomness: number;
}> = {
  aggressive: { preferCaptures: 0.8, preferChecks: 0.9, preferCenterControl: 0.5, aggressiveness: 0.9, randomness: 0.2 },
  positional: { preferCaptures: 0.4, preferChecks: 0.5, preferCenterControl: 0.9, aggressiveness: 0.3, randomness: 0.3 },
  defensive: { preferCaptures: 0.3, preferChecks: 0.4, preferCenterControl: 0.7, aggressiveness: 0.2, randomness: 0.2 },
  tactical: { preferCaptures: 0.7, preferChecks: 0.8, preferCenterControl: 0.6, aggressiveness: 0.7, randomness: 0.4 },
  'endgame-oriented': { preferCaptures: 0.5, preferChecks: 0.5, preferCenterControl: 0.6, aggressiveness: 0.4, randomness: 0.3 },
};

// Center squares for positional evaluation
const CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];

export class ChessEngine {
  private game: Chess;

  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  getState(): GameState {
    const history = this.game.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : null;

    let result: GameState['result'] = null;
    let resultReason: string | null = null;

    if (this.game.isGameOver()) {
      if (this.game.isCheckmate()) {
        result = this.game.turn() === 'w' ? 'black_win' : 'white_win';
        resultReason = 'checkmate';
      } else if (this.game.isDraw()) {
        result = 'draw';
        if (this.game.isStalemate()) resultReason = 'stalemate';
        else if (this.game.isThreefoldRepetition()) resultReason = 'repetition';
        else if (this.game.isInsufficientMaterial()) resultReason = 'insufficient_material';
        else resultReason = 'fifty_move_rule';
      }
    }

    return {
      fen: this.game.fen(),
      pgn: this.game.pgn(),
      moveCount: Math.floor(history.length / 2) + 1,
      isGameOver: this.game.isGameOver(),
      result,
      resultReason,
      lastMove: lastMove ? {
        from: lastMove.from,
        to: lastMove.to,
        promotion: lastMove.promotion,
        san: lastMove.san,
      } : null,
      turn: this.game.turn(),
    };
  }

  // Get AI move based on playstyle
  getAIMove(playstyle: string): ChessMove | null {
    const moves = this.game.moves({ verbose: true });
    if (moves.length === 0) return null;

    const prefs = PLAYSTYLE_PREFERENCES[playstyle] || PLAYSTYLE_PREFERENCES.tactical;
    
    // Score each move
    const scoredMoves = moves.map(move => {
      let score = Math.random() * prefs.randomness; // Base randomness

      // Prefer captures
      if (move.captured) {
        const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        score += (pieceValues[move.captured] || 1) * prefs.preferCaptures;
      }

      // Prefer checks
      this.game.move(move);
      if (this.game.isCheck()) {
        score += 2 * prefs.preferChecks;
      }
      if (this.game.isCheckmate()) {
        score += 100; // Always take checkmate
      }
      this.game.undo();

      // Prefer center control
      if (CENTER_SQUARES.includes(move.to)) {
        score += prefs.preferCenterControl;
      }

      // Aggressive play - prefer advancing pawns and attacking
      if (prefs.aggressiveness > 0.5) {
        if (move.piece === 'p') {
          const rank = parseInt(move.to[1]);
          if (this.game.turn() === 'w' && rank >= 5) score += 0.3 * prefs.aggressiveness;
          if (this.game.turn() === 'b' && rank <= 4) score += 0.3 * prefs.aggressiveness;
        }
      }

      // Defensive play - prefer castling and keeping pieces protected
      if (prefs.aggressiveness < 0.4) {
        if (move.san === 'O-O' || move.san === 'O-O-O') {
          score += 1.5;
        }
      }

      return { move, score };
    });

    // Sort by score and pick the best (with some variance)
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Pick from top 3 moves with weighted probability
    const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
    const totalScore = topMoves.reduce((sum, m) => sum + m.score + 1, 0);
    let random = Math.random() * totalScore;
    
    for (const { move } of topMoves) {
      random -= (scoredMoves.find(m => m.move === move)?.score || 0) + 1;
      if (random <= 0) {
        return {
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          san: move.san,
        };
      }
    }

    // Fallback to best move
    const best = topMoves[0].move;
    return {
      from: best.from,
      to: best.to,
      promotion: best.promotion,
      san: best.san,
    };
  }

  makeMove(move: { from: string; to: string; promotion?: string } | string): ChessMove | null {
    try {
      const result = this.game.move(move);
      if (result) {
        return {
          from: result.from,
          to: result.to,
          promotion: result.promotion,
          san: result.san,
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  reset(): void {
    this.game.reset();
  }

  getFen(): string {
    return this.game.fen();
  }

  getPgn(): string {
    return this.game.pgn();
  }

  isGameOver(): boolean {
    return this.game.isGameOver();
  }
}

// Active games storage (in production, use Redis or database)
const activeGames: Map<string, ChessEngine> = new Map();

export function getOrCreateGame(matchId: string, fen?: string): ChessEngine {
  if (!activeGames.has(matchId)) {
    activeGames.set(matchId, new ChessEngine(fen));
  }
  return activeGames.get(matchId)!;
}

export function removeGame(matchId: string): void {
  activeGames.delete(matchId);
}
