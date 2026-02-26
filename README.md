# Student Grade Tracker

This repository is a monorepo containing both backend and frontend applications for the Student Grade Tracker project.

- `/backend` contains a Flask API using the application factory pattern.
- `/frontend` contains a React (TypeScript) application powered by Vite and styled with Tailwind CSS.

## Prerequisites

- Python 3.11+
- Node 18+
- Docker / Docker Compose (for optional local database)

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
flask run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Docker

A PostgreSQL database can be started via Docker Compose:

```bash
docker-compose up -d
```
