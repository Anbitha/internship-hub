import { useState } from 'react'; import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'; import { api } from '../api.js';
import { DEPARTMENTS } from './panels.jsx';
const ROLES = ['student', 'faculty', 'admin'];
const blurb = { student: 'Find internships, apply, and track your progress.', faculty: 'Approve postings, guide students, and review reports.', admin: 'Manage users and oversee every internship.' };
export default function Login() {
  const { role } = useParams(), nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', department: '' }), [reg, setReg] = useState(false), [err, setErr] = useState('');
  if (!ROLES.includes(role)) return <Navigate to="/login/student" replace />;
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setErr('');
    try {
      const d = await api(reg ? '/auth/register' : '/auth/login', 'POST', { ...f, role });
      localStorage.setItem('token', d.token); localStorage.setItem('user', JSON.stringify(d.user)); nav('/' + d.user.role);
    } catch (e) { setErr(e.message); }
  };
  return (<div className="login">
    <aside><h1>InternHub</h1><p>{blurb[role]}</p></aside>
    <form onSubmit={submit}>
      <nav className="tabs">{ROLES.map(r => <Link key={r} className={r === role ? 'on' : ''} to={`/login/${r}`} onClick={() => setReg(false)}>{r}</Link>)}</nav>
      <h2>{reg ? 'Create student account' : `Log in as ${role}`}</h2>
      {reg && <>
        <label>Full name<input value={f.name} onChange={set('name')} required /></label>
        <label>Department
          <select value={f.department} onChange={set('department')} required>
            <option value="">Select your department</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </>}
      <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
      <label>Password<input type="password" value={f.password} onChange={set('password')} required minLength={reg ? 6 : 1} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button>{reg ? 'Create account' : 'Log in'}</button>
      {role === 'student' && <button type="button" className="link" onClick={() => setReg(!reg)}>{reg ? 'I already have an account' : 'New student? Create an account'}</button>}
    </form></div>);
}
