const mongoose = require('mongoose');

// Whitelists mirror the enums defined on TrainingActivity — any value outside
// these (including objects produced by `?status[$ne]=draft`-style query strings)
// is silently ignored rather than passed through to the Mongo filter.
const VALID_STATUSES = ['draft', 'submitted', 'under_review', 'for_revision', 'approved', 'ongoing', 'completed', 'consolidated'];
const VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFilter = (user, query) => {
  const filter = {};

  if (user.role === 'province_focal') {
    filter.province = user.assignedProvince?._id || user.assignedProvince;
  } else if (typeof query.province === 'string' && mongoose.isValidObjectId(query.province)) {
    filter.province = query.province;
  }

  if (typeof query.status === 'string' && VALID_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }
  if (typeof query.quarter === 'string' && VALID_QUARTERS.includes(query.quarter)) {
    filter.quarter = query.quarter;
  }
  if (typeof query.year === 'string' || typeof query.year === 'number') {
    const year = parseInt(query.year, 10);
    if (!Number.isNaN(year)) filter.year = year;
  }

  if (typeof query.search === 'string' && query.search.trim()) {
    const safe = escapeRegex(query.search.slice(0, 200));
    filter.$or = [
      { trainingCourse: { $regex: safe, $options: 'i' } },
      { trainer: { $regex: safe, $options: 'i' } },
      { venue: { $regex: safe, $options: 'i' } },
    ];
  }

  return filter;
};

module.exports = buildFilter;
