# MediConnect 🏥

MediConnect is a comprehensive, full-stack doctor appointment booking and medical consultation platform. It features an advanced concurrent booking engine and AI-driven triage assistance.

This repository is split into two main components:
- [backend](file:///c:/Users/srinadh/OneDrive/Desktop/15may/backend): An Express.js server connected to MySQL.
- [frontend](file:///c:/Users/srinadh/OneDrive/Desktop/15may/frontend): A Vite-powered React single page application.

---

## Core Features 🚀

*   **Bitmask Scheduling Engine:** Instead of storing each booking as a separate row and doing slow, complex time-overlap queries, MediConnect utilizes a 64-bit `BIGINT` bitmask system in MySQL. Each 5-minute slot in a doctor's shift is represented by a single bit (0 for free, 1 for booked). Database-level atomic bitwise operations (`shift & mask`) prevent double-booking at high concurrency.
*   **AI Symptom Triage Chatbot:** Integrated with the **Google Gemini 2.5 Flash API**, patients can describe their symptoms, and the AI categorizes severity, recommends specialization tags (e.g., cardiologist, dermatologist), detects foreign languages, and automatically filters for matching doctors.
*   **Virtual Wallet System:** Patients start with a virtual wallet balance. When booking, fees are deducted automatically, and refunds are instantly credited upon cancellation.
*   **Filters & Search:** Patients can filter doctors by specialization tags, name, and languages spoken.
*   **Medical Records Management:** Patients can upload medical records (PDF/images) to their profile, and doctors can attach prescriptions/records directly to a patient's booking.

---

## Tech Stack 💻

*   **Frontend:** React 19, Vite 8, React Router 7, Lucide Icons, Vanilla CSS (with TailwindCSS v4 configured for utility classes).
*   **Backend:** Node.js, Express.js.
*   **Database:** MySQL (v8.x/9.x).
*   **AI Integration:** `@google/generative-ai` SDK.

---

## How to Run It Locally 🛠️

### 1. Database Setup
Make sure you have MySQL running on port `3306` with a database named `mediconnect`.
Initialize the database tables by executing the schema file:
```bash
mysql -u root -p < backend/schema.sql
```

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your configuration:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=mediconnect
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   ```
4. Seed the database with 100 fake doctors, patients, reviews, and records:
   ```bash
   node seed.js
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

The application will run on `http://localhost:5173`. You can log in using any generated patient/doctor email from `seed.js` (default password is `password123`) or register a new account.

---

## Codebase Architecture 📁

```
15may/
├── backend/
│   ├── src/
│   │   ├── config/      # DB Connection Pool
│   │   ├── controllers/ # Route Handlers (Auth, Appts, Doctors, Patients, Reviews, Schedules)
│   │   ├── middleware/  # JWT Authentication & Authorization
│   │   ├── routes/      # Express API Router Declarations
│   │   ├── services/    # Bitmask Logic & Gemini API Client
│   │   └── index.js     # Entrypoint
│   ├── schema.sql       # Database DDL
│   └── seed.js          # Faker-powered database seeder
└── frontend/
    ├── src/
    │   ├── components/  # AI Chat panel, Navbar
    │   ├── context/     # React Authentication Context
    │   ├── lib/         # Axios interceptor instance
    │   ├── pages/       # Patient & Doctor views (Dashboard, Booking, Profile)
    │   ├── App.jsx      # Router & main structure
    │   └── main.jsx     # DOM entrypoint
```

---

## Future Roadmap ⏱️
*   **Waitlist System:** An automated sweep mechanism using the bitmask engine to trigger notifications or bookings when a slot frees up.
*   **Real-time Notifications:** WebSockets integration using Socket.io to push real-time appointment updates to patients and doctors.
