const m = require('mongoose'), S = m.Schema, R = S.Types.ObjectId;
const M = (n, d) => m.model(n, new S(d, { timestamps: true }));
const ref = n => ({ type: R, ref: n });
exports.User = M('User', { name: String, email: { type: String, unique: true, lowercase: true }, password: String,
  role: { type: String, enum: ['admin', 'faculty', 'student'] }, facultyType: { type: String, enum: ['coordinator', 'mentor'] }, department: String });
exports.Company = M('Company', { name: { type: String, unique: true }, mouVerified: { type: Boolean, default: false } });
exports.Internship = M('Internship', { title: String, company: String, description: String, stipend: String, deadline: Date,
  department: String, status: { type: String, default: 'approved' }, createdBy: ref('User'), reviewedBy: ref('User') });
const applicationSchema = new S({
  student: ref('User'),
  internship: ref('Internship'),
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  section: { type: String, required: true },
  resume: { type: String, required: true },
  resumeName: { type: String, default: '' },
  coverLetter: { type: String, default: '' },
  status: { type: String, default: 'applied' }, // applied|offered|accepted|declined|expired|rejected|completed
  offerDeadline: Date,
  mentor: ref('User'),
  supervisor: String,
  companyContact: String,
  midEval: { score: Number, remarks: String },
  finalEval: { score: Number, remarks: String },
  completionDoc: String,
  completionDocName: { type: String, default: '' },
  completionDocUploadedAt: Date,
  internshipCompletedAt: Date,
  certificateDeadline: Date,
  certificateStatus: { type: String, default: 'not_submitted' }, // not_submitted|submitted|verified|rejected
  creditsAwarded: Number,
  creditsRemarks: String,
  creditsAwardedAt: Date,
  creditsAwardedBy: ref('User')
}, { timestamps: true });
applicationSchema.index({ student: 1, internship: 1 }, { unique: true });

exports.Application = m.model('Application', applicationSchema);
exports.Report = M('Report', { application: ref('Application'), student: ref('User'), type: String, content: String,
  status: { type: String, default: 'pending' }, feedback: String });
exports.Policy = M('Policy', { minCgpa: { type: Number, default: 6 }, credits: { type: Number, default: 2 }, maxApplications: { type: Number, default: 5 } });
exports.Activity = M('Activity', { actor: ref('User'), action: String, detail: String });
