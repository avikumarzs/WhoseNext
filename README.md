# WhoseNext

A real-time Placement Cell Queue Management System built with Node.js and vanilla JavaScript. Features a live student status dashboard, admin control panel with bulk Excel upload, and dynamic interview workflow routing.

## ✨ Features

### 👨‍💼 Admin Dashboard (Control Center)
- **Manual Entry:** Add candidates one by one with support for single rooms or multi-stage workflows (e.g., `Room 302` ➜ `Technical Round` ➜ `HR`).
- **Bulk Upload:** Upload an Excel (`.xlsx`) file to add hundreds of students instantly.
- **Queue Management:** View the active list and remove candidates once their interview process is complete.
- **Workflow Toggle:** Switch between "Single Room" mode and "Multi-Room Path" mode effortlessly.

### 📢 User Dashboard (Live Display)
- **Real-Time Updates:** The screen refreshes automatically every 2 seconds to show the latest status.
- **TV Mode:** Optimized for large screens/projectors in waiting halls with clear, readable typography.
- **Visual Paths:** Displays interview workflows as a clear step-by-step path with arrows.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API)
- **Backend:** Node.js, Express.js
- **Data Handling:** In-Memory Array (Mock Database)
- **File Parsing:** `xlsx` library for Excel sheet processing

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/placement-queue-system.git
   cd placement-queue-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Server**
   ```bash
   node server.js
   ```

4. **Access the Application**
   - **Admin Panel:** [http://localhost:3001/admin.html](http://localhost:3001/admin.html)
   - **Live Display:** [http://localhost:3001/](http://localhost:3001/)

---

## 📂 Project Structure

```text
placement-project/
│
├── node_modules/       # Installed dependencies
├── public/             # Static files (Frontend)
│   ├── admin.html      # Admin control interface
│   ├── user.html       # Public display interface
│   └── style.css       # Shared styling
│
├── server.js           # Backend logic (Express Server)
├── package.json        # Project metadata & dependencies
└── README.md           # Project documentation
```

---

## 📝 Usage Guide

### 1. Adding a Student (Manual)
1. Go to the **Admin Dashboard**.
2. Toggle "Multi-Room Mode" if the student needs to visit multiple locations.
3. Enter **Name** and **Room/Path**.
4. Click **Add**.

### 2. Bulk Uploading from Excel
1. Prepare an Excel sheet with two columns: `Name` and `Room`.
2. In the **Room** column, you can use commas to specify a path (e.g., `Lab 1, Room 405`).
3. Click **"Choose File"** in the Admin Dashboard and select your sheet.
4. Click **"Process Excel"**.

### 3. Displaying the Queue
1. Open the **Live Display** link on a projector or large monitor in the waiting area.
2. The list will auto-update as the Admin adds or removes students.

---

## 🤝 Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
