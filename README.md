# Traffic Chatbot - Next.js con Backend Integrado

Chatbot de tráfico vehicular con predicción LSTM, lógica difusa y sugerencias de rutas óptimas. **Backend completamente integrado en Next.js** - listo para Vercel.

## 🎯 Características

- ✅ **Backend Integrado**: No necesitas servidor Python separado
- ✅ **Serverless**: Despliega en Vercel con un click
- ✅ **Claude AI**: Integración con Claude Sonnet 4
- ✅ **MCP Protocol**: Conexión con servidor MCP via SSE
- ✅ **TypeScript**: Código completamente tipado
- ✅ **Session Management**: Manejo de múltiples usuarios
- ✅ **Real-time**: Respuestas en tiempo real
- ✅ **Responsive**: Funciona en desktop y móvil

## 🏗️ Arquitectura

```
┌────────────────────────────────────┐
│     Next.js Application            │
│                                     │
│  Frontend (React)  ←→  API Routes  │
│                         ↓           │
│                    MCP Client       │
│                         ↓           │
│                    LLM Service      │
└─────────────┬───────────────────────┘
              │
              │ SSE Connection
              ↓
┌─────────────────────────────────────┐
│         MCP Server                  │
│    (Traffic Prediction API)         │
└─────────────────────────────────────┘
```

## 🚀 Quick Start

### Desarrollo Local

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.local.example .env.local
```

Edita `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui
MCP_SERVER_URL=http://localhost:8080/sse
MCP_API_KEY=your-secure-api-key-here
```

3. **Iniciar MCP Server** (en otra terminal):
```bash
cd ../traffic_mcp_server
python server.py
```

4. **Iniciar la aplicación:**
```bash
npm run dev
```

5. **Abrir en navegador:**
```
http://localhost:3000
```

### Deploy a Vercel

#### Método 1: Vercel CLI

```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Configurar variables
vercel env add ANTHROPIC_API_KEY
vercel env add MCP_SERVER_URL
vercel env add MCP_API_KEY

# Deploy
vercel --prod
```

#### Método 2: GitHub Integration

1. Push a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Configura variables de entorno
4. Deploy automático

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para guía completa.

## 📁 Estructura del Proyecto

```
traffic-chatbot/
├── src/
│   ├── app/
│   │   ├── api/              # API Routes (Backend)
│   │   │   ├── chat/         # Endpoint de chat
│   │   │   ├── tools/        # Listar herramientas MCP
│   │   │   ├── health/       # Health check
│   │   │   └── clear/        # Limpiar sesión
│   │   ├── layout.tsx        # Layout principal
│   │   └── page.tsx          # Página home
│   │
│   ├── components/           # Componentes React
│   │   ├── ChatBot.tsx       # Componente principal
│   │   ├── ChatMessage.tsx   # Mensaje individual
│   │   ├── ChatInput.tsx     # Input de usuario
│   │   └── ToolsPanel.tsx    # Panel de herramientas
│   │
│   ├── lib/                  # Lógica de negocio
│   │   ├── mcp-client.ts     # Cliente MCP (SSE)
│   │   ├── llm-service.ts    # Integración Claude
│   │   ├── session-manager.ts # Manejo de sesiones
│   │   └── api.ts            # API helpers
│   │
│   ├── hooks/                # React hooks
│   │   └── useChat.ts        # Hook de chat
│   │
│   └── types/                # TypeScript types
│       └── chat.ts
│
├── public/                   # Archivos estáticos
├── package.json
├── vercel.json              # Configuración Vercel
├── .env.local.example       # Ejemplo de variables
└── README.md                # Este archivo
```

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14** - Framework React con SSR
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos
- **Lucide React** - Iconos

### Backend (API Routes)
- **Next.js API Routes** - Serverless functions
- **Anthropic SDK** - Claude AI integration
- **MCP SDK** - Model Context Protocol client
- **Session Management** - In-memory sessions

### Deployment
- **Vercel** - Hosting y serverless functions
- **Railway/Render** - MCP Server hosting

## 📡 API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/chat` | POST | Enviar mensaje al chatbot |
| `/api/tools` | GET | Listar herramientas MCP disponibles |
| `/api/health` | GET | Health check del sistema |
| `/api/clear/:sessionId` | POST | Limpiar historial de sesión |

### Ejemplo de Uso

```javascript
// Enviar mensaje
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '¿Cuántas estaciones hay?',
    session_id: 'user-123'
  })
});

const data = await response.json();
console.log(data.response);
```

## 🔧 Configuración

### Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Sí | API key de Anthropic Claude |
| `MCP_SERVER_URL` | ✅ Sí | URL del servidor MCP (con `/sse`) |
| `MCP_API_KEY` | ✅ Sí | API key para autenticar con MCP |

### Vercel Configuration

El archivo `vercel.json` configura:
- Timeout de funciones: 60s
- Memoria: 1024MB
- Región: us-east

## 🧪 Testing

```bash
# Ejecutar en modo desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar versión de producción
npm start

# Linting
npm run lint
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "sessions": 0,
  "mcp_configured": true,
  "anthropic_configured": true
}
```

## 💬 Uso del Chatbot

### Consultas de Ejemplo

1. **Estaciones disponibles:**
   - "¿Cuántas estaciones de tráfico hay?"
   - "Muéstrame las estaciones de la autopista 101"

2. **Filtros:**
   - "¿Qué estaciones van hacia el norte?"
   - "Estaciones en la autopista 5 dirección sur"

3. **Predicciones:**
   - "¿Cómo funciona la predicción de tráfico?"
   - "¿Qué es el SPI?"

4. **Información general:**
   - "¿Qué puedes hacer?"
   - "Explícame las herramientas disponibles"

## 🔒 Seguridad

- ✅ API keys en variables de entorno
- ✅ Nunca exponer keys en el código
- ✅ CORS configurado en API routes
- ✅ Validación de inputs
- ✅ Error handling robusto

### Best Practices

1. **No commitear `.env.local`** - Usa `.env.local.example`
2. **Rotar API keys** - Regularmente
3. **Rate limiting** - Considerar para producción
4. **Monitoring** - Usar Vercel Analytics

## 📊 Performance

- **Cold Start**: ~2-3s (primera petición)
- **Warm Response**: ~500ms - 2s
- **Claude API**: ~2-5s (depende del query)
- **MCP Tool Execution**: ~1-3s

### Optimizaciones

- Session caching
- Tool response caching
- Serverless function optimization
- Edge runtime donde sea posible

## 🐛 Troubleshooting

### "Cannot connect to MCP server"

**Solución:**
```bash
# Verificar que MCP server esté corriendo
cd traffic_mcp_server
python server.py

# Verificar URL en .env.local
echo $MCP_SERVER_URL
```

### "ANTHROPIC_API_KEY not found"

**Solución:**
```bash
# Verificar .env.local existe
cat .env.local

# Verificar la variable esté configurada
grep ANTHROPIC .env.local
```

### Build fails en Vercel

**Solución:**
1. Verificar que todas las dependencias estén en `package.json`
2. Verificar que no haya errores de TypeScript
3. Revisar logs de build en Vercel dashboard

## 📈 Roadmap

- [ ] Redis para session storage
- [ ] Rate limiting con Upstash
- [ ] Error monitoring con Sentry
- [ ] Analytics con Vercel Analytics
- [ ] Dark mode
- [ ] Exportar conversaciones
- [ ] Voice input
- [ ] Multilingual support

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-feature`
3. Commit: `git commit -m 'Add nueva feature'`
4. Push: `git push origin feature/nueva-feature`
5. Pull Request

## 📝 Licencia

MIT License

## 🆘 Soporte

- **Documentación**: Ver [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues**: Reportar en GitHub Issues
- **Vercel**: Ver logs con `vercel logs`

## 🙏 Créditos

- **Anthropic** - Claude AI
- **Model Context Protocol** - MCP SDK
- **Vercel** - Hosting
- **Next.js** - Framework

---

**Desarrollado con ❤️ usando Next.js, TypeScript, y Claude AI**
