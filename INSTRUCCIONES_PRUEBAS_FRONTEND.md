# 🧪 Instrucciones para Probar el Sistema de Calificaciones V2 desde el Frontend

## 🚀 Pasos para Probar

### 1. **Iniciar el Backend**
```bash
cd /Users/sena/Desktop/Ingles/back
python -m uvicorn main:AcademyEnApp --reload --host 0.0.0.0 --port 8000
```

### 2. **Iniciar el Frontend**
```bash
cd /Users/sena/Desktop/Ingles/ingles-frontend
ng serve
```

### 3. **Acceder al Componente de Pruebas**

#### **Opción A: Como Empresa**
1. Ve a: `http://localhost:4200/login`
2. Inicia sesión como empresa
3. Navega a: `http://localhost:4200/dashboard-empresa/grading-test`

#### **Opción B: Como Profesor**
1. Ve a: `http://localhost:4200/login`
2. Inicia sesión como profesor
3. Navega a: `http://localhost:4200/dashboard-profesor/grading-test`

---

## 🧪 Funcionalidades de Prueba Disponibles

### **Panel de Control**
- **Username del estudiante**: Cambia el estudiante a probar (ej: `estudiante1`)
- **ID de unidad**: Cambia la unidad a probar (ej: `1`)
- **Ejecutar Todas las Pruebas**: Ejecuta la suite completa de pruebas

### **Pruebas Automáticas Incluidas**
1. ✅ **Resumen del Estudiante** - Carga resumen completo de calificaciones
2. ✅ **Detalle de Unidad** - Carga calificación detallada de una unidad
3. ✅ **Estadísticas Generales** - Carga estadísticas del sistema
4. ✅ **Validación de Consistencia** - Verifica integridad de datos

### **Acciones de Prueba Manual**
- 📝 **Probar Calificación de Tarea** - Actualiza una calificación de tarea
- 🔍 **Validar Consistencia** - Ejecuta validación de integridad
- 🔄 **Sincronizar Calificaciones** - Sincroniza datos existentes

---

## 📊 Qué Verás en las Pruebas

### **Resumen del Estudiante**
```
✅ Resumen del Estudiante: estudiante1
- Total Unidades: 5
- Aprobadas: 3  
- Promedio: 78.5%
```

### **Detalle de Unidad**
```
📋 Detalle Unidad 1
📝 Tareas: 85% (4 tareas)
🧩 Quizzes: 78% (2 quizzes)  
⏱️ Tiempo: 100% (150 min)
🎯 Nota Final: 82% - Aprobado
```

### **Estadísticas Generales**
```
📈 Estadísticas Generales
- 25 Estudiantes
- 120 Tareas Calificadas
- 45 Quizzes Calificados
- 83% Promedio Tareas
```

### **Log de Resultados**
```
10:30:15 🚀 Componente de pruebas inicializado
10:30:16 ✅ Resumen del estudiante cargado: 5 unidades
10:30:17 ✅ Detalle de unidad cargado: Nota 82%
10:30:18 ✅ Estadísticas generales cargadas: 25 estudiantes
```

---

## 🔧 Endpoints que se Están Probando

### **Nuevos Endpoints V2:**
- `GET /api/v2/grades/estudiantes/{username}/resumen`
- `GET /api/v2/grades/estudiantes/{username}/unidades/{unidad_id}`
- `POST /api/v2/grades/tareas`
- `POST /api/v2/grades/quizzes`
- `GET /api/v2/grades/estadisticas/general`
- `GET /api/v2/grades/admin/validate-consistency`
- `POST /api/v2/grades/admin/sync-all-grades`

---

## 🚨 Posibles Errores y Soluciones

### **Error 401 - No autorizado**
- **Causa**: Token expirado o inválido
- **Solución**: Vuelve a iniciar sesión

### **Error 404 - Estudiante no encontrado**
- **Causa**: El username no existe
- **Solución**: Cambia el username a uno válido (ej: `estudiante1`)

### **Error 500 - Error del servidor**
- **Causa**: Backend no está corriendo o hay error en la base de datos
- **Solución**: Verifica que el backend esté corriendo en puerto 8000

### **Error de CORS**
- **Causa**: Frontend y backend en puertos diferentes
- **Solución**: Verifica que el backend permita requests desde localhost:4200

---

## 🎯 Casos de Prueba Recomendados

### **Caso 1: Estudiante con Datos Completos**
```
Username: estudiante1
Unidad ID: 1
Esperado: Datos completos con tareas, quizzes y tiempo
```

### **Caso 2: Estudiante Nuevo (Sin Datos)**
```
Username: estudiante_nuevo
Unidad ID: 1  
Esperado: Valores en 0 o null, pero sin errores
```

### **Caso 3: Unidad Inexistente**
```
Username: estudiante1
Unidad ID: 999
Esperado: Error controlado o datos vacíos
```

### **Caso 4: Calificación de Tarea**
```
Acción: Probar Calificación de Tarea
Esperado: Score actualizado y recálculo automático
```

---

## 📈 Métricas de Éxito

### **✅ Prueba Exitosa Si:**
- Todas las requests devuelven status 200
- Los datos se muestran correctamente en la UI
- Las calificaciones se actualizan en tiempo real
- No hay errores en la consola del navegador
- El log muestra mensajes de éxito (✅)

### **❌ Revisar Si:**
- Hay errores 500 en el backend
- Los datos no se cargan
- Las actualizaciones no se reflejan
- Hay errores de TypeScript en la consola

---

## 🔍 Debug y Monitoreo

### **Consola del Navegador**
- Abre DevTools (F12)
- Ve a la pestaña Console
- Busca logs del componente: `[SUCCESS]`, `[ERROR]`, `[INFO]`

### **Network Tab**
- Ve las requests HTTP en tiempo real
- Verifica status codes y responses
- Revisa headers de autenticación

### **Backend Logs**
- Revisa la consola donde corre el backend
- Busca logs con `[INFO]`, `[WARN]`, `[ERROR]`

---

## 🎉 ¡Listo para Probar!

1. **Inicia backend y frontend**
2. **Inicia sesión como empresa o profesor**  
3. **Ve a `/grading-test`**
4. **Ejecuta las pruebas**
5. **Revisa los resultados**

**¡El nuevo sistema de calificaciones está listo para ser probado desde el frontend!** 🚀

---

*Documentación de pruebas - Sistema de Calificaciones V2*
*Noviembre 2025 - Plataforma Educativa BLS*
