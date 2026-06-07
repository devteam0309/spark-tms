const mongoose = require('mongoose');

const REQUIRED_DOCS = [
  { field: 'certificateOfCompletionLink', label: 'Certificate of Completion' },
  { field: 'attendanceFormLink', label: 'Attendance Form' },
  { field: 'terminalReportLink', label: 'Terminal Report' },
  { field: 'evaluationFeedbackReportLink', label: 'Evaluation/Feedback Report' },
  { field: 'scholarsAgreementLink', label: "Scholars Agreement" },
  { field: 'assessmentScoresheetLink', label: 'Assessment Scoresheet' },
];

const isDateOrTBD = (v) => v === '' || v === 'TBD' || !isNaN(Date.parse(v));

const trainingActivitySchema = new mongoose.Schema({
  year: { type: Number, required: true, min: 2020, max: 2100 },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  trainingCourse: { type: String, required: true, trim: true },
  province: { type: mongoose.Schema.Types.ObjectId, ref: 'Province', required: true },
  targetSector: { type: String, trim: true },
  venue: { type: String, trim: true },
  partnerAgency: { type: String, trim: true },
  partnerProvision: { type: String, trim: true },
  courseCoordinator: { type: String, trim: true },
  trainer: { type: String, trim: true },
  trainerEmail: { type: String, trim: true, lowercase: true },
  trainerRequirementsLink: { type: String, trim: true },

  maleEnrolled: { type: Number, default: 0, min: 0 },
  femaleEnrolled: { type: Number, default: 0, min: 0 },
  totalEnrolled: { type: Number, default: 0 },

  startDate: { type: Date },
  endDate: { type: Date },
  mode: { type: String, enum: ['Face-to-Face', 'Online', 'Hybrid', ''], default: '' },
  time: { type: String, trim: true },
  onlineCampaignDates: { type: String, trim: true },
  // Stored as a string (not Date) so the focal can record "TBD" before the
  // actual date is known and fill it in later once it's scheduled.
  assessmentDate: { type: String, trim: true, validate: { validator: isDateOrTBD, message: '{PATH} must be a valid date or "TBD"' } },
  graduationDate: { type: String, trim: true, validate: { validator: isDateOrTBD, message: '{PATH} must be a valid date or "TBD"' } },

  maleGraduates: { type: Number, default: 0, min: 0 },
  femaleGraduates: { type: Number, default: 0, min: 0 },
  numberOfGraduates: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },

  numberOfMedalists: { type: Number, default: 0, min: 0 },
  withOnlineJobs: { type: Number, default: 0, min: 0 },
  freelanceSales: { type: Number, default: 0, min: 0 },
  // Whether the training itself (as an event) is still running or has wrapped up —
  // distinct from `status`, which tracks the submission's review/approval workflow.
  trainingStatus: { type: String, enum: ['Ongoing', 'Done'], default: 'Ongoing' },

  certificateOfCompletionLink: { type: String, trim: true },
  certificateOfParticipationLink: { type: String, trim: true },
  testimonialDriveLink: { type: String, trim: true },
  terminalReportLink: { type: String, trim: true },
  attendanceFormLink: { type: String, trim: true },
  rawPhotoVideoDocumentationLink: { type: String, trim: true },
  scholarsAgreementLink: { type: String, trim: true },
  assessmentScoresheetLink: { type: String, trim: true },
  monitoringTrackerLink: { type: String, trim: true },
  afterTrainingReportLink: { type: String, trim: true },
  evaluationFeedbackReportLink: { type: String, trim: true },

  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'for_revision', 'approved', 'ongoing', 'completed', 'consolidated'],
    default: 'draft',
  },
  remarks: { type: String, trim: true },
  missingDocuments: [{ type: String }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

trainingActivitySchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'End date must be on or after start date');
  }
  next();
});

trainingActivitySchema.pre('save', function (next) {
  this.totalEnrolled = (this.maleEnrolled || 0) + (this.femaleEnrolled || 0);
  this.numberOfGraduates = (this.maleGraduates || 0) + (this.femaleGraduates || 0);
  this.completionRate = this.totalEnrolled > 0
    ? Math.round((this.numberOfGraduates / this.totalEnrolled) * 10000) / 100
    : 0;
  this.missingDocuments = REQUIRED_DOCS
    .filter(d => !this[d.field])
    .map(d => d.label);
  next();
});

trainingActivitySchema.index({ province: 1, status: 1 });
trainingActivitySchema.index({ status: 1, quarter: 1 });
trainingActivitySchema.index({ year: 1, quarter: 1 });
trainingActivitySchema.index({ createdBy: 1 });
trainingActivitySchema.index({ startDate: 1 });
trainingActivitySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('TrainingActivity', trainingActivitySchema);
