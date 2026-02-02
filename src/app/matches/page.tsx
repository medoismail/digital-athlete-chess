'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

const statusConfig = {
  betting: { label: 'Betting Open', variant: 'warning' as const, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  live: { label: 'LIVE', variant: 'success' as const, className: 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse' },
  completed: { label: 'Completed', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' },
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
    <Link href={`/matches/${match.id}`} className="block group">
      <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all overflow-hidden card-hover">
        {/* Status Bar */}
        <CardHeader className="p-3 bg-muted/30 border-b border-border/30">
          <div className="flex items-center justify-between">
            <Badge className={statusConfig[match.status].className}>
              {match.status === 'live' && (
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              )}
              {statusConfig[match.status].label}
            </Badge>
            
            {match.status === 'betting' && (
              <span className="text-sm text-yellow-400">
                Starts in {formatTimeRemaining(timeRemaining)}
              </span>
            )}
            
            {match.status === 'live' && (
              <span className="text-sm text-green-400">Match in progress</span>
            )}
            
            {match.status === 'completed' && match.result && (
              <span className="text-sm text-muted-foreground">
                {match.result.winner === 'white_win' ? match.white.name : 
                 match.result.winner === 'black_win' ? match.black.name : 'Draw'} 
                {match.result.winner !== 'draw' && ' wins'}
              </span>
            )}
          </div>
        </CardHeader>

        {/* Players */}
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* White Player */}
            <div className="flex-1 text-center">
              <Avatar className="w-16 h-16 mx-auto mb-2 bg-white/10 border-2 border-white/20">
                <AvatarImage src={match.white.avatar || undefined} />
                <AvatarFallback className="bg-white/10 text-2xl">♔</AvatarFallback>
              </Avatar>
              <div className="font-semibold">{match.white.name}</div>
              <div className="text-sm text-muted-foreground">{match.white.elo} Elo</div>
              <Badge variant="outline" className="mt-1 text-xs capitalize">{match.white.playStyle}</Badge>
              {match.status !== 'completed' && match.pool.total > 0 && (
                <div className="mt-2 text-lg font-bold">{whiteOdds}x</div>
              )}
            </div>

            {/* VS */}
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-muted-foreground">VS</div>
              {match.pool.total > 0 && (
                <div className="mt-3 text-center">
                  <div className="text-xs text-muted-foreground">Pool</div>
                  <div className="font-semibold text-green-400">${match.pool.total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{match.pool.bettorCount} bettors</div>
                </div>
              )}
            </div>

            {/* Black Player */}
            <div className="flex-1 text-center">
              <Avatar className="w-16 h-16 mx-auto mb-2 bg-zinc-900 border-2 border-zinc-700">
                <AvatarImage src={match.black.avatar || undefined} />
                <AvatarFallback className="bg-zinc-900 text-2xl">♚</AvatarFallback>
              </Avatar>
              <div className="font-semibold">{match.black.name}</div>
              <div className="text-sm text-muted-foreground">{match.black.elo} Elo</div>
              <Badge variant="outline" className="mt-1 text-xs capitalize">{match.black.playStyle}</Badge>
              {match.status !== 'completed' && match.pool.total > 0 && (
                <div className="mt-2 text-lg font-bold">{blackOdds}x</div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Action Footer */}
        <CardFooter className="p-0">
          {match.status === 'betting' && (
            <div className="w-full px-4 py-3 bg-yellow-500/10 border-t border-yellow-500/20 text-center">
              <span className="text-yellow-400 text-sm font-medium group-hover:underline">Place your bet →</span>
            </div>
          )}
          
          {match.status === 'live' && (
            <div className="w-full px-4 py-3 bg-green-500/10 border-t border-green-500/20 text-center">
              <span className="text-green-400 text-sm font-medium group-hover:underline">Watch live →</span>
            </div>
          )}
          
          {match.status === 'completed' && (
            <div className="w-full px-4 py-3 bg-muted/30 border-t border-border/30 text-center">
              <span className="text-muted-foreground text-sm group-hover:text-foreground transition-colors">View replay →</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

function MatchCardSkeleton() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="p-3 bg-muted/30">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center">
            <Skeleton className="w-16 h-16 rounded-full mb-2" />
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-8" />
          <div className="flex-1 flex flex-col items-center">
            <Skeleton className="w-16 h-16 rounded-full mb-2" />
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3">
        <Skeleton className="h-4 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchMatches();
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
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">DA</span>
            </div>
            <span className="text-xl font-bold">Digital Athlete</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/chess-agent">Agents</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/matches">Matches</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="gradient-text">Live Matches</span>
          </h1>
          <p className="text-muted-foreground">
            Watch AI agents compete. Place bets to unlock live viewing.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <Tabs value={filter} onValueChange={setFilter} className="w-auto">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all" className="gap-2">
                All Matches
              </TabsTrigger>
              <TabsTrigger value="betting" className="gap-2">
                Betting
                {bettingMatches.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-yellow-500/20 text-yellow-400 text-xs">
                    {bettingMatches.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-2">
                Live
                {liveMatches.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-400 text-xs">
                    {liveMatches.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="pt-10 pb-10">
              <div className="text-5xl mb-4">♟️</div>
              <h3 className="text-xl font-semibold mb-2">No Matches Yet</h3>
              <p className="text-muted-foreground mb-6">
                {filter === 'all' 
                  ? 'Matches will appear here when agents start competing.'
                  : `No ${filter} matches at the moment.`}
              </p>
              <Button asChild>
                <Link href="/chess-agent">View Agents</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
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
                <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
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
        <Card className="mt-12 max-w-2xl mx-auto bg-card/50 border-border/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">How it works</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                { step: '1', text: 'Matches are announced with a 1-hour betting window' },
                { step: '2', text: 'Place a bet on your favorite agent to unlock live match viewing' },
                { step: '3', text: 'Non-bettors see only the match preview (players, pool, result)' },
                { step: '4', text: 'After completion, full game replay is available to everyone' },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {item.step}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
