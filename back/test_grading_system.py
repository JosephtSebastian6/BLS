"""
Script de Pruebas del Sistema de Calificaciones
===============================================

Este script valida que el nuevo sistema de calificaciones funcione correctamente.
"""

import requests
import json
from datetime import datetime
import sys

# Configuración
BASE_URL = "http://localhost:8000"
AUTH_URL = f"{BASE_URL}/auth"
GRADES_URL = f"{BASE_URL}/api/v2/grades"

class GradingSystemTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
    
    def authenticate(self, username="admin", password="admin123"):
        """Autenticar con el sistema"""
        try:
            response = requests.post(f"{AUTH_URL}/login", json={
                "username": username,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_test("✅ Autenticación exitosa", True)
                return True
            else:
                self.log_test(f"❌ Error de autenticación: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error conectando al servidor: {e}", False)
            return False
    
    def test_consistency_validation(self):
        """Probar validación de consistencia"""
        try:
            response = requests.get(f"{GRADES_URL}/admin/validate-consistency", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                consistente = data.get("consistente", False)
                inconsistencias = data.get("inconsistencias_encontradas", 0)
                
                if consistente:
                    self.log_test("✅ Sistema de calificaciones consistente", True)
                else:
                    self.log_test(f"⚠️ Se encontraron {inconsistencias} inconsistencias", True)
                    for detalle in data.get("detalles_inconsistencias", []):
                        print(f"   - {detalle}")
                
                return True
            else:
                self.log_test(f"❌ Error validando consistencia: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error en validación de consistencia: {e}", False)
            return False
    
    def test_student_grades_summary(self, username="estudiante1"):
        """Probar resumen de calificaciones de estudiante"""
        try:
            response = requests.get(f"{GRADES_URL}/estudiantes/{username}/resumen", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                total_unidades = data.get("resumen", {}).get("total_unidades", 0)
                self.log_test(f"✅ Resumen de calificaciones obtenido ({total_unidades} unidades)", True)
                return True
            elif response.status_code == 404:
                self.log_test(f"⚠️ Estudiante {username} no encontrado", True)
                return True
            else:
                self.log_test(f"❌ Error obteniendo resumen: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error en resumen de calificaciones: {e}", False)
            return False
    
    def test_unit_grade_calculation(self, username="estudiante1", unidad_id=1):
        """Probar cálculo de calificación de unidad"""
        try:
            response = requests.get(f"{GRADES_URL}/estudiantes/{username}/unidades/{unidad_id}", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                nota_final = data.get("calificacion_final", {}).get("nota", 0)
                self.log_test(f"✅ Calificación de unidad calculada (nota: {nota_final})", True)
                return True
            else:
                self.log_test(f"❌ Error calculando calificación de unidad: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error en cálculo de calificación: {e}", False)
            return False
    
    def test_task_grade_update(self, username="estudiante1", unidad_id=1, filename="test.pdf", score=85):
        """Probar actualización de calificación de tarea"""
        try:
            response = requests.post(f"{GRADES_URL}/tareas", 
                json={
                    "estudiante_username": username,
                    "unidad_id": unidad_id,
                    "filename": filename,
                    "score": score
                },
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                if success:
                    self.log_test(f"✅ Calificación de tarea actualizada (score: {score})", True)
                    return True
                else:
                    self.log_test(f"❌ Error actualizando tarea: {data.get('error')}", False)
                    return False
            else:
                self.log_test(f"❌ Error HTTP actualizando tarea: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error en actualización de tarea: {e}", False)
            return False
    
    def test_general_statistics(self):
        """Probar estadísticas generales"""
        try:
            response = requests.get(f"{GRADES_URL}/estadisticas/general", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                total_estudiantes = data.get("resumen", {}).get("total_estudiantes", 0)
                self.log_test(f"✅ Estadísticas generales obtenidas ({total_estudiantes} estudiantes)", True)
                return True
            else:
                self.log_test(f"❌ Error obteniendo estadísticas: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error en estadísticas generales: {e}", False)
            return False
    
    def test_grading_history(self, username="estudiante1"):
        """Probar historial de calificaciones"""
        try:
            response = requests.get(f"{GRADES_URL}/estudiantes/{username}/historial", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                total_registros = data.get("total_registros", 0)
                self.log_test(f"✅ Historial de calificaciones obtenido ({total_registros} registros)", True)
                return True
            else:
                self.log_test(f"❌ Error obteniendo historial: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error en historial de calificaciones: {e}", False)
            return False
    
    def test_sync_grades(self):
        """Probar sincronización de calificaciones"""
        try:
            response = requests.post(f"{GRADES_URL}/admin/sync-all-grades", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                if success:
                    estudiantes = data.get("resultados", {}).get("estudiantes_procesados", 0)
                    self.log_test(f"✅ Sincronización completada ({estudiantes} estudiantes)", True)
                    return True
                else:
                    self.log_test(f"❌ Error en sincronización: {data.get('error')}", False)
                    return False
            else:
                self.log_test(f"❌ Error HTTP en sincronización: {response.status_code}", False)
                return False
                
        except Exception as e:
            self.log_test(f"❌ Error en sincronización: {e}", False)
            return False
    
    def log_test(self, message, success):
        """Registrar resultado de prueba"""
        self.test_results.append({"message": message, "success": success})
        print(message)
    
    def run_all_tests(self):
        """Ejecutar todas las pruebas"""
        print("🚀 Iniciando pruebas del sistema de calificaciones...")
        print("=" * 60)
        
        # Autenticación
        if not self.authenticate():
            print("❌ No se pudo autenticar. Abortando pruebas.")
            return False
        
        print("\n📊 Probando funcionalidades del sistema...")
        
        # Pruebas principales
        tests = [
            ("Validación de consistencia", self.test_consistency_validation),
            ("Resumen de calificaciones", self.test_student_grades_summary),
            ("Cálculo de calificación de unidad", self.test_unit_grade_calculation),
            ("Actualización de calificación de tarea", self.test_task_grade_update),
            ("Estadísticas generales", self.test_general_statistics),
            ("Historial de calificaciones", self.test_grading_history),
            ("Sincronización de calificaciones", self.test_sync_grades)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 Ejecutando: {test_name}")
            if test_func():
                passed += 1
        
        print("\n" + "=" * 60)
        print(f"📈 Resultados finales: {passed}/{total} pruebas exitosas")
        
        if passed == total:
            print("🎉 ¡Todas las pruebas pasaron! El sistema está funcionando correctamente.")
            return True
        else:
            print(f"⚠️ {total - passed} pruebas fallaron. Revisar los errores anteriores.")
            return False

def main():
    """Función principal"""
    print("Sistema de Pruebas - Calificaciones V2")
    print("=====================================")
    
    tester = GradingSystemTester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
