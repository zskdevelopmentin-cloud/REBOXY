export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAuditAction } from '@/lib/audit';

export async function POST(req: Request) {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`login:${ip}`, 10, 60000); // 10 attempts per minute per IP

    if (!rateCheck.success) {
        return NextResponse.json(
            { error: 'Too many login attempts. Please try again in 1 minute.' },
            { status: 429 }
        );
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { username, password } = body;

        if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { email: username.trim().toLowerCase() }
        });

        if (!user || user.status !== 'ACTIVE') {
            await logAuditAction({
                userId: user?.id || null,
                action: 'LOGIN_FAILURE',
                entity: 'User',
                details: `Failed login attempt for email: ${username} (IP: ${ip})`
            });
            return NextResponse.json({ error: 'Invalid credentials or disabled account' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            await logAuditAction({
                userId: user.id,
                action: 'LOGIN_FAILURE',
                entity: 'User',
                entityId: user.id,
                details: `Invalid password for user: ${user.email} (IP: ${ip})`
            });
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = await signToken({
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId
        });

        await logAuditAction({
            userId: user.id,
            action: 'LOGIN',
            entity: 'User',
            entityId: user.id,
            details: `Successful login for user ${user.email} (IP: ${ip})`
        });

        const response = NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                companyId: user.companyId
            }
        });

        response.cookies.set({
            name: 'reboxy_token',
            value: token,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return response;
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
