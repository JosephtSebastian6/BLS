# Sistema de Calificaciones V2 - Documentación Completa

## 🎯 Resumen Ejecutivo

El **Sistema de Calificaciones V2** es una solución unificada y consistente que reemplaza el sistema fragmentado anterior. Proporciona:

- ✅ **Consistencia total** entre todos los componentes
- ✅ **Sincronización automática** de datos
- ✅ **Validaciones robustas** en todos los niveles
- ✅ **Performance optimizada** con consultas eficientes
- ✅ **API moderna** con documentación completa
- ✅ **Transacciones atómicas** para integridad de datos

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **GradingService** (`grading_service.py`)
   - Servicio centralizado para toda la lógica de calificaciones
   - Maneja cálculos, validaciones y sincronización
   - Transacciones atómicas para integridad

2. **Grading Routes** (`grading_routes.py`)
   - Endpoints REST modernos y consistentes
   - Validación de entrada con Pydantic
   - Manejo robusto de errores

3. **Modelos de Datos** (existentes en `models.py`)
   - `TareaCalificacion` - Calificaciones de tareas individuales
   - `EstudianteQuizCalificacion` - Calificaciones de quizzes
   - `UnidadCalificacionFinal` - Overrides manuales
   - `EstudianteProgresoUnidad` - Progreso consolidado

---

## 📊 Flujo de Calificaciones

### 1. Calificación de Tareas
```
Profesor califica tarea → GradingService.update_task_grade() → 
Upsert TareaCalificacion → Sincronizar EstudianteProgresoUnidad → 
Recalcular nota final → Crear notificación
```

### 2. Calificación de Quizzes
```
Sistema/Profesor califica quiz → GradingService.update_quiz_grade() → 
Upsert EstudianteQuizCalificacion → Sincronizar EstudianteProgresoUnidad → 
Recalcular nota final → Crear notificación
```

### 3. Override Manual
```
Profesor/Admin override → GradingService.set_manual_override() → 
Upsert UnidadCalificacionFinal → Recalcular con override → 
Crear notificación
```

---

## 🔧 Configuración de Pesos

El sistema usa configuración centralizada en `settings.py`:

```python
GRADES_WT_TAREAS = 0.6      # 60% peso de tareas
GRADES_WT_QUIZ = 0.3        # 30% peso de quizzes  
GRADES_WT_TIEMPO = 0.1      # 10% peso de tiempo dedicado
GRADES_OBJETIVO_MIN = 120   # 120 minutos objetivo por unidad
GRADES_UMBRAL_APROBACION = 60  # 60 puntos para aprobar
```

### Fórmula de Cálculo

```
Nota Final = (Promedio_Tareas × Peso_Tareas) + 
             (Promedio_Quizzes × Peso_Quiz) + 
             (Score_Tiempo × Peso_Tiempo)

Score_Tiempo = min(100, (Tiempo_Dedicado_Min × 100) / Objetivo_Min)

Aprobado = (Nota_Final >= Umbral_Aprobacion) OR Override_Manual
```

---

## 🚀 API Endpoints V2

### Base URL: `/api/v2/grades`

#### 📋 Resumen de Calificaciones
```http
GET /estudiantes/{username}/resumen
```
**Respuesta:**
```json
{
  "username": "estudiante1",
  "resumen": {
    "total_unidades": 5,
    "unidades_aprobadas": 3,
    "unidades_pendientes": 2,
    "promedio_general": 78.5,
    "porcentaje_aprobacion": 60.0
  },
  "unidades": [...]
}
```

#### 📊 Calificación de Unidad
```http
GET /estudiantes/{username}/unidades/{unidad_id}
```
**Respuesta:**
```json
{
  "username": "estudiante1",
  "unidad_id": 1,
  "componentes": {
    "tareas": {
      "promedio": 85.5,
      "count": 4,
      "peso": 0.6
    },
    "quizzes": {
      "promedio": 78.0,
      "count": 2,
      "peso": 0.3
    },
    "tiempo": {
      "minutos": 150,
      "score": 100,
      "objetivo": 120,
      "peso": 0.1
    }
  },
  "calificacion_final": {
    "nota": 82,
    "aprobado": true,
    "umbral_aprobacion": 60,
    "override_manual": false
  }
}
```

#### ✏️ Actualizar Calificación de Tarea
```http
POST /tareas
Content-Type: application/json

{
  "estudiante_username": "estudiante1",
  "unidad_id": 1,
  "filename": "tarea1.pdf",
  "score": 85
}
```

#### 🧩 Actualizar Calificación de Quiz
```http
POST /quizzes
Content-Type: application/json

{
  "estudiante_username": "estudiante1",
  "unidad_id": 1,
  "quiz_id": 5,
  "score": 78
}
```

#### 🔧 Override Manual
```http
POST /override
Content-Type: application/json

{
  "estudiante_username": "estudiante1",
  "unidad_id": 1,
  "score": 90,
  "aprobado": true
}
```

#### 📈 Estadísticas Generales
```http
GET /estadisticas/general
```

#### 📜 Historial de Calificaciones
```http
GET /estudiantes/{username}/historial?unidad_id=1&limit=50
```

---

## 🔧 Endpoints de Administración

### Sincronización Masiva
```http
POST /admin/sync-all-grades
```
Sincroniza todas las calificaciones existentes con el nuevo sistema.

### Validación de Consistencia
```http
GET /admin/validate-consistency
```
Verifica la consistencia de todos los datos de calificaciones.

---

## 🧪 Testing

### Script de Pruebas Automatizadas
```bash
cd /Users/sena/Desktop/Ingles/back
python test_grading_system.py
```

### Pruebas Incluidas:
- ✅ Validación de consistencia
- ✅ Resumen de calificaciones
- ✅ Cálculo de calificación de unidad
- ✅ Actualización de calificación de tarea
- ✅ Estadísticas generales
- ✅ Historial de calificaciones
- ✅ Sincronización masiva

---

## 🔄 Migración desde Sistema Anterior

### Paso 1: Validar Estado Actual
```http
GET /api/v2/grades/admin/validate-consistency
```

### Paso 2: Sincronizar Datos
```http
POST /api/v2/grades/admin/sync-all-grades
```

### Paso 3: Verificar Resultados
```http
GET /api/v2/grades/admin/validate-consistency
```

### Paso 4: Actualizar Frontend
- Cambiar endpoints a `/api/v2/grades/*`
- Usar nuevos formatos de respuesta
- Implementar manejo de errores mejorado

---

## 🛡️ Seguridad y Validaciones

### Validaciones de Entrada
- ✅ Scores entre 0-100
- ✅ Usuarios existentes
- ✅ Unidades válidas
- ✅ Quizzes pertenecientes a unidades correctas

### Autorización
- ✅ Solo profesores/empresa/admin pueden calificar
- ✅ Profesores solo ven estudiantes asignados
- ✅ Endpoints de admin requieren permisos especiales

### Integridad de Datos
- ✅ Transacciones atómicas
- ✅ Rollback en caso de error
- ✅ Sincronización automática
- ✅ Validación de consistencia

---

## 📈 Performance y Optimización

### Consultas Optimizadas
- ✅ Índices en campos clave
- ✅ Consultas batch para múltiples registros
- ✅ Lazy loading de datos relacionados

### Caching (Futuro)
- 📋 Cache de cálculos de calificaciones
- 📋 Invalidación automática en actualizaciones
- 📋 Cache de estadísticas generales

---

## 🚨 Manejo de Errores

### Tipos de Error
1. **ValidationError** - Datos de entrada inválidos
2. **NotFoundError** - Recursos no encontrados
3. **PermissionError** - Permisos insuficientes
4. **DatabaseError** - Errores de base de datos
5. **CalculationError** - Errores en cálculos

### Respuestas de Error
```json
{
  "success": false,
  "error": "Descripción del error",
  "error_code": "VALIDATION_ERROR",
  "details": {...}
}
```

---

## 📋 Checklist de Implementación

### Backend ✅
- [x] GradingService implementado
- [x] Endpoints V2 creados
- [x] Validaciones implementadas
- [x] Tests automatizados
- [x] Documentación completa
- [x] Endpoints de admin
- [x] Manejo de errores robusto

### Frontend 📋
- [ ] Actualizar servicios Angular
- [ ] Migrar componentes a nuevos endpoints
- [ ] Implementar manejo de errores mejorado
- [ ] Actualizar interfaces de usuario
- [ ] Tests de integración

### Base de Datos ✅
- [x] Modelos existentes validados
- [x] Índices optimizados
- [x] Constraints de integridad

---

## 🎯 Beneficios del Nuevo Sistema

### Para Desarrolladores
- 🔧 **Código más limpio** y mantenible
- 🧪 **Tests automatizados** para confiabilidad
- 📚 **Documentación completa** para facilitar desarrollo
- 🔄 **API consistente** en todos los endpoints

### Para Usuarios
- ⚡ **Performance mejorada** en cálculos
- 🎯 **Datos siempre consistentes** entre pantallas
- 🔔 **Notificaciones automáticas** de calificaciones
- 📊 **Reportes más precisos** y detallados

### Para Administradores
- 🔍 **Herramientas de diagnóstico** integradas
- 🔄 **Sincronización automática** de datos
- 📈 **Estadísticas en tiempo real**
- 🛡️ **Validaciones robustas** de integridad

---

## 📞 Soporte y Mantenimiento

### Logs del Sistema
Los logs se encuentran en la consola del servidor con prefijos:
- `[INFO]` - Operaciones normales
- `[WARN]` - Advertencias no críticas
- `[ERROR]` - Errores que requieren atención

### Monitoreo
- Validar consistencia semanalmente
- Revisar logs de errores diariamente
- Ejecutar tests automatizados en cada deploy

### Contacto
Para soporte técnico o preguntas sobre el sistema, contactar al equipo de desarrollo.

---

*Documentación actualizada: Noviembre 2025*
*Sistema de Calificaciones V2 - Plataforma Educativa BLS*
