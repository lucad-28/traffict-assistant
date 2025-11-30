# 🚀 Quick Start Guide

## Configuración en 5 Minutos

### Paso 1: Instalar Dependencias (1 min)

```bash
cd traffic-chatbot
npm install
```

### Paso 2: Configurar Variables de Entorno (2 min)

```bash
# Copiar el template
cp .env.local.example .env.local
```

Editar `.env.local` con tus valores:

```env
# 🔑 REQUERIDO: Tu API key de Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui

# 🌐 REQUERIDO: URL del servidor MCP
# Para desarrollo local:
MCP_SERVER_URL=http://localhost:8080/sse

# 🔐 REQUERIDO: API key para MCP (debe coincidir con el server)
MCP_API_KEY=your-secure-api-key-here
```

**¿Dónde conseguir las API keys?**
- **ANTHROPIC_API_KEY**: [console.anthropic.com](https://console.anthropic.com)
- **MCP_API_KEY**: Usa el mismo valor que configuraste en el MCP server (default: `your-secure-api-key-here`)

### Paso 3: Iniciar MCP Server (1 min)

Abre una **nueva terminal**:

```bash
cd ../traffic_mcp_server
python server.py
```

Deberías ver:
```
INFO:server:Starting Traffic MCP Server with SSE transport
INFO:server:Server will listen on 0.0.0.0:8080
```

✅ **Mantén esta terminal abierta**

### Paso 4: Iniciar la Aplicación (1 min)

Vuelve a la terminal del chatbot:

```bash
npm run dev
```

Deberías ver:
```
  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.3s
```

### Paso 5: ¡Usar el Chatbot! 🎉

Abre tu navegador en:
```
http://localhost:3000
```

## 🧪 Verificar que Todo Funcione

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

✅ Deberías ver:
```json
{
  "status": "healthy",
  "sessions": 0,
  "mcp_configured": true,
  "anthropic_configured": true
}
```

### Test 2: Herramientas MCP

```bash
curl http://localhost:3000/api/tools
```

✅ Deberías ver 3 herramientas:
```json
[
  {
    "name": "get_traffic_stations",
    "description": "Obtiene la lista de todas las estaciones..."
  },
  {
    "name": "predict_traffic_spi",
    "description": "Predice el índice de rendimiento..."
  },
  {
    "name": "suggest_routes",
    "description": "Sugiere rutas óptimas..."
  }
]
```

### Test 3: Chat

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola, ¿qué puedes hacer?", "session_id": "test"}'
```

✅ Deberías recibir una respuesta en español

## 💬 Probar en el Navegador

Una vez en http://localhost:3000, prueba estas consultas:

1. **"¿Cuántas estaciones de tráfico están disponibles?"**
   - Debería usar la herramienta `get_traffic_stations`
   - Responder con el número total

2. **"Muéstrame las estaciones de la autopista 101"**
   - Debería filtrar por autopista
   - Mostrar estaciones específicas

3. **"¿Cómo funciona la predicción de tráfico?"**
   - Debería explicar el sistema LSTM
   - Sin necesitar llamar herramientas

4. **"¿Qué herramientas tienes disponibles?"**
   - Debería listar las 3 herramientas MCP
   - Explicar qué hace cada una

## 🔧 Troubleshooting

### ❌ Error: "Cannot connect to MCP server"

**Problema:** MCP server no está corriendo

**Solución:**
```bash
cd traffic_mcp_server
python server.py
```

---

### ❌ Error: "ANTHROPIC_API_KEY not found"

**Problema:** Variable de entorno no configurada

**Solución:**
```bash
# Verificar que .env.local existe
ls -la .env.local

# Verificar el contenido
cat .env.local | grep ANTHROPIC
```

Si no existe, crea el archivo:
```bash
cp .env.local.example .env.local
# Editar y agregar tu API key
```

---

### ❌ Error: "Module not found: @anthropic-ai/sdk"

**Problema:** Dependencias no instaladas

**Solución:**
```bash
npm install
```

---

### ❌ Puerto 3000 ya en uso

**Problema:** Otro servicio usando el puerto

**Solución:**
```bash
# Opción 1: Usar otro puerto
PORT=3001 npm run dev

# Opción 2: Matar el proceso
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :3000
kill -9 <PID>
```

---

### ❌ El chatbot no responde

**Checklist:**
1. ✅ MCP server corriendo en 8080?
2. ✅ `.env.local` tiene ANTHROPIC_API_KEY?
3. ✅ `.env.local` tiene MCP_SERVER_URL?
4. ✅ MCP_API_KEY coincide en ambos lados?
5. ✅ Internet funcionando?

**Debug:**
```bash
# Ver logs en la terminal de Next.js
# Buscar errores en rojo

# Test de health
curl http://localhost:3000/api/health
```

## 📚 Próximos Pasos

Una vez que todo funcione localmente:

### 1. Deploy a Vercel (Producción)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para guía completa

### 2. Personalizar el Chatbot

- Editar estilos en `src/components/`
- Modificar prompts en `src/lib/llm-service.ts`
- Agregar funcionalidades en `src/app/api/`

### 3. Agregar Funcionalidades

- [ ] Dark mode
- [ ] Exportar conversaciones
- [ ] Voice input
- [ ] Más herramientas MCP

## 🆘 Ayuda

Si algo no funciona:

1. **Revisa los logs** en la terminal
2. **Consulta BACKEND_INTEGRATION.md** para detalles técnicos
3. **Lee DEPLOYMENT.md** para deployment
4. **Revisa README.md** para documentación completa

## 🎉 ¡Listo!

Tu chatbot está funcionando. Ahora puedes:

✅ Hacer preguntas sobre tráfico
✅ Consultar estaciones
✅ Obtener predicciones
✅ Sugerir rutas óptimas

**¡Disfruta tu chatbot de tráfico! 🚗💨**
