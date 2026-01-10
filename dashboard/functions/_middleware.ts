// Cloudflare Pages Functions entry point
// Routes all non-static requests to Next.js

export async function onRequest(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    
    // Check if it's an API request - pass through
    if (url.pathname.startsWith('/api/')) {
      return fetch(request);
    }
    
    // For all other requests, serve from .next/standalone
    return context.next(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
