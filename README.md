# MediKiosk – Updated Root Folder Version

This version keeps the working MediKiosk frontend style and uses a **single root folder** for GitHub/Render.

## Files
- `server.js` – Express backend, uploads, authentication, queue APIs
- `db.js` – SQLite database and automatic migration for verification fields
- `index.html` – frontend shell
- `style.css` – existing MediKiosk styling plus small additions for emergency/verification/document buttons
- `script.js` – frontend logic
- `images/` – existing hospital images
- `uploads/` – created automatically by `server.js`

## New features
1. No `frontend/` or `backend/` folders are required.
2. Doctors can open/view/download patient-uploaded medical images/PDFs.
3. Home page has Ambulance 108, Fire 101, Police 112 and Emergency Helpline 112.
4. Patient registration requires one verification method:
   - Aadhaar number: 12 digits + Verhoeff checksum check
   - Health Card number: 6–30 letters/numbers/spaces/dot/slash/hyphen
   - Birth Certificate: JPG/PNG/WEBP image only
5. Aadhaar/Health Card values are stored as a SHA-256 hash plus last four characters; the full number is not returned to doctors.
6. Birth Certificate image is stored as a protected patient document and is visible to the assigned doctor.

## Important
Aadhaar checksum validation is not government identity verification. This prototype does not connect to UIDAI or any government health database.

## Render
- Root Directory: blank
- Build Command: `npm install`
- Start Command: `npm start`
- Add `JWT_SECRET` as an environment variable (Render can generate it).

## Demo accounts
- Registration: `regdesk / reg123`
- Doctors: `bones`, `brain`, `opd`, `emergency`, `pediatrics` / `doc123`


## Zero-folder structure

All project files and website images are kept directly in the project root.
There is no `images` folder and no `uploads` folder.

Patient-uploaded files are stored directly in the project root at runtime.
They are served through `/uploads/<filename>` by `server.js`.

Root files:
- server.js
- db.js
- package.json
- render.yaml
- index.html
- style.css
- script.js
- home.jpg
- registration.jpg
- queue.jpg
- doctor.jpg
