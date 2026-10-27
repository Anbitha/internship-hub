require('dotenv').config(); require('express-async-errors');
const express = require('express'), cors = require('cors'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Company, Internship, Application, Report, Policy, Activity } = require('./models');
const app = express(); app.use(cors(), express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }));

const sign = u => jwt.sign({ id: String(u._id), role: u.role, ft: u.facultyType, dept: u.department }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u._id, name: u.name, email: u.email, role: u.role, facultyType: u.facultyType, department: u.department });
const logAs = (id, action, detail) => Activity.create({ actor: id, action, detail }).catch(console.error);
const log = (q, action, detail) => logAs(q.user.id, action, detail);
const aText = async id => { const a = await Application.findById(id).populate('student', 'name').populate('internship', 'title'); return a ? `${a.name || a.student?.name} → ${a.internship?.title}` : String(id); };

// auth(...roles): admin passes role checks for viewing. Coordinator/mentor actions are faculty-only (admin is view-only there).
const auth = (...roles) => async (q, s, n) => {
  try {
    q.user = jwt.verify((q.headers.authorization || '').slice(7), process.env.JWT_SECRET);
    if (!q.user.dept && q.user.id) {
      const dbU = await User.findById(q.user.id).select('department');
      if (dbU) q.user.dept = dbU.department;
    }
  } catch {
    return s.status(401).json({ error: 'Please log in again' });
  }
  if (roles.length && q.user.role !== 'admin' && !roles.includes(q.user.role)) return s.status(403).json({ error: 'Not allowed for your role' });
  n();
};
const sub = t => (q, s, n) => q.user.role === 'faculty' && q.user.ft === t ? n() : s.status(403).json({ error: `Only a faculty ${t} can do this` });
const adminOnly = (q, s, n) => q.user.role === 'admin' ? n() : s.status(403).json({ error: 'Admin only' });
const coord = [auth('faculty'), sub('coordinator')], mentor = [auth('faculty'), sub('mentor')];

// ---- auth
app.post('/api/auth/login', async (q, s) => {
  const { email, password, role } = q.body, u = await User.findOne({ email: (email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(password || '', u.password))) return s.status(400).json({ error: 'Wrong email or password' });
  if (u.role !== role) return s.status(403).json({ error: `This account is not a ${role}. Use the ${u.role} login.` });
  s.json({ token: sign(u), user: pub(u) });
});
app.post('/api/auth/register', async (q, s) => {
  const { name, email, password, department } = q.body;
  if (!name || !email || (password || '').length < 6) return s.status(400).json({ error: 'Name, email and a 6+ character password are required' });
  if (!department || !department.trim()) return s.status(400).json({ error: 'Department is required' });
  if (await User.findOne({ email: email.toLowerCase() })) return s.status(400).json({ error: 'Email already registered' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'student', department: department.trim() });
  logAs(u._id, 'registered', `Created student account (${department.trim()})`);
  s.json({ token: sign(u), user: pub(u) });
});

// ---- users (admin: add students and faculty with department)
app.get('/api/users', auth(), adminOnly, async (q, s) => s.json(await User.find().select('-password').sort('role name')));
app.post('/api/users', auth(), adminOnly, async (q, s) => {
  const { name, email, password, role, facultyType, department } = q.body;
  if (!['faculty', 'student'].includes(role)) return s.status(400).json({ error: 'Admin can only add students and faculty' });
  if (role === 'faculty' && !['coordinator', 'mentor'].includes(facultyType)) return s.status(400).json({ error: 'Choose coordinator or mentor' });
  if (!department || !department.trim()) return s.status(400).json({ error: 'Department is required for faculty and students' });
  if (!name || !email || (password || '').length < 6) return s.status(400).json({ error: 'Name, email and a 6+ character password are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return s.status(400).json({ error: 'Email already registered' });
  const u = await User.create({
    name,
    email,
    role,
    facultyType: role === 'faculty' ? facultyType : undefined,
    department: department.trim(),
    password: await bcrypt.hash(password, 10)
  });
  log(q, 'added user', `${u.name} (${role === 'faculty' ? 'faculty ' + facultyType : role} - ${department.trim()})`);
  s.json(pub(u));
});
app.delete('/api/users/:id', auth(), adminOnly, async (q, s) => {
  const u = await User.findById(q.params.id); if (!u) return s.status(404).json({ error: 'User not found' });
  if (u.role === 'admin') return s.status(400).json({ error: 'Admin accounts cannot be deleted here' });
  await u.deleteOne(); log(q, 'deleted user', `${u.name} (${u.role})`); s.json({ ok: true });
});
app.get('/api/mentors', auth('faculty'), async (q, s) => {
  const f = { role: 'faculty', facultyType: 'mentor' };
  if (q.user.dept) f.department = q.user.dept;
  s.json(await User.find(f).select('name email department'));
});
app.get('/api/activity', auth(), adminOnly, async (q, s) => s.json(await Activity.find().sort('-createdAt').limit(300).populate('actor', 'name role facultyType department')));

// ---- policy & companies
app.get('/api/policy', auth(), async (q, s) => s.json((await Policy.findOne()) || (await Policy.create({}))));
app.put('/api/policy', coord, async (q, s) => { const p = (await Policy.findOne()) || new Policy(); Object.assign(p, q.body); await p.save(); log(q, 'updated policy', `Min CGPA ${p.minCgpa}, credits ${p.credits}, max applications ${p.maxApplications}`); s.json(p); });
app.get('/api/companies', auth('faculty'), async (q, s) => s.json(await Company.find().sort('name')));
app.patch('/api/companies/:id', coord, async (q, s) => {
  const c = await Company.findByIdAndUpdate(q.params.id, { mouVerified: !!q.body.mouVerified }, { new: true });
  log(q, c.mouVerified ? 'verified MoU' : 'removed MoU verification', c.name); s.json(c);
});

// ---- internships (scoped by department for students and coordinators)
app.get('/api/internships', auth(), async (q, s) => {
  await Internship.updateMany({ deadline: { $lt: new Date() }, status: { $ne: 'expired' } }, { status: 'expired' });
  let f = {};
  if (q.user.role === 'student') {
    f = { status: 'approved', deadline: { $gte: new Date() } };
    if (q.user.dept) f.department = q.user.dept;
  } else if (q.user.role === 'faculty' && q.user.ft === 'coordinator') {
    // In coordinator dashboard, postings whose deadline is over are removed automatically
    // And coordinator only manages postings in their own department
    f = { status: { $ne: 'expired' }, deadline: { $gte: new Date() } };
    if (q.user.dept) f.department = q.user.dept;
  }
  if (q.query.q) { const r = new RegExp(q.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = [{ title: r }, { company: r }, { description: r }]; }
  const list = await Internship.find(f).sort('-createdAt').populate('createdBy', 'name').populate('reviewedBy', 'name').lean(), cs = await Company.find().lean();
  s.json(list.map(i => ({ ...i, mouVerified: !!cs.find(c => c.name === i.company)?.mouVerified })));
});
app.post('/api/internships', coord, async (q, s) => {
  const { title, company, description, stipend, deadline } = q.body;
  const dept = q.body.department || q.user.dept;
  if (!dept) return s.status(400).json({ error: 'Department is required for internship posting' });
  await Company.updateOne({ name: company }, { $setOnInsert: { name: company } }, { upsert: true });
  const i = await Internship.create({ title, company, description, stipend, deadline, department: dept, createdBy: q.user.id, status: 'approved' });
  log(q, 'posted internship', `${title} at ${company} (${dept})`); s.json(i);
});
app.patch('/api/internships/:id/status', coord, async (q, s) => {
  const i = await Internship.findByIdAndUpdate(q.params.id, { status: q.body.status, reviewedBy: q.user.id }, { new: true });
  log(q, `${q.body.status} internship`, `${i.title} at ${i.company}`); s.json(i);
});

// ---- applications
const popA = x => x.populate('student', 'name email').populate('internship', 'title company').populate('mentor', 'name email').populate('creditsAwardedBy', 'name email');
app.post('/api/applications', auth('student'), async (q, s) => {
  if (q.user.role !== 'student') return s.status(403).json({ error: 'Students only' });
  const { internship, name, mobileNumber, department, year, section, resume, resumeName, coverLetter } = q.body;
  const pol = (await Policy.findOne()) || (await Policy.create({}));

  if (!name || !name.trim()) return s.status(400).json({ error: 'Name is required' });
  if (!mobileNumber || !mobileNumber.trim()) return s.status(400).json({ error: 'Mobile number is required' });
  if (!department || !department.trim()) return s.status(400).json({ error: 'Department is required' });
  if (!year || !String(year).trim()) return s.status(400).json({ error: 'Year is required' });
  if (!section || !section.trim()) return s.status(400).json({ error: 'Section is required' });
  if (!resume || !resume.trim()) return s.status(400).json({ error: 'Resume is required' });

  const i = await Internship.findById(internship);
  if (!i || i.status !== 'approved') return s.status(400).json({ error: 'This posting is not open' });
  if (i.deadline && i.deadline < new Date()) return s.status(400).json({ error: 'Application deadline has passed' });
  if (await Application.findOne({ student: q.user.id, internship })) return s.status(400).json({ error: 'You have already applied for this internship. Each student can apply only once.' });
  if (await Application.countDocuments({ student: q.user.id }) >= pol.maxApplications) return s.status(400).json({ error: `Limit of ${pol.maxApplications} applications reached` });

  try {
    const a = await Application.create({
      student: q.user.id,
      internship,
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      department: department.trim(),
      year: String(year).trim(),
      section: section.trim(),
      resume: resume.trim(),
      resumeName: (resumeName || '').trim(),
      coverLetter: (coverLetter || '').trim()
    });
    log(q, 'applied', `${i.title} at ${i.company}`);
    s.json(a);
  } catch (err) {
    if (err.code === 11000) {
      return s.status(400).json({ error: 'You have already applied for this internship. Each student can apply only once.' });
    }
    throw err;
  }
});
app.get('/api/applications', auth(), async (q, s) => {
  await Application.updateMany({ status: 'offered', offerDeadline: { $lt: new Date() } }, { status: 'expired' });
  let f = {};
  if (q.user.role === 'student') {
    f = { student: q.user.id };
  } else if (q.user.ft === 'mentor') {
    f = { mentor: q.user.id };
  } else if (q.user.ft === 'coordinator' && q.user.dept) {
    f = { department: q.user.dept };
  }
  s.json(await popA(Application.find(f).sort('-createdAt')));
});
app.patch('/api/applications/:id/offer', coord, async (q, s) => {
  const { offerDeadline, mentor, supervisor, companyContact } = q.body;
  const a = await Application.findByIdAndUpdate(q.params.id, { status: 'offered', offerDeadline, mentor: mentor || undefined, supervisor, companyContact }, { new: true });
  log(q, 'sent offer', await aText(a._id)); s.json(a);
});
app.patch('/api/applications/:id/reject', coord, async (q, s) => {
  const a = await Application.findByIdAndUpdate(q.params.id, { status: 'rejected' }, { new: true }); log(q, 'rejected application', await aText(a._id)); s.json(a);
});
app.patch('/api/applications/:id/respond', auth('student'), async (q, s) => {
  const a = await Application.findOne({ _id: q.params.id, student: q.user.id });
  if (!a || a.status !== 'offered') return s.status(400).json({ error: 'No open offer' });
  if (a.offerDeadline && a.offerDeadline < new Date()) { a.status = 'expired'; await a.save(); return s.status(400).json({ error: 'Offer deadline has passed' }); }
  a.status = q.body.accept ? 'accepted' : 'declined'; await a.save(); log(q, `${a.status} offer`, await aText(a._id)); s.json(a);
});
app.patch('/api/applications/:id/completion', auth('student'), async (q, s) => {
  const { completionDoc, completionDocName, internshipCompletedAt } = q.body;
  if (!completionDoc) return s.status(400).json({ error: 'Please upload or provide a link to the completion certificate' });
  const a = await Application.findOne({ _id: q.params.id, student: q.user.id, status: { $in: ['accepted', 'completed'] } });
  if (!a) return s.status(400).json({ error: 'Internship must be accepted to upload completion certificate' });

  const compDate = internshipCompletedAt ? new Date(internshipCompletedAt) : (a.internshipCompletedAt || new Date());
  const certDeadline = a.certificateDeadline || new Date(compDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  a.completionDoc = completionDoc;
  a.completionDocName = (completionDocName || 'Internship_Certificate').trim();
  a.completionDocUploadedAt = new Date();
  a.certificateStatus = 'submitted';
  a.internshipCompletedAt = compDate;
  a.certificateDeadline = certDeadline;
  await a.save();

  log(q, 'uploaded completion certificate', await aText(a._id));
  s.json(a);
});
app.patch('/api/applications/:id/eval', mentor, async (q, s) => {
  const { stage, score, remarks } = q.body; if (!['midEval', 'finalEval'].includes(stage)) return s.status(400).json({ error: 'Bad stage' });
  const set = { [stage]: { score, remarks } };
  if (stage === 'finalEval') {
    set.status = 'completed';
    set.internshipCompletedAt = new Date();
    set.certificateDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month deadline
  }
  const a = await Application.findOneAndUpdate({ _id: q.params.id, mentor: q.user.id }, set, { new: true });
  if (!a) return s.status(403).json({ error: 'This student is not assigned to you' });
  log(q, stage === 'midEval' ? 'mid-point evaluation' : 'final evaluation', `${await aText(a._id)}: ${score}/10`); s.json(a);
});
app.patch('/api/applications/:id/verify-certificate', mentor, async (q, s) => {
  const { credits, remarks, action } = q.body;
  const a = await Application.findOne({ _id: q.params.id, mentor: q.user.id });
  if (!a) return s.status(403).json({ error: 'This student is not assigned to you' });
  if (!a.completionDoc) return s.status(400).json({ error: 'Student has not uploaded the completion certificate yet' });

  if (action === 'reject') {
    a.certificateStatus = 'rejected';
    a.creditsRemarks = remarks || 'Certificate rejected / re-upload requested';
    await a.save();
    log(q, 'rejected certificate', await aText(a._id));
    return s.json(a);
  }

  const numCredits = Number(credits);
  if (isNaN(numCredits) || numCredits <= 0) return s.status(400).json({ error: 'Please specify a valid number of credits (e.g. 2)' });

  a.certificateStatus = 'verified';
  a.status = 'completed';
  a.creditsAwarded = numCredits;
  a.creditsRemarks = remarks || 'Certificate verified and credits awarded';
  a.creditsAwardedAt = new Date();
  a.creditsAwardedBy = q.user.id;
  await a.save();

  log(q, 'verified certificate and awarded credits', `${await aText(a._id)}: ${numCredits} credits`);
  s.json(a);
});

// ---- reports
app.post('/api/reports', auth('student'), async (q, s) => {
  const { application, type, content } = q.body;
  if (!(await Application.findOne({ _id: application, student: q.user.id, status: { $in: ['accepted', 'completed'] } }))) return s.status(400).json({ error: 'Internship not active' });
  const r = await Report.create({ application, type, content, student: q.user.id }); log(q, `submitted ${type} report`, await aText(application)); s.json(r);
});
app.get('/api/reports', auth(), async (q, s) => {
  let f = {}; if (q.user.role === 'student') f = { student: q.user.id };
  else if (q.user.ft === 'mentor') f = { application: { $in: (await Application.find({ mentor: q.user.id }).select('_id')).map(a => a._id) } };
  s.json(await Report.find(f).populate('student', 'name').populate({ path: 'application', populate: { path: 'internship', select: 'title' } }).sort('-createdAt'));
});
app.patch('/api/reports/:id', mentor, async (q, s) => {
  const r = await Report.findById(q.params.id).populate('application');
  if (!r || String(r.application?.mentor) !== q.user.id) return s.status(403).json({ error: 'This student is not assigned to you' });
  r.status = q.body.status; r.feedback = q.body.feedback; await r.save();
  log(q, r.status === 'approved' ? 'approved report' : 'requested report changes', `${await aText(r.application._id)} (${r.type})`); s.json(r);
});

app.use((e, q, s, n) => { console.error(e); s.status(500).json({ error: e.message }); });
mongoose.connect(process.env.MONGO_URI).then(async () => {
  if (!(await User.findOne({ role: 'admin' }))) await User.create({ name: 'Admin', email: 'admin@college.edu', role: 'admin', password: await bcrypt.hash('admin123', 10) });
  app.listen(process.env.PORT || 5001, () => console.log('API ready'));
});
