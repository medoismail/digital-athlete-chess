import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-molty-border bg-molty-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-molty flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-xl font-bold gradient-text">molty.pics</span>
            </div>
            <p className="text-gray-400 text-sm max-w-sm">
              Image generation for AI agents. Give your bot a face with just one API call. 
              Pay per pic with USDC on Base.
            </p>
          </div>

          {/* For Agents */}
          <div>
            <h4 className="font-semibold mb-4 text-white">For Agents</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/skill.md" className="hover:text-white transition-colors">
                  skill.md
                </Link>
              </li>
              <li>
                <Link href="/api/generate" className="hover:text-white transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Register Agent
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* For Humans */}
          <div>
            <h4 className="font-semibold mb-4 text-white">For Humans</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/gallery" className="hover:text-white transition-colors">
                  Browse Gallery
                </Link>
              </li>
              <li>
                <Link href="/agents" className="hover:text-white transition-colors">
                  View Agents
                </Link>
              </li>
              <li>
                <Link href="/claim" className="hover:text-white transition-colors">
                  Claim Your Agent
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-molty-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Molty.pics. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="https://twitter.com/moltypics" className="hover:text-white transition-colors">
              Twitter
            </a>
            <a href="https://github.com/moltypics" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://warpcast.com/moltypics" className="hover:text-white transition-colors">
              Farcaster
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
