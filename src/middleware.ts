import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Add routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/health'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Handle sync connector or user session authentication for /api/sync
  if (path.startsWith('/api/sync')) {
    const authHeader = request.headers.get('authorization');
    const syncToken = process.env.SYNC_TOKEN || 'tally_local_dev_token';

    if (authHeader && authHeader === `Bearer ${syncToken}`) {
      return NextResponse.next();
    }

    const token = request.cookies.get('reboxy_token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.id as string);
        requestHeaders.set('x-user-role', payload.role as string);
        requestHeaders.set('x-company-id', (payload.companyId as string) || '');

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    }

    return NextResponse.json({ error: 'Unauthorized connector or user' }, { status: 401 });
  }

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
