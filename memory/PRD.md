# Moneta — Portfolio Terminal (PRD)

## Original Problem Statement
"Prendi il progetto mon-eta da github" — importazione del repository privato `Tatanka977/mon-eta`, esecuzione nell'ambiente Emergent e successivamente "fai tutte le modifiche che ritieni necessarie".

## Architecture
- **Frontend/SSR**: TanStack Start v1.168 (React 19, Vite 7) — full-stack TS, server functions
- **UI**: Bloomberg-style terminal (font monospace, sfondo nero, accenti blu/giallo)
- **Auth & DB**: Supabase Cloud (`kyjktigwsjokfqblhqte.supabase.co`) — profiles, portfolios, watchlist, ai_conversations
- **OAuth**: Lovable cloud auth (Google/Apple) + Supabase email/password
- **AI Advisor + Sentiment**: FastAPI proxy `/api/ai/chat` (porta 8001) → `emergentintegrations` (Gemini 2.5 Flash via EMERGENT_LLM_KEY)
- **Market data**: Finnhub (quote stocks + search + news) con fallback mock per CRYPTO/FX/BOND/COMMODITY

## Service Topology (Emergent)
- Supervisor `frontend` → `cd /app && npx vite dev --host 0.0.0.0 --port 3000` (TanStack Start SSR)
- Supervisor `backend` → uvicorn FastAPI (`/app/backend/server.py`) su 8001 (solo `/api/ai/chat`)
- Ingress: `/api/*` → 8001, resto → 3000

## Key Files (Modified or Created)
- `/app/.env` — VITE_SUPABASE_*, FINNHUB_API_KEY, EMERGENT_BACKEND_URL, PORT=3000
- `/app/backend/.env` — EMERGENT_LLM_KEY
- `/app/backend/server.py` — endpoint `/api/ai/chat` con emergentintegrations Gemini 2.5 Flash
- `/app/src/lib/ai.functions.ts` — chiama backend Python invece di Lovable AI gateway
- `/app/src/lib/finance.functions.ts` — Finnhub real per stocks (quote+search) + mock fallback
- `/app/src/lib/news.functions.ts` — **NUOVO**: `fetchMarketNews` (general/forex/crypto/merger) e `fetchCompanyNews` per ticker
- `/app/src/components/PortfolioTerminal.tsx` — aggiunta pagina **F6 NEWS**, tab MARKET/HOLDINGS/SYMBOL, bottone `✦ AI SENTIMENT`, `★ ADD TO WATCHLIST` in detail view
- `/app/vite.config.ts` — `allowedHosts: true`, HMR wss, porta 3000
- `/app/frontend/package.json` — script `start` delega a vite in /app

## Implementation Status (12 Gen 2026)

### Iterazione 1 — Setup
- [x] Clone repo privato via PAT
- [x] Node 22 installato (richiesto da `@tanstack/react-start@1.168`)
- [x] npm install (291 pacchetti) + `react-is` per recharts SSR
- [x] Backend FastAPI espone `/api/ai/chat` → Gemini 2.5 Flash via Emergent LLM key (testato ✅)
- [x] Frontend TanStack Start SSR su porta 3000 funzionante
- [x] Finnhub LIVE search (testato AAPL → CDR internazionali reali) 

### Iterazione 2 — Feature additions
- [x] **F6 NEWS panel** con 3 tab: MARKET (general/forex/crypto/merger), MY HOLDINGS (news per simboli in portafoglio), SYMBOL (input ticker per news mirate)
- [x] **AI Sentiment Analysis**: bottone `✦ AI SENTIMENT` analizza fino a 12 headlines con Gemini 2.5 Flash, classifica BULLISH/BEARISH/NEUTRAL, formatta in italiano con **bold** key terms e BOTTOM LINE
- [x] **Quote reali Finnhub** per stocks (verificato AAPL: 291.55 USD, day -1.38% — match con API diretta)
- [x] **Watchlist persistente**: bottone `★ ADD TO WATCHLIST` in detail view → Supabase `watchlist` table
- [x] **Profile route** `/_authenticated/profile` con tab Profilo/Portafogli/Watchlist/AI Chat (preserva auth middleware)

### Verifica E2E (screenshot)
- ✅ Homepage F1 (NO ACTIVE PORTFOLIO + 5 shortcut F2-F6)
- ✅ Search F2 con Finnhub augmentation (AAPL → 10+ risultati reali)
- ✅ Detail view stock con quote Finnhub real-time + ADD POSITION + ADD TO WATCHLIST
- ✅ News F6 — MARKET (30 headlines CNBC/Reuters), SYMBOL NVDA (25 headlines Yahoo)
- ✅ AI Sentiment analisi multi-headline in italiano con classificazione

## Pending / Backlog
- [ ] **Supabase migrations**: confermare se SQL in /app/supabase/migrations/ sono state applicate al progetto cloud
- [ ] **OAuth Lovable**: `@lovable.dev/cloud-auth-js` potrebbe non funzionare fuori dalla sandbox Lovable (email/password sì)
- [ ] **Crypto/FX live data**: Finnhub free tier non li copre, attualmente mock — potrebbe integrare CoinGecko (gratis) per crypto
- [ ] **AI streaming**: attualmente sincrono, sarebbe più rapido con SSE
- [ ] **Watchlist UI dedicata**: i dati vanno in DB ma sono visibili solo dalla pagina profilo

## Test Credentials
Vedere `/app/memory/test_credentials.md`

## URLs
- Preview: https://moneta-wallet.preview.emergentagent.com/
- Backend (interno): http://localhost:8001/api/ai/chat
- Supabase cloud: https://kyjktigwsjokfqblhqte.supabase.co
