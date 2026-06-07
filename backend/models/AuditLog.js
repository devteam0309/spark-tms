const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  trainingActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingActivity' },
  previousStatus: { type: String },
  newStatus: { type: String },
  remarks: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

auditLogSchema.index({ trainingActivity: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
