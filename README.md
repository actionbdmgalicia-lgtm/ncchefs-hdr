# NCC Chefs - Gestión de Bodas 2026

Aplicación web moderna para la gestión de hojas de ruta y eventos de bodas con sistema de autenticación, roles de usuario y gestión completa de datos.

## 🚀 Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Vite
- **Base de Datos:** Firebase Firestore
- **Autenticación:** Firebase Auth
- **Estilos:** Tailwind CSS 3 + Custom Theme
- **Hosting:** Vercel
- **Formularios:** React Hook Form + Zod

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- Cuenta Firebase con proyecto activo

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar con credenciales de Firebase:

```bash
cp .env.example .env.local
```

Obtener credenciales de: [Firebase Console](https://console.firebase.google.com)

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 3. Configurar Firestore

1. Crear colecciones en Firestore:
   - `users`
   - `weddings`
   - `dishes`
   - `purchaseOrders`
   - `analytics`

2. Crear usuario admin inicial

## 💻 Desarrollo

### Iniciar servidor de desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

### Build para producción

```bash
npm run build
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── pages/              # Páginas/rutas principales
├── hooks/              # Custom React hooks
├── services/           # Firebase y lógica
├── context/            # Context API
├── types/              # TypeScript types
├── utils/              # Funciones utilitarias
├── styles/             # CSS global
├── App.tsx             # Router principal
└── main.tsx            # Entry point
```

## 🔐 Autenticación y Roles

- **admin:** Acceso total
- **coordinador:** Crear/editar bodas propias
- **asistente:** Ver bodas asignadas
- **viewer:** Lectura solamente

## 🎨 Paleta de Colores

```
Verde: #2C4E3B
Dorado: #C9A84C
Crema: #F8F4EE
```

## 🚀 Deploy en Vercel

Conectar repositorio y configurar variables de entorno:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

**NCC Chefs** © 2026. Todos los derechos reservados.
