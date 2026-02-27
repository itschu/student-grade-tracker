# Student Grade Tracker

## Project Overview

Student Grade Tracker is a full-stack web application built with Flask (backend) and React (frontend) backed by PostgreSQL. It supports three roles — **Admin**, **Teacher**, and **Student** — with semester-based course management, weighted grade calculations, per-role dashboards, and CSV/PDF export of gradebooks.

---

## Tech Stack

| Layer      | Technologies                                                    |
| ---------- | --------------------------------------------------------------- |
| Backend    | Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, WeasyPrint |
| Frontend   | React, Vite, Tailwind CSS, React Query, Recharts                |
| Database   | SQLite (local) / PostgreSQL (Railway)                           |
| Deployment | Railway                                                         |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node 18+

### Backend Setup

1. `cd backend`
2. Create and activate a virtual environment, then `pip install -r requirements.txt`
3. Copy `backend/.env.example` to `backend/.env` — the default `DATABASE_URL=sqlite:///grade_tracker.db` works out of the box, no database server needed
4. Run migrations: `flask db upgrade`

> Optional: if you prefer PostgreSQL locally, run `docker-compose up -d` and update `DATABASE_URL` accordingly 6. Start the server: `flask run` → available at `http://localhost:5000` 7. Note: the admin user is **auto-created on first startup** using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from your `.env` — no manual seeding required

### Frontend Setup

1. `cd frontend`
2. `npm install`
3. Copy `frontend/.env.example` to `frontend/.env` — the default `VITE_API_URL=http://localhost:5000` is correct for local dev
4. `npm run dev` → available at `http://localhost:5173`

### First Login

Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values you set in `backend/.env`.

---

## Railway Deployment

1. Create a new Railway project
2. Add the **PostgreSQL** plugin — Railway automatically sets `DATABASE_URL` on the backend service
3. Add a **Backend service** with root directory set to `/backend`:
    - Railway auto-detects `backend/Procfile` (`flask db upgrade && python -m flask run --host=0.0.0.0 --port=$PORT`)
    - Set env vars: `JWT_SECRET_KEY` (generate with `openssl rand -hex 32`), `FLASK_APP=run.py`, `FLASK_ENV=production`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_URL` (set this after the frontend service is created)
4. Add a **Frontend service** with root directory set to `/frontend`:
    - Railway auto-detects `frontend/nixpacks.toml` (runs `npm run build`, serves with `npx serve dist --listen $PORT`)
    - Set env var: `VITE_API_URL` = the backend service's public Railway URL
5. Go back to the backend service and set `FRONTEND_URL` = the frontend service's public Railway URL (required for CORS)
6. First login: use the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values you set in the Railway env panel
7. PDF exports: WeasyPrint GTK/Pango dependencies are installed automatically via `backend/nixpacks.toml` — no manual action needed on Railway

---

## Environment Variables Reference

| Variable         | Service  | Required | Description                                                                                          | Example                                                              |
| ---------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`   | Backend  | Yes      | SQLite file for local dev (default). For production set to PostgreSQL URL provided by Railway plugin | `sqlite:///grade_tracker.db` / `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET_KEY` | Backend  | Yes      | Random secret for JWT signing                                                                        | _(use `openssl rand -hex 32`)_                                       |
| `FLASK_APP`      | Backend  | Yes      | Flask entry point                                                                                    | `run.py`                                                             |
| `FLASK_ENV`      | Backend  | Yes      | Environment mode                                                                                     | `production`                                                         |
| `ADMIN_EMAIL`    | Backend  | Yes      | First admin login email                                                                              | `admin@school.edu`                                                   |
| `ADMIN_PASSWORD` | Backend  | Yes      | First admin login password                                                                           | _(use a strong password)_                                            |
| `FRONTEND_URL`   | Backend  | Yes      | Frontend public URL — used for CORS                                                                  | `https://frontend.up.railway.app`                                    |
| `VITE_API_URL`   | Frontend | Yes      | Backend public URL — injected at build time for API calls                                            | `https://backend.up.railway.app`                                     |

---

## WeasyPrint Note

- **Linux / Railway**: GTK/Pango libraries are installed automatically via `backend/nixpacks.toml` — PDF export works out of the box.
- **Windows (local dev)**: WeasyPrint requires native GTK/Pango libraries. If they are not installed, the PDF export endpoint returns a `503` error — **CSV export always works** as a fallback.
- For Windows installation instructions, see the [WeasyPrint installation guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows)
