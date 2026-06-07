const TrainingActivity = require('../models/TrainingActivity');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const buildFilter = require('../utils/buildFilter');
const { sendStatusNotification } = require('../utils/email');
const logger = require('../utils/logger');

const DOCUMENT_LINK_FIELDS = [
  'trainerRequirementsLink', 'certificateOfCompletionLink', 'certificateOfParticipationLink',
  'testimonialDriveLink', 'terminalReportLink', 'attendanceFormLink',
  'rawPhotoVideoDocumentationLink', 'scholarsAgreementLink', 'assessmentScoresheetLink',
  'monitoringTrackerLink', 'afterTrainingReportLink', 'evaluationFeedbackReportLink',
];

const isValidUrl = (v) => {
  if (!v || v.trim() === '') return true;
  try {
    const u = new URL(v.trim());
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
};

const validateLinkFields = (body, fields) => {
  const invalid = fields.filter(f => body[f] !== undefined && !isValidUrl(body[f]));
  return invalid.length > 0 ? invalid : null;
};

// Fire-and-forget audit logging — mirrors the setImmediate() pattern already
// used for email notifications, so a transient AuditLog failure never turns a
// successful mutation into an error response for the client.
const logAudit = (entry) => {
  setImmediate(() => {
    AuditLog.create(entry).catch((e) => logger.error('Failed to write audit log', { context: 'audit', error: e.message }));
  });
};

// `assignedProvince` may arrive populated ({ _id, name, ... }) or as a bare
// ObjectId depending on how the user document was fetched — normalize to a
// string id either way.
const getUserProvinceId = (user) =>
  user.assignedProvince?._id?.toString() || user.assignedProvince?.toString();

const SUBMISSION_REQUIRED_FIELDS = [
  'quarter', 'year', 'trainingCourse', 'province', 'targetSector', 'venue',
  'courseCoordinator', 'trainer', 'startDate', 'endDate', 'mode',
];

const ALLOWED_UPDATE_FIELDS = [
  'year', 'quarter', 'trainingCourse', 'targetSector', 'venue',
  'partnerAgency', 'partnerProvision', 'courseCoordinator',
  'trainer', 'trainerEmail', 'trainerRequirementsLink',
  'maleEnrolled', 'femaleEnrolled', 'startDate', 'endDate',
  'mode', 'time', 'onlineCampaignDates', 'assessmentDate', 'graduationDate',
  'maleGraduates', 'femaleGraduates', 'numberOfMedalists',
  'withOnlineJobs', 'freelanceSales', 'trainingStatus', 'remarks',
  'certificateOfCompletionLink', 'certificateOfParticipationLink',
  'testimonialDriveLink', 'terminalReportLink', 'attendanceFormLink',
  'rawPhotoVideoDocumentationLink', 'scholarsAgreementLink',
  'assessmentScoresheetLink', 'monitoringTrackerLink',
  'afterTrainingReportLink', 'evaluationFeedbackReportLink',
];

const VALID_TRANSITIONS = {
  province_focal: {
    draft: ['submitted'],
    for_revision: ['submitted'],
  },
  spark_focal: {
    submitted: ['under_review', 'approved', 'for_revision'],
    under_review: ['approved', 'for_revision'],
    approved: ['ongoing'],
    ongoing: ['completed'],
    completed: ['consolidated'],
  },
};

const getTrainings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const filter = buildFilter(req.user, req.query);

    const [trainings, total] = await Promise.all([
      TrainingActivity.find(filter)
        .populate('province', 'name code')
        .populate('createdBy', 'firstName lastName')
        .sort('-updatedAt')
        .skip(skip)
        .limit(limit),
      TrainingActivity.countDocuments(filter),
    ]);

    res.json({ trainings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch training records' });
  }
};

const getTraining = async (req, res) => {
  try {
    const training = await TrainingActivity.findById(req.params.id)
      .populate('province', 'name code region')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName');

    if (!training) return res.status(404).json({ message: 'Training not found' });

    if (req.user.role === 'province_focal') {
      const userProvince = getUserProvinceId(req.user);
      if (training.province._id.toString() !== userProvince) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const logs = await AuditLog.find({ trainingActivity: training._id })
      .populate('user', 'firstName lastName role')
      .sort('-createdAt')
      .limit(20);

    res.json({ training, logs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch training record' });
  }
};

const createTraining = async (req, res) => {
  try {
    let provinceId = req.body.province;
    if (req.user.role === 'province_focal') {
      if (!req.user.assignedProvince) {
        return res.status(400).json({ message: 'You must be assigned to a province before creating training records' });
      }
      provinceId = req.user.assignedProvince?._id || req.user.assignedProvince;
    }

    const invalidLinks = validateLinkFields(req.body, DOCUMENT_LINK_FIELDS);
    if (invalidLinks) {
      return res.status(400).json({ message: `Invalid URL format for: ${invalidLinks.join(', ')}. Only http/https URLs are allowed.` });
    }

    const allowed = {};
    ALLOWED_UPDATE_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) allowed[f] = req.body[f];
    });

    const training = await TrainingActivity.create({
      ...allowed,
      province: provinceId,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      status: 'draft',
    });

    logAudit({
      user: req.user._id,
      action: 'TRAINING_CREATED',
      trainingActivity: training._id,
      newStatus: 'draft',
    });

    res.status(201).json(training);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateTraining = async (req, res) => {
  try {
    const training = await TrainingActivity.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training not found' });

    if (req.user.role === 'province_focal') {
      const userProvince = getUserProvinceId(req.user);
      if (training.province.toString() !== userProvince)
        return res.status(403).json({ message: 'Access denied' });
      if (!['draft', 'for_revision'].includes(training.status))
        return res.status(400).json({ message: 'Can only edit draft or returned records' });
    }

    const invalidLinks = validateLinkFields(req.body, DOCUMENT_LINK_FIELDS);
    if (invalidLinks) {
      return res.status(400).json({ message: `Invalid URL format for: ${invalidLinks.join(', ')}. Only http/https URLs are allowed.` });
    }

    ALLOWED_UPDATE_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) training[f] = req.body[f];
    });
    training.updatedBy = req.user._id;
    await training.save();

    logAudit({
      user: req.user._id,
      action: 'TRAINING_UPDATED',
      trainingActivity: training._id,
    });

    res.json(training);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteTraining = async (req, res) => {
  try {
    const training = await TrainingActivity.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training not found' });

    if (req.user.role === 'province_focal') {
      const userProvince = getUserProvinceId(req.user);
      if (training.province.toString() !== userProvince)
        return res.status(403).json({ message: 'Access denied' });
      if (!['draft', 'for_revision'].includes(training.status))
        return res.status(400).json({ message: 'Can only delete draft or returned records' });
    } else {
      if (['consolidated'].includes(training.status))
        return res.status(400).json({ message: 'Cannot delete consolidated records' });
    }

    await TrainingActivity.findByIdAndDelete(req.params.id);
    logAudit({
      user: req.user._id,
      action: 'TRAINING_DELETED',
      trainingActivity: req.params.id,
    });

    res.json({ message: 'Training deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete training record' });
  }
};

const changeStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });

    const training = await TrainingActivity.findById(req.params.id)
      .populate('province', 'name')
      .populate('createdBy', 'email firstName lastName');
    if (!training) return res.status(404).json({ message: 'Training not found' });

    const prevStatus = training.status;
    const role = req.user.role;

    const allowed = VALID_TRANSITIONS[role]?.[prevStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${prevStatus}' to '${status}'`,
      });
    }

    if (role === 'province_focal') {
      const missing = SUBMISSION_REQUIRED_FIELDS.filter(f => !training[f]);
      if (missing.length > 0) {
        return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
      }
    }

    if (status === 'for_revision' && !remarks?.trim()) {
      return res.status(400).json({ message: 'Remarks are required when returning for revision' });
    }

    training.status = status;
    training.updatedBy = req.user._id;
    if (remarks) training.remarks = remarks;
    await training.save();

    logAudit({
      user: req.user._id,
      action: `STATUS_CHANGED_TO_${status.toUpperCase()}`,
      trainingActivity: training._id,
      previousStatus: prevStatus,
      newStatus: status,
      remarks,
    });

    // Send email notification asynchronously (never blocks response)
    setImmediate(async () => {
      try {
        let recipients = [];
        if (status === 'submitted') {
          // Notify all active spark focals
          recipients = await User.find({ role: 'spark_focal', isActive: true }).select('email firstName lastName');
        } else if (training.createdBy) {
          // Notify the training's creator (province focal)
          recipients = [training.createdBy];
        }
        await sendStatusNotification({
          toUsers: recipients,
          training,
          newStatus: status,
          remarks,
          changedBy: req.user,
        });
      } catch (e) {
        logger.error('Status notification email failed', { context: 'status-notification', error: e.message });
      }
    });

    res.json(training);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
};

const updateLinks = async (req, res) => {
  try {
    const training = await TrainingActivity.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training not found' });

    if (req.user.role === 'province_focal') {
      const userProvince = getUserProvinceId(req.user);
      if (training.province.toString() !== userProvince)
        return res.status(403).json({ message: 'Access denied' });
      if (!['draft', 'for_revision'].includes(training.status))
        return res.status(400).json({ message: 'Can only update documents on draft or returned records' });
    }

    const linkFields = [
      'trainerRequirementsLink', 'certificateOfCompletionLink', 'certificateOfParticipationLink',
      'testimonialDriveLink', 'terminalReportLink', 'attendanceFormLink',
      'rawPhotoVideoDocumentationLink', 'scholarsAgreementLink', 'assessmentScoresheetLink',
      'monitoringTrackerLink', 'afterTrainingReportLink', 'evaluationFeedbackReportLink',
    ];

    const invalidLinks = validateLinkFields(req.body, linkFields);
    if (invalidLinks) {
      return res.status(400).json({ message: `Invalid URL format for: ${invalidLinks.join(', ')}. Only http/https URLs are allowed.` });
    }

    linkFields.forEach(field => {
      if (req.body[field] !== undefined) training[field] = req.body[field];
    });

    training.updatedBy = req.user._id;
    await training.save();

    logAudit({
      user: req.user._id,
      action: 'DOCUMENT_LINKS_UPDATED',
      trainingActivity: training._id,
    });

    res.json(training);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update document links' });
  }
};

module.exports = {
  getTrainings, getTraining, createTraining, updateTraining, deleteTraining,
  changeStatus, updateLinks,
};
