import { useState } from 'react'; import { api, useData, run, fmt } from '../api.js'; import Tabs, { Badge } from './Tabs.jsx';

const DEPARTMENTS = [
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

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

function Browse({ user }) {
  const [q, setQ] = useState('');
  const [list] = useData('/internships?q=' + encodeURIComponent(q));
  const [myApps, loadApps] = useData('/applications');
  const [open, setOpen] = useState(null);
  const [resumeMode, setResumeMode] = useState('upload'); // 'upload' or 'link'
  const [submitting, setSubmitting] = useState(false);

  const blankForm = {
    name: user?.name || '',
    mobileNumber: '',
    department: '',
    customDept: '',
    year: '',
    section: '',
    resume: '',
    resumeName: '',
    coverLetter: ''
  };

  const [f, setF] = useState(blankForm);

  // Map internship IDs that the student has already applied for
  const appliedMap = new Map();
  (myApps || []).forEach(a => {
    const iId = typeof a.internship === 'object' ? a.internship?._id : a.internship;
    if (iId) appliedMap.set(String(iId), a);
  });

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5 MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setF(prev => ({
        ...prev,
        resume: ev.target.result,
        resumeName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearResumeFile = () => {
    setF(prev => ({ ...prev, resume: '', resumeName: '' }));
  };

  const submitApplication = async (e, internshipId) => {
    e.preventDefault();
    const cleanPhone = (f.mobileNumber || '').replace(/\D/g, '');
    if (!f.name.trim()) return alert('Please enter your name');
    if (cleanPhone.length !== 10) return alert('Please enter a valid 10-digit mobile number');
    if (!f.department) return alert('Please select your department');
    if (f.department === 'Other' && !f.customDept.trim()) return alert('Please specify your department');
    if (!f.year) return alert('Please select your year of study');
    if (!f.section.trim()) return alert('Please enter your section');
    if (!f.resume.trim()) return alert('Please provide your resume (upload a file or paste a link)');

    setSubmitting(true);
    try {
      await api('/applications', 'POST', {
        internship: internshipId,
        name: f.name.trim(),
        mobileNumber: cleanPhone,
        department: f.department === 'Other' ? f.customDept.trim() : f.department,
        year: f.year,
        section: f.section.trim().toUpperCase(),
        resume: f.resume.trim(),
        resumeName: f.resumeName.trim(),
        coverLetter: f.coverLetter.trim()
      });
      alert('Application submitted successfully! You can track its status under "My applications".');
      setOpen(null);
      setF({ ...blankForm, name: user?.name || '' });
      loadApps();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <input className="search" placeholder="Search by role, company or keyword" value={q} onChange={e => setQ(e.target.value)} />
      {!list.length && <p className="muted">No open postings match your search.</p>}
      {list.map(i => {
        const applied = appliedMap.get(String(i._id));
        const isOpen = open === i._id;

        return (
          <div className="card" key={i._id}>
            <div className="row">
              <div>
                <b>{i.title}</b> at {i.company} {i.mouVerified && <Badge s="MoU verified" />}
                {applied && <Badge s={applied.status || 'applied'} />}
                <p>{i.description}</p>
                <small>Apply by {fmt(i.deadline)} {i.stipend && `· ${i.stipend}`}</small>
              </div>
            </div>

            {applied ? (
              <div className="sub" style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
                <p style={{ margin: 0, color: 'var(--ink)' }}>
                  ✓ <b>You have already applied for this internship.</b>
                </p>
                <small className="muted">
                  Submitted on {fmt(applied.createdAt)} · Status: <b>{applied.status}</b> · View details under the <i>My applications</i> tab.
                </small>
                <div className="actions" style={{ marginTop: '8px' }}>
                  <button disabled className="ghost" style={{ cursor: 'not-allowed', opacity: 0.65 }}>
                    Already Applied
                  </button>
                </div>
              </div>
            ) : isOpen ? (
              <form className="grid sub" onSubmit={e => submitApplication(e, i._id)}>
                <h4 style={{ margin: '4px 0 2px' }}>Apply for {i.title} at {i.company}</h4>
                <small className="muted">Note: You can apply only once for this internship posting. Please verify your details before submitting.</small>

                <div className="grid-2">
                  <label>
                    Student Name *
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={f.name}
                      onChange={e => setF({ ...f, name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Mobile Number *
                    <input
                      type="tel"
                      placeholder="10-digit Mobile Number"
                      value={f.mobileNumber}
                      onChange={e => setF({ ...f, mobileNumber: e.target.value })}
                      maxLength={10}
                      required
                    />
                  </label>
                </div>

                <div className="grid-3">
                  <label>
                    Department *
                    <select
                      value={f.department}
                      onChange={e => setF({ ...f, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>

                  <label>
                    Year *
                    <select
                      value={f.year}
                      onChange={e => setF({ ...f, year: e.target.value })}
                      required
                    >
                      <option value="">Select Year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>

                  <label>
                    Section *
                    <input
                      type="text"
                      placeholder="e.g. A, B, C"
                      value={f.section}
                      onChange={e => setF({ ...f, section: e.target.value })}
                      maxLength={10}
                      required
                    />
                  </label>
                </div>

                {f.department === 'Other' && (
                  <label>
                    Specify Department *
                    <input
                      type="text"
                      placeholder="Enter your department name"
                      value={f.customDept}
                      onChange={e => setF({ ...f, customDept: e.target.value })}
                      required
                    />
                  </label>
                )}

                <div className="upload-card">
                  <div className="row" style={{ alignItems: 'center' }}>
                    <label style={{ margin: 0, fontWeight: 700, color: 'var(--ink)' }}>Resume *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={resumeMode === 'upload' ? '' : 'ghost'}
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => setResumeMode('upload')}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        className={resumeMode === 'link' ? '' : 'ghost'}
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => setResumeMode('link')}
                      >
                        Paste Link
                      </button>
                    </div>
                  </div>

                  {resumeMode === 'upload' ? (
                    <div>
                      {f.resume && f.resumeName ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--ok)', fontWeight: 600 }}>
                            📄 {f.resumeName}
                          </span>
                          <button type="button" className="ghost" style={{ padding: '3px 8px', fontSize: '0.8rem' }} onClick={clearResumeFile}>
                            Change / Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            required={!f.resume}
                          />
                          <small className="muted">Accepted formats: PDF, DOC, DOCX (Max 5 MB)</small>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        placeholder="Paste Resume link (Google Drive / GitHub / Portfolio URL)"
                        value={f.resume}
                        onChange={e => setF({ ...f, resume: e.target.value, resumeName: 'Online Resume' })}
                        required
                      />
                      <small className="muted">Ensure the link has public viewing permissions enabled.</small>
                    </div>
                  )}
                </div>

                <label>
                  Cover Letter / Note (Optional)
                  <textarea
                    placeholder="Brief introduction or why you are a good fit for this role"
                    value={f.coverLetter}
                    onChange={e => setF({ ...f, coverLetter: e.target.value })}
                  />
                </label>

                <div className="actions">
                  <button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Send Application'}
                  </button>
                  <button type="button" className="ghost" onClick={() => setOpen(null)} disabled={submitting}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="actions">
                <button onClick={() => {
                  setF({ ...blankForm, name: user?.name || '' });
                  setOpen(i._id);
                }}>
                  Apply
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function printDoc(a, user, kind) {
  const w = window.open('');
  w.document.write(`<body style="font-family:Georgia,serif;max-width:640px;margin:60px auto;line-height:1.7"><h1>${kind === 'cert' ? 'Certificate of Completion' : 'Experience Letter'}</h1>
  <p>${kind === 'cert' ? 'This certifies that' : 'To whom it may concern: this is to confirm that'} <b>${a.name || user.name}</b> successfully completed an internship as <b>${a.internship?.title}</b> at <b>${a.internship?.company}</b>.</p>
  ${kind === 'letter' ? `<p>Mentor: ${a.mentor?.name || '-'}. Supervisor: ${a.supervisor || '-'}.</p>` : ''}
  ${a.creditsAwarded != null ? `<p>Academic Credits Awarded: <b>${a.creditsAwarded} Credits</b> (Verified by Mentor: ${a.mentor?.name || 'Faculty Mentor'})</p>` : ''}
  <p>Issued ${new Date().toLocaleDateString()}</p></body>`);
  w.document.close(); w.print();
}

function CompletionCertificateSection({ a, load }) {
  const [showUpload, setShowUpload] = useState(!a.completionDoc || a.certificateStatus === 'rejected');
  const [certMode, setCertMode] = useState('upload');
  const [certData, setCertData] = useState({ doc: '', name: '', compDate: '' });
  const [saving, setSaving] = useState(false);

  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Certificate file size must be less than 5 MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setCertData(prev => ({ ...prev, doc: ev.target.result, name: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const submitCert = async e => {
    e.preventDefault();
    if (!certData.doc.trim()) return alert('Please upload a file or enter a link to your certificate');
    setSaving(true);
    try {
      await api(`/applications/${a._id}/completion`, 'PATCH', {
        completionDoc: certData.doc,
        completionDocName: certData.name || 'Completion_Certificate',
        internshipCompletedAt: certData.compDate || undefined
      });
      alert('Completion certificate uploaded successfully! Your mentor will verify it and assign your credits.');
      setShowUpload(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deadline = a.certificateDeadline ? new Date(a.certificateDeadline) : null;
  const isPastDeadline = deadline && Date.now() > deadline.getTime();

  return (
    <div className="sub" style={{ background: '#fafbfc', padding: '14px', borderRadius: '8px', border: '1px solid var(--line)', marginTop: '12px' }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <div>
          <b>Internship Completion Certificate & Credits</b>
          <Badge s={a.certificateStatus === 'verified' ? 'approved' : a.certificateStatus === 'rejected' ? 'rejected' : a.completionDoc ? 'pending' : 'rejected'} />
        </div>
      </div>

      {/* Prominent Credits Display */}
      {a.creditsAwarded != null ? (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #10b981', borderRadius: '8px', padding: '12px 16px', margin: '10px 0' }}>
          <div className="row" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '1.1rem', color: '#065f46', fontWeight: 800 }}>
              🎓 Academic Credits Awarded: {a.creditsAwarded} Credits
            </span>
            <span className="badge approved">Verified</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#047857' }}>
            Verified and approved by Mentor <b>{a.mentor?.name || 'Faculty Mentor'}</b> on {fmt(a.creditsAwardedAt || a.updatedAt)}.
            {a.creditsRemarks && <span> Remarks: "<i>{a.creditsRemarks}</i>"</span>}
          </p>
        </div>
      ) : a.completionDoc && a.certificateStatus !== 'rejected' ? (
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '10px 14px', margin: '10px 0' }}>
          <b>⏳ Certificate Uploaded – Awaiting Mentor Verification & Credits</b>
          <p style={{ margin: '3px 0 0', fontSize: '0.88rem', color: 'var(--ink)' }}>
            Uploaded on {fmt(a.completionDocUploadedAt || a.updatedAt)}. Your faculty mentor will verify the certificate and allocate your academic credits.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '10px 14px', margin: '10px 0' }}>
          <b style={{ color: '#b45309' }}>⚠️ Upload Certificate within 1 Month</b>
          <p style={{ margin: '3px 0 0', fontSize: '0.88rem', color: '#92400e' }}>
            Students must upload their official internship completion certificate within <b>1 month</b> after internship completion to receive academic credits.
            {deadline && <> Due by: <b>{fmt(deadline)}</b> {isPastDeadline && <span style={{ color: 'var(--bad)' }}>(Deadline passed)</span>}</>}
          </p>
        </div>
      )}

      {/* Uploaded Certificate Details */}
      {a.completionDoc && !showUpload && (
        <div style={{ marginTop: '8px' }}>
          <p style={{ margin: '6px 0' }}>
            <a href={a.completionDoc} target="_blank" rel="noreferrer" download={a.completionDocName || 'completion-certificate'}>
              📄 <b>View / Download Uploaded Certificate</b> {a.completionDocName ? `(${a.completionDocName})` : ''}
            </a>
          </p>
          {a.certificateStatus !== 'verified' && (
            <button className="ghost" style={{ fontSize: '0.82rem', padding: '4px 10px', marginTop: '4px' }} onClick={() => setShowUpload(true)}>
              Replace Certificate
            </button>
          )}
        </div>
      )}

      {/* Upload / Replace Certificate Form */}
      {showUpload && (
        <form className="grid" style={{ marginTop: '10px' }} onSubmit={submitCert}>
          <div className="upload-card">
            <div className="row" style={{ alignItems: 'center' }}>
              <label style={{ margin: 0, fontWeight: 700, color: 'var(--ink)' }}>
                {a.completionDoc ? 'Upload Replacement Certificate' : 'Upload Completion Certificate *'}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={certMode === 'upload' ? '' : 'ghost'}
                  style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                  onClick={() => setCertMode('upload')}
                >
                  File Upload
                </button>
                <button
                  type="button"
                  className={certMode === 'link' ? '' : 'ghost'}
                  style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                  onClick={() => setCertMode('link')}
                >
                  Paste Link
                </button>
              </div>
            </div>

            {certMode === 'upload' ? (
              <div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={handleFile}
                  required={!certData.doc}
                />
                <small className="muted">Upload official certificate issued by the company (PDF or Image, max 5 MB). Must be uploaded within 1 month of completion.</small>
                {certData.name && (
                  <p style={{ margin: '4px 0 0', color: 'var(--ok)', fontWeight: 600, fontSize: '0.88rem' }}>
                    Selected: {certData.name}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  placeholder="Paste Google Drive / Cloud link to certificate"
                  value={certData.doc}
                  onChange={e => setCertData({ ...certData, doc: e.target.value, name: 'Online Certificate' })}
                  required
                />
                <small className="muted">Ensure public link viewing permission is turned on.</small>
              </div>
            )}

            <label style={{ marginTop: '6px' }}>
              Internship Completion Date (Optional)
              <input
                type="date"
                value={certData.compDate}
                onChange={e => setCertData({ ...certData, compDate: e.target.value })}
              />
              <small className="muted">Certificate must be uploaded within 1 month after this date.</small>
            </label>
          </div>

          <div className="actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Uploading...' : 'Submit Certificate for Verification'}
            </button>
            {a.completionDoc && (
              <button type="button" className="ghost" onClick={() => setShowUpload(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function Mine({ user }) {
  const [list, load] = useData('/applications');
  return (
    <div>
      {!list.length && <p className="muted">You haven't applied yet. Browse postings to get started.</p>}
      {list.map(a => (
        <div className="card" key={a._id}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div>
              <b>{a.internship?.title}</b> at {a.internship?.company} <Badge s={a.status} />
              {a.creditsAwarded != null && <Badge s="approved" />}
            </div>
          </div>

          <div className="app-meta">
            <span><strong>Name:</strong> {a.name || user.name}</span>
            <span><strong>Mobile:</strong> {a.mobileNumber || '-'}</span>
            <span><strong>Dept:</strong> {a.department || '-'}</span>
            <span><strong>Year & Section:</strong> {a.year || '-'} {a.section ? `(Sec ${a.section})` : ''}</span>
            {a.creditsAwarded != null && <span><strong style={{ color: 'var(--ok)' }}>🎓 Credits:</strong> {a.creditsAwarded}</span>}
          </div>

          {a.resume && (
            <p style={{ margin: '6px 0' }}>
              <a href={a.resume} target="_blank" rel="noreferrer" download={a.resumeName || undefined}>
                📄 {a.resumeName ? `Resume (${a.resumeName})` : 'View / Download Resume'}
              </a>
              {a.coverLetter && <span className="muted"> · "{a.coverLetter}"</span>}
            </p>
          )}

          {a.status === 'offered' && (
            <div className="grid sub">
              <p>Offer received. Respond by <b>{fmt(a.offerDeadline)}</b>.</p>
              <div className="actions">
                <button onClick={() => run(() => api(`/applications/${a._id}/respond`, 'PATCH', { accept: true }), load)}>Accept offer</button>
                <button className="ghost" onClick={() => run(() => api(`/applications/${a._id}/respond`, 'PATCH', { accept: false }), load)}>Decline</button>
              </div>
            </div>
          )}
          {a.status === 'expired' && <p className="muted">The offer deadline passed.</p>}

          {['accepted', 'completed'].includes(a.status) && (
            <div className="sub">
              <p>Mentor: <b>{a.mentor?.name || 'not assigned'}</b> ({a.mentor?.email}) · Supervisor: <b>{a.supervisor || '-'}</b> · Company contact: <b>{a.companyContact || '-'}</b></p>

              {/* Completion Certificate & Credits Section */}
              <CompletionCertificateSection a={a} load={load} />

              {a.certificateStatus === 'verified' ? (
                <div className="actions" style={{ marginTop: '12px' }}>
                  {/* <button onClick={() => printDoc(a, user, 'cert')}>Download Completion Certificate</button> */}
                  {/* <button onClick={() => printDoc(a, user, 'letter')}>Download Experience Letter</button> */}
                </div>
              ) : (
                <small style={{ display: 'block', marginTop: '8px' }} className="muted">
                  Official completion certificate and letter unlock once your mentor reviews your certificate and awards credits.
                </small>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Student({ user }) {
  return <Tabs tabs={{ 'Browse internships': <Browse user={user} />, 'My applications': <Mine user={user} /> }} />;
}

