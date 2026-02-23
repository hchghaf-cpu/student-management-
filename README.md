# 🎓 Student Management System

A complete full-stack **Student Management** web application built with **Node.js**, **Express**, **SQLite (sql.js/WASM)**, and vanilla **HTML/CSS/JavaScript**.

## ✨ Features

- **Dashboard** – live stats cards + bar charts (courses & grade distribution)
- **Students list** – sortable columns, search, multi-filter, pagination
- **Add / Edit / Delete** students with full form validation
- **REST API** with proper HTTP status codes and error handling
- **Persistent SQLite database** via sql.js (WASM – zero native build deps)
- **Vercel-ready** serverless deployment

## 🗂️ Project Structure

```
├── server.js           ← Express entry point
├── database.js         ← sql.js WASM SQLite layer
├── vercel.json         ← Vercel deployment config
├── routes/
│   └── students.js     ← REST API routes (CRUD + stats)
└── public/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## 🚀 Run Locally

```bash
npm install
npm start
# → http://localhost:3000
```

## 🌐 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List students (search, filter, sort, paginate) |
| GET | `/api/students/stats` | Dashboard stats |
| GET | `/api/students/:id` | Get one student |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |

## ☁️ Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Or connect this GitHub repo directly in the [Vercel dashboard](https://vercel.com/new).

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | SQLite via sql.js (WASM) |
| Frontend | Vanilla HTML / CSS / JS |
| Deployment | Vercel (serverless) |
