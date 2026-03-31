# Weather App - Technical Assessment

## Project Overview
This repository contains the full-stack weather application developed for the PM Accelerator technical assessment. It includes both Tech Assessment 1 (Frontend) and Tech Assessment 2 (Backend) requirements, providing real-time weather information and search history management.

The project is built with React, TypeScript, Node.js, Express, Prisma ORM, and SQLite.

### Project Structure
1.  **frontend/**: React application with TypeScript and Vanilla CSS.
2.  **backend/**: Node.js/Express API with Prisma database models.
3.  **backend/src/__tests__/**: Automated backend tests with Jest.
4.  **docker-compose.yml**: Configuration to run the application components.

### Installation & Execution

#### Option 1: Docker
```bash
git clone https://github.com/LucasPNunes1/PMAccelerator-FullStack
cd PMAccelerator-FullStack
docker compose up --build -d
```
*   Frontend: http://localhost
*   Backend: http://localhost:3000

#### Option 2: Manual Local Setup

1. **Backend**:
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

2. **Frontend**:
```bash
cd frontend
npm install
npm run dev
```

---

## 1. Tech Assessment 1: Frontend (React + TypeScript)
Calculated to meet the following requirements:
*   **Location Search**: Current weather retrieval based on city name entry. 
*   **Five-Day Forecast**: Vertical/horizontal daily forecast display.
*   **Error Handling**: Messaging for city not found and API request failures.
*   **Responsive Design**: CSS implementation for desktop and mobile devices.
*   **UI Assets**: SVG icons and images used for weather condition display.

## 2. Tech Assessment 2: Backend (Node.js + Prisma)
Calculated to meet the following requirements:
*   **CRUD Functionalites**:
    *   **CREATE**: Stores weather query with location and date range.
    *   **READ**: Accesses previously requested weather search records.
    *   **UPDATE**: Edits aliases and personal notes in the database history.
    *   **DELETE**: Removes history records from the SQLite database.
*   **API Integrations**:
    *   **YouTube API**: Localized videos based on search location.
    *   **Google Maps API**: Geographic map centering on search location.
    *   **Weather API**: Real-time and historical data via Open-Meteo.
*   **Data Export**: History data export to JSON and CSV formats.
