# Weather App — Full Stack Technical Assessment

**Author:** Tati Karizska  
**Completed:** Tech Assessment **#1 (Frontend)** + **#2 (Backend)**  
**Company:** [Product Manager Accelerator](https://www.linkedin.com/company/product-manager-accelerator/)

A web-first weather app with live API data, responsive UI, SQLite persistence (full CRUD), extra API integrations, and multi-format export.

---

## How to run

```bash
cd weather-app
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional in `.env`:
```bash
YOUTUBE_API_KEY=your_key_here
```
(Without it, YouTube still works via search links.)

No weather API key is required (Open-Meteo).

---

## What was built

### Tech Assessment #1 — Frontend
- Location input: city / town / landmark / ZIP / GPS coordinates (`lat,lon`)
- Current weather: temperature, feels like, humidity, wind, condition + icons
- “Use my location” (browser Geolocation API)
- 5-day forecast (responsive grid)
- Error handling: location not found, API failures, geolocation denied, invalid dates
- Responsive layout (desktop / tablet / phone)

### Tech Assessment #2 — Backend
- REST APIs under `/api/*`
- SQLite + Prisma persistence
- **CREATE** — location + date range → historical temperatures stored
- **READ** — list/detail of saved records
- **UPDATE** — location / dates / notes (with validation; re-fetches when needed)
- **DELETE** — remove records
- Validations: date range, past dates only for archive, location exists (geocoding / best match)
- Extra APIs: OpenStreetMap embed, Wikipedia link, YouTube search/embed
- Export: **JSON**, **CSV**, **Markdown**, **XML**

---

## App pages

| Route | Purpose |
| --- | --- |
| `/` | Live weather + 5-day forecast |
| `/records` | CRUD + map / Wikipedia / YouTube + export |
| `/about` | Author + PM Accelerator info |

## API endpoints

| Method & path | Purpose |
| --- | --- |
| `GET /api/weather?q=London` | Current weather + 5-day forecast |
| `GET /api/weather?lat=&lon=` | Weather by coordinates |
| `GET /api/records` | List saved records |
| `POST /api/records` | Create record |
| `GET/PUT/DELETE /api/records/:id` | Read / update / delete |
| `GET /api/export?format=json\|csv\|md\|xml` | Download export (`id` optional) |

---

## Tech stack
- Next.js 15 (App Router) + TypeScript + React
- Prisma + SQLite
- Open-Meteo (forecast + archive + geocoding)
- BigDataCloud (reverse geocoding for coordinates)
- OpenStreetMap, Wikipedia, YouTube
- Zod validation

## Notes for reviewers
- Weather data is **not static** — pulled from live APIs.
- Historical CREATE uses Open-Meteo **Archive** → date ranges must be in the past (validated in UI + API).
- Dependencies are listed in `package.json`.

## Demo video
https://drive.google.com/file/d/1NON5BOCLcR-or_cRuLLntjtNvg1m3tCE/view?usp=sharing
