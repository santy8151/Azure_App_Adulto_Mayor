# 🌿 VidaPlena – App para Adulto Mayor

> Aplicación web asistida por inteligencia artificial para mejorar la calidad de vida de los adultos mayores. Backend en Java (Spring Boot) desplegado en Azure, frontend en React + TypeScript.

---

## 📋 Tabla de contenido

- [Descripción](#descripción)
- [Características](#características)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación y configuración](#instalación-y-configuración)
  - [Backend (Java Spring Boot)](#backend-java-spring-boot)
  - [Frontend (React TypeScript)](#frontend-react-typescript)
- [Despliegue en Azure](#despliegue-en-azure)
- [Variables de entorno](#variables-de-entorno)
- [Módulos de la app](#módulos-de-la-app)
- [API Reference](#api-reference)
- [Seguridad](#seguridad)
- [Contribuir](#contribuir)

---

## Descripción

**VidaPlena** es una aplicación diseñada para adultos mayores en Colombia que integra un asistente de inteligencia artificial (Claude por Anthropic), recordatorios de medicamentos, monitoreo de signos vitales, agenda de actividades, contactos de confianza y notas personales, todo en una interfaz accesible con tipografía grande y contraste adecuado.

---

## Características

| Módulo | Funcionalidad |
|--------|--------------|
| 💬 **Chat IA** | Asistente conversacional impulsado por Claude (Anthropic), historial multi-turno, acciones rápidas |
| 💊 **Medicamentos** | Lista de medicamentos, marcado como tomado, barra de progreso diaria |
| 📊 **Signos Vitales** | Pulso, presión, temperatura, O₂, glucosa, peso; historial semanal |
| 📅 **Agenda** | Actividades médicas, sociales, ejercicio y ocio; marcado de completadas |
| 📞 **Contactos** | Contactos de confianza con llamada directa, número de emergencias 123 |
| 📝 **Notas** | Notas personales por categoría (salud, familia, general) |
| 🆘 **Emergencia** | Botón SOS con alerta animada y datos de contactos clave |

---

## Arquitectura

```
┌─────────────────────────────────────┐
│        Frontend (React + TS)        │
│   Azure Static Web Apps / Vercel    │
└────────────────┬────────────────────┘
                 │ POST /api/chat
                 │ (JSON, sin API Key expuesta)
┌────────────────▼────────────────────┐
│     Backend Java 17 – Spring Boot   │
│        Azure App Service (B2)       │
│                                     │
│  ChatController  →  ClaudeService   │
│  (REST API)         (HTTP Client)   │
└────────────────┬────────────────────┘
                 │ HTTPS + x-api-key
                 │ (API Key solo en Azure)
┌────────────────▼────────────────────┐
│     Anthropic API – Claude          │
│   api.anthropic.com/v1/messages     │
└─────────────────────────────────────┘
```

La **API Key de Anthropic nunca se expone al frontend**. Vive como variable de entorno en Azure App Service.

---

## Tecnologías

### Backend
- Java 17
- Spring Boot 3.2
- Spring Data JPA
- Microsoft SQL Server Driver (Azure SQL)
- Spring Security
- Spring Actuator (health checks)
- Azure Application Insights

### Frontend
- React 18
- TypeScript 5
- Vite (bundler)
- Nunito + Lora (Google Fonts)
- CSS-in-JS (sin librerías externas de UI)

### Infraestructura Azure
| Servicio Azure | Uso |
|----------------|-----|
| **Azure App Service** | Hosting del backend Spring Boot (Linux, Java 17) |
| **Azure SQL Database** | Base de datos de usuarios y datos médicos |
| **Azure Bot Service** | Integración del asistente virtual (opcional) |
| **Azure Notification Hubs** | Notificaciones push a dispositivos móviles |
| **Azure Functions** | Recordatorios automáticos programados |
| **Azure Static Web Apps** | Hosting del frontend React |
| **Azure Application Insights** | Monitoreo y telemetría |
| **Azure Key Vault** | Gestión segura de secretos y API keys |

### CI/CD
- Azure DevOps Pipelines
- Git (control de versiones)

---

## Estructura del proyecto

```
vidaplena/
├── backend/
│   ├── src/main/java/com/vidaplena/
│   │   ├── controller/
│   │   │   └── ChatController.java       # Endpoint REST /api/chat
│   │   ├── service/
│   │   │   └── ClaudeService.java        # Llamada segura a Anthropic
│   │   ├── dto/
│   │   │   ├── ChatRequest.java          # DTO de entrada
│   │   │   └── ChatResponse.java         # DTO de salida
│   │   └── VidaPlenaApplication.java     # Main class
│   ├── src/main/resources/
│   │   └── application.properties        # Configuración con variables de entorno
│   └── pom.xml                           # Dependencias Maven + plugin Azure
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                       # Entrada principal
│   │   └── vidaplena-app.tsx             # Componente principal con todos los módulos
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

---

## Instalación y configuración

### Backend (Java Spring Boot)

#### Prerrequisitos
- Java 17+
- Maven 3.8+
- Cuenta Azure con suscripción activa

#### Clonar y configurar

```bash
git clone https://github.com/tu-usuario/vidaplena.git
cd vidaplena/backend
```

#### Configurar variables de entorno locales

Crea un archivo `.env` o configura las variables en tu sistema:

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
export AZURE_SQL_URL=jdbc:sqlserver://tu-servidor.database.windows.net:1433;database=vidaplena
export AZURE_SQL_USER=admin
export AZURE_SQL_PASSWORD=tu-password-seguro
```

#### Ejecutar en local

```bash
mvn spring-boot:run
```

El backend estará disponible en `http://localhost:8080`.

Verificar que funciona:

```bash
curl http://localhost:8080/api/chat/health
# Respuesta: VidaPlena API activa ✅
```

#### Compilar para producción

```bash
mvn clean package -DskipTests
# Genera: target/backend-1.0.0.jar
```

---

### Frontend (React TypeScript)

#### Prerrequisitos
- Node.js 18+
- npm o yarn

#### Instalar dependencias

```bash
cd vidaplena/frontend
npm install
```

#### Configurar URL del backend

En `src/vidaplena-app.tsx`, la URL del backend se configura directamente en la interfaz (barra de configuración superior). También puedes definirla como variable de entorno:

```bash
# .env.local
VITE_BACKEND_URL=https://vidaplena-backend.azurewebsites.net
```

#### Ejecutar en desarrollo

```bash
npm run dev
# Disponible en http://localhost:5173
```

#### Compilar para producción

```bash
npm run build
# Genera la carpeta dist/
```

---

## Despliegue en Azure

### 1. Backend – Azure App Service

#### Opción A: Maven Plugin (recomendado)

```bash
# Asegúrate de tener Azure CLI instalado y autenticado
az login

# Desplegar directamente con Maven
mvn azure-webapp:deploy
```

#### Opción B: Azure CLI

```bash
# Crear grupo de recursos
az group create --name vidaplena-rg --location eastus

# Crear App Service Plan
az appservice plan create \
  --name vidaplena-plan \
  --resource-group vidaplena-rg \
  --sku B2 \
  --is-linux

# Crear Web App con Java 17
az webapp create \
  --resource-group vidaplena-rg \
  --plan vidaplena-plan \
  --name vidaplena-backend \
  --runtime "JAVA:17-java17"

# Desplegar el JAR
az webapp deploy \
  --resource-group vidaplena-rg \
  --name vidaplena-backend \
  --src-path target/backend-1.0.0.jar \
  --type jar
```

### 2. Frontend – Azure Static Web Apps

```bash
# Compilar
npm run build

# Desplegar con Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
swa deploy ./dist \
  --deployment-token $AZURE_STATIC_WEB_APPS_API_TOKEN \
  --env production
```

---

## Variables de entorno

Configura estas variables en **Azure Portal → App Service → Configuration → Application Settings**:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API Key de Anthropic (Claude) | `sk-ant-api03-...` |
| `AZURE_SQL_URL` | JDBC URL de Azure SQL Database | `jdbc:sqlserver://...` |
| `AZURE_SQL_USER` | Usuario de la base de datos | `adminvidaplena` |
| `AZURE_SQL_PASSWORD` | Contraseña de la base de datos | `P@ssw0rd!` |
| `APPINSIGHTS_KEY` | Clave de Application Insights | `xxxxxxxx-xxxx-...` |

> **Importante:** Nunca subas las API Keys al repositorio. Usa `.gitignore` y variables de entorno siempre.

---

## Módulos de la app

### 💬 Chat IA
El asistente responde con contexto especializado para adultos mayores colombianos. Maneja el historial completo de la conversación y tiene un system prompt que define su personalidad cálida y paciente.

El flujo de la llamada es:
```
Frontend → POST /api/chat (backend Azure) → Anthropic Claude API → respuesta
```

### 💊 Medicamentos
Muestra los medicamentos del día con horario, dosis e ícono. Al tocar un medicamento, se marca como tomado y se actualiza la barra de progreso. Persiste el estado en memoria durante la sesión (se puede conectar a Azure SQL para persistencia real).

### 📊 Signos Vitales
Panel con 6 métricas de salud con indicadores de tendencia (subiendo/bajando/estable). Incluye historial simulado de la semana en forma de barra de progreso. Se puede conectar a dispositivos IoT vía Azure IoT Hub.

### 📅 Agenda
Actividades organizadas por día con cuatro categorías: médica (🩺), ejercicio (🏃), social (👨‍👩‍👦) y ocio (📚). Se pueden marcar como completadas.

### 📞 Contactos
Lista de contactos de confianza con botón de llamada directa (`tel:` link). El número de emergencias 123 se destaca visualmente en rojo.

### 📝 Notas
Notas personales categorizadas (salud, familia, general) con fecha y posibilidad de eliminar. Se guardan en el estado local del componente.

---

## API Reference

### `POST /api/chat`

Envía un mensaje al asistente IA.

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "¿Cuáles son mis medicamentos de hoy?" },
    { "role": "assistant", "content": "Hoy tienes Metformina a las 8AM..." },
    { "role": "user", "content": "¿Y para qué sirve la Metformina?" }
  ]
}
```

**Response:**
```json
{
  "reply": "La Metformina es un medicamento para controlar el azúcar en la sangre..."
}
```

**Códigos de respuesta:**
- `200 OK` – Respuesta exitosa del asistente
- `500 Internal Server Error` – Error al comunicarse con Anthropic

---

### `GET /api/chat/health`

Verifica que el servicio esté activo.

**Response:**
```
VidaPlena API activa ✅
```

---

## Seguridad

- La **API Key de Anthropic** se guarda como variable de entorno en Azure, nunca en el código fuente ni en el frontend.
- Configurar **CORS** en `ChatController.java` para permitir solo el dominio del frontend en producción:
  ```java
  @CrossOrigin(origins = "https://tu-app.azurestaticapps.net")
  ```
- Usar **Azure Key Vault** para gestión avanzada de secretos en producción.
- Habilitar **HTTPS** obligatorio en Azure App Service.
- Agregar autenticación de usuarios con **Azure Active Directory B2C** (recomendado para producción).

---

## Contribuir

1. Haz un fork del repositorio.
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Haz commit de tus cambios: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request.

---

## Licencia

MIT © 2026 VidaPlena – Corporación Unificada Nacional de Educación Superior (CUN)

---

> Desarrollado con ❤️ para mejorar la calidad de vida de los adultos mayores en Colombia.
