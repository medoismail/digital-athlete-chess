/**
 * DIGITAL ATHLETE AI - CHESS AGENT
 * 
 * An autonomous AI Chess Agent acting as a "Digital Athlete"
 * that builds long-term competitive identity, reputation, and performance history
 * through consistent, explainable, and strategic play.
 */

// Types and Interfaces
export type PlayStyle = 'aggressive' | 'positional' | 'defensive' | 'tactical' | 'endgame-oriented';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

export type PositionEvaluation = 'winning' | 'advantage' | 'equal' | 'disadvantage' | 'losing';

export interface ChessMove {
  san: string;      // Standard Algebraic Notation (e.g., "e4", "Nf3")
  uci: string;      // UCI format (e.g., "e2e4", "g1f3")
  explanation?: MoveExplanation;
}

export interface MoveExplanation {
  reasons: string[];           // 1-3 key reasons
  threatConsidered: string;    // Main opponent threat considered
  styleAlignment: boolean;     // Whether move fits playstyle
}

export interface MatchResult {
  outcome: 'win' | 'loss' | 'draw';
  openingPlayed: string;
  criticalMoments: string[];
  mistakesMade: string[];
  styleAdherence: number;      // 0-100%
}

export interface AgentStats {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  longestWinStreak: number;
  reputationScore: number;     // 0-100
}

export interface AgentIdentity {
  id: string;
  name: string;
  playStyle: PlayStyle;
  preferredOpenings: {
    white: string[];
    black: string[];
  };
  strengths: string[];
  weaknesses: string[];
  createdAt: Date;
}

export interface Position {
  fen: string;
  turn: 'white' | 'black';
  phase: GamePhase;
  evaluation: PositionEvaluation;
  legalMoves: string[];
}

// Chess Agent Class
export class DigitalAthleteChessAgent {
  private identity: AgentIdentity;
  private stats: AgentStats;
  private matchHistory: MatchResult[] = [];
  private learningNotes: string[] = [];

  constructor(config: {
    id: string;
    name: string;
    playStyle?: PlayStyle;
  }) {
    this.identity = {
      id: config.id,
      name: config.name,
      playStyle: config.playStyle || 'positional',
      preferredOpenings: this.initializeOpenings(config.playStyle || 'positional'),
      strengths: this.initializeStrengths(config.playStyle || 'positional'),
      weaknesses: this.initializeWeaknesses(config.playStyle || 'positional'),
      createdAt: new Date(),
    };

    this.stats = {
      elo: 1500,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      currentStreak: 0,
      longestWinStreak: 0,
      reputationScore: 50,
    };
  }

  // Initialize openings based on playstyle
  private initializeOpenings(style: PlayStyle): { white: string[]; black: string[] } {
    const openingsByStyle: Record<PlayStyle, { white: string[]; black: string[] }> = {
      aggressive: {
        white: ['King\'s Gambit', 'Italian Game', 'Scotch Game', 'Danish Gambit'],
        black: ['Sicilian Dragon', 'King\'s Indian Defense', 'Grünfeld Defense'],
      },
      positional: {
        white: ['Queen\'s Gambit', 'English Opening', 'Reti Opening', 'Catalan'],
        black: ['Queen\'s Gambit Declined', 'Nimzo-Indian', 'Caro-Kann'],
      },
      defensive: {
        white: ['London System', 'Colle System', 'Torre Attack'],
        black: ['French Defense', 'Caro-Kann', 'Petroff Defense'],
      },
      tactical: {
        white: ['Italian Game', 'Ruy Lopez', 'Vienna Game'],
        black: ['Sicilian Najdorf', 'Two Knights Defense', 'Marshall Attack'],
      },
      'endgame-oriented': {
        white: ['Exchange Variation QGD', 'Berlin Defense (as White)', 'Symmetrical English'],
        black: ['Berlin Defense', 'Exchange French', 'Petrosian System'],
      },
    };
    return openingsByStyle[style];
  }

  // Initialize strengths based on playstyle
  private initializeStrengths(style: PlayStyle): string[] {
    const strengthsByStyle: Record<PlayStyle, string[]> = {
      aggressive: ['attacking play', 'piece activity', 'initiative', 'tactical combinations'],
      positional: ['pawn structure', 'piece placement', 'long-term planning', 'prophylaxis'],
      defensive: ['solid positions', 'counterattack timing', 'patience', 'fortress building'],
      tactical: ['calculation', 'pattern recognition', 'complications', 'sacrifices'],
      'endgame-oriented': ['technique', 'king activity', 'pawn endgames', 'conversion'],
    };
    return strengthsByStyle[style];
  }

  // Initialize weaknesses based on playstyle
  private initializeWeaknesses(style: PlayStyle): string[] {
    const weaknessesByStyle: Record<PlayStyle, string[]> = {
      aggressive: ['quiet positions', 'deep defense', 'over-extension'],
      positional: ['sharp tactics', 'time pressure complications'],
      defensive: ['dynamic positions', 'attacking when required'],
      tactical: ['quiet technical positions', 'long maneuvering games'],
      'endgame-oriented': ['sharp middlegame attacks', 'complex calculations'],
    };
    return weaknessesByStyle[style];
  }

  /**
   * DECISION-MAKING FRAMEWORK
   * Evaluates and selects the best move based on the framework
   */
  async selectMove(position: Position, candidateMoves: CandidateMove[]): Promise<ChessMove> {
    // A) Legality & Safety - Filter out unsafe moves
    const safeMoves = this.filterSafeMoves(candidateMoves);
    
    if (safeMoves.length === 0) {
      // All moves are risky - pick the least bad one
      return this.selectLeastBadMove(candidateMoves);
    }

    // B) Style Alignment - Score moves by style fit
    const styledMoves = safeMoves.map(move => ({
      ...move,
      styleScore: this.evaluateStyleAlignment(move),
    }));

    // C) Opponent Counterplay - Evaluate counterplay reduction
    const counterplayScored = styledMoves.map(move => ({
      ...move,
      counterplayScore: this.evaluateCounterplayReduction(move, position),
    }));

    // D) Position & Plan - Evaluate positional improvement
    const positionallyScored = counterplayScored.map(move => ({
      ...move,
      positionalScore: this.evaluatePositionalImprovement(move, position),
    }));

    // E) Risk vs Context - Apply risk assessment
    const finalScored = positionallyScored.map(move => ({
      ...move,
      finalScore: this.applyRiskContext(move, position),
    }));

    // Select the best move
    const bestMove = finalScored.reduce((best, current) => 
      current.finalScore > best.finalScore ? current : best
    );

    return this.formatMove(bestMove, position);
  }

  // Filter moves that don't blunder material
  private filterSafeMoves(moves: CandidateMove[]): CandidateMove[] {
    return moves.filter(move => 
      !move.blundersMatertial && 
      !move.allowsForcedTactics &&
      move.isLegal
    );
  }

  // Select the least bad move when all options are risky
  private selectLeastBadMove(moves: CandidateMove[]): ChessMove {
    const sorted = [...moves].sort((a, b) => b.evaluation - a.evaluation);
    const best = sorted[0];
    return {
      san: best.san,
      uci: best.uci,
      explanation: {
        reasons: ['Defensive necessity', 'Minimizing damage'],
        threatConsidered: best.threatConsidered || 'Multiple threats',
        styleAlignment: false,
      },
    };
  }

  // Evaluate how well a move fits the agent's playstyle
  private evaluateStyleAlignment(move: CandidateMove): number {
    let score = 50; // Base score

    const styleTraits: Record<PlayStyle, (m: CandidateMove) => number> = {
      aggressive: (m) => {
        if (m.isAttacking) score += 20;
        if (m.createsThreats) score += 15;
        if (m.sacrificesMaterial && m.hasCompensation) score += 10;
        if (m.isPassive) score -= 20;
        return score;
      },
      positional: (m) => {
        if (m.improvesPieceActivity) score += 20;
        if (m.improvesPawnStructure) score += 15;
        if (m.isProphylactic) score += 10;
        if (m.weakensPawnStructure) score -= 20;
        return score;
      },
      defensive: (m) => {
        if (m.improvesSafety) score += 20;
        if (m.consolidatesPosition) score += 15;
        if (m.reducesCounterplay) score += 10;
        if (m.overextends) score -= 25;
        return score;
      },
      tactical: (m) => {
        if (m.hasTacticalMotif) score += 20;
        if (m.createsComplications) score += 15;
        if (m.setsTrap) score += 10;
        if (m.isSimplifying && !m.isWinning) score -= 15;
        return score;
      },
      'endgame-oriented': (m) => {
        if (m.headsTowardEndgame) score += 20;
        if (m.simplifiesWhenAhead) score += 20;
        if (m.improvesKingActivity) score += 15;
        if (m.createsUnnecessaryComplications) score -= 20;
        return score;
      },
    };

    return styleTraits[this.identity.playStyle](move);
  }

  // Evaluate how much a move reduces opponent's counterplay
  private evaluateCounterplayReduction(move: CandidateMove, position: Position): number {
    let score = 50;

    if (move.reducesOpponentActivity) score += 15;
    if (move.restrictsOpponentPieces) score += 10;
    if (move.preventsOpponentPlan) score += 20;
    if (move.allowsOpponentInitiative) score -= 20;

    return score;
  }

  // Evaluate positional improvement
  private evaluatePositionalImprovement(move: CandidateMove, position: Position): number {
    let score = 50;

    // Piece activity
    if (move.improvesPieceActivity) score += 15;
    
    // King safety
    if (move.improvesSafety) score += 15;
    if (move.weakensKingSafety) score -= 20;

    // Pawn structure
    if (move.improvesPawnStructure) score += 10;
    if (move.weakensPawnStructure) score -= 10;

    // Clear plan
    if (move.advancesPlan) score += 15;

    return score;
  }

  // Apply risk assessment based on position context
  private applyRiskContext(
    move: CandidateMove & { styleScore: number; counterplayScore: number; positionalScore: number },
    position: Position
  ): number {
    const baseScore = (move.styleScore + move.counterplayScore + move.positionalScore) / 3;
    let riskMultiplier = 1;

    switch (position.evaluation) {
      case 'winning':
        // When winning: prefer simplification and control
        if (move.isSimplifying) riskMultiplier = 1.3;
        if (move.createsUnnecessaryComplications) riskMultiplier = 0.6;
        break;
      
      case 'advantage':
        // With advantage: prefer solid play
        if (move.consolidatesPosition) riskMultiplier = 1.2;
        if (move.isRisky) riskMultiplier = 0.7;
        break;
      
      case 'equal':
        // In equal positions: solid improvement with practical chances
        if (move.improvesPieceActivity) riskMultiplier = 1.1;
        if (move.fitsStyle) riskMultiplier *= 1.1;
        break;
      
      case 'disadvantage':
      case 'losing':
        // When worse: find best practical defense or counterplay
        if (move.createsPracticalProblems) riskMultiplier = 1.3;
        if (move.isPassive) riskMultiplier = 0.8;
        // But NOT random chaos
        if (move.isReckless) riskMultiplier = 0.5;
        break;
    }

    return baseScore * riskMultiplier;
  }

  // Format the final move output
  private formatMove(
    move: CandidateMove & { finalScore: number },
    position: Position
  ): ChessMove {
    const reasons: string[] = [];
    
    if (move.advancesPlan) reasons.push(move.planDescription || 'Advances strategic plan');
    if (move.improvesPieceActivity) reasons.push('Improves piece activity');
    if (move.improvesSafety) reasons.push('Improves king safety');
    if (move.reducesCounterplay) reasons.push('Reduces opponent counterplay');
    if (move.isSimplifying && position.evaluation === 'winning') reasons.push('Simplifies winning position');
    if (move.createsThreats) reasons.push('Creates concrete threats');

    // Limit to 3 reasons
    const topReasons = reasons.slice(0, 3);
    if (topReasons.length === 0) {
      topReasons.push('Best available option');
    }

    return {
      san: move.san,
      uci: move.uci,
      explanation: {
        reasons: topReasons,
        threatConsidered: move.threatConsidered || 'No immediate threats',
        styleAlignment: move.fitsStyle || false,
      },
    };
  }

  /**
   * POST-MATCH ANALYSIS
   * Reviews game and updates learning
   */
  async analyzeMatch(result: MatchResult): Promise<void> {
    this.matchHistory.push(result);
    this.updateStats(result);

    // Internal review
    const learnings: string[] = [];

    // What worked well
    if (result.outcome === 'win') {
      learnings.push(`Opening ${result.openingPlayed} worked well`);
    }

    // What failed
    if (result.mistakesMade.length > 0) {
      result.mistakesMade.forEach(mistake => {
        learnings.push(`Avoid: ${mistake}`);
      });
    }

    // Style adherence
    if (result.styleAdherence < 70) {
      learnings.push('Need to stay more consistent with playstyle');
    }

    // Store learnings for gradual improvement
    this.learningNotes.push(...learnings);

    // Update reputation based on performance
    this.updateReputation(result);
  }

  // Update statistics after a match
  private updateStats(result: MatchResult): void {
    this.stats.gamesPlayed++;

    switch (result.outcome) {
      case 'win':
        this.stats.wins++;
        this.stats.currentStreak = Math.max(0, this.stats.currentStreak) + 1;
        this.stats.longestWinStreak = Math.max(this.stats.longestWinStreak, this.stats.currentStreak);
        this.stats.elo += this.calculateEloChange(result.outcome);
        break;
      case 'loss':
        this.stats.losses++;
        this.stats.currentStreak = Math.min(0, this.stats.currentStreak) - 1;
        this.stats.elo += this.calculateEloChange(result.outcome);
        break;
      case 'draw':
        this.stats.draws++;
        this.stats.currentStreak = 0;
        break;
    }

    this.stats.winRate = (this.stats.wins / this.stats.gamesPlayed) * 100;
  }

  // Calculate Elo change (simplified)
  private calculateEloChange(outcome: 'win' | 'loss' | 'draw'): number {
    const K = 32; // K-factor for rating changes
    switch (outcome) {
      case 'win': return Math.round(K * 0.5);
      case 'loss': return Math.round(K * -0.5);
      case 'draw': return 0;
    }
  }

  // Update reputation score
  private updateReputation(result: MatchResult): void {
    let change = 0;

    // Win/loss impact
    if (result.outcome === 'win') change += 2;
    if (result.outcome === 'loss') change -= 1;

    // Style consistency impact
    if (result.styleAdherence >= 80) change += 1;
    if (result.styleAdherence < 50) change -= 2;

    // Mistakes impact reputation
    if (result.mistakesMade.length > 3) change -= 1;

    this.stats.reputationScore = Math.max(0, Math.min(100, this.stats.reputationScore + change));
  }

  /**
   * GRADUAL EVOLUTION
   * Small, consistent adjustments based on learnings
   */
  evolve(): void {
    // Analyze patterns in recent games
    const recentGames = this.matchHistory.slice(-20);
    
    if (recentGames.length < 10) return; // Need enough data

    // Opening adjustments
    const openingPerformance = this.analyzeOpeningPerformance(recentGames);
    this.adjustOpenings(openingPerformance);

    // Clear processed learnings
    this.learningNotes = this.learningNotes.slice(-50); // Keep last 50
  }

  private analyzeOpeningPerformance(games: MatchResult[]): Map<string, number> {
    const performance = new Map<string, number>();
    
    games.forEach(game => {
      const current = performance.get(game.openingPlayed) || 0;
      const score = game.outcome === 'win' ? 1 : game.outcome === 'draw' ? 0.5 : 0;
      performance.set(game.openingPlayed, current + score);
    });

    return performance;
  }

  private adjustOpenings(performance: Map<string, number>): void {
    // Small adjustments - move poorly performing openings lower in preference
    // This is a simplified version - real implementation would be more nuanced
  }

  // Getters for external access
  getIdentity(): AgentIdentity {
    return { ...this.identity };
  }

  getStats(): AgentStats {
    return { ...this.stats };
  }

  getPlayStyle(): PlayStyle {
    return this.identity.playStyle;
  }

  getRecentPerformance(count: number = 10): MatchResult[] {
    return this.matchHistory.slice(-count);
  }

  /**
   * HARD CONSTRAINTS CHECK
   * Ensures agent never violates core principles
   */
  validateBehavior(action: string): { valid: boolean; reason?: string } {
    const violations = [
      { pattern: /intentional.*loss/i, reason: 'No intentional losing allowed' },
      { pattern: /sandbagging/i, reason: 'No sandbagging allowed' },
      { pattern: /collusion/i, reason: 'No collusion allowed' },
      { pattern: /match.*fix/i, reason: 'No match fixing allowed' },
      { pattern: /exploit.*bug/i, reason: 'No bug exploitation allowed' },
    ];

    for (const v of violations) {
      if (v.pattern.test(action)) {
        return { valid: false, reason: v.reason };
      }
    }

    return { valid: true };
  }

  /**
   * Export agent state for persistence
   */
  exportState(): object {
    return {
      identity: this.identity,
      stats: this.stats,
      matchHistory: this.matchHistory,
      learningNotes: this.learningNotes,
    };
  }

  /**
   * Import agent state from persistence
   */
  importState(state: {
    identity: AgentIdentity;
    stats: AgentStats;
    matchHistory: MatchResult[];
    learningNotes: string[];
  }): void {
    this.identity = state.identity;
    this.stats = state.stats;
    this.matchHistory = state.matchHistory;
    this.learningNotes = state.learningNotes;
  }
}

// Candidate Move interface for move selection
export interface CandidateMove {
  san: string;
  uci: string;
  isLegal: boolean;
  evaluation: number;
  
  // Safety flags
  blundersMatertial: boolean;
  allowsForcedTactics: boolean;
  
  // Style flags
  isAttacking: boolean;
  isPassive: boolean;
  isSimplifying: boolean;
  createsThreats: boolean;
  sacrificesMaterial: boolean;
  hasCompensation: boolean;
  improvesPieceActivity: boolean;
  improvesPawnStructure: boolean;
  weakensPawnStructure: boolean;
  isProphylactic: boolean;
  improvesSafety: boolean;
  weakensKingSafety: boolean;
  consolidatesPosition: boolean;
  reducesCounterplay: boolean;
  overextends: boolean;
  hasTacticalMotif: boolean;
  createsComplications: boolean;
  setsTrap: boolean;
  isWinning: boolean;
  headsTowardEndgame: boolean;
  simplifiesWhenAhead: boolean;
  improvesKingActivity: boolean;
  createsUnnecessaryComplications: boolean;
  
  // Counterplay flags
  reducesOpponentActivity: boolean;
  restrictsOpponentPieces: boolean;
  preventsOpponentPlan: boolean;
  allowsOpponentInitiative: boolean;
  
  // Plan flags
  advancesPlan: boolean;
  planDescription?: string;
  
  // Risk flags
  isRisky: boolean;
  isReckless: boolean;
  createsPracticalProblems: boolean;
  fitsStyle: boolean;
  
  // Threat considered
  threatConsidered?: string;
}

// Factory function to create a new agent
export function createChessAgent(config: {
  id: string;
  name: string;
  playStyle?: PlayStyle;
}): DigitalAthleteChessAgent {
  return new DigitalAthleteChessAgent(config);
}

// Export default instance creator
export default DigitalAthleteChessAgent;
