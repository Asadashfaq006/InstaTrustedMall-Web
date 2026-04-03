import { NextResponse } from 'next/server';

/**
 * Next.js Middleware — Route protection by role.
 *
 * Reads the 'token' cookie, decodes the JWT payload (without verification —
 * verification happens server-side on API calls), and redirects unauthorized
 * users based on the route they're trying to access.
 *
 * Route rules:
 *   /super-admin/*  → requires role 'super_admin'
 *   /admin/*        → requires role 'admin'
 *   /dashboard/*    → requires role 'admin' | 'manager' | 'salesperson' | 'viewer'
 *   /               → public (landing page)
 *   /welcome        → public
 */

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Check if expired
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (
    pathname === '/' ||
    pathname === '/welcome' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Read role-specific cookie based on the route being accessed,
  // falling back to legacy 'token' cookie for backward compatibility.
  let token = null;
  let user = null;

  if (pathname.startsWith('/super-admin')) {
    token = request.cookies.get('sa_token')?.value || request.cookies.get('token')?.value;
    user = token ? decodeJwtPayload(token) : null;
    if (!user || user.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    token = request.cookies.get('admin_token')?.value || request.cookies.get('token')?.value;
    user = token ? decodeJwtPayload(token) : null;
    if (!user || user.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    token = request.cookies.get('user_token')?.value || request.cookies.get('admin_token')?.value || request.cookies.get('token')?.value;
    user = token ? decodeJwtPayload(token) : null;
    const businessRoles = ['admin', 'manager', 'salesperson', 'viewer'];
    if (!user || !businessRoles.includes(user.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Legacy routes (/home, /products, /stock, etc.) — allow if any valid token present
  token = request.cookies.get('sa_token')?.value || request.cookies.get('admin_token')?.value || request.cookies.get('user_token')?.value || request.cookies.get('token')?.value;
  user = token ? decodeJwtPayload(token) : null;
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
