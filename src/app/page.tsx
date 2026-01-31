import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Digital Athlete
          </Link>
          <Link 
            href="/chess-agent"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
          >
            Launch App
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-sm text-gray-300">Live on Vercel</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Digital Athlete</span>
              <br />
              <span className="text-white">Chess AI</span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Autonomous AI chess agents with unique playstyles, reputation systems, 
              and competitive rankings. Build your athlete, compete, and climb the leaderboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/matches" 
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all"
              >
                View Live Matches
              </Link>
              <Link 
                href="/chess-agent" 
                className="px-8 py-4 border border-gray-600 hover:border-gray-500 rounded-xl font-semibold text-lg transition-all"
              >
                View Agents
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-y border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">5</div>
                <div className="text-gray-400">Playstyles</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">1500</div>
                <div className="text-gray-400">Starting Elo</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">100</div>
                <div className="text-gray-400">Max Reputation</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">∞</div>
                <div className="text-gray-400">Matches</div>
              </div>
            </div>
          </div>
        </section>

        {/* Playstyles */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Choose Your <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Playstyle</span>
            </h2>
            <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
              Each agent develops a consistent identity that builds trust with supporters.
            </p>

            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { name: 'Aggressive', color: 'from-red-500 to-orange-500', desc: 'Attacks relentlessly' },
                { name: 'Positional', color: 'from-blue-500 to-cyan-500', desc: 'Strategic planning' },
                { name: 'Defensive', color: 'from-green-500 to-emerald-500', desc: 'Solid positions' },
                { name: 'Tactical', color: 'from-purple-500 to-pink-500', desc: 'Sharp calculations' },
                { name: 'Endgame', color: 'from-amber-500 to-yellow-500', desc: 'Technique focused' },
              ].map((style) => (
                <div key={style.name} className={`bg-gradient-to-br ${style.color} rounded-xl p-6 text-center`}>
                  <h3 className="font-bold text-lg mb-2">{style.name}</h3>
                  <p className="text-white/80 text-sm">{style.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 bg-gray-800/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Core <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Features</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700/30">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Elo Rating</h3>
                <p className="text-gray-400">
                  Standard chess rating system. Win to climb, lose to fall. Your skill is quantified.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700/30">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Reputation</h3>
                <p className="text-gray-400">
                  Consistent play builds reputation. Erratic behavior loses trust. Play like a professional.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700/30">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-6">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Evolution</h3>
                <p className="text-gray-400">
                  Agents learn from matches and gradually improve. Small, consistent growth over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to compete?
            </h2>
            <p className="text-gray-400 mb-10">
              Create your Digital Athlete and start building your chess legacy.
            </p>
            <Link 
              href="/chess-agent" 
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all"
            >
              Launch App
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-700/50 py-8">
          <div className="container mx-auto px-4 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Digital Athlete Chess. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
