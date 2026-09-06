# MediKiosk

MediKiosk is a web-based hospital OPD management system designed to simplify patient registration, queue management, and doctor access to patient medical information.

## 🚀 Live Demo

https://medikioskhosp.onrender.com/

## 💡 Key Features

### Patient Registration
- Easy digital patient registration.
- Collects essential patient information.
- Supports verification through Aadhaar, Health Card, or Birth Certificate.
- Generates an OPD queue number.

### OPD Queue Management
- Maintains the patient queue digitally.
- Allows doctors to call and complete patients.
- Helps reduce waiting-time confusion.

### Medical Document Upload
- Patients can upload previous medical reports and prescriptions.
- Supports medical documents such as images and PDF files.
- Documents can be accessed by authorized doctors.

### AI-Powered Medical History Summary
- Uploaded medical reports are processed using Google Gemini AI.
- Automatically extracts relevant medical information.
- Generates a concise and organized medical history summary.
- Helps doctors review previous medical information faster.
- Patient-identifying information is excluded from the AI-generated summary.
- The AI is used only for summarization and does not provide diagnosis or treatment recommendations.

### Doctor Dashboard
- Doctors can view registered patients.
- Doctors can access uploaded medical documents.
- Doctors can view the AI-generated medical history summary.
- Supports scheduling patient follow-ups.

## 🛠️ Technology Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- SQLite
- better-sqlite3

### AI
- Google Gemini API
- @google/genai

### Deployment
- GitHub
- Render

## 📂 Project Structure

MediKiosk/
├── index.html
├── style.css
├── script.js
├── server.js
├── db.js
├── package.json
├── render.yaml
└── README.md
