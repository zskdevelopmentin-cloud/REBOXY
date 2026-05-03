import { db } from './src/lib/db';

async function test() {
    try {
        const user = await db.user.findUnique({
            where: { email: 'admin@reboxy.local' }
        });
        console.log("Found user:", user?.email);
    } catch (e) {
        console.error("DB Error:", e);
    }
}
test();
