const THREADS_API_BASE = "https://graph.threads.net/v1.0";

interface ThreadsPost {
  id: string;
  text?: string;
  permalink?: string;
  timestamp?: string;
  media_type?: string;
  media_url?: string;
}

interface ThreadsResponse {
  data: ThreadsPost[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

export function getThreadsAuthUrl(): string {
  const appId = process.env.THREADS_APP_ID;
  const redirectUri = process.env.THREADS_REDIRECT_URI;

  return (
    `https://threads.net/oauth/authorize` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&scope=threads_basic` +
    `&response_type=code`
  );
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  // Step 1: Get short-lived token
  const res = await fetch(`${THREADS_API_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      client_secret: process.env.THREADS_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: process.env.THREADS_REDIRECT_URI!,
      code,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to get short-lived token: ${JSON.stringify(data)}`);
  }

  // Step 2: Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `${THREADS_API_BASE}/access_token` +
      `?grant_type=th_exchange_token` +
      `&client_secret=${process.env.THREADS_APP_SECRET}` +
      `&access_token=${data.access_token}`
  );

  const longData = await longRes.json();
  if (!longData.access_token) {
    throw new Error(`Failed to get long-lived token: ${JSON.stringify(longData)}`);
  }

  return longData.access_token;
}

export async function refreshToken(token: string): Promise<string> {
  const res = await fetch(
    `${THREADS_API_BASE}/refresh_access_token` +
      `?grant_type=th_refresh_token` +
      `&access_token=${token}`
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

export async function fetchMyThreads(
  token: string,
  since?: string
): Promise<ThreadsPost[]> {
  const fields = "id,text,permalink,timestamp,media_type,media_url";
  let url = `${THREADS_API_BASE}/me/threads?fields=${fields}&limit=50&access_token=${token}`;

  if (since) {
    url += `&since=${since}`;
  }

  const allPosts: ThreadsPost[] = [];

  // Paginate through results
  let nextUrl: string | undefined = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Threads API error ${res.status}: ${errText}`);
    }

    const data: ThreadsResponse = await res.json();
    allPosts.push(...data.data);

    nextUrl = data.paging?.next;
    // Safety limit: max 5 pages (250 posts per sync)
    if (allPosts.length >= 250) break;
  }

  return allPosts;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX) || [];
  // Filter out threads.net URLs (self-references)
  return matches.filter((url) => !url.includes("threads.net"));
}
