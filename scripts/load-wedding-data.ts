import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, setDoc, doc } from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
const envFile = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envFile, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const firebaseConfig = {
  apiKey: env['VITE_FIREBASE_API_KEY'],
  authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: env['VITE_FIREBASE_PROJECT_ID'],
  storageBucket: env['VITE_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId: env['VITE_FIREBASE_APP_ID'],
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dataPath = path.join(__dirname, '../../NCCHEFS HOJAS DE RUTA/wedding_roadmaps_firestore.json');

interface WeddingData {
  couple_names?: string;
  date?: string;
  time_start?: string;
  time_end?: string;
  coordinator?: string;
  location?: string;
  guests?: Record<string, any>;
  menu?: Record<string, any>;
  special_menus?: Record<string, any>;
  protocols?: Record<string, any>;
  notes?: Record<string, any>;
  financial?: Record<string, any>;
  [key: string]: any;
}

async function loadWeddingData() {
  try {
    console.log('🔄 Reading wedding data from JSON...');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const fileData = JSON.parse(rawData);

    console.log('🗑️  Cleaning duplicates from Firestore...');
    const weddingsRef = collection(db, 'weddings');
    const snapshot = await getDocs(weddingsRef);

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'weddings', docSnap.id));
    }
    console.log(`✅ Deleted ${snapshot.size} old documents`);

    console.log('📝 Loading new wedding data...');
    let weddingCount = 0;

    // Iterate through each file
    for (const fileName in fileData) {
      const fileWeddings = fileData[fileName];

      // Iterate through each wedding in the file
      for (const weddingKey in fileWeddings) {
        const weddingData: WeddingData = fileWeddings[weddingKey];

        // Create a unique ID based on couple names and date
        const dateStr = weddingData.date?.split('T')[0] || '';
        const coupleName = weddingData.couple_names?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
        const weddingId = `${dateStr}_${coupleName}`.substring(0, 50);

        try {
          await setDoc(doc(db, 'weddings', weddingId), {
            ...weddingData,
            file_source: fileName,
            created_at: new Date(),
            updated_at: new Date(),
          });

          weddingCount++;
          console.log(`✅ Loaded: ${weddingData.couple_names} (${weddingData.date})`);
        } catch (err) {
          console.error(`❌ Error loading ${weddingData.couple_names}:`, err);
        }
      }
    }

    console.log(`\n✨ Successfully loaded ${weddingCount} weddings to Firestore`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error loading wedding data:', err);
    process.exit(1);
  }
}

loadWeddingData();
