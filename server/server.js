require('dotenv').config(); require('express-async-errors');
const express = require('express'), cors = require('cors'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Company, Internship, Application, Report, Policy, Activity } = require('./models');
const app = express(); app.use(cors(), express.json());

const sign = u => jwt.sign({ id: String(u._id), role: u.role, ft: u.facultyType }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u._id, name: u.name, email: u.email, role: u.role, facultyType: u.facultyType });
const logAs = (id, action, detail) => Activity.create({ actor: id, action, detail }).catch(console.error);
const log = (q, action, detail) => logAs(q.user.id, action, detail);
const aText = async id => { const a = await Application.findById(id).populate('student', 'name').populate('internship', 'title'); return a ? `${a.student?.name} → ${a.internship?.title}` : String(id); };

// auth(...roles): admin passes role checks for viewing. Coordinator/mentor actions are faculty-only (admin is view-only there).
const auth = (...roles) => (q, s, n) => {
  try { q.user = jwt.verify((q.headers.authorization || '').slice(7), process.env.JWT_SECRET); } catch { return s.status(401).json({ error: 'Please log in again' }); }
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
  const { name, email, password } = q.body;
  if (!name || !email || (password || '').length < 6) return s.status(400).json({ error: 'Name, email and a 6+ character password are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return s.status(400).json({ error: 'Email already registered' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'student' });
  logAs(u._id, 'registered', 'Created a student account');
  s.json({ token: sign(u), user: pub(u) });
});

// ---- users (admin: add students and faculty only)
app.get('/api/users', auth(), adminOnly, async (q, s) => s.json(await User.find().select('-password').sort('role name')));
app.post('/api/users', auth(), adminOnly, async (q, s) => {
  const { name, email, password, role, facultyType } = q.body;
  if (!['faculty', 'student'].includes(role)) return s.status(400).json({ error: 'Admin can only add students and faculty' });
  if (role === 'faculty' && !['coordinator', 'mentor'].includes(facultyType)) return s.status(400).json({ error: 'Choose coordinator or mentor' });
  if (!name || !email || (password || '').length < 6) return s.status(400).json({ error: 'Name, email and a 6+ character password are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return s.status(400).json({ error: 'Email already registered' });
  const u = await User.create({ name, email, role, facultyType: role === 'faculty' ? facultyType : undefined, password: await bcrypt.hash(password, 10) });
  log(q, 'added user', `${u.name} (${role === 'faculty' ? 'faculty ' + facultyType : role})`);
  s.json(pub(u));
});
app.delete('/api/users/:id', auth(), adminOnly, async (q, s) => {
  const u = await User.findById(q.params.id); if (!u) return s.status(404).json({ error: 'User not found' });
  if (u.role === 'admin') return s.status(400).json({ error: 'Admin accounts cannot be deleted here' });
  await u.deleteOne(); log(q, 'deleted user', `${u.name} (${u.role})`); s.json({ ok: true });
});
app.get('/api/mentors', auth('faculty'), async (q, s) => s.json(await User.find({ role: 'faculty', facultyType: 'mentor' }).select('name email')));
app.get('/api/activity', auth(), adminOnly, async (q, s) => s.json(await Activity.find().sort('-createdAt').limit(300).populate('actor', 'name role facultyType')));

// ---- policy & companies
app.get('/api/policy', auth(), async (q, s) => s.json((await Policy.findOne()) || (await Policy.create({}))));
app.put('/api/policy', coord, async (q, s) => { const p = (await Policy.findOne()) || new Policy(); Object.assign(p, q.body); await p.save(); log(q, 'updated policy', `Min CGPA ${p.minCgpa}, credits ${p.credits}, max applications ${p.maxApplications}`); s.json(p); });
app.get('/api/companies', auth('faculty'), async (q, s) => s.json(await Company.find().sort('name')));
app.patch('/api/companies/:id', coord, async (q, s) => {
  const c = await Company.findByIdAndUpdate(q.params.id, { mouVerified: !!q.body.mouVerified }, { new: true });
  log(q, c.mouVerified ? 'verified MoU' : 'removed MoU verification', c.name); s.json(c);
});

// ---- internships
app.get('/api/internships', auth(), async (q, s) => {
  const f = q.user.role === 'student' ? { status: 'approved' } : {};
  if (q.query.q) { const r = new RegExp(q.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = [{ title: r }, { company: r }, { description: r }]; }
  const list = await Internship.find(f).sort('-createdAt').populate('createdBy', 'name').populate('reviewedBy', 'name').lean(), cs = await Company.find().lean();
  s.json(list.map(i => ({ ...i, mouVerified: !!cs.find(c => c.name === i.company)?.mouVerified })));
});
app.post('/api/internships', coord, async (q, s) => {
  const { title, company, description, stipend, deadline } = q.body;
  await Company.updateOne({ name: company }, { $setOnInsert: { name: company } }, { upsert: true });
  const i = await Internship.create({ title, company, description, stipend, deadline, createdBy: q.user.id });
  log(q, 'posted internship', `${title} at ${company}`); s.json(i);
});
app.patch('/api/internships/:id/status', coord, async (q, s) => {
  const i = await Internship.findByIdAndUpdate(q.params.id, { status: q.body.status, reviewedBy: q.user.id }, { new: true });
  log(q, `${q.body.status} internship`, `${i.title} at ${i.company}`); s.json(i);
});

// ---- applications
const popA = x => x.populate('student', 'name email').populate('internship', 'title company').populate('mentor', 'name email');
app.post('/api/applications', auth('student'), async (q, s) => {
  if (q.user.role !== 'student') return s.status(403).json({ error: 'Students only' });
  const { internship, resume, coverLetter } = q.body, pol = (await Policy.findOne()) || (await Policy.create({}));
  const i = await Internship.findById(internship);
  if (!i || i.status !== 'approved') return s.status(400).json({ error: 'This posting is not open' });
  if (i.deadline && i.deadline < new Date()) return s.status(400).json({ error: 'Application deadline has passed' });
  if (await Application.findOne({ student: q.user.id, internship })) return s.status(400).json({ error: 'You already applied' });
  if (await Application.countDocuments({ student: q.user.id }) >= pol.maxApplications) return s.status(400).json({ error: `Limit of ${pol.maxApplications} applications reached` });
  const a = await Application.create({ student: q.user.id, internship, resume, coverLetter });
  log(q, 'applied', `${i.title} at ${i.company}`); s.json(a);
});
app.get('/api/applications', auth(), async (q, s) => {
  await Application.updateMany({ status: 'offered', offerDeadline: { $lt: new Date() } }, { status: 'expired' });
  const f = q.user.role === 'student' ? { student: q.user.id } : q.user.ft === 'mentor' ? { mentor: q.user.id } : {};
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
  const a = await Application.findOneAndUpdate({ _id: q.params.id, student: q.user.id, status: 'accepted' }, { completionDoc: q.body.completionDoc }, { new: true });
  if (a) log(q, 'saved completion documents', await aText(a._id)); s.json(a);
});
app.patch('/api/applications/:id/eval', mentor, async (q, s) => {
  const { stage, score, remarks } = q.body; if (!['midEval', 'finalEval'].includes(stage)) return s.status(400).json({ error: 'Bad stage' });
  const set = { [stage]: { score, remarks } }; if (stage === 'finalEval') set.status = 'completed';
  const a = await Application.findOneAndUpdate({ _id: q.params.id, mentor: q.user.id }, set, { new: true });
  if (!a) return s.status(403).json({ error: 'This student is not assigned to you' });
  log(q, stage === 'midEval' ? 'mid-point evaluation' : 'final evaluation', `${await aText(a._id)}: ${score}/10`); s.json(a);
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
  app.listen(process.env.PORT || 5000, () => console.log('API ready'));
});
