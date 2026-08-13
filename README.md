# Frequency

> This project is currently under active development and is not yet feature-complete. Expect ongoing changes and improvements.

## Overview

Frequency is a web application for transferring and synchronizing playlists across popular music streaming platforms, including Spotify, Apple Music, YouTube Music, and Amazon Music. The goal is to make it easy to manage your music collections across services.

## Features
- Transfer playlists between supported platforms
- Connect multiple music accounts securely
- Set up recurring syncs between platforms
- View history of transfers and syncs
- Responsive, modern user interface

## Tech Stack
- Vite (build tool)
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (backend/auth)
- Optional: FastAPI (Python) backend for selected endpoints

## Getting Started

### Prerequisites
- Node.js and npm

### Setup
Clone the repository and install dependencies:

```sh
git clone https://github.com/jrkyles/Frequency.git
cd Frequency
npm install
npm run dev
```

### Optional Python backend
If you prefer to use the Python backend for certain endpoints:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then create a `.env.local` at the repo root with:

```sh
VITE_API_BASE=http://localhost:8000
```

Unset `VITE_API_BASE` to use Supabase Edge Functions instead.

## Deployment
You can deploy Frequency using your preferred platform.

## Contributing
Contributions are welcome. See CONTRIBUTING.md for guidelines.

## License
This project is licensed under the MIT License. See LICENSE for details.

## Author
[James Kyles](https://github.com/jrkyles)

---

This project was originally bootstrapped with Lovable and is now being actively developed and customized.
