# AntojosGo - Discover Great Food Near You

Una aplicación móvil para descubrir restaurantes y platillos cerca de ti, diseñada para Android con posibilidad de expandir a iOS.

## 🚀 Características Principales

### Para Usuarios (Comensales)
- **Registro e inicio de sesión** con email/password y Google OAuth
- **Mapa interactivo** que muestra solo restaurantes registrados en la app
- **Búsqueda avanzada** por tipo de comida, distancia, menú e ingredientes
- **Vista detallada** de restaurantes con fotos, ubicación, menú y contacto
- **Sistema de reseñas** y calificaciones de restaurantes y platillos
- **Perfil de usuario** editable con información personal

### Para Restaurantes (Futuro)
- Registro y administración de perfil
- Gestión de menú digital con fotos
- Estadísticas básicas de visitas
- Respuesta a reseñas de clientes

## 🏗️ Arquitectura del Proyecto

```
/
├── frontend/          # Aplicación móvil (React Native + Expo)
├── backend/           # API servidor (FastAPI + Python)
├── admin/             # Panel web de administración (React) [Futuro]
├── .env.example       # Variables de entorno de ejemplo
└── README.md          # Este archivo
```

## 📱 Tech Stack

### Mobile Frontend
- **React Native** con **Expo** (Android/iOS)
- **React Navigation** para navegación
- **AsyncStorage** para almacenamiento local
- **Expo Vector Icons** para iconografía

### Backend API
- **FastAPI** (Python)
- **JWT** para autenticación
- **bcrypt** para encriptación de contraseñas
- **Mock data** (listo para PostgreSQL)

### Integraciones Futuras
- **Firebase Authentication** (Google OAuth)
- **Mapbox** para mapas y GPS
- **Cloudinary** para almacenamiento de imágenes
- **PostgreSQL** como base de datos principal

## 🚀 Instalación y Configuración

### Requisitos
- Node.js 18+
- Python 3.11+
- Expo CLI
- Yarn o npm

### Backend
```bash
cd backend
pip install -r requirements.txt
python server.py
```
El servidor estará disponible en `http://localhost:8001`

### Frontend Mobile
```bash
cd frontend
yarn install
expo start
```

### Variables de Entorno
Copia `.env.example` y configura las variables necesarias:
```bash
cp .env.example .env
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/google` - OAuth con Google
- `GET /api/auth/verify` - Verificar token JWT

### Restaurantes
- `GET /api/restaurants` - Listar restaurantes
- `GET /api/restaurants/{id}` - Detalles de restaurante
- `GET /api/restaurants/search?q=query` - Búsqueda de restaurantes

### Usuario
- `PUT /api/profile` - Actualizar perfil de usuario
- `GET /api/health` - Estado del servidor

## 📱 Screens de la App

### Completadas
1. **SplashScreen** - Pantalla de carga
2. **AuthScreen** - Registro/Login con validación
3. **HomeScreen** - Mapa + lista de restaurantes con filtros
4. **RestaurantListScreen** - Vista de lista con búsqueda
5. **RestaurantDetailScreen** - Detalles completos del restaurante
6. **ProfileScreen** - Perfil de usuario editable

## 🗄️ Datos Mock

El backend incluye datos de ejemplo:
- **3 restaurantes**: Tacos El Güero (Mexicana), Pizza Italiana, Burger House (Fast-food)
- **Menús completos** con precios e ingredientes
- **Sistema de autenticación** funcional con JWT

## 🔮 Próximas Funciones

### MVP Extendido
- [ ] Sistema de reseñas y calificaciones
- [ ] Integración real con Mapbox
- [ ] Firebase Authentication
- [ ] Push notifications
- [ ] Panel de administración web

### Funciones Avanzadas
- [ ] Filtros por ingredientes y alergias
- [ ] Restaurantes favoritos
- [ ] Historial de búsquedas
- [ ] Modo offline
- [ ] Compartir restaurantes

## 🛠️ Desarrollo

### Estructura de Carpetas
```
frontend/app/
├── screens/           # Pantallas de la app
├── context/           # Context providers (Auth)
├── services/          # API services
└── index.tsx          # Navegación principal
```

### Estado de la App
- ✅ **Autenticación** completa con JWT
- ✅ **Navegación** entre pantallas
- ✅ **API integration** funcional
- ✅ **Mock data** para desarrollo
- ⏳ **Mapbox integration** (placeholder)
- ⏳ **Firebase Auth** (mocked)

## 📄 Licencia

Este proyecto está en desarrollo como MVP para AntojosGo.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

**AntojosGo** - ¿Qué se te antoja hoy? 🍽️
