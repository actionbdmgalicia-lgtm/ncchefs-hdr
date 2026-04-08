import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB_o0W0hMKBOcOpVRGebMKD_VPGdFjihEc",
  authDomain: "ncchefs-bodas-2026.firebaseapp.com",
  projectId: "ncchefs-bodas-2026",
  storageBucket: "ncchefs-bodas-2026.firebasestorage.app",
  messagingSenderId: "82220360765",
  appId: "1:82220360765:web:3ad09575cd2bac6d03f654"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log('🔥 Probando conexión a Firebase...');

// Prueba con credenciales
const email = process.argv[2] || 'admin@ncchefs.com';
const password = process.argv[3];

if (!password) {
  console.log('❌ Uso: node test-firebase.js <email> <password>');
  console.log('Ejemplo: node test-firebase.js admin@ncchefs.com TuPassword123!');
  process.exit(1);
}

console.log(`📧 Email: ${email}`);
console.log(`🔐 Intentando login...`);

signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    console.log('✅ Login exitoso!');
    console.log('UID:', userCredential.user.uid);
    console.log('Email:', userCredential.user.email);
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ Error al login:');
    console.log('Código:', error.code);
    console.log('Mensaje:', error.message);

    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 El usuario no existe. Crea uno en Firebase Console:');
      console.log(`   https://console.firebase.google.com/project/ncchefs-bodas-2026/auth/users`);
    } else if (error.code === 'auth/wrong-password') {
      console.log('\n💡 La contraseña es incorrecta.');
    }

    process.exit(1);
  });
