# Demo video script (1–2 minutes)

Speak in English or Russian — whichever is more comfortable. Show the screen the whole time.

## 0:00–0:15 — Intro
> “Hi, I’m Tati Karizska. This is my full-stack weather app for the PM Accelerator assessment — Tech Assessment 1 and 2.”

Show: home page header with your name + footer PM Accelerator link.

## 0:15–0:45 — Live Weather (#1)
1. Search **Paris** → show current weather + icons  
2. Show **5-day forecast**  
3. Quickly try **ZIP** `90210` or coordinates  
4. Click **Use my location** (or say it works if permission already granted)  
5. Show an **error**: type `zzzznotacity999` → error message

## 0:45–1:20 — Saved Records CRUD (#2)
1. Go to **Saved Records**  
2. **CREATE**: location + past date range → Create record  
3. Open the record → temperatures table + **map**  
4. Point to Wikipedia / YouTube links  
5. **UPDATE** notes → Update  
6. **Export** CSV or JSON (download)  
7. **DELETE** one record  

## 1:20–1:40 — Code (optional but nice)
Show briefly in the editor / GitHub:
- `src/app/api/records/route.ts` (CRUD API)
- `prisma/schema.prisma` (database)

> “Backend uses Next.js API routes, Prisma, and SQLite. Frontend is React with Next.js.”

## 1:40–2:00 — Close
> “Assessments 1 and 2 are both completed. Repo and README explain how to run it. Thank you!”

Show `/about` page once.
