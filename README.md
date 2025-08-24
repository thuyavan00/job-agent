# JobAgent Pro

A job automation platform with:

- **Resume & Cover Letter Builder** (ATS-friendly)
- **Workflow Builder** (future)
- **Application Tracker**
- **Interview Calendar**
- AI-powered modules (planned)

This README covers the **Resume Builder** feature implemented so far.

---

## ✨ Features Implemented

### 🔹 Resume & Cover Letter Builder

- Step-by-step wizard (Personal Info → Education → Work Experience → Projects → Skills).
- ATS-friendly resume and cover letter templates generated from user input.
- Output stored as **PDF** and **DOCX** under `generated/`:
  - Resumes → `resume-simple-ats-v<TIMESTAMP>.pdf/.docx`
  - Cover Letters → `cover-simple-ats-v<TIMESTAMP>.pdf/.docx`
- Files served statically under `/static/...` and listed separately on the Resume Builder dashboard.
- **Default file** is always the latest (sorted by modified time).
- Files can be **viewed, downloaded, or deleted** from the frontend.
- New resume wizard starts with **StepBasics** after clicking _Create New Resume_.

### 🔹 Frontend (React + Vite + Tailwind v4)

- **Sidebar navigation** with active highlighting.
- **Theme toggle (dark/light)** using a global `ThemeProvider`.
- Sidebar footer includes:
  - Theme toggle
  - User email (truncated with ellipsis if too long).
- **Resume Builder landing page** shows:
  - Resumes list
  - Cover letters list
  - “Create New Resume” button
- **Wizard navigation**:
  - StepperHeader with icons + progress bar
  - `Next` (form submit + navigate forward)
  - `Previous` (navigate back)
- Styling:
  - Dark mode by default
  - Form fields with custom background colors
  - Components centered & spaced for readability

### 🔹 Backend (NestJS + Express)

- **Static file serving**:
  - `/static/*` serves files from `generated/`.
  - Emails are slugified (`kannanthuyavan@gmail.com` → `kannanthuyavan-gmail-com`) for safe folder names.
- **ResumeController**:
  - `GET /resume/files` → lists grouped `{ resumes, coverLetters }`
  - `DELETE /resume/files/:fileName` → deletes a file for the current user
  - Both expect `x-user-email` header
- **Generation service**:
  - Writes resume + cover letter files into `generated/<safeEmail>/`
  - Filenames include timestamp version (cache busting)

---

## 🛠️ Tech Stack

### Frontend

- [React](https://react.dev/) (Vite bundler)
- [TailwindCSS v4](https://tailwindcss.com/)
- [lucide-react](https://lucide.dev/) icons
- React Router v6
- Axios for API calls

### Backend

- [NestJS](https://nestjs.com/) (Express adapter)
- `ServeStaticModule` for serving `/static`
- File I/O with Node `fs/promises`

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd job-agent
npm install
```

### 2. Run Backend

```bash
cd server
npm run start:dev
```

Backend runs at [http://localhost:3000](http://localhost:3000).

### 3. Run Frontend

```bash
cd client
npm run dev
```

Frontend runs at [http://localhost:5173](http://localhost:5173).

### 4. Proxy Setup (Vite → Nest)

`vite.config.ts` includes:

```ts
server: {
  proxy: {
    "/api": { target: "http://localhost:3000", changeOrigin: true },
    "/static": { target: "http://localhost:3000", changeOrigin: true },
  },
}
```

---

## 📂 Project Structure

```
job-agent/
│
├── server/                     # NestJS backend
│   ├── src/
│   │   ├── resume/
│   │   │   ├── resume.controller.ts
│   │   │   └── file-util.ts
│   │   └── main.ts
│   ├── generated/              # generated files (per user folder)
│   └── ...
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── StepperHeader.tsx
│   │   │   └── Card.tsx
│   │   ├── theme/
│   │   │   └── ThemeProvider.tsx
│   │   ├── routes/
│   │   │   ├── ResumeLayout.tsx
│   │   │   ├── ResumeHome.tsx
│   │   │   ├── StepBasics.tsx
│   │   │   ├── StepEducation.tsx
│   │   │   ├── StepExperience.tsx
│   │   │   ├── StepProjects.tsx
│   │   │   └── StepSkills.tsx
│   │   └── constants/
│   │       └── steps.ts
│   └── ...
```

---

## 🔮 Next Steps

- [ ] Workflow Builder (connect job portals, Gmail, LinkedIn)
- [ ] Application Tracker UI + interview rounds
- [ ] Calendar integration (Google/Outlook)
- [ ] AI-powered Resume optimization
- [ ] User authentication & profiles

---

## 🧑‍💻 Dev Notes

- **Cache busting**: PDFs/DOCXs are versioned with `-v<TIMESTAMP>` → no stale cache.
- **Slugify emails**: ensures safe folder names on Windows.
- **Default file** = latest by `mtimeMs` in each group.
- **Theme switching**: Only **dark** / **light** supported, using `data-theme` attr + TailwindCSS variables.
- **Navigation**: Stepper auto-advances and backtracks using `resumeSteps` array.

---

## 📜 License

MIT
