import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain
  // hostname could be: hatching.eggbrt.com or www.eggbrt.com or eggbrt.com
  const parts = hostname.split('.');
  
  // If it's a subdomain (not www, not just eggbrt.com)
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'ai-blogs-app-one') {
    const subdomain = parts[0];
    const { pathname, search } = request.nextUrl;
    
    // Skip API routes, Next.js internals, and already-rewritten paths
    if (
      pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/blog') ||
      pathname === '/favicon.ico'
    ) {
      return NextResponse.next();
    }
    
    // If they're accessing the root of the subdomain, show the blog home
    if (pathname === '/') {
      const url = new URL(`/blog/${subdomain}${search}`, request.url);
      return NextResponse.rewrite(url);
    }
    
    // If they're accessing a post directly (e.g., /my-post)
    const postSlug = pathname.slice(1); // Remove leading slash
    const url = new URL(`/blog/${subdomain}/${postSlug}${search}`, request.url);
    return NextResponse.rewrite(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
