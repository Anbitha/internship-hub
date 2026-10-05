import { useState } from 'react'; import { api, useData, run, fmt } from '../api.js'; import Tabs, { Badge } from './Tabs.jsx';

function Browse() {
  const [q, setQ] = useState(''), [list] = useData('/internships?q=' + encodeURIComponent(q)), [open, setOpen] = useState(null), [f, setF] = useState({ resume: '', coverLetter: '' });
  return (<div><input className="search" placeholder="Search by role, company or keyword" value={q} onChange={e => setQ(e.target.value)} />
    {!list.length && <p className="muted">No open postings match your search.</p>}
    {list.map(i => (<div className="card" key={i._id}><b>{i.title}</b> at {i.company} {i.mouVerified && <Badge s="MoU verified" />}<p>{i.description}</p><small>Apply by {fmt(i.deadline)} {i.stipend && `· ${i.stipend}`}</small>
      {open === i._id ? (<form className="grid sub" onSubmit={e => { e.preventDefault(); run(() => api('/applications', 'POST', { internship: i._id, ...f }), () => { setOpen(null); alert('Application sent. Track it under My applications.'); }); }}>
        <input type="url" placeholder="Resume link (Drive / GitHub / PDF URL)" value={f.resume} onChange={e => setF({ ...f, resume: e.target.value })} required />
        <textarea placeholder="Cover letter" value={f.coverLetter} onChange={e => setF({ ...f, coverLetter: e.target.value })} required />
        <div className="actions"><button>Send application</button><button type="button" className="ghost" onClick={() => setOpen(null)}>Cancel</button></div></form>)
        : <div className="actions"><button onClick={() => setOpen(i._id)}>Apply</button></div>}</div>))}</div>);
}

function printDoc(a, user, kind) {
  const w = window.open(''), ev = a.finalEval;
  w.document.write(`<body style="font-family:Georgia,serif;max-width:640px;margin:60px auto;line-height:1.7"><h1>${kind === 'cert' ? 'Certificate of Completion' : 'Experience Letter'}</h1>
  <p>${kind === 'cert' ? 'This certifies that' : 'To whom it may concern: this is to confirm that'} <b>${user.name}</b> successfully completed an internship as <b>${a.internship.title}</b> at <b>${a.internship.company}</b>.</p>
  ${kind === 'letter' ? `<p>Mentor: ${a.mentor?.name || '-'}. Final evaluation: ${ev?.score}/10. ${ev?.remarks || ''}</p>` : ''}<p>Issued ${new Date().toLocaleDateString()}</p></body>`);
  w.document.close(); w.print();
}
function Mine({ user }) {
  const [list, load] = useData('/applications'), [reports, loadR] = useData('/reports'), [rep, setRep] = useState({}), [doc, setDoc] = useState({});
  return (<div>{!list.length && <p className="muted">You haven't applied yet. Browse postings to get started.</p>}
    {list.map(a => (<div className="card" key={a._id}><b>{a.internship?.title}</b> at {a.internship?.company} <Badge s={a.status} />
      {a.status === 'offered' && <div className="grid sub"><p>Offer received. Respond by <b>{fmt(a.offerDeadline)}</b>.</p><div className="actions">
        <button onClick={() => run(() => api(`/applications/${a._id}/respond`, 'PATCH', { accept: true }), load)}>Accept offer</button>
        <button className="ghost" onClick={() => run(() => api(`/applications/${a._id}/respond`, 'PATCH', { accept: false }), load)}>Decline</button></div></div>}
      {a.status === 'expired' && <p className="muted">The offer deadline passed.</p>}
      {['accepted', 'completed'].includes(a.status) && (<div className="sub">
        <p>Mentor: <b>{a.mentor?.name || 'not assigned'}</b> ({a.mentor?.email}) · Supervisor: <b>{a.supervisor}</b> · Company contact: <b>{a.companyContact}</b></p>
        {a.midEval?.score != null && <p>Mid-point: {a.midEval.score}/10 – {a.midEval.remarks}</p>}{a.finalEval?.score != null && <p>Final: {a.finalEval.score}/10 – {a.finalEval.remarks}</p>}
        {a.status === 'accepted' && <>
          <form className="grid" onSubmit={e => { e.preventDefault(); run(() => api('/reports', 'POST', { application: a._id, ...rep }), () => { loadR(); setRep({}); }); }}>
            <select value={rep.type || ''} onChange={e => setRep({ ...rep, type: e.target.value })} required><option value="">Report type</option><option value="progress">Progress</option><option value="final">Final</option></select>
            <textarea placeholder="What did you work on and learn?" value={rep.content || ''} onChange={e => setRep({ ...rep, content: e.target.value })} required /><button>Submit report</button></form>
          <div className="grid"><input type="url" placeholder="Completion documents link" value={doc[a._id] ?? a.completionDoc ?? ''} onChange={e => setDoc({ ...doc, [a._id]: e.target.value })} />
            <button onClick={() => run(() => api(`/applications/${a._id}/completion`, 'PATCH', { completionDoc: doc[a._id] }), load)}>Save link</button></div></>}
        {reports.filter(r => r.application?._id === a._id).map(r => <p key={r._id}>{r.type} report <Badge s={r.status} /> {r.feedback && `– ${r.feedback}`}</p>)}
        {a.status === 'completed' ? <div className="actions"><button onClick={() => printDoc(a, user, 'cert')}>Download certificate</button><button onClick={() => printDoc(a, user, 'letter')}>Download experience letter</button></div>
          : <small>Certificate and letter unlock after your mentor's final evaluation.</small>}</div>)}</div>))}</div>);
}
export default function Student({ user }) { return <Tabs tabs={{ 'Browse internships': <Browse />, 'My applications': <Mine user={user} /> }} />; }
