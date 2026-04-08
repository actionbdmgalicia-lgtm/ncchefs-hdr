import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT ||
  path.join(process.cwd(), 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Firebase service account not found. Create one in Firebase Console.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

interface Wedding {
  couples_name: string;
  clients: string;
  date: string;
  start_time: string;
  end_time: string;
  coordinator: string;
  service_type: string;
  venue: string;
  adults: number;
  children: number;
  status: string;
  file_source: string;
}

async function loadWeddings() {
  try {
    // Read weddings from JSON file
    const weddingsPath = path.join(__dirname, '../weddings_data.json');
    const weddingsData: Wedding[] = JSON.parse(
      fs.readFileSync(weddingsPath, 'utf8')
    );

    console.log(`Loading ${weddingsData.length} weddings to Firestore...`);

    const batch = db.batch();
    let count = 0;

    for (const wedding of weddingsData) {
      const docRef = db.collection('weddings').doc();
      batch.set(docRef, {
        ...wedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      count++;

      // Commit batch every 500 docs (Firestore limit)
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Committed ${count} weddings...`);
      }
    }

    // Commit remaining documents
    if (count % 500 !== 0) {
      await batch.commit();
    }

    console.log(`✓ Successfully loaded ${weddingsData.length} weddings!`);

    // Verify load
    const snapshot = await db.collection('weddings').get();
    console.log(`Total weddings in Firestore: ${snapshot.size}`);

    process.exit(0);
  } catch (error) {
    console.error('Error loading weddings:', error);
    process.exit(1);
  }
}

loadWeddings();
