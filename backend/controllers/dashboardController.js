const TrainingActivity = require('../models/TrainingActivity');
const AuditLog = require('../models/AuditLog');
const Province = require('../models/Province');

const getSparkFocalDashboard = async (req, res) => {
  try {
    const baseFilter = {};
    if (req.query.year) baseFilter.year = parseInt(req.query.year, 10);

    const [
      totalTrainings,
      byStatus,
      byProvince,
      missingDocsCount,
      enrollmentAgg,
      upcomingTrainings,
      recentLogs,
      provinceList,
    ] = await Promise.all([
      TrainingActivity.countDocuments(baseFilter),
      TrainingActivity.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TrainingActivity.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$province',
            count: { $sum: 1 },
            enrolled: { $sum: '$totalEnrolled' },
            graduates: { $sum: '$numberOfGraduates' },
          },
        },
        {
          $lookup: { from: 'provinces', localField: '_id', foreignField: '_id', as: 'province' },
        },
        { $unwind: { path: '$province', preserveNullAndEmptyArrays: true } },
      ]),
      TrainingActivity.countDocuments({ ...baseFilter, missingDocuments: { $exists: true, $not: { $size: 0 } } }),
      TrainingActivity.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            totalEnrolled: { $sum: '$totalEnrolled' },
            totalGraduates: { $sum: '$numberOfGraduates' },
          },
        },
      ]),
      TrainingActivity.find({
        ...baseFilter,
        startDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      })
        .populate('province', 'name')
        .sort('startDate')
        .limit(5),
      AuditLog.find()
        .populate('user', 'firstName lastName role')
        .populate('trainingActivity', 'trainingCourse')
        .sort('-createdAt')
        .limit(10),
      Province.find({ isActive: true }).sort('name'),
    ]);

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });

    const completionRate = enrollmentAgg[0]?.totalEnrolled > 0
      ? Math.round((enrollmentAgg[0].totalGraduates / enrollmentAgg[0].totalEnrolled) * 10000) / 100
      : 0;

    res.json({
      totalTrainings,
      pending: statusMap.submitted || 0,
      forRevision: statusMap.for_revision || 0,
      approved: statusMap.approved || 0,
      ongoing: statusMap.ongoing || 0,
      completed: statusMap.completed || 0,
      consolidated: statusMap.consolidated || 0,
      draft: statusMap.draft || 0,
      missingDocsCount,
      totalEnrolled: enrollmentAgg[0]?.totalEnrolled || 0,
      totalGraduates: enrollmentAgg[0]?.totalGraduates || 0,
      completionRate,
      byStatus,
      byProvince,
      upcomingTrainings,
      recentLogs,
      provinceList,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProvinceFocalDashboard = async (req, res) => {
  try {
    const provinceId = req.user.assignedProvince?._id || req.user.assignedProvince;
    if (!provinceId) return res.status(400).json({ message: 'No province assigned' });

    const filter = { province: provinceId };
    if (req.query.year) filter.year = parseInt(req.query.year, 10);

    const [
      total,
      byStatus,
      missingDocs,
      enrollmentAgg,
      upcomingTrainings,
      recentRemarks,
    ] = await Promise.all([
      TrainingActivity.countDocuments(filter),
      TrainingActivity.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TrainingActivity.countDocuments({ ...filter, missingDocuments: { $exists: true, $not: { $size: 0 } } }),
      TrainingActivity.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEnrolled: { $sum: '$totalEnrolled' },
            totalGraduates: { $sum: '$numberOfGraduates' },
          },
        },
      ]),
      TrainingActivity.find({
        ...filter,
        startDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      })
        .sort('startDate')
        .limit(5),
      TrainingActivity.find({ ...filter, remarks: { $exists: true, $ne: '' } })
        .sort('-updatedAt')
        .limit(5)
        .select('trainingCourse remarks status updatedAt'),
    ]);

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });

    res.json({
      total,
      draft: statusMap.draft || 0,
      submitted: statusMap.submitted || 0,
      underReview: statusMap.under_review || 0,
      forRevision: statusMap.for_revision || 0,
      approved: statusMap.approved || 0,
      ongoing: statusMap.ongoing || 0,
      completed: statusMap.completed || 0,
      missingDocs,
      totalEnrolled: enrollmentAgg[0]?.totalEnrolled || 0,
      totalGraduates: enrollmentAgg[0]?.totalGraduates || 0,
      upcomingTrainings,
      recentRemarks,
      byStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSparkFocalDashboard, getProvinceFocalDashboard };
