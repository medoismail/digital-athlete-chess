'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import Chessboard to avoid SSR issues
const Chessboard = dynamic(
  () => import('react-chessboard').then(mod => mod.Chessboard),
  { ssr: false, loading: () => <div className="w-[450px] h-[450px] bg-gray-700/50 rounded-lg animate-pulse" /> }
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

interface MoveRecord {
  move: string;
  by: 'white' | 'black';
  agent: string;
  fen: string;
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
  yourBet?: {
    side: string;
    amount: number;
  };
  recentBets?: {
    side: string;
    amount: number;
    time: string;
  }[];
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
  
  // Spectator code
  const [spectatorCode, setSpectatorCode] = useState(initialCode || '');
  const [codeError, setCodeError] = useState<string | null>(null);
  
  // Auto-play state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playingMove, setPlayingMove] = useState(false);

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
    
    // Refresh more frequently during live games
    const interval = setInterval(fetchMatch, match?.status === 'live' ? 3000 : 10000);
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

  const playNextMove = async () => {
    if (!match || match.status !== 'live' || playingMove) return;
    
    setPlayingMove(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'play_move' }),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchMatch();
      }
    } catch (err) {
      console.error('Failed to play move:', err);
    } finally {
      setPlayingMove(false);
    }
  };

  const startAutoPlay = async () => {
    if (!match || match.status === 'completed') return;
    
    setIsAutoPlaying(true);
    
    // Start the game if not live
    if (match.status !== 'live') {
      await fetch(`/api/matches/${matchId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_game' }),
      });
      await fetchMatch();
    }
  };

  // Auto-play loop
  useEffect(() => {
    if (!isAutoPlaying || !match || match.status !== 'live') return;
    
    const playMove = async () => {
      await playNextMove();
    };
    
    const timeout = setTimeout(playMove, 1500); // 1.5 second delay between moves
    
    return () => clearTimeout(timeout);
  }, [isAutoPlaying, match?.status, match?.game?.moveCount]);

  // Stop auto-play when game ends
  useEffect(() => {
    if (match?.status === 'completed') {
      setIsAutoPlaying(false);
    }
  }, [match?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h3 className="text-xl font-semibold mb-2">Match Not Found</h3>
          <p className="text-gray-400 mb-6">{error || 'This match does not exist.'}</p>
          <Link href="/matches" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all">
            Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Digital Athlete
          </Link>
          <Link href="/matches" className="text-gray-400 hover:text-white transition-all">
            ← All Matches
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 mb-6 text-center ${
          match.status === 'betting' ? 'bg-yellow-500/20 border border-yellow-500/30' :
          match.status === 'live' ? 'bg-green-500/20 border border-green-500/30' :
          'bg-gray-500/20 border border-gray-500/30'
        }`}>
          {match.status === 'betting' && (
            <>
              <div className="text-2xl font-bold text-yellow-400">Betting Open</div>
              <div className="text-yellow-300">Match starts in {formatTimeRemaining(timeRemaining)}</div>
            </>
          )}
          {match.status === 'live' && (
            <>
              <div className="text-2xl font-bold text-green-400 flex items-center justify-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                LIVE
              </div>
              <div className="text-green-300">Move {match.game?.moveCount || 0}</div>
            </>
          )}
          {match.status === 'completed' && match.result && (
            <>
              <div className="text-2xl font-bold text-white">
                {match.result.winner === 'white_win' ? match.white.name :
                 match.result.winner === 'black_win' ? match.black.name : 'Draw'}
                {match.result.winner !== 'draw' && ' Wins!'}
              </div>
              <div className="text-gray-300 capitalize">{match.result.reason?.replace('_', ' ')}</div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Players */}
          <div className="space-y-6">
            {/* White Player */}
            <div className={`bg-gray-800/50 rounded-xl p-4 ${
              match.result?.winner === 'white_win' ? 'ring-2 ring-green-500' : ''
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                  {match.white.avatar ? (
                    <img src={match.white.avatar} alt={match.white.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">♔</span>
                  )}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {match.white.name}
                    {match.result?.winner === 'white_win' && <span className="text-green-400 text-sm">Winner</span>}
                  </div>
                  <div className="text-sm text-gray-400">{match.white.elo} Elo • {match.white.playStyle}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{match.white.record}</div>
              {match.status !== 'completed' && (
                <div className="mt-2 text-lg font-bold text-center">{match.pool.whiteOdds}x odds</div>
              )}
            </div>

            {/* Black Player */}
            <div className={`bg-gray-800/50 rounded-xl p-4 ${
              match.result?.winner === 'black_win' ? 'ring-2 ring-green-500' : ''
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center overflow-hidden">
                  {match.black.avatar ? (
                    <img src={match.black.avatar} alt={match.black.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">♚</span>
                  )}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {match.black.name}
                    {match.result?.winner === 'black_win' && <span className="text-green-400 text-sm">Winner</span>}
                  </div>
                  <div className="text-sm text-gray-400">{match.black.elo} Elo • {match.black.playStyle}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{match.black.record}</div>
              {match.status !== 'completed' && (
                <div className="mt-2 text-lg font-bold text-center">{match.pool.blackOdds}x odds</div>
              )}
            </div>

            {/* Pool Info */}
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase">Total Pool</div>
                <div className="text-2xl font-bold text-green-400">${match.pool.total.toFixed(2)}</div>
                <div className="text-xs text-gray-500">{match.pool.bettorCount} bettors</div>
              </div>
            </div>
          </div>

          {/* Center Column - Chess Board */}
          <div className="lg:col-span-2">
            {canViewGame && match.game ? (
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="max-w-lg mx-auto mb-4">
                  <Chessboard 
                    position={match.game.currentFen}
                    boardWidth={450}
                    arePiecesDraggable={false}
                    customBoardStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                    }}
                  />
                </div>

                {/* Game Controls */}
                {match.status === 'live' && (
                  <div className="flex gap-3 justify-center mb-4">
                    <button
                      onClick={playNextMove}
                      disabled={playingMove || isAutoPlaying}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg transition-all"
                    >
                      {playingMove ? 'Playing...' : 'Next Move'}
                    </button>
                    <button
                      onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        isAutoPlaying 
                          ? 'bg-red-600 hover:bg-red-500' 
                          : 'bg-green-600 hover:bg-green-500'
                      }`}
                    >
                      {isAutoPlaying ? 'Stop Auto-Play' : 'Auto-Play'}
                    </button>
                  </div>
                )}

                {match.status === 'betting' && (
                  <div className="flex justify-center">
                    <button
                      onClick={startAutoPlay}
                      className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-all"
                    >
                      Start Game Now (Skip Betting)
                    </button>
                  </div>
                )}

                {/* Move History */}
                {match.game.moveHistory && match.game.moveHistory.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Move History</h4>
                    <div className="bg-gray-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-1 text-sm font-mono">
                        {match.game.moveHistory.map((move, i) => (
                          <span key={i} className={`px-2 py-1 rounded ${
                            move.by === 'white' ? 'bg-white/10' : 'bg-gray-700'
                          }`}>
                            {i % 2 === 0 && <span className="text-gray-500 mr-1">{Math.floor(i/2) + 1}.</span>}
                            {move.move}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PGN */}
                {match.game.pgn && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">PGN</h4>
                    <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-sm max-h-32 overflow-y-auto">
                      {match.game.pgn}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2">Live View Locked</h3>
                <p className="text-gray-400 mb-6">
                  Place a bet or enter spectator code to watch live
                </p>

                {/* Spectator Code Input */}
                <div className="max-w-sm mx-auto">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={spectatorCode}
                      onChange={(e) => setSpectatorCode(e.target.value.toUpperCase())}
                      placeholder="Enter spectator code"
                      className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest text-center"
                      maxLength={6}
                    />
                    <button
                      onClick={verifySpectatorCode}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
                    >
                      Enter
                    </button>
                  </div>
                  {codeError && (
                    <p className="mt-2 text-red-400 text-sm">{codeError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading match...</p>
        </div>
      </div>
    }>
      <MatchPageWrapper />
    </Suspense>
  );
}
