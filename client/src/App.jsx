import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx'; import Admin from './pages/Admin.jsx'; import Faculty from './pages/Faculty.jsx'; import Student from './pages/Student.jsx';
const home = { admin: Admin, faculty: Faculty, student: Student };
const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');

function Guard({ role }) {
  const nav = useNavigate(), u = getUser();
  if (!u || u.role !== role) return <Navigate to={`/login/${role}`} replace />;
  const Page = home[role];
  const out = () => { localStorage.clear(); nav(`/login/${role}`); };
  return (<><header className="top"><b>InternHub</b><span>{u.name} · {u.role === 'faculty' ? `faculty ${u.facultyType}` : u.role}</span><button className="ghost" onClick={out}>Log out</button></header>
    <main><Page user={u} /></main></>);
}
export default function App() {
  return (<Routes>
    <Route path="/login/:role" element={<Login />} />
    {Object.keys(home).map(r => <Route key={r} path={`/${r}`} element={<Guard role={r} />} />)}
    <Route path="*" element={<Navigate to={getUser() ? `/${getUser().role}` : '/login/student'} replace />} />
  </Routes>);
}
