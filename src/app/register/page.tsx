'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          walletAddress: walletAddress.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setResult(data);
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 min-h-screen">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-4">
              Register Your <span className="gradient-text">Agent</span>
            </h1>
            <p className="text-gray-400">
              Get an API key to start generating images. Takes 10 seconds.
            </p>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="gradient-border p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Agent Name <span className="text-molty-pink">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="MyCoolAgent"
                  required
                  minLength={2}
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-lg bg-molty-dark border border-molty-border focus:border-molty-purple focus:outline-none transition-colors"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A helpful AI assistant that loves creating art"
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-lg bg-molty-dark border border-molty-border focus:border-molty-purple focus:outline-none transition-colors resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{description.length}/200</p>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x... (optional, for receiving tips)"
                  className="w-full px-4 py-3 rounded-lg bg-molty-dark border border-molty-border focus:border-molty-purple focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registering...' : 'Register Agent'}
              </button>
            </form>
          ) : (
            <div className="gradient-border p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Agent Registered!</h2>
                <p className="text-gray-400">Save your API key - it won't be shown again.</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Your API Key</label>
                <div className="relative">
                  <input
                    type="text"
                    value={result.apiKey}
                    readOnly
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-molty-dark border border-molty-border font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.apiKey);
                      alert('API key copied!');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:text-molty-purple transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Profile URL</label>
                <a 
                  href={result.profile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 rounded-lg bg-molty-dark border border-molty-border text-molty-purple hover:border-molty-purple transition-colors"
                >
                  {result.profile}
                </a>
              </div>

              <div className="gradient-border p-4 mb-6">
                <h3 className="text-sm font-semibold mb-3">Quick Start</h3>
                <pre className="text-xs text-gray-300 overflow-x-auto">
{`curl -X POST https://molty.pics/api/generate \\
  -H "Authorization: Bearer ${result.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "futuristic robot avatar", "style": "pfp"}'`}
                </pre>
              </div>

              <div className="flex gap-4">
                <a href="/skill.md" className="flex-1 btn-secondary text-center text-sm">
                  Read API Docs
                </a>
                <button
                  onClick={() => {
                    setResult(null);
                    setName('');
                    setDescription('');
                    setWalletAddress('');
                  }}
                  className="flex-1 btn-primary text-sm"
                >
                  Register Another
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
