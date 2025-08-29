# Academia de Inglés - Sistema de Gestión

Sistema completo de gestión para academia de inglés con funcionalidades para estudiantes, profesores y empresas.

## 🏗️ Arquitectura del Proyecto

### Backend (FastAPI + MySQL)
- **Framework**: FastAPI con Python
- **Base de datos**: MySQL con SQLAlchemy ORM
- **Autenticación**: JWT con bcrypt para hash de contraseñas
- **Email**: Configurado con Gmail SMTP para verificaciones
- **Estructura**: Modular con separación de responsabilidades

### Frontend (Angular 20)
- **Framework**: Angular 20 con TypeScript
- **UI**: Angular Material + Componentes personalizados
- **Arquitectura**: Componentes standalone
- **Calendario**: Integración con angular-calendar para gestión de clases

## 📁 Estructura del Proyecto

```
Ingles/
├── back/                           # Backend FastAPI
│   ├── Clever_MySQL_conn.py        # Conexión a base de datos
│   ├── auth_routes.py              # Rutas de autenticación
│   ├── main.py                     # Aplicación principal
│   └── requirements.txt            # Dependencias Python
├── ingles-frontend/                # Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard-estudiante/
│   │   │   ├── mis-clases/         # Calendario de clases
│   │   │   └── ...
│   │   └── ...
├── templates/                      # Plantillas de email
├── .env                           # Variables de entorno
└── requirements.txt               # Dependencias globales
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Python 3.8+
- Node.js 18+
- MySQL 8.0+
- Git

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd Ingles
```

### 2. Configurar Backend

#### Instalar dependencias Python
```bash
# Crear entorno virtual
python -m venv entornoIngles
source entornoIngles/bin/activate  # Linux/Mac
# o
entornoIngles\Scripts\activate     # Windows

# Instalar dependencias
pip install -r requirements.txt
```

#### Configurar base de datos
1. Crear base de datos MySQL:
```sql
CREATE DATABASE academia_ingles;
```

2. Configurar archivo `.env`:
```env
# Base de datos
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=academia_ingles

# JWT
SECRET_KEY=tu_clave_secreta_muy_segura

# Email (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
```

#### Ejecutar backend
```bash
cd back
python main.py
```
El backend estará disponible en `http://localhost:8000`

### 3. Configurar Frontend

#### Instalar dependencias
```bash
cd ingles-frontend
npm install
```

#### Ejecutar frontend
```bash
npm start
```
El frontend estará disponible en `http://localhost:4200`

## 👥 Roles y Funcionalidades

### 🎓 Estudiantes
- Registro y verificación por email
- Dashboard personalizado
- Visualización de clases asignadas
- Acceso a enlaces de Meet

### 👨‍🏫 Profesores
- Gestión de clases (crear, editar, eliminar)
- Calendario interactivo tipo Google Calendar
- Asignación de estudiantes a clases
- Vista de semana/mes/día

### 🏢 Empresas
- Dashboard corporativo
- Gestión de empleados estudiantes
- Reportes de progreso

## 🔧 Características Técnicas

### Backend
- **Autenticación JWT**: Tokens seguros con expiración
- **Validación de datos**: Pydantic models
- **CORS configurado**: Para desarrollo local
- **Manejo de errores**: Respuestas HTTP consistentes
- **Verificación por email**: Sistema de tokens de verificación

### Frontend
- **Componentes standalone**: Arquitectura moderna de Angular
- **Lazy loading**: Carga optimizada de módulos
- **Guards de autenticación**: Protección de rutas
- **Responsive design**: Adaptable a dispositivos móviles
- **Calendar integration**: Vista de calendario interactiva

## 📅 Gestión de Clases

El sistema incluye un calendario interactivo que permite:
- **Vista múltiple**: Mes, semana y día
- **Navegación**: Botones Previous/Today/Next
- **Eventos**: Clases mostradas como eventos
- **Detalles**: Información completa de cada clase
- **Responsive**: Adaptable a diferentes pantallas

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Validación de entrada en backend
- Variables de entorno para credenciales
- CORS configurado apropiadamente

## 🧪 Testing

### Backend
```bash
cd back
python -m pytest
```

### Frontend
```bash
cd ingles-frontend
npm test
```

## 📦 Deployment

### Backend (Producción)
```bash
# Instalar dependencias de producción
pip install -r requirements.txt

# Configurar variables de entorno de producción
export DB_HOST=tu_host_produccion
export DB_PASSWORD=contraseña_segura

# Ejecutar con Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### Frontend (Producción)
```bash
cd ingles-frontend
npm run build
# Los archivos estáticos estarán endist/
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Scripts Disponibles

### Backend
- `python main.py` - Ejecutar servidor de desarrollo
- `python -m pytest` - Ejecutar tests

### Frontend
- `npm start` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm test` - Ejecutar tests
- `npm run lint` - Linter

## 🐛 Troubleshooting

### Error: Could not resolve "@angular/animations"
```bash
cd ingles-frontend
npm install @angular/animations
```

### Error de conexión a base de datos
- Verificar que MySQL esté ejecutándose
- Revisar credenciales en `.env`
- Confirmar que la base de datos existe

### Error de CORS
- Verificar configuración de CORS en `main.py`
- Confirmar URLs del frontend en configuración

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Contacto

Para soporte o consultas, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024
