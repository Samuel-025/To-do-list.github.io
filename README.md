# ⚡ TaskFlow - Full-Stack Task Manager

🌐 **Live Demo**: [https://samuel-025.github.io/To-do-list.github.io/](https://samuel-025.github.io/To-do-list.github.io/)

A modern, full-stack Task Manager application combining the single-column dashboard UI of **TaskFlow** (`To-do-list.github.io`) with a robust **Python Flask** REST API and **SQLite** database backend.

---

## ✨ Features Overview

- 🎨 **TaskFlow UI Dashboard**: Centered, single-column dashboard featuring cyan/teal accents, dark glassmorphism styling, and responsive layout.
- 📊 **Live Stat Cards**: Real-time metrics for **TOTAL**, **DONE**, and **PENDING** tasks, plus an overall task completion progress bar.
- ⚡ **Task Creation & Priority Selector**: Quick task creation with priority pill buttons (*Low*, *Medium*, *High*), due date picker, and input auto-focus.
- 🔀 **Filter Pills & Sorting Controls**: Filter tasks instantly by *All*, *Active*, *Done*, or *High Priority*, and sort by *Newest first*, *Oldest first*, *Priority*, or *Due date*.
- 🔐 **User Authentication & Accounts**: Tabbed **Sign In / Sign Up** page with secure password hashing (`Werkzeug`), session cookies, and user-isolated task data.
- ⚙️ **Account Settings & Danger Zone**: Interactive profile menu, password manager, and account deletion with password verification.
- 📋 **Subtask Checklist Drawer**: Click any task card to open the slide-over detail drawer panel for managing subtasks (`📋 X/Y`), notes, and date edits.
- 🌙 **Dark / Light Theme**: Compact icon theme switcher button with `localStorage` memory across both the login page and dashboard.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.9+, Flask, Flask-SQLAlchemy (SQLite ORM), Werkzeug Security
- **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox/Grid), Modern ES6+ JavaScript (Fetch API)
- **Database**: SQLite (`tasks.db`)

---

## 📁 Repository Structure

```text
To-Do List/
├── app.py                  # Flask web server, auth session engine & REST API endpoints
├── index.html              # Single source of truth: TaskFlow main dashboard layout
├── login.html              # Single source of truth: User authentication (Sign In / Sign Up)
├── .nojekyll               # Bypasses Jekyll on GitHub Pages to serve index.html directly
├── tasks.db                # SQLite database (Users, Tasks, Subtasks)
├── requirements.txt        # Python package dependencies (Flask, Flask-SQLAlchemy)
├── .gitignore              # Git ignore rules for venv, cache, and DBs
├── README.md               # Complete repository documentation
├── .vscode/                # VS Code workspace settings & F5 launch config
│   ├── settings.json
│   └── launch.json
└── static/                 # Static web assets
    ├── style.css           # Styling, themes, dashboard, auth card & drawer CSS
    ├── app.js              # Dual-engine API client (Flask REST API + localStorage fallback)
    └── favicon.svg         # TaskFlow logo browser tab icon
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+ installed.

### 1. Install Dependencies
```powershell
.\venv\Scripts\pip install -r requirements.txt
```

### 2. Run the Application
```powershell
.\venv\Scripts\python.exe app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser.

### 3. One-Click VS Code Debugging (F5)
Press **`F5`** inside VS Code to launch the server using the included [.vscode/launch.json](file:///c:/Users/adity/Desktop/Suya/To-Do%20List/.vscode/launch.json).

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `POST /api/auth/register` | `POST` | Create a new user account |
| `POST /api/auth/login` | `POST` | User sign in & session initialization |
| `POST /api/auth/logout` | `POST` | Sign out user |
| `GET /api/auth/me` | `GET` | Get current logged-in user details |
| `PUT /api/auth/account/password` | `PUT` | Update user password |
| `DELETE /api/auth/account` | `DELETE` | Delete account and all user data |
| `GET /api/tasks` | `GET` | Fetch user tasks (Query params: `filter`, `sort`, `search`) |
| `POST /api/tasks` | `POST` | Create a new task |
| `GET /api/tasks/<id>` | `GET` | Get task detail & subtasks |
| `PUT /api/tasks/<id>` | `PUT` | Update task fields (completed, priority, due date, notes) |
| `DELETE /api/tasks/<id>` | `DELETE` | Delete task |
| `POST /api/tasks/<id>/subtasks` | `POST` | Add subtask item |
| `PUT /api/subtasks/<id>` | `PUT` | Toggle/rename subtask |
| `DELETE /api/subtasks/<id>` | `DELETE` | Delete subtask |
| `GET /api/stats` | `GET` | Fetch Total, Done, Pending, and Completion Rate metrics |

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
