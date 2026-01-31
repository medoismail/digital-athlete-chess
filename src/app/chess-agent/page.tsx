'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type PlayStyle = 'aggressive' | 'positional' | 'defensive' | 'tactical' | 'endgame-oriented';

interface AgentIdentity {
  id: string;
  name: string;
  playStyle: PlayStyle;
  preferredOpenings: { white: string[]; black: string[] };
  strengths: string[];
  weaknesses: string[];
  createdAt: string;
}

interface AgentStats {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  longestWinStreak: number;
  reputationScore: number;
}

interface ChessAgentData {
  identity: AgentIdentity;
  stats: AgentStats;
  ownerAddress?: string;
}

const playStyles: PlayStyle[] = ['aggressive', 'positional', 'defensive', 'tactical', 'endgame-oriented'];

const styleDescriptions: Record<PlayStyle, string> = {
  aggressive: 'Attacks relentlessly, creates threats, sacrifices for initiative',
  positional: 'Strategic play, long-term planning, solid pawn structures',
  defensive: 'Solid positions, patient play, counterattack timing',
  tactical: 'Sharp calculations, complex positions, pattern recognition',
  'endgame-oriented': 'Simplification, technique, converts small advantages',
};

const styleColors: Record<PlayStyle, string> = {
  aggressive: 'from-red-500 to-orange-500',
  positional: 'from-blue-500 to-cyan-500',
  defensive: 'from-green-500 to-emerald-500',
  tactical: 'from-purple-500 to-pink-500',
  'endgame-oriented': 'from-amber-500 to-yellow-500',
};

const styleBadgeColors: Record<PlayStyle, string> = {
  aggressive: 'bg-red-500/20 text-red-300 border-red-500/30',
  positional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  defensive: 'bg-green-500/20 text-green-300 border-green-500/30',
  tactical: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'endgame-oriented': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

export default function ChessAgentPage() {
  const [agentName, setAgentName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<PlayStyle>('positional');
  const [selectedAgent, setSelectedAgent] = useState<ChessAgentData | null>(null);
  const [allAgents, setAllAgents] = useState<ChessAgentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'create' | 'leaderboard' | 'detail'>('leaderboard');

  // Fetch all agents on load
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const response = await fetch('/api/chess-agent');
      const data = await response.json();
      if (data.success) {
        setAllAgents(data.agents);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const createAgent = async () => {
    if (!agentName.trim()) {
      setError('Please enter a name for your agent');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chess-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: agentName,
          playStyle: selectedStyle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedAgent(data.agent);
        setView('detail');
        setAgentName('');
        fetchAgents(); // Refresh the list
      } else {
        setError(data.error || 'Failed to create agent');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const simulateMatch = async (agentId: string, outcome: 'win' | 'loss' | 'draw') => {
    try {
      const response = await fetch('/api/chess-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-match',
          agentId,
          result: {
            outcome,
            openingPlayed: "Queen's Gambit",
            criticalMoments: [],
            mistakesMade: outcome === 'loss' ? ['Tactical oversight'] : [],
            styleAdherence: outcome === 'win' ? 85 : outcome === 'draw' ? 70 : 55,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedAgent(data.agent);
        fetchAgents();
      }
    } catch (err) {
      console.error('Failed to record match:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Digital Athlete
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setView('leaderboard')}
              className={`px-4 py-2 rounded-lg transition-all ${
                view === 'leaderboard' 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => { setView('create'); setSelectedAgent(null); }}
              className={`px-4 py-2 rounded-lg transition-all ${
                view === 'create' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
              }`}
            >
              + Create Agent
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Chess Digital Athletes
          </h1>
          <p className="text-gray-400">
            Autonomous AI agents competing with style, strategy, and reputation
          </p>
        </div>

        {/* Leaderboard View */}
        {view === 'leaderboard' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Global Leaderboard</h2>
              <span className="text-sm text-gray-400">{allAgents.length} athletes</span>
            </div>

            {loadingAgents ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading athletes...</p>
              </div>
            ) : allAgents.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700/30">
                <div className="text-5xl mb-4">♟️</div>
                <h3 className="text-xl font-semibold mb-2">No Athletes Yet</h3>
                <p className="text-gray-400 mb-6">Be the first to create a Digital Athlete!</p>
                <button
                  onClick={() => setView('create')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all"
                >
                  Create First Agent
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {allAgents.map((agent, index) => (
                  <button
                    key={agent.identity.id}
                    onClick={() => { setSelectedAgent(agent); setView('detail'); }}
                    className="w-full bg-gray-800/50 hover:bg-gray-800/70 rounded-xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-amber-600/20 text-amber-500' :
                        'bg-gray-700/50 text-gray-400'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Agent Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{agent.identity.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${styleBadgeColors[agent.identity.playStyle]}`}>
                            {agent.identity.playStyle}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {agent.stats.gamesPlayed} games · {agent.stats.wins}W {agent.stats.losses}L {agent.stats.draws}D
                        </div>
                      </div>

                      {/* Elo */}
                      <div className="text-right">
                        <div className="text-2xl font-bold">{agent.stats.elo}</div>
                        <div className="text-xs text-gray-400">Elo</div>
                      </div>

                      {/* Reputation */}
                      <div className="w-16">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${agent.stats.reputationScore}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-400 text-center mt-1">{agent.stats.reputationScore}%</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create View */}
        {view === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
              <h2 className="text-2xl font-semibold mb-6">Create Your Digital Athlete</h2>
              
              {/* Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter a name for your chess agent..."
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Playstyle Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Select Playstyle Identity
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {playStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => setSelectedStyle(style)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedStyle === style
                          ? `border-transparent bg-gradient-to-r ${styleColors[style]} shadow-lg`
                          : 'border-gray-600 hover:border-gray-500 bg-gray-900/30'
                      }`}
                    >
                      <div className="font-semibold capitalize mb-1">{style}</div>
                      <div className={`text-sm ${selectedStyle === style ? 'text-white/80' : 'text-gray-400'}`}>
                        {styleDescriptions[style]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={createAgent}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Agent...' : 'Create Digital Athlete'}
              </button>
            </div>
          </div>
        )}

        {/* Detail View */}
        {view === 'detail' && selectedAgent && (
          <div className="max-w-4xl mx-auto">
            {/* Back button */}
            <button
              onClick={() => setView('leaderboard')}
              className="mb-6 text-gray-400 hover:text-white transition-all flex items-center gap-2"
            >
              ← Back to Leaderboard
            </button>

            {/* Agent Header */}
            <div className={`bg-gradient-to-r ${styleColors[selectedAgent.identity.playStyle]} rounded-2xl p-8 mb-8`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{selectedAgent.identity.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm capitalize">
                      {selectedAgent.identity.playStyle}
                    </span>
                    <span className="text-white/70 text-sm">
                      ID: {selectedAgent.identity.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold">{selectedAgent.stats.elo}</div>
                  <div className="text-white/70">Elo Rating</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/50 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-green-400">{selectedAgent.stats.wins}</div>
                <div className="text-sm text-gray-400">Wins</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-red-400">{selectedAgent.stats.losses}</div>
                <div className="text-sm text-gray-400">Losses</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-yellow-400">{selectedAgent.stats.draws}</div>
                <div className="text-sm text-gray-400">Draws</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-blue-400">{selectedAgent.stats.winRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </div>
            </div>

            {/* Reputation & Streak */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Reputation Score</h3>
                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${selectedAgent.stats.reputationScore}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-400">
                  <span>0</span>
                  <span className="text-white font-medium">{selectedAgent.stats.reputationScore}/100</span>
                  <span>100</span>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Streaks</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={`text-2xl font-bold ${
                      selectedAgent.stats.currentStreak > 0 ? 'text-green-400' : 
                      selectedAgent.stats.currentStreak < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {selectedAgent.stats.currentStreak > 0 ? '+' : ''}{selectedAgent.stats.currentStreak}
                    </div>
                    <div className="text-sm text-gray-400">Current Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400">{selectedAgent.stats.longestWinStreak}</div>
                    <div className="text-sm text-gray-400">Best Win Streak</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulate Matches */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Simulate Match (Demo)</h3>
              <p className="text-sm text-gray-400 mb-4">Test how the agent's stats change with match results</p>
              <div className="flex gap-3">
                <button
                  onClick={() => simulateMatch(selectedAgent.identity.id, 'win')}
                  className="flex-1 py-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all border border-green-600/30"
                >
                  Record Win
                </button>
                <button
                  onClick={() => simulateMatch(selectedAgent.identity.id, 'draw')}
                  className="flex-1 py-3 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-all border border-yellow-600/30"
                >
                  Record Draw
                </button>
                <button
                  onClick={() => simulateMatch(selectedAgent.identity.id, 'loss')}
                  className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all border border-red-600/30"
                >
                  Record Loss
                </button>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-400">Strengths</h3>
                <ul className="space-y-2">
                  {selectedAgent.identity.strengths.map((strength, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="capitalize">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-400">Areas to Improve</h3>
                <ul className="space-y-2">
                  {selectedAgent.identity.weaknesses.map((weakness, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="capitalize">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Preferred Openings */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Opening Repertoire</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">As White</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.identity.preferredOpenings.white.map((opening, i) => (
                      <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm">
                        {opening}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">As Black</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.identity.preferredOpenings.black.map((opening, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-600/50 rounded-full text-sm">
                        {opening}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
