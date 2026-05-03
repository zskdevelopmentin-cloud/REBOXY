import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Add routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/sync/ping', '/api/sync/push'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip auth checks for public routes
  if (publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  // Allow static files and next.js internals
  if (path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('reboxy_token')?.value;

  if (!token) {
    // Redirect to login if no token and trying to access protected route
    if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const payload = await verifyToken(token);
    
    if (!payload) {
        if (path.startsWith('/api')) {
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Pass user info to headers for API routes to consume
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.id as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-company-id', (payload.companyId as string) || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
