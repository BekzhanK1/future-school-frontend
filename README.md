# Future School Frontend

Web client for the learning management system of International Future School Astana. Works with the [django-future-school-backend](https://github.com/BekzhanK1/django-future-school-backend) API.

## What's inside

- **Students**: dashboard, subjects, assignments and submissions, online tests, diary with grades, timetable.
- **Teachers**: classrooms, assignment review, test builder, Q&A threads.
- **Parents**: a separate dashboard with each child's grades and assignments.
- **Admins**: schools, users, courses, academic years and the timetable.
- Messages, notifications, support requests, password reset.
- Interface in several languages (`next-intl`).

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query, Axios, Zod, FullCalendar.

## Running locally

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_TIME_ZONE
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | backend API base URL |
| `NEXT_PUBLIC_APP_TIME_ZONE` | IANA time zone for all dates; must match the backend `TIME_ZONE` |

`NEXT_PUBLIC_*` values are baked into the bundle at build time, so set them before `npm run build` or `docker compose build`.

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build and server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
