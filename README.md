# WhoseNext - Smart Placement Queue System

A professional, real-time Queue Management System designed for College Placement Cells. It streamlines the interview process by managing candidate workflows, displaying live status updates on large screens, and handling complex multi-stage interview paths.

## ✨ Key Features

### 👨‍💼 Admin Command Center
- **Workflow Routing:** Support for multi-stage interviews.
    - *Example:* Enter `Aptitude, TR, HR` and the system tracks the candidate through every step.
- **Smart Actions:** Context-aware buttons (`Call In`, `Send to [Next Room]`, `Finish`).
- **Bulk Excel Upload:** Upload `.xlsx` files. The system automatically detects comma-separated rooms and converts them into a sequence path.
- **Live Branding:** Update the **Company Name** (e.g., "Google", "Amazon") instantly on the public display.
- **Dark Mode:** One-click toggle for night drives or low-light control rooms.

### 📢 Public Display (TV Mode)
- **Responsive Grid Layout:** Automatically adjusts layout based on the number of active interviews (Single Card vs. Multi-Grid).
- **Visual Path Tracking:**
    - **Grey:** Completed Rounds.
    - **Green/Glowing:** Current Round (Active).
    - **Dashed:** Pending Rounds.
- **"Up Next" Scroll:** A scrollable sidebar list for waiting candidates so the UI never breaks.
- **Professional UI:** High-contrast typography, avatar placeholders, and smooth animations.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (CSS Variables for Theming).
- **Backend:** Node.js, Express.js.
- **Data:** In-Memory Storage (Resets on server restart).
- **Libraries:** `xlsx` (SheetJS) for Excel parsing.

---

## 🚀 Installation & Setup

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Clone & Install
```bash
git clone https://github.com/your-username/whosenext.git
cd whosenext
npm install
```

### 3. Run the Server
```bash
node server.js
```

### 4. Open the App
- **Admin Panel:** [http://localhost:3001/admin.html](http://localhost:3001/admin.html)
- **Public Display:** [http://localhost:3001/](http://localhost:3001/)

---

## 📝 Usage Guide

### 🧑‍💻 For Admins

**1. Setting the Stage**
- Open the Admin Panel.
- Enter the **Company Name** (e.g., "TCS Digital") in the sidebar and click **Set Branding**.
- Toggle **Dark Mode** (🌙) if preferred.

**2. Adding Candidates**
- **Manual:** Enter Name and Room.
    - *Single Room:* `302`
    - *Multi-Room:* `302, Lab 1, HR Cabin`
- **Excel:** Upload a file with headers `Name` and `Room`. The system auto-converts commas in the room column to paths.

**3. Managing the Flow**
- Click **📢 Call In** to start an interview.
- If the candidate has more rounds, click **➝ Send to [Next Room]**.
- If it's the last round, click **✓ Finish**.

---

### 📺 For The Display Screen

- Connect a laptop to a Projector or TV.
- Open [http://localhost:3001/](http://localhost:3001/).
- Press **F11** for Full Screen.
- The screen will auto-refresh every 2 seconds.

---

## 📂 Project Structure

```text
whosenext/
│
├── node_modules/       # Dependencies
├── public/             # Frontend Assets
│   ├── admin.html      # Admin Dashboard logic
│   ├── user.html       # TV Display logic
│   └── style.css       # Global Styles & Dark Mode
│
├── server.js           # Express Server & API Routes
├── package.json        # Config & Scripts
└── README.md           # Documentation
```

---

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](LICENSE)
