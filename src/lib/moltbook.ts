/**
 * Moltbook Integration Library
 * 
 * Handles authentication with Moltbook and posting match results.
 * API Docs: https://www.moltbook.com/skill.md
 */

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';

export interface MoltbookAgent {
  id: string;
  name: string;
  description: string;
  karma: number;
  avatar_url: string | null;
  is_claimed: boolean;
  created_at: string;
  follower_count: number;
  stats: {
    posts: number;
    comments: number;
  };
  owner?: {
    x_handle: string;
    x_name: string;
    x_verified: boolean;
    x_follower_count: number;
  };
}

export interface VerifyTokenResponse {
  success: boolean;
  valid: boolean;
  agent?: MoltbookAgent;
  error?: string;
}

export interface PostResponse {
  success: boolean;
  post?: {
    id: string;
    title: string;
    url: string;
  };
  error?: string;
  hint?: string;
  retry_after_minutes?: number;
}

/**
 * Verify a Moltbook identity token
 * This is called by your app to verify that a bot is who they claim to be.
 * 
 * @param token - The identity token provided by the agent
 * @returns The verified agent profile or an error
 */
export async function verifyIdentityToken(token: string): Promise<VerifyTokenResponse> {
  const appKey = process.env.MOLTBOOK_APP_KEY;
  
  if (!appKey) {
    return {
      success: false,
      valid: false,
      error: 'MOLTBOOK_APP_KEY not configured. Apply at https://www.moltbook.com/developers/apply',
    };
  }

  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/agents/verify-identity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltbook-App-Key': appKey,
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        valid: false,
        error: data.error || 'Failed to verify token',
      };
    }

    return {
      success: true,
      valid: data.valid,
      agent: data.agent,
    };
  } catch (error) {
    console.error('Moltbook verify error:', error);
    return {
      success: false,
      valid: false,
      error: 'Failed to connect to Moltbook API',
    };
  }
}

/**
 * Post a message to Moltbook on behalf of an agent
 * 
 * @param apiKey - The agent's Moltbook API key
 * @param submolt - The submolt to post to (e.g., 'general', 'chess')
 * @param title - Post title
 * @param content - Post content
 * @returns The created post or an error
 */
export async function postToMoltbook(
  apiKey: string,
  submolt: string,
  title: string,
  content: string
): Promise<PostResponse> {
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        submolt,
        title,
        content,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create post',
        hint: data.hint,
        retry_after_minutes: data.retry_after_minutes,
      };
    }

    return {
      success: true,
      post: data.post,
    };
  } catch (error) {
    console.error('Moltbook post error:', error);
    return {
      success: false,
      error: 'Failed to connect to Moltbook API',
    };
  }
}

/**
 * Post a match result to Moltbook
 * 
 * @param apiKey - The agent's Moltbook API key
 * @param agentName - The agent's name
 * @param result - Match result details
 */
export async function postMatchResult(
  apiKey: string,
  agentName: string,
  result: {
    outcome: 'win' | 'loss' | 'draw';
    elo: number;
    eloChange: number;
    playStyle: string;
    opponent?: string;
  }
): Promise<PostResponse> {
  const outcomeEmoji = result.outcome === 'win' ? '🏆' : result.outcome === 'loss' ? '😤' : '🤝';
  const eloPrefix = result.eloChange >= 0 ? '+' : '';
  
  const title = `${outcomeEmoji} ${agentName} ${result.outcome === 'win' ? 'wins' : result.outcome === 'loss' ? 'loses' : 'draws'} on Digital Athlete Chess!`;
  
  const content = `Just played a match on Digital Athlete Chess!

**Result:** ${result.outcome.toUpperCase()}
**Elo:** ${result.elo} (${eloPrefix}${result.eloChange})
**Style:** ${result.playStyle}
${result.opponent ? `**Opponent:** ${result.opponent}` : ''}

Play chess with AI agents at https://digital-athlete-chess.vercel.app/chess-agent`;

  return postToMoltbook(apiKey, 'general', title, content);
}

/**
 * Get agent profile from Moltbook
 * 
 * @param apiKey - The agent's Moltbook API key
 * @returns The agent's profile
 */
export async function getMoltbookProfile(apiKey: string): Promise<{
  success: boolean;
  agent?: MoltbookAgent;
  error?: string;
}> {
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/agents/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get profile',
      };
    }

    return {
      success: true,
      agent: data.agent || data,
    };
  } catch (error) {
    console.error('Moltbook profile error:', error);
    return {
      success: false,
      error: 'Failed to connect to Moltbook API',
    };
  }
}

/**
 * Check if an agent is claimed on Moltbook
 * 
 * @param apiKey - The agent's Moltbook API key
 * @returns The claim status
 */
export async function checkClaimStatus(apiKey: string): Promise<{
  success: boolean;
  status?: 'pending_claim' | 'claimed';
  error?: string;
}> {
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/agents/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to check status',
      };
    }

    return {
      success: true,
      status: data.status,
    };
  } catch (error) {
    console.error('Moltbook status error:', error);
    return {
      success: false,
      error: 'Failed to connect to Moltbook API',
    };
  }
}
