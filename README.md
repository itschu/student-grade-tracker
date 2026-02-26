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

WeasyPrint is used for PDF exports and requires native GTK/Pango libraries. On Windows you must install these before running the server (otherwise Flask will crash at import time).

**Windows installation options**

1. **MSYS2 (recommended)**
    - Download and install MSYS2 from https://www.msys2.org/
    - Open the MSYS2 MinGW 64-bit shell and run:
        ```bash
        pacman -Syu
        pacman -S mingw-w64-x86_64-gtk3 mingw-w64-x86_64-pango \
            mingw-w64-x86_64-cairo mingw-w64-x86_64-gdk-pixbuf
        ```
    - Add `C:\msys64\mingw64\bin` (or your MSYS2 path) to your `PATH` environment variable, or set `WEASYPRINT_DLL_DIRECTORIES` to that folder.

2. **GTK runtime installer**
    - Download the Windows GTK runtime (e.g. from https://gtk.org/download/windows/) and install.
    - Add the GTK `bin` directory to your `PATH`.

After installing the native libraries, reactivate your virtual environment and verify that
`python -c "from weasyprint import HTML; print('ok')"` runs without errors.

Once the prerequisites are satisfied, the typical backend startup is:

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
