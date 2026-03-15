# 🎓 WhoseNext: Real-Time Placement Queue Management System

A high-performance, full-stack web application designed to streamline student flow during recruitment drives. This system replaces manual coordination with a real-time, automated digital queue, featuring a premium dark-themed Admin Control Center and a live, TV-optimized Candidate Dashboard.

**Author:** Avikshit Kumar

---

## 🚀 Key Features
- **Instant Real-Time Sync**: Powered by **Socket.io** for zero-latency updates across all connected displays.
- **TV-Optimized Dashboard**: Designed for high visibility on large screens, featuring animated progress bars and full-screen API support.
- **Audio Cues**: Automatic "chime" notifications to alert candidates when they are called for an interview.
- **Premium UI/UX**: Custom-built modal engine for a professional, dark-mode desktop experience—no generic browser alerts.
- **Excel Integration**: Bulk upload candidate lists via `.xlsx` and download detailed, multi-round interview reports.
- **Persistent Data**: Integrated with **MongoDB Atlas** using Mongoose to ensure candidate history and paths are stored securely.

---

## 🛠️ Tech Stack

**Frontend**
- HTML5 & CSS3 (Modern Flexbox/Grid architecture)
- Vanilla JavaScript (ES6+)
- Custom UI/Modal Engine (No external CSS frameworks)

**Backend & Real-Time**
- Node.js
- Express.js
- Socket.io (WebSocket protocol)

**Database & Data Processing**
- MongoDB Atlas (Cloud Database)
- Mongoose (ODM)
- SheetJS / `xlsx` (Excel parsing and generation)

---

## 📋 Prerequisites
Before you begin, ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/) (v14.x or higher)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and connection string.

---

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd placement-drive
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your MongoDB connection string and preferred port:
   ```env
   MONGO_URI=your_mongodb_atlas_connection_string
   PORT=3001
   ```

4. **Start the server:**
   ```bash
   npm start
   # Or for development with auto-restart: npm run dev (if nodemon is installed)
   ```

5. **Access the application:**
   - **Candidate Dashboard (User Page):** `https://whosenext-0fx4.onrender.com`
   - **Admin Control Center:** `https://whosenext-0fx4.onrender.com/admin`

---

## 📁 Project Structure

```text
placement-drive/
├── public/
│   ├── admin.html      # Admin control center UI
│   ├── user.html       # Candidate TV dashboard UI
│   ├── style.css       # Unified premium styling
│   └── chime.mp3       # Audio notification asset
├── server.js           # Express server, Socket.io, & API logic
├── package.json        # Project metadata and dependencies
├── .env                # Environment variables (ignored in git)
└── README.md           # Project documentation
```

---

## 🔌 Core API Endpoints

- `GET /get-queue`: Fetches the current active student queue.
- `GET /get-company`: Fetches current dashboard branding.
- `POST /add-student`: Adds a new candidate to the database.
- `POST /update-status`: Moves a candidate forward, rejects them, or calls them in.
- `POST /edit-student`: Modifies a candidate's assigned interview path.
- `DELETE /remove-student/:index`: Removes a candidate from the active queue.
- `GET /download-excel`: Generates and downloads the final `.xlsx` report.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](<your-issues-url>) if you want to contribute.

---

## 📄 License
This project is licensed under the **MIT License**. Feel free to use, modify, and distribute this project as per the terms of the license.
