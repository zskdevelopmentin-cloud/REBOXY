export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  const userCompanyId = req.headers.get('x-company-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const caller = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    });

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: User record not found' }, { status: 401 });
    }

    if (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required for user management' }, { status: 403 });
    }

    let targetCompanyId = caller.companyId || userCompanyId;
    let whereClause: any = {};

    if (caller.role === 'SUPER_ADMIN') {
      whereClause = {};
    } else {
      if (!targetCompanyId) {
        return NextResponse.json({ error: 'No active company assigned' }, { status: 400 });
      }
      whereClause = { companyId: targetCompanyId };
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const caller = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    });

    if (!caller || (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can create users' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, role, status } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Validate assigned role
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'SALES_STAFF', 'VIEWER'];
    const assignedRole = validRoles.includes(role) ? role : 'VIEWER';

    if (caller.role !== 'SUPER_ADMIN' && assignedRole === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Cannot create Super Admin users' }, { status: 403 });
    }

    let targetCompanyId = caller.companyId;
    if (caller.role === 'SUPER_ADMIN' && body.companyId) {
      targetCompanyId = body.companyId;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: assignedRole,
        status: status || 'ACTIVE',
        companyId: targetCompanyId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyId: true,
        createdAt: true
      }
    });

    await logAuditAction({
      userId,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: newUser.id,
      details: `Created user ${newUser.email} with role ${newUser.role}`
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const caller = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    });

    if (!caller || (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can modify users' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, role, status, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Enforce tenant isolation for non-super-admins
    if (caller.role !== 'SUPER_ADMIN' && targetUser.companyId !== caller.companyId) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit users belonging to another company' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;

    if (role !== undefined) {
      if (caller.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Cannot elevate role to Super Admin' }, { status: 403 });
      }
      updateData.role = role;
    }

    if (newPassword && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyId: true,
        createdAt: true
      }
    });

    await logAuditAction({
      userId,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: updatedUser.id,
      details: `Updated user ${updatedUser.email} (Role: ${updatedUser.role}, Status: ${updatedUser.status})`
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
