import { useState, useEffect } from 'react'; import { api, useData, run, fmt } from '../api.js'; import { Badge } from './Tabs.jsx';
const Empty = ({ list, text }) => list.length ? null : <p className="muted">{text}</p>;
// ro = read-only view (used on the admin dashboard)

export function Postings({ ro }) {
  const blank = { title: '', company: '', description: '', stipend: '', deadline: '' };
  const [list, load] = useData('/internships'), [f, setF] = useState(blank), set = k => e => setF({ ...f, [k]: e.target.value });
  const review = (i, status) => run(() => api(`/internships/${i._id}/status`, 'PATCH', { status }), load);
  return (<div>
    {!ro && <form className="card grid" onSubmit={e => { e.preventDefault(); run(() => api('/internships', 'POST', f), () => { load(); setF(blank); }); }}>
      <h3>New posting</h3>
      <input placeholder="Role title" value={f.title} onChange={set('title')} required />
      <input placeholder="Company" value={f.company} onChange={set('company')} required />
      <input placeholder="Stipend (optional)" value={f.stipend} onChange={set('stipend')} />
      <label>Apply by<input type="date" value={f.deadline} onChange={set('deadline')} required /></label>
      <textarea placeholder="What will the intern do?" value={f.description} onChange={set('description')} required />
      <button>Submit for approval</button>
    </form>}
    <Empty list={list} text="No postings yet." />
    {list.map(i => (<div className="card row" key={i._id}>
      <div><b>{i.title}</b> at {i.company} <Badge s={i.status} /> {i.mouVerified ? <Badge s="MoU verified" /> : <Badge s="MoU pending" />}<p>{i.description}</p>
        <small>Posted by <b>{i.createdBy?.name || 'unknown'}</b> on {fmt(i.createdAt)}{i.reviewedBy && <> · {i.status} by <b>{i.reviewedBy.name}</b></>} · Apply by {fmt(i.deadline)}{i.stipend && ` · ${i.stipend}`}</small></div>
      {!ro && <div className="actions">
        {i.status !== 'approved' && <button onClick={() => review(i, 'approved')}>Approve</button>}
        {i.status !== 'rejected' && <button className="ghost" onClick={() => review(i, 'rejected')}>Reject</button>}</div>}
    </div>))}</div>);
}

export function Companies({ ro }) {
  const [list, load] = useData('/companies');
  return (<div><Empty list={list} text="Companies appear here once a posting is created." />
    {list.map(c => (<div className="card row" key={c._id}><div><b>{c.name}</b> <Badge s={c.mouVerified ? 'MoU verified' : 'MoU pending'} /></div>
      {!ro && <button onClick={() => run(() => api(`/companies/${c._id}`, 'PATCH', { mouVerified: !c.mouVerified }), load)}>{c.mouVerified ? 'Remove verification' : 'Verify MoU'}</button>}</div>))}</div>);
}

export function Policy({ ro }) {
  const [p, setP] = useState(null);
  useEffect(() => { api('/policy').then(setP); }, []);
  if (!p) return null;
  const set = k => e => setP({ ...p, [k]: +e.target.value });
  return (<form className="card grid" onSubmit={e => { e.preventDefault(); run(() => api('/policy', 'PUT', p), () => alert('Policy saved')); }}>
    <h3>Eligibility and credits</h3>
    <label>Minimum CGPA<input type="number" step="0.1" value={p.minCgpa} onChange={set('minCgpa')} readOnly={ro} /></label>
    <label>Credits awarded on completion<input type="number" value={p.credits} onChange={set('credits')} readOnly={ro} /></label>
    <label>Max applications per student<input type="number" value={p.maxApplications} onChange={set('maxApplications')} readOnly={ro} /></label>
    {!ro && <button>Save policy</button>}</form>);
}

function OfferForm({ a, mentors, done }) {
  const [f, setF] = useState({ offerDeadline: '', mentor: '', supervisor: '', companyContact: '' }), set = k => e => setF({ ...f, [k]: e.target.value });
  return (<div className="grid sub">
    <label>Offer expires<input type="date" value={f.offerDeadline} onChange={set('offerDeadline')} /></label>
    <label>Mentor<select value={f.mentor} onChange={set('mentor')}><option value="">Choose mentor</option>{mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></label>
    <input placeholder="Company supervisor" value={f.supervisor} onChange={set('supervisor')} />
    <input placeholder="Company contact (email/phone)" value={f.companyContact} onChange={set('companyContact')} />
    <div className="actions"><button disabled={!f.offerDeadline || !f.mentor} onClick={() => run(() => api(`/applications/${a._id}/offer`, 'PATCH', f), done)}>Send offer</button>
      <button className="ghost" onClick={() => run(() => api(`/applications/${a._id}/reject`, 'PATCH'), done)}>Reject</button></div></div>);
}
export function Applications({ ro }) {
  const [list, load] = useData('/applications'), [mentors] = useData('/mentors');
  return (<div><Empty list={list} text="No applications yet." />
    {list.map(a => (<div className="card" key={a._id}><b>{a.student?.name}</b> → {a.internship?.title}, {a.internship?.company} <Badge s={a.status} />
      <p><a href={a.resume} target="_blank" rel="noreferrer">Resume</a> · {a.coverLetter}</p>
      {a.mentor && <small>Mentor: {a.mentor.name} · Supervisor: {a.supervisor} · Contact: {a.companyContact} · Offer expires {fmt(a.offerDeadline)}</small>}
      {!ro && a.status === 'applied' && <OfferForm a={a} mentors={mentors} done={load} />}</div>))}</div>);
}

export function Reports({ ro }) {
  const [list, load] = useData('/reports'), [fb, setFb] = useState({});
  const review = (r, status) => run(() => api(`/reports/${r._id}`, 'PATCH', { status, feedback: fb[r._id] }), load);
  return (<div><Empty list={list} text="No reports submitted yet." />
    {list.map(r => (<div className="card" key={r._id}><b>{r.student?.name}</b> · {r.application?.internship?.title} · {r.type} report <Badge s={r.status} />
      <p>{r.content}</p>{r.feedback && <small>Feedback: {r.feedback}</small>}
      {!ro && r.status === 'pending' && <div className="grid sub"><input placeholder="Feedback (optional)" onChange={e => setFb({ ...fb, [r._id]: e.target.value })} />
        <div className="actions"><button onClick={() => review(r, 'approved')}>Approve</button><button className="ghost" onClick={() => review(r, 'rejected')}>Request changes</button></div></div>}</div>))}</div>);
}

function EvalForm({ a, stage, done, ro }) {
  const [f, setF] = useState({ score: '', remarks: '' }), cur = a[stage], label = stage === 'midEval' ? 'Mid-point' : 'Final';
  if (cur?.score != null) return <p><b>{label}:</b> {cur.score}/10 – {cur.remarks}</p>;
  if (ro) return <p className="muted">{label} evaluation not done yet.</p>;
  return (<div className="grid sub"><b>{label} evaluation</b>
    <input type="number" min="0" max="10" placeholder="Score out of 10" value={f.score} onChange={e => setF({ ...f, score: +e.target.value })} />
    <input placeholder="Remarks" value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} />
    <button disabled={f.score === ''} onClick={() => run(() => api(`/applications/${a._id}/eval`, 'PATCH', { stage, ...f }), done)}>Save evaluation</button></div>);
}
export function Evaluations({ ro }) {
  const [list, load] = useData('/applications'), act = list.filter(a => ['accepted', 'completed'].includes(a.status));
  return (<div><Empty list={act} text="No active interns yet." />
    {act.map(a => (<div className="card" key={a._id}><b>{a.student?.name}</b> · {a.internship?.title} <Badge s={a.status} />{a.mentor && <small> · Mentor {a.mentor.name}</small>}
      <EvalForm a={a} stage="midEval" done={load} ro={ro} />{(a.midEval?.score != null) && <EvalForm a={a} stage="finalEval" done={load} ro={ro} />}</div>))}</div>);
}

export function Users() {
  const [list, load] = useData('/users'), blank = { name: '', email: '', password: '', role: 'faculty', facultyType: 'mentor' }, [f, setF] = useState(blank);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (<div>
    <form className="card grid" onSubmit={e => { e.preventDefault(); run(() => api('/users', 'POST', f), () => { load(); setF(blank); }); }}>
      <h3>Add a student or faculty member</h3><input placeholder="Name" value={f.name} onChange={set('name')} required /><input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      <input type="password" placeholder="Temporary password (6+ characters)" value={f.password} onChange={set('password')} required minLength={6} />
      <select value={f.role} onChange={set('role')}><option value="faculty">Faculty</option><option value="student">Student</option></select>
      {f.role === 'faculty' && <select value={f.facultyType} onChange={set('facultyType')}><option value="mentor">Mentor</option><option value="coordinator">Coordinator</option></select>}
      <button>Add user</button></form>
    {list.map(u => (<div className="card row" key={u._id}><div><b>{u.name}</b> · {u.email} <Badge s={u.facultyType || u.role} /></div>
      {u.role !== 'admin' && <button className="ghost" onClick={() => confirm(`Delete ${u.name}?`) && run(() => api(`/users/${u._id}`, 'DELETE'), load)}>Delete</button>}</div>))}</div>);
}

export function Activity() {
  const [list] = useData('/activity');
  return (<div><Empty list={list} text="No activity yet." />
    {list.map(x => (<div className="card" key={x._id}><b>{x.actor?.name || 'Deleted user'}</b> <Badge s={x.actor?.facultyType || x.actor?.role || 'user'} /> {x.action}
      <p>{x.detail}</p><small>{new Date(x.createdAt).toLocaleString()}</small></div>))}</div>);
}
