
# Furlong Logística AI - Plataforma de Gestión Inteligente

![Version](https://img.shields.io/badge/version-1.0.0-red)
![Status](https://img.shields.io/badge/status-stable-green)
![Tech](https://img.shields.io/badge/tech-React%20%7C%20TypeScript%20%7C%20Gemini%20AI-blue)

Aplicación web progresiva (PWA) diseñada para la gestión logística de **Transporte Furlong**. Permite la consolidación de gastos, gestión de flota y procesamiento inteligente de documentos mediante Inteligencia Artificial (Google Gemini).

## 🚀 Características Principales

### 1. Tablero de Control (Dashboard)
- Visualización de KPIs financieros en tiempo real.
- Gráficos de distribución de gastos por proveedor.
- Alertas de flota activa vs inactiva.

### 2. Base Maestra de Flota (Motor V2)
- **Lectura Matricial Inteligente:** Capacidad para leer archivos Excel complejos y múltiples hojas simultáneamente.
- **Mapeo de Columnas:** Detección automática de:
  - `PATENTE`
  - `RESPONSABLE DE USUARIO`
  - `NUMERO DE TAG`
  - `EQUIPOS`
- **Deduplicación:** Lógica para unificar registros repetidos y mantener la base limpia (ej: 816 filas -> Registros Únicos).

### 3. Procesamiento con IA (Gemini Flash 2.5)
- **Lectura de PDFs:** Extracción automática de tablas de resúmenes bancarios y facturas.
- **Clasificación de Gastos:** Categorización automática de peajes, combustible y mantenimiento.
- **Normalización:** Estandarización de formatos de fecha y moneda.

### 4. Gestión de Gastos y Tarjetas
- Conciliación de resúmenes de tarjetas corporativas.
- Detección automática de vencimientos y totales.
- Auditoría de gastos por tarjeta/chofer.

### 5. Arquitectura Local-First
- **IndexedDB:** Todos los datos persisten en el navegador del usuario de forma segura.
- **Seguridad:** Logs de auditoría de acciones (Creación, Borrado, Login).
- **Exportación:** Generación de reportes nativos en Excel (.xlsx).

## 🛠️ Tecnologías

- **Frontend:** React 18, TypeScript.
- **Estilos:** Tailwind CSS (Diseño "Furlong Corporate").
- **IA:** Google GenAI SDK (Gemini 2.5 Flash).
- **Datos:** XLSX (SheetJS), IndexedDB.
- **Gráficos:** Recharts.
- **Iconos:** Lucide React.

## 📦 Uso del Sistema

1. **Login:** Ingrese con credenciales administrativas.
2. **Carga de Base:** En la sección "Centro de Carga", suba el Excel de flota (Soporta columnas Patente, Tag, Responsable, Equipos).
3. **Procesamiento:** Arrastre PDFs de gastos para que la IA extraiga los ítems.
4. **Reportes:** Descargue el Excel consolidado desde la vista de Reportes.

---
**Transporte Furlong © 2024** - Departamento de Sistemas
