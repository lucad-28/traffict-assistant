# Deployment Guide - Traffic Chatbot on Vercel

Este es el guide completo para desplegar el Traffic Chatbot en Vercel con el backend integrado.

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│              Vercel Deployment                       │
│  ┌───────────────────────────────────────────────┐  │
│  │         Next.js Application                   │  │
│  │                                                │  │
│  │  ┌──────────────┐      ┌──────────────┐      │  │
│  │  │   Frontend   │      │  API Routes  │      │  │
│  │  │   (React)    │◄────►│  (Backend)   │      │  │
│  │  └──────────────┘      └──────┬───────┘      │  │
│  │                               │               │  │
│  │                               │               │  │
│  │                    ┌──────────▼─────────┐    │  │
│  │                    │   MCP Client       │    │  │
│  │                    │   + LLM Service    │    │  │
│  │                    └──────────┬─────────┘    │  │
│  └───────────────────────────────┼──────────────┘  │
└────────────────────────────────┼─────────────────┘
                                  │
                                  │ SSE
                                  │
                    ┌─────────────▼──────────────┐
                    │   MCP Server (Externo)     │
                    │   Puerto 8080 o Cloud      │
                    └────────────────────────────┘
```

## Características

✅ **Backend Integrado**: No necesitas servidor Python separado
✅ **Serverless**: Escala automáticamente con Vercel
✅ **API Routes**: Backend en TypeScript/Next.js
✅ **Session Management**: Manejo de sesiones en memoria
✅ **Claude Integration**: Integración directa con Anthropic API
✅ **MCP Tools**: Conexión con servidor MCP via SSE

## Pre-requisitos

### 1. Cuentas Necesarias

- [ ] Cuenta de [Vercel](https://vercel.com) (gratuita)
- [ ] API Key de [Anthropic](https://console.anthropic.com)
- [ ] Servidor MCP desplegado y accesible (o local para desarrollo)

### 2. Instalaciones Locales

```bash
# Node.js 18+
node --version

# npm o yarn
npm --version
```

## Configuración Local

### Paso 1: Instalar Dependencias

```bash
cd traffic-chatbot
npm install
```

### Paso 2: Configurar Variables de Entorno

Crea un archivo `.env.local`:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus valores:

```env
# REQUERIDO: Tu API key de Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui

# REQUERIDO: URL de tu servidor MCP
# Para desarrollo local:
MCP_SERVER_URL=http://localhost:8080/sse

# Para producción (después de desplegar MCP server):
# MCP_SERVER_URL=https://tu-mcp-server.railway.app/sse

# REQUERIDO: API key para autenticar con MCP server
MCP_API_KEY=your-secure-api-key-here
```

### Paso 3: Iniciar Servidor MCP (Local)

En otra terminal:

```bash
cd ../traffic_mcp_server
python server.py
```

Deberías ver:
```
INFO:server:Starting Traffic MCP Server with SSE transport
INFO:server:Server will listen on 0.0.0.0:8080
```

### Paso 4: Ejecutar Localmente

```bash
cd traffic-chatbot
npm run dev
```

Abre http://localhost:3000

## Deployment a Vercel

### Opción 1: Deploy via CLI (Recomendado)

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login a Vercel

```bash
vercel login
```

#### 3. Configurar Variables de Entorno

```bash
# En el directorio traffic-chatbot/
vercel env add ANTHROPIC_API_KEY
# Pega tu API key cuando se solicite

vercel env add MCP_SERVER_URL
# Pega la URL de tu MCP server (ej: https://tu-server.com/sse)

vercel env add MCP_API_KEY
# Pega tu API key del MCP server
```

#### 4. Deploy

```bash
# Deploy a preview
vercel

# Deploy a producción
vercel --prod
```

### Opción 2: Deploy via GitHub

#### 1. Sube tu código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/traffic-chatbot.git
git push -u origin main
```

#### 2. Conecta con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New Project"
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno:
   - `ANTHROPIC_API_KEY`
   - `MCP_SERVER_URL`
   - `MCP_API_KEY`

#### 3. Deploy

Vercel automáticamente:
- Detectará Next.js
- Instalará dependencias
- Compilará la aplicación
- Desplegará

## Desplegar el MCP Server

El MCP server debe estar accesible desde internet. Opciones:

### Opción A: Railway.app (Recomendado)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# En el directorio traffic_mcp_server/
railway init
railway up

# Obtener la URL
railway domain
```

Tu URL será algo como: `https://traffic-mcp-server.railway.app`

Usa esta URL + `/sse` en `MCP_SERVER_URL`:
```
MCP_SERVER_URL=https://traffic-mcp-server.railway.app/sse
```

### Opción B: Render.com

1. Ve a [render.com](https://render.com)
2. Crear "New Web Service"
3. Conecta tu repositorio
4. Configuración:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python server.py`
   - Environment Variables:
     - `TRAFFIC_API_URL`
     - `MCP_API_KEY`
     - `PORT=8080`

### Opción C: VPS (Digital Ocean, Linode, etc.)

```bash
# SSH a tu servidor
ssh user@your-server.com

# Instalar dependencias
sudo apt update
sudo apt install python3 python3-pip

# Clonar repo
git clone https://github.com/tu-repo.git
cd traffic_mcp_server

# Instalar requirements
pip3 install -r requirements.txt

# Ejecutar con systemd o screen
screen -S mcp-server
python3 server.py
```

## Verificación del Deployment

### 1. Health Check

```bash
curl https://tu-app.vercel.app/api/health
```

Debería retornar:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "sessions": 0,
  "mcp_configured": true,
  "anthropic_configured": true
}
```

### 2. Tools Check

```bash
curl https://tu-app.vercel.app/api/tools
```

Debería retornar array de 3 herramientas.

### 3. Chat Test

```bash
curl -X POST https://tu-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola", "session_id": "test"}'
```

## Variables de Entorno

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `ANTHROPIC_API_KEY` | ✅ Sí | API key de Anthropic | `sk-ant-api03-...` |
| `MCP_SERVER_URL` | ✅ Sí | URL del servidor MCP | `https://server.com/sse` |
| `MCP_API_KEY` | ✅ Sí | API key para MCP server | `your-secure-key` |

### Configurar en Vercel Dashboard

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada variable para:
   - Production
   - Preview
   - Development

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not found"

**Solución:**
- Verifica que la variable esté configurada en Vercel
- Re-deploya después de agregar variables

### Error: "Failed to connect to MCP server"

**Solución:**
- Verifica que `MCP_SERVER_URL` sea correcta
- Verifica que el MCP server esté corriendo
- Verifica que sea accesible desde internet
- Chequea que el puerto esté abierto

### Error: "Unauthorized: Invalid API key"

**Solución:**
- Verifica que `MCP_API_KEY` coincida en ambos lados
- Re-deploya el MCP server y la app

### Timeout en API Routes

**Problema:** Las funciones tardan mucho

**Solución:**
Edita `vercel.json`:
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

## Monitoring

### Logs en Vercel

```bash
# Ver logs en tiempo real
vercel logs tu-app.vercel.app --follow

# Ver logs de una función específica
vercel logs tu-app.vercel.app --follow /api/chat
```

### Metrics

En Vercel Dashboard → Analytics:
- Visitas
- Latencia de API
- Errores
- Uso de funciones

## Costos

### Vercel
- **Free Tier**:
  - 100 GB bandwidth
  - 100 GB-Hrs serverless function execution
  - ✅ Suficiente para desarrollo y uso moderado

### Anthropic API
- Claude Sonnet 4: ~$3 per millón de tokens input, ~$15 por millón output
- Estimado: $0.01 - $0.10 por conversación típica

### Railway/Render (MCP Server)
- **Free Tier**: $5 crédito mensual
- **Starter**: $5-10/mes

## Escalabilidad

El backend integrado en Next.js/Vercel escala automáticamente:

- **Funciones Serverless**: Se crean instancias según demanda
- **Sessions**: Almacenadas en memoria (considerar Redis para producción)
- **MCP Server**: Escalar según tráfico

### Para Producción Alta Demanda

1. **Redis para Sessions**:
```typescript
// Reemplazar session-manager.ts con Redis
import Redis from 'ioredis';
```

2. **Rate Limiting**:
```typescript
// API middleware
import rateLimit from '@upstash/ratelimit';
```

3. **Monitoring**:
- Sentry para error tracking
- LogRocket para session replay

## Seguridad

### API Keys
- ✅ Nunca commitear `.env.local`
- ✅ Usar Vercel Environment Variables
- ✅ Rotar keys regularmente

### CORS
Configurado automáticamente en las API routes.

### Rate Limiting
Considera agregar para producción:
```bash
npm install @upstash/ratelimit
```

## Updates y Mantenimiento

### Actualizar la App

```bash
# Pull cambios
git pull

# Deploy
vercel --prod
```

### Actualizar Dependencias

```bash
npm update
npm audit fix
```

## Backup y Rollback

### Rollback en Vercel

```bash
# Ver deployments
vercel ls

# Promover deployment anterior a producción
vercel promote <deployment-url>
```

## Recursos

- [Vercel Docs](https://vercel.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Anthropic API](https://docs.anthropic.com)
- [MCP Protocol](https://modelcontextprotocol.io)

## Soporte

Para problemas:
1. Revisa logs: `vercel logs`
2. Verifica health: `/api/health`
3. Chequea MCP server
4. Revisa variables de entorno

---

**¡Tu chatbot está listo para producción! 🚀**
