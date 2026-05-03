import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    // Validate SYNC_TOKEN
    const authHeader = req.headers.get('authorization');
    const SYNC_TOKEN = process.env.SYNC_TOKEN || 'tally_local_dev_token';

    if (!authHeader || authHeader !== `Bearer ${SYNC_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized connector' }, { status: 401 });
    }

    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
