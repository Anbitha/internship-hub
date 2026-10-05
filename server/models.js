const m = require('mongoose'), S = m.Schema, R = S.Types.ObjectId;
const M = (n, d) => m.model(n, new S(d, { timestamps: true }));
const ref = n => ({ type: R, ref: n });
exports.User = M('User', { name: String, email: { type: String, unique: true, lowercase: true }, password: String,
  role: { type: String, enum: ['admin', 'faculty', 'student'] }, facultyType: { type: String, enum: ['coordinator', 'mentor'] } });
exports.Company = M('Company', { name: { type: String, unique: true }, mouVerified: { type: Boolean, default: false } });
exports.Internship = M('Internship', { title: String, company: String, description: String, stipend: String, deadline: Date,
  status: { type: String, default: 'pending' }, createdBy: ref('User'), reviewedBy: ref('User') });
exports.Application = M('Application', { student: ref('User'), internship: ref('Internship'), resume: String, coverLetter: String,
  status: { type: String, default: 'applied' }, // applied|offered|accepted|declined|expired|rejected|completed
  offerDeadline: Date, mentor: ref('User'), supervisor: String, companyContact: String,
  midEval: { score: Number, remarks: String }, finalEval: { score: Number, remarks: String }, completionDoc: String });
exports.Report = M('Report', { application: ref('Application'), student: ref('User'), type: String, content: String,
  status: { type: String, default: 'pending' }, feedback: String });
exports.Policy = M('Policy', { minCgpa: { type: Number, default: 6 }, credits: { type: Number, default: 2 }, maxApplications: { type: Number, default: 5 } });
exports.Activity = M('Activity', { actor: ref('User'), action: String, detail: String });
