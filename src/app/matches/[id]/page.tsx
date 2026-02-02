'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import Chessboard to avoid SSR issues
const Chessboard = dynamic(
  () => import('react-chessboard').then(mod => mod.Chessboard),
  { ssr: false, loading: () => <Skeleton className="w-[400px] h-[400px] mx-auto rounded-lg" /> }
);

interface AgentDetails {
  id: string;
  name: string;
  elo: number;
  playStyle: string;
  avatar: string | null;
  record: string;
  reputation: number;
  strengths: string[];
  weaknesses: string[];
}

interface ThinkingData {
  phase: string;
  considerations: string[];
  confidence: number;
  thinkingTimeMs: number;
}

interface MoveRecord {
  move: string;
  by: 'white' | 'black';
  agent: string;
  fen: string;
  thinking?: ThinkingData;
  timestamp: string;
}

interface MatchDetails {
  id: string;
  status: 'betting' | 'live' | 'completed';
  white: AgentDetails;
  black: AgentDetails;
  pool: {
    total: number;
    white: number;
    black: number;
    whiteOdds: string;
    blackOdds: string;
    bettorCount: number;
  };
  timing: {
    bettingEndsAt: string;
    startedAt: string | null;
    completedAt: string | null;
    timeUntilStart: number | null;
  };
  game?: {
    currentFen: string;
    moveCount: number;
    pgn: string | null;
    moveHistory: MoveRecord[];
  };
  result?: {
    winner: string;
    reason: string;
    winnerAgentId: string;
  };
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Starting soon...';
  
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function MatchContent({ initialCode }: { initialCode: string | null }) {
  const params = useParams();
  const matchId = params.id as string;
  
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canViewGame, setCanViewGame] = useState(false);
  const [lastMove, setLastMove] = useState<MoveRecord | null>(null);
  
  // Spectator code
  const [spectatorCode, setSpectatorCode] = useState(initialCode || '');
  const [codeError, setCodeError] = useState<string | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const savedAddress = typeof window !== 'undefined' ? localStorage.getItem('bettorAddress') : null;
      let queryParams = '';
      
      if (savedAddress) queryParams += `bettor=${savedAddress}`;
      if (spectatorCode) queryParams += `${queryParams ? '&' : ''}code=${spectatorCode}`;
      
      const response = await fetch(`/api/matches/${matchId}${queryParams ? '?' + queryParams : ''}`);
      const data = await response.json();
      
      if (data.success) {
        setMatch(data.match);
        setCanViewGame(data.access?.canViewLive || false);
        if (data.match.timing.timeUntilStart) {
          setTimeRemaining(data.match.timing.timeUntilStart);
        }
        
        // Get last move for display
        if (data.match.game?.moveHistory?.length > 0) {
          setLastMove(data.match.game.moveHistory[data.match.game.moveHistory.length - 1]);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [matchId, spectatorCode]);

  useEffect(() => {
    fetchMatch();
    
    // Auto-refresh: faster during live games
    const interval = setInterval(fetchMatch, match?.status === 'live' ? 2000 : 10000);
    return () => clearInterval(interval);
  }, [fetchMatch, match?.status]);

  useEffect(() => {
    if (match?.status !== 'betting' || !match.timing.timeUntilStart) return;

    const interval = setInterval(() => {
      const remaining = new Date(match.timing.bettingEndsAt).getTime() - Date.now();
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [match?.status, match?.timing?.bettingEndsAt, match?.timing?.timeUntilStart]);

  const verifySpectatorCode = () => {
    if (!spectatorCode.trim()) {
      setCodeError('Please enter a code');
      return;
    }
    setCodeError(null);
    fetchMatch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-10 pb-10">
            <div className="text-5xl mb-4">❌</div>
            <CardTitle className="mb-2">Match Not Found</CardTitle>
            <p className="text-muted-foreground mb-6">{error || 'This match does not exist.'}</p>
            <Button asChild>
              <Link href="/matches">Back to Matches</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine whose turn it is
  const isWhiteTurn = match.game?.currentFen?.split(' ')[1] === 'w';

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">DA</span>
            </div>
            <span className="text-xl font-bold">Digital Athlete</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/matches">← All Matches</Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Status Banner */}
        <Card className={`mb-6 ${
          match.status === 'betting' ? 'bg-yellow-500/10 border-yellow-500/30' :
          match.status === 'live' ? 'bg-green-500/10 border-green-500/30' :
          'bg-muted/30 border-border/50'
        }`}>
          <CardContent className="py-4 text-center">
            {match.status === 'betting' && (
              <>
                <div className="text-2xl font-bold text-yellow-400">Betting Open</div>
                <div className="text-yellow-300">Match starts in {formatTimeRemaining(timeRemaining)}</div>
              </>
            )}
            {match.status === 'live' && (
              <div className="flex items-center justify-center gap-4">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse text-lg px-4 py-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block" />
                  LIVE
                </Badge>
                <span className="text-green-300">Move {match.game?.moveCount || 0}</span>
              </div>
            )}
            {match.status === 'completed' && match.result && (
              <>
                <div className="text-2xl font-bold">
                  {match.result.winner === 'white_win' ? match.white.name :
                   match.result.winner === 'black_win' ? match.black.name : 'Draw'}
                  {match.result.winner !== 'draw' && ' Wins!'}
                </div>
                <div className="text-muted-foreground capitalize">{match.result.reason?.replace('_', ' ')}</div>
              </>
            )}
          </CardContent>
        </Card>

        {canViewGame && match.game ? (
          <div className="space-y-6">
            {/* Top Row - Both Agents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* White Agent */}
              <Card className={`bg-card/50 border-border/50 transition-all ${
                match.status === 'live' && isWhiteTurn ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' : ''
              } ${match.result?.winner === 'white_win' ? 'ring-2 ring-yellow-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-white/20">
                      <AvatarImage src={match.white.avatar || undefined} />
                      <AvatarFallback className="bg-white/10 text-2xl">♔</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center gap-2">
                        {match.white.name}
                        {match.result?.winner === 'white_win' && <span className="text-yellow-400">👑</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {match.white.elo} Elo • <Badge variant="outline" className="text-xs capitalize">{match.white.playStyle}</Badge>
                      </div>
                    </div>
                    {match.status === 'live' && isWhiteTurn && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Thinking
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Black Agent */}
              <Card className={`bg-card/50 border-border/50 transition-all ${
                match.status === 'live' && !isWhiteTurn ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' : ''
              } ${match.result?.winner === 'black_win' ? 'ring-2 ring-yellow-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-zinc-700">
                      <AvatarImage src={match.black.avatar || undefined} />
                      <AvatarFallback className="bg-zinc-900 text-2xl">♚</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center gap-2">
                        {match.black.name}
                        {match.result?.winner === 'black_win' && <span className="text-yellow-400">👑</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {match.black.elo} Elo • <Badge variant="outline" className="text-xs capitalize">{match.black.playStyle}</Badge>
                      </div>
                    </div>
                    {match.status === 'live' && !isWhiteTurn && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Thinking
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chess Board - Centered */}
            <div className="flex justify-center">
              <Card className="bg-card/50 border-border/50 p-4 inline-block">
                <Chessboard 
                  position={match.game.currentFen}
                  boardWidth={Math.min(400, typeof window !== 'undefined' ? window.innerWidth - 64 : 400)}
                  arePiecesDraggable={false}
                  customBoardStyle={{
                    borderRadius: '8px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                  }}
                  customDarkSquareStyle={{ backgroundColor: 'hsl(var(--primary) / 0.3)' }}
                  customLightSquareStyle={{ backgroundColor: 'hsl(var(--secondary))' }}
                />
              </Card>
            </div>

            {/* Bottom Row - Move History & Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Move History */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Move History</CardTitle>
                </CardHeader>
                <CardContent>
                  {match.game.moveHistory && match.game.moveHistory.length > 0 ? (
                    <div className="bg-muted/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-1 text-sm font-mono">
                        {match.game.moveHistory.map((move, i) => (
                          <span key={i} className={`px-2 py-1 rounded ${
                            move.by === 'white' ? 'bg-white/10' : 'bg-muted'
                          } ${i === match.game!.moveHistory.length - 1 ? 'ring-1 ring-green-500' : ''}`}>
                            {i % 2 === 0 && <span className="text-muted-foreground mr-1">{Math.floor(i/2) + 1}.</span>}
                            {move.move}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No moves yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Last Move & Thinking */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Last Move</CardTitle>
                </CardHeader>
                <CardContent>
                  {lastMove ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-2xl">{lastMove.move}</span>
                          <span className="text-muted-foreground ml-2">by {lastMove.agent}</span>
                        </div>
                        {lastMove.thinking && (
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">{lastMove.thinking.phase}</Badge>
                            <div className="text-sm text-green-400 mt-1">{(lastMove.thinking.confidence * 100).toFixed(0)}% confident</div>
                          </div>
                        )}
                      </div>
                      {lastMove.thinking?.considerations && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {lastMove.thinking.considerations.slice(0, 3).map((c, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Waiting for first move...</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pool Info (if betting) */}
            {match.pool.total > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">White Pool</div>
                      <div className="text-lg font-bold">${match.pool.white.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase">Total Pool</div>
                      <div className="text-2xl font-bold text-green-400">${match.pool.total.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{match.pool.bettorCount} bettors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Black Pool</div>
                      <div className="text-lg font-bold">${match.pool.black.toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Locked View */
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <CardTitle className="mb-2">Match Access Locked</CardTitle>
              <p className="text-muted-foreground mb-6">
                Place a bet or enter spectator code to watch
              </p>

              {/* Spectator Code Input */}
              <div className="max-w-sm mx-auto">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={spectatorCode}
                    onChange={(e) => setSpectatorCode(e.target.value.toUpperCase())}
                    placeholder="Spectator code"
                    className="uppercase tracking-widest text-center font-mono"
                    maxLength={6}
                  />
                  <Button onClick={verifySpectatorCode}>
                    Enter
                  </Button>
                </div>
                {codeError && (
                  <p className="mt-2 text-destructive text-sm">{codeError}</p>
                )}
              </div>

              {/* Players Preview */}
              <div className="mt-8 flex items-center justify-center gap-6">
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-2 border-2 border-white/20">
                    <AvatarFallback className="bg-white/10 text-3xl">♔</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{match.white.name}</div>
                  <div className="text-sm text-muted-foreground">{match.white.elo}</div>
                </div>
                <div className="text-2xl text-muted-foreground font-bold">VS</div>
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-2 border-2 border-zinc-700">
                    <AvatarFallback className="bg-zinc-900 text-3xl">♚</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{match.black.name}</div>
                  <div className="text-sm text-muted-foreground">{match.black.elo}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Wrapper component to handle searchParams with Suspense
function MatchPageWrapper() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  return <MatchContent initialCode={code} />;
}

export default function MatchDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading match...</p>
        </div>
      </div>
    }>
      <MatchPageWrapper />
    </Suspense>
  );
}
