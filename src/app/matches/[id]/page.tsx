'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import Chessboard to avoid SSR issues
const Chessboard = dynamic(
  () => import('react-chessboard').then(mod => mod.Chessboard),
  { ssr: false, loading: () => <div className="w-[400px] h-[400px] bg-gray-700/50 rounded-lg animate-pulse mx-auto" /> }
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

  // Determine whose turn it is
  const isWhiteTurn = match.game?.currentFen?.split(' ')[1] === 'w';
  const thinkingAgent = isWhiteTurn ? match.white : match.black;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Digital Athlete Arena
          </Link>
          <Link href="/matches" className="text-gray-400 hover:text-white transition-all">
            ← All Matches
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
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
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-2xl font-bold text-green-400">LIVE</span>
              </div>
              <div className="text-green-300">Move {match.game?.moveCount || 0}</div>
            </div>
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

        {canViewGame && match.game ? (
          <div className="space-y-6">
            {/* Top Row - Both Agents */}
            <div className="grid grid-cols-2 gap-4">
              {/* White Agent */}
              <div className={`bg-gray-800/50 rounded-xl p-4 transition-all ${
                match.status === 'live' && isWhiteTurn ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' : ''
              } ${match.result?.winner === 'white_win' ? 'ring-2 ring-yellow-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {match.white.avatar ? (
                      <img src={match.white.avatar} alt={match.white.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">♔</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold flex items-center gap-2 truncate">
                      {match.white.name}
                      {match.result?.winner === 'white_win' && <span className="text-yellow-400">👑</span>}
                    </div>
                    <div className="text-sm text-gray-400">{match.white.elo} Elo • <span className="capitalize">{match.white.playStyle}</span></div>
                  </div>
                  {match.status === 'live' && isWhiteTurn && (
                    <div className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Thinking
                    </div>
                  )}
                </div>
              </div>

              {/* Black Agent */}
              <div className={`bg-gray-800/50 rounded-xl p-4 transition-all ${
                match.status === 'live' && !isWhiteTurn ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' : ''
              } ${match.result?.winner === 'black_win' ? 'ring-2 ring-yellow-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {match.black.avatar ? (
                      <img src={match.black.avatar} alt={match.black.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">♚</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold flex items-center gap-2 truncate">
                      {match.black.name}
                      {match.result?.winner === 'black_win' && <span className="text-yellow-400">👑</span>}
                    </div>
                    <div className="text-sm text-gray-400">{match.black.elo} Elo • <span className="capitalize">{match.black.playStyle}</span></div>
                  </div>
                  {match.status === 'live' && !isWhiteTurn && (
                    <div className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Thinking
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chess Board - Centered */}
            <div className="flex justify-center">
              <div className="bg-gray-800/50 rounded-xl p-4 inline-block">
                <Chessboard 
                  position={match.game.currentFen}
                  boardWidth={Math.min(400, typeof window !== 'undefined' ? window.innerWidth - 64 : 400)}
                  arePiecesDraggable={false}
                  customBoardStyle={{
                    borderRadius: '8px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                  }}
                />
              </div>
            </div>

            {/* Bottom Row - Move History & Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Move History */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Move History</h4>
                {match.game.moveHistory && match.game.moveHistory.length > 0 ? (
                  <div className="bg-gray-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-1 text-sm font-mono">
                      {match.game.moveHistory.map((move, i) => (
                        <span key={i} className={`px-2 py-1 rounded ${
                          move.by === 'white' ? 'bg-white/10' : 'bg-gray-700'
                        } ${i === match.game!.moveHistory.length - 1 ? 'ring-1 ring-green-500' : ''}`}>
                          {i % 2 === 0 && <span className="text-gray-500 mr-1">{Math.floor(i/2) + 1}.</span>}
                          {move.move}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No moves yet</div>
                )}
              </div>

              {/* Last Move & Thinking */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Last Move</h4>
                {lastMove ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-2xl">{lastMove.move}</span>
                        <span className="text-gray-400 ml-2">by {lastMove.agent}</span>
                      </div>
                      {lastMove.thinking && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{lastMove.thinking.phase}</div>
                          <div className="text-sm text-green-400">{(lastMove.thinking.confidence * 100).toFixed(0)}% confident</div>
                        </div>
                      )}
                    </div>
                    {lastMove.thinking?.considerations && (
                      <div className="text-xs text-gray-400 space-y-1">
                        {lastMove.thinking.considerations.slice(0, 3).map((c, i) => (
                          <div key={i}>• {c}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Waiting for first move...</div>
                )}
              </div>
            </div>

            {/* Pool Info (if betting) */}
            {match.pool.total > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">White Pool</div>
                    <div className="text-lg font-bold">${match.pool.white.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">Total Pool</div>
                    <div className="text-2xl font-bold text-green-400">${match.pool.total.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{match.pool.bettorCount} bettors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Black Pool</div>
                    <div className="text-lg font-bold">${match.pool.black.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Locked View */
          <div className="max-w-lg mx-auto">
            <div className="bg-gray-800/50 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Match Access Locked</h3>
              <p className="text-gray-400 mb-6">
                Place a bet or enter spectator code to watch
              </p>

              {/* Spectator Code Input */}
              <div className="max-w-sm mx-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spectatorCode}
                    onChange={(e) => setSpectatorCode(e.target.value.toUpperCase())}
                    placeholder="Spectator code"
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

              {/* Players Preview */}
              <div className="mt-8 flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-xl bg-white/10 flex items-center justify-center mb-2">
                    <span className="text-3xl">♔</span>
                  </div>
                  <div className="font-medium">{match.white.name}</div>
                  <div className="text-sm text-gray-400">{match.white.elo}</div>
                </div>
                <div className="text-2xl text-gray-600">VS</div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-xl bg-gray-900 flex items-center justify-center mb-2">
                    <span className="text-3xl">♚</span>
                  </div>
                  <div className="font-medium">{match.black.name}</div>
                  <div className="text-sm text-gray-400">{match.black.elo}</div>
                </div>
              </div>
            </div>
          </div>
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
