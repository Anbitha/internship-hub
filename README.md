# InternHub – Internship Management (MERN)
Roles: admin, faculty (coordinator / mentor), student. Each has its own login page and dashboard.

## Run
1. Start MongoDB locally (or use Atlas).
2. `cd server && cp .env.example .env && npm install && npm start`  (API on :5000)
3. `cd client && npm install && npm run dev`  (app on :5173)

Seeded admin: admin@college.edu / admin123 (change it). Admin can add only students and faculty
(Coordinator or Mentor), cannot create other admins, and has a read-only view of postings (with who posted/approved),
companies, applications, evaluations and reports, plus an Activity tab showing who did what.
Students can also self-register on the student login page.

Flow: faculty/admin posts internship -> coordinator approves -> student applies ->
coordinator sends offer (deadline, mentor, supervisor, company contact) -> student accepts/declines ->
student submits reports -> mentor approves + mid/final evaluations -> student downloads certificate & letter.
