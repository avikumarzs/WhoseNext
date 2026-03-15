# 🎓 Placement Drive: Real-Time Queue Management System

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
- **Frontend**: HTML5, CSS3 (Modern Flex/Grid), JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Real-Time Communication**: Socket.io
- **Database**: MongoDB Atlas (Mongoose)
- **Data Processing**: SheetJS (XLSX)

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
   Create a `.env` file in the root directory and add your MongoDB connection string:
   ```env
   MONGO_URI=your_mongodb_atlas_connection_string
   PORT=3001
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Access the application:**
   - **Candidate Dashboard (User Page):** `http://localhost:3001`
   - **Admin Control Center:** `http://localhost:3001/admin`

---

## 📁 Project Structure
- `server.js`: The core Express server handling Socket.io events and API routes.
- `public/`:
  - `user.html`: The live dashboard for public display.
  - `admin.html`: The command center for recruitment coordinators.
  - `style.css`: Unified styling for the premium dark-mode interface.
  - `chime.mp3`: Local audio asset for student alerts.

---
---

## 📱 LinkedIn Post Draft

**Headline: Streamlining Recruitment with Real-Time Engineering 🚀**

Managing hundreds of candidates across multiple interview rooms is a logistical challenge. I built a real-time management system to turn "Queue Chaos" into a sleek, automated digital experience during campus placement drives. 

**What's under the hood?**
✅ **Live Synchronization:** Using **Socket.io**, name updates and "Call Ins" happen instantly across all screens.
✅ **TV-Ready Dashboard:** A dedicated interface for public displays, complete with animated progress bars and audio chimes to notify students.
✅ **Automated Analytics:** Generates detailed Excel reports of the entire drive, including round-by-round results for every candidate.
✅ **Modern UI/UX:** A custom-built, dark-mode interface designed for high-pressure environments.

This project was a deep dive into building production-ready systems that handle time-sensitive data streams and provide immediate visual feedback. 

**Tech Stack:** Node.js | Express | Socket.io | MongoDB | SheetJS

#WebDevelopment #NodeJS #RecruitmentTech #SocketIO #FullStack #SoftwareEngineering #PlacementDrive