// Prerequisito: firebase-admin disponible en functions/node_modules
// Ejecutar desde el worktree:
//
//   (Windows / PowerShell)
//     $env:NODE_PATH = "$PWD\functions\node_modules"
//     $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\a\serviceAccount.json"
//     npx tsx scripts/seed-allowlist.ts
//
//   (macOS / Linux, bash/zsh)
//     NODE_PATH="$(pwd)/functions/node_modules" \
//     GOOGLE_APPLICATION_CREDENTIALS="/ruta/a/serviceAccount.json" \
//       npx tsx scripts/seed-allowlist.ts
//
// Para obtener el serviceAccount.json:
//   Firebase Console → Project Settings → Service accounts → Generate new private key
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// projectId se detecta automáticamente desde las credenciales del service account
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
