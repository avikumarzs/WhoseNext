# 🚀 Real-Time Placement Management System

A high-performance, real-time web application designed for college placement cells to manage candidate queues, interview rounds, and final selections. Built with a modern **SaaS-style UI**, it features persistent storage, live updates via WebSockets, and seamless Excel integration.

![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge) ![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white) ![SheetJS](https://img.shields.io/badge/SheetJS-217346?style=for-the-badge&logo=microsoft-excel&logoColor=white)

## ✨ Key Features

* **⚡ Real-Time Sync:** Powered by **Socket.io** for 0ms latency updates across Admin, User, and Selection Board displays.
* **💾 Persistent Storage:** Data is automatically saved to a local `placement_data.json` file, ensuring no data loss on server restarts.
* **📊 Admin Stats Dashboard:** Live counters for total candidates, active interviews, and waiting status.
* **📥 Excel Integration:** * **Bulk Upload:** Add hundreds of candidates instantly from an `.xlsx` file.
    * **Final Export:** Download a complete placement report with selection decisions.
* **🌓 Smart Dark Mode:** Persistent theme selection using `localStorage` to prevent flash-banging users on reload.
* **🔍 Smart Search:** Instant filtering for candidates in both Admin and User views with "No results" feedback.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Real-Time:** Socket.io
* **Database:** Local JSON Persistence (`fs` module)
* **Excel Logic:** SheetJS (XLSX)
* **Frontend:** HTML5, CSS3 (Glassmorphism & Grid), Vanilla JavaScript

---

## 📂 Project Structure

```text
├── server.js              # Express server & Socket.io logic
├── placement_data.json    # Local database (Auto-generated)
├── make_readme.js         # Documentation Generator
├── public/
│   ├── admin.html         # Candidate management & stats
│   ├── user.html          # Public live display for students
│   ├── results.html       # Selection board for HR/Recruiters
│   └── style.css          # Global SaaS-style theme
└── package.json           # Dependencies
```

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Installation
Clone this repository and install the required dependencies:

```bash
npm init -y
npm install express socket.io xlsx
```

### 3. Run the Server
```bash
node server.js
```

### 4. Access the App
* **Admin Panel:** `http://localhost:3001/admin`
* **User Display:** `http://localhost:3001/`
* **Selection Board:** `http://localhost:3001/results`

---

## 📝 Usage Notes

### **Excel Upload Format**
To bulk upload candidates, ensure your Excel file has headers like **"Name"** and **"Room"**. The system uses fuzzy matching to detect headers regardless of capitalization.

### **System Reset**
To clear the entire drive for a new day, use the **"Reset System"** button in the Admin Sidebar. Type `RESET` to confirm deletion of all local data.

---

## 📄 License

This project is licensed under the MIT License - see the text below for details.

```text
MIT License

Copyright (c) 2026 Admin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
