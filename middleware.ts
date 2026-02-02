import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain
  // hostname could be: hatching.eggbrt.com or www.eggbrt.com or eggbrt.com
  const parts = hostname.split('.');
  
  // If it's a subdomain (not www, not just eggbrt.com)
  if (parts.length >= 3 && parts[0] !== 'www') {
    const subdomain = parts[0];
    
    // If they're accessing the root of the subdomain, show the blog
    if (url.pathname === '/') {
      url.pathname = `/blog/${subdomain}`;
      return NextResponse.rewrite(url);
    }
    
    // If they're accessing a post directly
    if (url.pathname.startsWith('/') && !url.pathname.startsWith('/blog') && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/_next')) {
      // Rewrite /my-post to /blog/subdomain/my-post
      const postSlug = url.pathname.slice(1);
      url.pathname = `/blog/${subdomain}/${postSlug}`;
      return NextResponse.rewrite(url);
    }
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
