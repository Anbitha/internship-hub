import { useState, useEffect } from 'react'; import { api, useData, run, fmt } from '../api.js'; import { Badge } from './Tabs.jsx';
const Empty = ({ list, text }) => list.length ? null : <p className="muted">{text}</p>;
// ro = read-only view (used on the admin dashboard)

export const DEPARTMENTS = [
  'Computer Science and Engineering (CSE)',
  'Information Technology (IT)',
  'Electronics and Communication Engineering (ECE)',
  'Electrical and Electronics Engineering (EEE)',
  'Mechanical Engineering (MECH)',
  'Civil Engineering (CIVIL)',
  'Artificial Intelligence and Data Science (AI & DS)',
  'Cyber Security',
  'Master of Computer Applications (MCA)',
  'Other'
];

export function Postings({ ro, user }) {
  const blank = { title: '', company: '', description: '', stipend: '', deadline: '', department: user?.department || 'Computer Science and Engineering (CSE)' };
  const [list, load] = useData('/internships'), [f, setF] = useState(blank), set = k => e => setF({ ...f, [k]: e.target.value });

  // In faculty coordinator dashboard, once the deadline is over the posting is removed automatically
  const isPostingActive = i => {
    if (!i.deadline) return true;
    const d = new Date(i.deadline);
    d.setHours(23, 59, 59, 999);
    return d.getTime() >= Date.now();
  };
  const visibleList = ro ? list : list.filter(isPostingActive);

  return (<div>
    {!ro && <form className="card grid" onSubmit={e => { e.preventDefault(); run(() => api('/internships', 'POST', f), () => { load(); setF({ ...blank, department: user?.department || f.department }); }); }}>
      <h3>New posting</h3>
      <input placeholder="Role title" value={f.title} onChange={set('title')} required />
      <input placeholder="Company" value={f.company} onChange={set('company')} required />
      <label>Department
        <select value={f.department} onChange={set('department')} required>
          <option value="">Select Department</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <input placeholder="Stipend (optional)" value={f.stipend} onChange={set('stipend')} />
      <label>Apply by<input type="date" value={f.deadline} onChange={set('deadline')} required /></label>
      <textarea placeholder="What will the intern do?" value={f.description} onChange={set('description')} required />
      <button>Post Internship</button>
    </form>}
    <Empty list={visibleList} text={ro ? "No postings yet." : "No active postings. (Past-deadline postings are automatically removed)"} />
    {visibleList.map(i => (<div className="card row" key={i._id}>
      <div>
        <b>{i.title}</b> at {i.company} {i.department && <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>🏛️ {i.department}</span>} {i.mouVerified && <Badge s="MoU verified" />}
        <p>{i.description}</p>
        <small>Posted by <b>{i.createdBy?.name || 'unknown'}</b> on {fmt(i.createdAt)} · Apply by {fmt(i.deadline)}{i.stipend && ` · ${i.stipend}`}</small>
      </div>
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
    {list.map(a => (<div className="card" key={a._id}>
      <b>{a.name || a.student?.name}</b> → {a.internship?.title}, {a.internship?.company} <Badge s={a.status} />
      <div className="app-meta">
        <span><strong>Mobile:</strong> {a.mobileNumber || 'N/A'}</span>
        <span><strong>Dept:</strong> {a.department || 'N/A'}</span>
        <span><strong>Year & Sec:</strong> {a.year || 'N/A'} {a.section ? `(Sec ${a.section})` : ''}</span>
        <span><strong>Email:</strong> {a.student?.email}</span>
      </div>
      <p>
        {a.resume && <a href={a.resume} target="_blank" rel="noreferrer" download={a.resumeName || undefined}>📄 {a.resumeName ? `Resume (${a.resumeName})` : 'Resume'}</a>}
        {a.coverLetter && <span className="muted"> · "{a.coverLetter}"</span>}
      </p>
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

function CertificateVerification({ a, done, ro }) {
  const [credits, setCredits] = useState(a.creditsAwarded || 2);
  const [remarks, setRemarks] = useState(a.creditsRemarks || '');
  const [editing, setEditing] = useState(false);

  const handleVerify = e => {
    e.preventDefault();
    run(() => api(`/applications/${a._id}/verify-certificate`, 'PATCH', { credits: +credits, remarks, action: 'verify' }), () => {
      alert('Certificate verified and credits awarded successfully!');
      setEditing(false);
      done();
    });
  };

  const handleReject = () => {
    const reason = prompt('Please enter reason for rejecting certificate / requesting re-upload:', remarks || 'Certificate image is unclear');
    if (!reason) return;
    run(() => api(`/applications/${a._id}/verify-certificate`, 'PATCH', { remarks: reason, action: 'reject' }), () => {
      alert('Certificate marked for re-upload.');
      done();
    });
  };

  if (!a.completionDoc) {
    return (
      <div className="sub" style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: '6px' }}>
        <p className="muted" style={{ margin: 0 }}>
          ⏳ <b>Completion Certificate & Credits:</b> Awaiting student to upload completion certificate (due within 1 month after internship completion).
        </p>
      </div>
    );
  }

  const isVerified = a.certificateStatus === 'verified' && !editing;

  return (
    <div className="sub" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--line)' }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <div>
          <b>Internship Completion Certificate</b>
          <Badge s={a.certificateStatus === 'verified' ? 'approved' : a.certificateStatus === 'rejected' ? 'rejected' : 'pending'} />
        </div>
      </div>

      <p style={{ margin: '8px 0' }}>
        <a href={a.completionDoc} target="_blank" rel="noreferrer" download={a.completionDocName || 'completion-certificate'}>
          📄 <b>View / Download Certificate</b> {a.completionDocName ? `(${a.completionDocName})` : ''}
        </a>
        <span className="muted"> · Uploaded on {fmt(a.completionDocUploadedAt || a.updatedAt)}</span>
        {a.certificateDeadline && (
          <span className="muted"> · Due: {fmt(a.certificateDeadline)}</span>
        )}
      </p>

      {isVerified ? (
        <div style={{ background: '#d8f0e3', color: 'var(--ok)', padding: '10px 12px', borderRadius: '6px', marginTop: '6px' }}>
          <b>✓ Certificate Verified & Credits Awarded: {a.creditsAwarded} Credits</b>
          {a.creditsRemarks && <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>Remarks: "{a.creditsRemarks}"</p>}
          <small style={{ color: 'var(--ink)', opacity: 0.8 }}>Verified on {fmt(a.creditsAwardedAt)}</small>
          {!ro && (
            <div style={{ marginTop: '8px' }}>
              <button className="ghost" style={{ fontSize: '0.8rem', padding: '3px 10px' }} onClick={() => setEditing(true)}>
                Modify Credits / Remarks
              </button>
            </div>
          )}
        </div>
      ) : (!ro && (
        <form className="grid" style={{ marginTop: '8px' }} onSubmit={handleVerify}>
          <div className="grid-2">
            <label>
              Credits to Award *
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                placeholder="Credits"
                value={credits}
                onChange={e => setCredits(e.target.value)}
                required
              />
            </label>
            <label>
              Verification Remarks
              <input
                placeholder="Remarks (e.g. Verified official company certificate)"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </label>
          </div>
          <div className="actions">
            <button type="submit">Verify Certificate & Award Credits</button>
            <button type="button" className="ghost" onClick={handleReject}>Reject / Request Re-upload</button>
            {editing && <button type="button" className="ghost" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form>
      ))}
    </div>
  );
}

export function Evaluations({ ro }) {
  const [list, load] = useData('/applications'), act = list.filter(a => ['accepted', 'completed'].includes(a.status));
  return (<div><Empty list={act} text="No active interns assigned yet." />
    {act.map(a => (<div className="card" key={a._id}>
      <b>{a.name || a.student?.name}</b> · {a.internship?.title} ({a.internship?.company}) <Badge s={a.status} />
      <div className="app-meta">
        <span><strong>Mobile:</strong> {a.mobileNumber || '-'}</span>
        <span><strong>Dept:</strong> {a.department || '-'}</span>
        <span><strong>Year & Sec:</strong> {a.year || '-'} {a.section ? `(Sec ${a.section})` : ''}</span>
        <span><strong>Email:</strong> {a.student?.email}</span>
      </div>
      <CertificateVerification a={a} done={load} ro={ro} />
    </div>))}</div>);
}

export function Users() {
  const blank = { name: '', email: '', password: '', role: 'faculty', facultyType: 'mentor', department: 'Computer Science and Engineering (CSE)', customDept: '' };
  const [list, load] = useData('/users'), [f, setF] = useState(blank);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (<div>
    <form className="card grid" onSubmit={e => {
      e.preventDefault();
      const payload = { ...f, department: f.department === 'Other' ? f.customDept : f.department };
      run(() => api('/users', 'POST', payload), () => { load(); setF(blank); });
    }}>
      <h3>Add a student or faculty member</h3>
      <input placeholder="Name" value={f.name} onChange={set('name')} required />
      <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      <input type="password" placeholder="Temporary password (6+ characters)" value={f.password} onChange={set('password')} required minLength={6} />
      <label>Department *
        <select value={f.department} onChange={set('department')} required>
          <option value="">Select department</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      {f.department === 'Other' && (
        <input placeholder="Enter department name" value={f.customDept || ''} onChange={set('customDept')} required />
      )}
      <select value={f.role} onChange={set('role')}><option value="faculty">Faculty</option><option value="student">Student</option></select>
      {f.role === 'faculty' && <select value={f.facultyType} onChange={set('facultyType')}><option value="mentor">Mentor</option><option value="coordinator">Coordinator</option></select>}
      <button>Add user</button></form>
    {list.map(u => (<div className="card row" key={u._id}>
      <div>
        <b>{u.name}</b> · {u.email} <Badge s={u.facultyType || u.role} />
        {u.department && <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', marginLeft: '6px' }}>🏛️ {u.department}</span>}
      </div>
      {u.role !== 'admin' && <button className="ghost" onClick={() => confirm(`Delete ${u.name}?`) && run(() => api(`/users/${u._id}`, 'DELETE'), load)}>Delete</button>}</div>))}</div>);
}

export function Activity() {
  const [list] = useData('/activity');
  return (<div><Empty list={list} text="No activity yet." />
    {list.map(x => (<div className="card" key={x._id}><b>{x.actor?.name || 'Deleted user'}</b> <Badge s={x.actor?.facultyType || x.actor?.role || 'user'} /> {x.action}
      <p>{x.detail}</p><small>{new Date(x.createdAt).toLocaleString()}</small></div>))}</div>);
}
