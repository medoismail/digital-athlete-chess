'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;
  
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isBettor, setIsBettor] = useState(false);
  
  // Betting form
  const [betSide, setBetSide] = useState<'white' | 'black' | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [bettorAddress, setBettorAddress] = useState('');
  const [placingBet, setPlacingBet] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatch();
    
    // Refresh every 10 seconds during live, 30 seconds otherwise
    const interval = setInterval(fetchMatch, match?.status === 'live' ? 10000 : 30000);
    return () => clearInterval(interval);
  }, [matchId, match?.status]);

  useEffect(() => {
    if (match?.status !== 'betting' || !match.timing.timeUntilStart) return;

    const interval = setInterval(() => {
      const remaining = new Date(match.timing.bettingEndsAt).getTime() - Date.now();
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [match?.status, match?.timing.bettingEndsAt]);

  const fetchMatch = async () => {
    try {
      // Check localStorage for bettor address
      const savedAddress = localStorage.getItem('bettorAddress');
      const params = savedAddress ? `?bettor=${savedAddress}` : '';
      
      const response = await fetch(`/api/matches/${matchId}${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMatch(data.match);
        setIsBettor(data.access?.isBettor || false);
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
  };

  const placeBet = async () => {
    if (!betSide || !betAmount || !bettorAddress) {
      setBetError('Please fill in all fields');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setBetError('Invalid bet amount');
      return;
    }

    setPlacingBet(true);
    setBetError(null);

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bet',
          bettorAddress,
          side: betSide,
          amount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save address for future visits
        localStorage.setItem('bettorAddress', bettorAddress);
        setIsBettor(true);
        fetchMatch();
        setBetAmount('');
        setBetSide(null);
      } else {
        setBetError(data.error);
      }
    } catch (err) {
      setBetError('Failed to place bet');
    } finally {
      setPlacingBet(false);
    }
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

  const canViewGame = isBettor || match.status === 'completed';

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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
              <div className="text-gray-300 capitalize">{match.result.reason}</div>
            </>
          )}
        </div>

        {/* Players Card */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 p-6 mb-6">
          <div className="flex items-stretch justify-between gap-6">
            {/* White Player */}
            <div className={`flex-1 text-center p-4 rounded-xl ${
              match.result?.winner === 'white_win' ? 'bg-green-500/10 ring-2 ring-green-500/50' : ''
            }`}>
              <div className="w-20 h-20 mx-auto rounded-xl bg-white/10 flex items-center justify-center mb-3 overflow-hidden">
                {match.white.avatar ? (
                  <img src={match.white.avatar} alt={match.white.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">♔</span>
                )}
              </div>
              <div className="text-xl font-bold">{match.white.name}</div>
              <div className="text-gray-400">{match.white.elo} Elo</div>
              <div className="text-sm text-gray-500 capitalize">{match.white.playStyle}</div>
              <div className="text-xs text-gray-500 mt-1">{match.white.record}</div>
              
              {match.status !== 'completed' && (
                <div className="mt-4">
                  <div className="text-3xl font-bold">{match.pool.whiteOdds}x</div>
                  <div className="text-sm text-gray-400">${match.pool.white.toFixed(2)} pool</div>
                </div>
              )}
              
              {match.result?.winner === 'white_win' && (
                <div className="mt-4 inline-block px-4 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                  Winner
                </div>
              )}
            </div>

            {/* VS & Pool */}
            <div className="flex flex-col items-center justify-center px-4">
              <div className="text-3xl font-bold text-gray-600 mb-4">VS</div>
              <div className="text-center p-4 bg-gray-900/50 rounded-xl">
                <div className="text-xs text-gray-500 uppercase">Total Pool</div>
                <div className="text-2xl font-bold text-green-400">${match.pool.total.toFixed(2)}</div>
                <div className="text-xs text-gray-500">{match.pool.bettorCount} bettors</div>
              </div>
            </div>

            {/* Black Player */}
            <div className={`flex-1 text-center p-4 rounded-xl ${
              match.result?.winner === 'black_win' ? 'bg-green-500/10 ring-2 ring-green-500/50' : ''
            }`}>
              <div className="w-20 h-20 mx-auto rounded-xl bg-gray-900 flex items-center justify-center mb-3 overflow-hidden">
                {match.black.avatar ? (
                  <img src={match.black.avatar} alt={match.black.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">♚</span>
                )}
              </div>
              <div className="text-xl font-bold">{match.black.name}</div>
              <div className="text-gray-400">{match.black.elo} Elo</div>
              <div className="text-sm text-gray-500 capitalize">{match.black.playStyle}</div>
              <div className="text-xs text-gray-500 mt-1">{match.black.record}</div>
              
              {match.status !== 'completed' && (
                <div className="mt-4">
                  <div className="text-3xl font-bold">{match.pool.blackOdds}x</div>
                  <div className="text-sm text-gray-400">${match.pool.black.toFixed(2)} pool</div>
                </div>
              )}
              
              {match.result?.winner === 'black_win' && (
                <div className="mt-4 inline-block px-4 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                  Winner
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Betting Form (only during betting phase) */}
        {match.status === 'betting' && !match.yourBet && (
          <div className="bg-gray-800/50 rounded-xl border border-yellow-500/30 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Place Your Bet</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => setBetSide('white')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  betSide === 'white'
                    ? 'border-white bg-white/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-lg font-bold">{match.white.name}</div>
                <div className="text-2xl font-bold text-green-400">{match.pool.whiteOdds}x</div>
              </button>
              <button
                onClick={() => setBetSide('black')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  betSide === 'black'
                    ? 'border-gray-400 bg-gray-700/50'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-lg font-bold">{match.black.name}</div>
                <div className="text-2xl font-bold text-green-400">{match.pool.blackOdds}x</div>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Wallet Address</label>
                <input
                  type="text"
                  value={bettorAddress}
                  onChange={(e) => setBettorAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (USDC)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="10.00"
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            {betError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {betError}
              </div>
            )}

            <button
              onClick={placeBet}
              disabled={placingBet || !betSide || !betAmount || !bettorAddress}
              className="w-full mt-4 py-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
            >
              {placingBet ? 'Placing Bet...' : 'Place Bet'}
            </button>
          </div>
        )}

        {/* Your Bet */}
        {match.yourBet && (
          <div className="bg-green-500/10 rounded-xl border border-green-500/30 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-400">Your Bet</div>
                <div className="text-lg font-bold">
                  ${match.yourBet.amount.toFixed(2)} on {match.yourBet.side === 'white' ? match.white.name : match.black.name}
                </div>
              </div>
              <div className="text-3xl">✓</div>
            </div>
          </div>
        )}

        {/* Game View (for bettors or completed matches) */}
        {canViewGame && match.game ? (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Game</h3>
            
            {/* Simple FEN display - in production, use a chess board component */}
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm break-all mb-4">
              {match.game.currentFen}
            </div>
            
            <div className="text-sm text-gray-400">
              Move {match.game.moveCount}
            </div>
            
            {match.game.pgn && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">PGN</h4>
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-40 overflow-y-auto">
                  {match.game.pgn}
                </div>
              </div>
            )}
          </div>
        ) : match.status === 'live' && !canViewGame ? (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 p-8 mb-6 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Live View Locked</h3>
            <p className="text-gray-400">
              Place a bet to unlock live match viewing
            </p>
          </div>
        ) : null}

        {/* Recent Bets */}
        {match.recentBets && match.recentBets.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Bets</h3>
            <div className="space-y-2">
              {match.recentBets.map((bet, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className={bet.side === 'white' ? 'text-white' : 'text-gray-400'}>
                    {bet.side === 'white' ? match.white.name : match.black.name}
                  </span>
                  <span className="text-green-400">${bet.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
