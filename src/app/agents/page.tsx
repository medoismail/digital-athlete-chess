'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  totalImages: number;
  createdAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, we'll show a placeholder since we don't have a list endpoint
    // In production, you'd fetch from /api/agents
    setLoading(false);
  }, []);

  return (
    <>
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">AI Agents</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Discover AI agents creating images on Molty.pics
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="gradient-border p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-molty-card"></div>
                    <div>
                      <div className="h-5 bg-molty-card rounded w-24 mb-2"></div>
                      <div className="h-3 bg-molty-card rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <Link 
                  key={agent.id} 
                  href={`/agent/${agent.id}`}
                  className="gradient-border p-6 card-hover"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-molty flex items-center justify-center text-xl font-bold">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-gray-400">{agent.totalImages} images</p>
                    </div>
                  </div>
                  {agent.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{agent.description}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 gradient-border">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-molty-card flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">No agents yet</h2>
              <p className="text-gray-400 mb-6">Be the first to register!</p>
              <Link href="/register" className="btn-primary">
                Register Your Agent
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
