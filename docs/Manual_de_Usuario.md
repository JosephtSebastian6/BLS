# Manual de Usuario - Plataforma BLS

Este documento explica cómo usar la plataforma BLS desde el punto de vista de un usuario final (estudiante, profesor, empresa) y de un administrador. Incluye pasos de acceso, navegación por módulos, acciones frecuentes y resolución de problemas.


## 1. Acceso y autenticación

- URL de inicio: https://tu-dominio-o-localhost
- Inicio de sesión: Navega a `Inicio de Sesión` en la barra superior o directamente a `/login`.
- Registro: Si tu institución lo permite, usa `Registrarse` o contacta al administrador.

Pasos de login:
1) Ingresa tu `usuario` y `contraseña`.
2) Presiona `Iniciar sesión`.
3) Serás redirigido automáticamente según tu rol:
   - Estudiante → `/dashboard-estudiante`
   - Profesor → `/dashboard-profesor`
   - Empresa → `/dashboard-empresa`
   - Administrador → `/admin` (Panel de roles y usuarios)

Si aparece “Matrícula inactiva”, contacta a tu coordinador o administrador.


## 2. Navegación general

- Barra superior fija: Logo, menús (Inicio, Programas, Nosotros, Contacto) y accesos a Inicio de sesión y Registro.
- Menú Programas: Lista de programas académicos.
- Footer: Información de contacto y políticas.

Sugerencias de uso:
- En desktop, usa el menú desplegable “Programas”.
- En móvil, la interfaz se adapta; algunos menús se compactan.


## 3. Página de inicio (Home)

- Encabezado con carrusel de imágenes.
  - Avance automático cada 5s.
  - Controles de flechas y puntos.
  - Pausa al pasar el mouse.

- Secciones informativas: ventajas, tarjetas de programas y CTA de contacto.


## 4. Roles y paneles

### 4.1 Estudiante (`/dashboard-estudiante`)
- Unidades: Consulta de unidades y materiales.
- Planeador: Organización de clases y actividades.
- Análisis de desempeño: Página de métricas y progreso.

### 4.2 Profesor (`/dashboard-profesor`)
- Mis clases: Lista de clases asignadas.
- Planeador y tareas: Gestión de planeación y tareas.
- Unidades: Acceso a materiales.

### 4.3 Empresa (`/dashboard-empresa`)
- Resumen: Panel con vista general.
- Estudiantes / Matrículas: Gestión de estudiantes vinculados.
- Unidades y análisis: Estadísticas del aprendizaje.

### 4.4 Administrador (`/admin`)
- Gestión de roles de usuario (buscar, filtrar y cambiar rol).
- Enlaces rápidos a métricas y unidades.


## 5. Uso del Panel de Administración (roles)

Acceso: Autenticado como admin → redirección automática a `/admin`.

Funciones principales:
1) Buscar usuarios por `username` o `email`.
2) Ver `rol actual` y seleccionar `nuevo rol`.
3) Presionar `Aplicar` para guardar el cambio.

Buenas prácticas:
- Filtra por correo institucional para evitar homónimos.
- Cambia de a un usuario por vez y verifica el mensaje de confirmación.


## 6. Contacto y soporte

- Opción `Contacto` en la barra superior.
- WhatsApp: Enlace directo si está habilitado.
- Soporte técnico: Contacta al administrador de la plataforma.


## 7. Preguntas frecuentes (FAQ)

- Olvidé mi usuario/contraseña
  - Usa la opción de recuperación (si está habilitada) o contacta al admin.

- No veo mis unidades
  - Verifica tu matrícula activa. Si sigue el problema, reporta a soporte.

- No puedo cambiar de rol
  - Solo administradores pueden modificar roles. Si eres admin y ves error, revisa tu token (botón “Probar conexión”).


## 8. Resolución de problemas

- La interfaz no cambia o “se ve igual” tras ajustes
  - Refresca con `Cmd+Shift+R` (Mac) o `Ctrl+F5` (Windows) para limpiar caché.

- Error de permisos (403)
  - Tu rol no tiene acceso a esa sección, verifica con el admin.

- Error de sesión
  - Cierra sesión y vuelve a iniciar. Verifica que tu navegador permite cookies/localStorage.


## 9. Accesibilidad y recomendaciones

- Navegación con teclado en los menús.
- Contraste del header mejorado y botones con foco visible.
- Para lectores de pantalla, se incluyen `aria-label` en controles del carrusel.


## 10. Glosario

- Matrícula: vínculo activo de un estudiante con un programa.
- Rol: tipo de usuario con permisos (estudiante, profesor, empresa, admin).
- Unidades: contenidos y materiales de aprendizaje.


## 11. Anexos

- Políticas de privacidad y Términos: ver enlaces del footer.
- Datos de contacto de BLS: ver sección “Contáctanos” o footer del sitio.

---

Sugerencias para extender el manual:
- Agregar capturas de pantalla clave: login, home, cada dashboard y panel admin.
- Crear guías rápidas por rol separadas (1 página por rol).
- Publicar este manual con **MkDocs** o **GitHub Pages** para acceso web.
