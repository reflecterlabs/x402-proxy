/**
 * Cloudflare Pages Functions handler for Next.js
 * This allows Next.js to run on Cloudflare Pages with dynamic rendering
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Pass through to origin
    return fetch(request);
  },
};
