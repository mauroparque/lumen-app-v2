// Prerequisito: firebase-admin disponible en node_modules o en functions/node_modules
// Ejecutar desde root: NODE_PATH=./functions/node_modules npx tsx scripts/seed-allowlist.ts
// Requiere: GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const APP_ID = 'lumen-production';
const CLINIC_ID = 'lumen-general';
const basePath = `artifacts/${APP_ID}/clinics/${CLINIC_ID}`;

async function seed() {
    const staffSnap = await db.collection(`${basePath}/staff`).get();

    if (staffSnap.empty) {
        console.log('No staff found. Create entries manually in Firestore console.');
        return;
    }

    const batch = db.batch();
    for (const doc of staffSnap.docs) {
        const data = doc.data();
        const emailDocRef = db.collection(`${basePath}/allowedEmails`).doc(data.email);
        batch.set(emailDocRef, {
            email: data.email,
            role: data.role || 'professional',
            professionalName: data.name,
        });
        console.log(`  → ${data.email} (${data.role || 'professional'}) as ${data.name}`);
    }

    await batch.commit();
    console.log(`\nSeeded ${staffSnap.size} allowed emails.`);
}

seed().catch(console.error);
