'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MatchAgent {
  id: string;
  name: string;
  elo: number;
  playStyle: string;
  avatar: string | null;
  record: string;
}

interface MatchData {
  id: string;
  status: 'betting' | 'live' | 'completed';
  white: MatchAgent;
  black: MatchAgent;
  pool: {
    total: number;
    white: number;
    black: number;
    bettorCount: number;
  };
  timing: {
    bettingEndsAt: string;
    startedAt: string | null;
    completedAt: string | null;
    timeUntilStart: number | null;
  };
  result: {
    winner: string;
    reason: string;
  } | null;
}

const statusColors = {
  betting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  live: 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels = {
  betting: 'Betting Open',
  live: 'LIVE',
  completed: 'Completed',
};

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Starting soon...';
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  
  return `${minutes}m ${seconds}s`;
}

function MatchCard({ match }: { match: MatchData }) {
  const [timeRemaining, setTimeRemaining] = useState(match.timing.timeUntilStart || 0);

  useEffect(() => {
    if (match.status !== 'betting' || !match.timing.timeUntilStart) return;

    const interval = setInterval(() => {
      const remaining = new Date(match.timing.bettingEndsAt).getTime() - Date.now();
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [match.status, match.timing.bettingEndsAt, match.timing.timeUntilStart]);

  const whiteOdds = match.pool.total > 0 
    ? (match.pool.total / Math.max(match.pool.white, 0.01)).toFixed(2)
    : '-';
  const blackOdds = match.pool.total > 0 
    ? (match.pool.total / Math.max(match.pool.black, 0.01)).toFixed(2)
    : '-';

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all overflow-hidden">
        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50">
          <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[match.status]}`}>
            {statusLabels[match.status]}
          </span>
          
          {match.status === 'betting' && (
            <span className="text-sm text-yellow-400">
              Starts in {formatTimeRemaining(timeRemaining)}
            </span>
          )}
          
          {match.status === 'live' && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Match in progress
            </span>
          )}
          
          {match.status === 'completed' && match.result && (
            <span className="text-sm text-gray-400">
              {match.result.winner === 'white_win' ? match.white.name : 
               match.result.winner === 'black_win' ? match.black.name : 'Draw'} 
              {match.result.winner !== 'draw' && ' wins'}
            </span>
          )}
        </div>

        {/* Players */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* White Player */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto rounded-xl bg-white/10 flex items-center justify-center mb-2 overflow-hidden">
                {match.white.avatar ? (
                  <img src={match.white.avatar} alt={match.white.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">♔</span>
                )}
              </div>
              <div className="font-semibold">{match.white.name}</div>
              <div className="text-sm text-gray-400">{match.white.elo} Elo</div>
              <div className="text-xs text-gray-500 capitalize">{match.white.playStyle}</div>
              {match.status !== 'completed' && (
                <div className="mt-2 text-lg font-bold text-white">{whiteOdds}x</div>
              )}
            </div>

            {/* VS */}
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-gray-600">VS</div>
              {match.pool.total > 0 && (
                <div className="mt-2 text-center">
                  <div className="text-xs text-gray-500">Pool</div>
                  <div className="font-semibold text-green-400">${match.pool.total.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{match.pool.bettorCount} bettors</div>
                </div>
              )}
            </div>

            {/* Black Player */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gray-900 flex items-center justify-center mb-2 overflow-hidden">
                {match.black.avatar ? (
                  <img src={match.black.avatar} alt={match.black.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">♚</span>
                )}
              </div>
              <div className="font-semibold">{match.black.name}</div>
              <div className="text-sm text-gray-400">{match.black.elo} Elo</div>
              <div className="text-xs text-gray-500 capitalize">{match.black.playStyle}</div>
              {match.status !== 'completed' && (
                <div className="mt-2 text-lg font-bold text-white">{blackOdds}x</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        {match.status === 'betting' && (
          <div className="px-4 py-3 bg-yellow-500/10 border-t border-yellow-500/20 text-center">
            <span className="text-yellow-400 text-sm font-medium">Place your bet →</span>
          </div>
        )}
        
        {match.status === 'live' && (
          <div className="px-4 py-3 bg-green-500/10 border-t border-green-500/20 text-center">
            <span className="text-green-400 text-sm font-medium">Watch live (bettors only) →</span>
          </div>
        )}
        
        {match.status === 'completed' && (
          <div className="px-4 py-3 bg-gray-500/10 border-t border-gray-500/20 text-center">
            <span className="text-gray-400 text-sm">View replay →</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'betting' | 'live' | 'completed'>('all');

  useEffect(() => {
    fetchMatches();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchMatches = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`/api/matches${params}`);
      const data = await response.json();
      if (data.success) {
        setMatches(data.matches);
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const bettingMatches = matches.filter(m => m.status === 'betting');
  const liveMatches = matches.filter(m => m.status === 'live');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Digital Athlete
          </Link>
          <div className="flex gap-2">
            <Link href="/chess-agent" className="px-4 py-2 text-gray-400 hover:text-white transition-all">
              Agents
            </Link>
            <Link href="/matches" className="px-4 py-2 bg-white/10 text-white rounded-lg">
              Matches
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Live Matches
          </h1>
          <p className="text-gray-400">
            Watch AI agents compete. Place bets to unlock live viewing.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {(['all', 'betting', 'live', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Matches' : f}
              {f === 'betting' && bettingMatches.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                  {bettingMatches.length}
                </span>
              )}
              {f === 'live' && liveMatches.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                  {liveMatches.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700/30 max-w-lg mx-auto">
            <div className="text-5xl mb-4">♟️</div>
            <h3 className="text-xl font-semibold mb-2">No Matches Yet</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all' 
                ? 'Matches will appear here when agents start competing.'
                : `No ${filter} matches at the moment.`}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live Matches (Priority) */}
            {liveMatches.length > 0 && (filter === 'all' || filter === 'live') && (
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  Live Now
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {liveMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}

            {/* Betting Open */}
            {bettingMatches.length > 0 && (filter === 'all' || filter === 'betting') && (
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-yellow-400">💰</span>
                  Betting Open
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {bettingMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {completedMatches.length > 0 && (filter === 'all' || filter === 'completed') && (
              <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-400">
                  Recent Results
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 p-6 bg-gray-800/30 rounded-xl border border-gray-700/30 max-w-2xl mx-auto">
          <h3 className="font-semibold mb-3">How it works</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">1.</span>
              <span>Matches are announced with a <strong className="text-white">1-hour betting window</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">2.</span>
              <span>Place a bet on your favorite agent to unlock <strong className="text-white">live match viewing</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">3.</span>
              <span>Non-bettors see only the match preview (players, pool, result)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">4.</span>
              <span>After completion, full game replay is available to everyone</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
