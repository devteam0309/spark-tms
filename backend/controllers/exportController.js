const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const TrainingActivity = require('../models/TrainingActivity');
const buildFilter = require('../utils/buildFilter');
const logger = require('../utils/logger');

const fmt = (d) => (!d ? '' : d === 'TBD' ? 'TBD' : new Date(d).toLocaleDateString('en-PH'));

const HEADERS = [
  { header: 'Year', key: 'year', width: 8 },
  { header: 'Quarter', key: 'quarter', width: 8 },
  { header: 'Training Course', key: 'trainingCourse', width: 30 },
  { header: 'Province', key: 'province', width: 15 },
  { header: 'Target Sector', key: 'targetSector', width: 20 },
  { header: 'Venue', key: 'venue', width: 20 },
  { header: 'Partner Agency', key: 'partnerAgency', width: 20 },
  { header: 'Partner Provision', key: 'partnerProvision', width: 20 },
  { header: 'Course Coordinator(s)', key: 'courseCoordinator', width: 28 },
  { header: 'Trainer', key: 'trainer', width: 20 },
  { header: 'Trainer Email', key: 'trainerEmail', width: 25 },
  { header: 'Male Enrolled', key: 'maleEnrolled', width: 12 },
  { header: 'Female Enrolled', key: 'femaleEnrolled', width: 14 },
  { header: 'Total Enrolled', key: 'totalEnrolled', width: 13 },
  { header: 'Start Date', key: 'startDate', width: 12 },
  { header: 'End Date', key: 'endDate', width: 12 },
  { header: 'Mode', key: 'mode', width: 12 },
  { header: 'Assessment Date', key: 'assessmentDate', width: 15 },
  { header: 'Graduation Date', key: 'graduationDate', width: 15 },
  { header: 'Male Graduates', key: 'maleGraduates', width: 14 },
  { header: 'Female Graduates', key: 'femaleGraduates', width: 16 },
  { header: 'Total Graduates', key: 'numberOfGraduates', width: 14 },
  { header: 'Completion Rate (%)', key: 'completionRate', width: 18 },
  { header: 'No. of Medalists', key: 'numberOfMedalists', width: 15 },
  { header: 'With Online Jobs', key: 'withOnlineJobs', width: 14 },
  { header: 'Freelance Sales', key: 'freelanceSales', width: 14 },
  { header: 'Training Status', key: 'trainingStatus', width: 14 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Missing Documents', key: 'missingDocuments', width: 30 },
  { header: 'Remarks', key: 'remarks', width: 30 },
];

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  },
};

const STRIPE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };

const exportExcel = async (req, res) => {
  try {
    const filter = buildFilter(req.user, req.query);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SPARK_Training_Activities.xlsx"');

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });
    workbook.creator = 'SPARK TMS';

    const ws = workbook.addWorksheet('Training Activities');
    ws.columns = HEADERS;

    // Header row
    const headerRow = ws.addRow(HEADERS.map(h => h.header));
    headerRow.height = 35;
    headerRow.eachCell(cell => { Object.assign(cell, HEADER_STYLE); });
    headerRow.commit();

    const cursor = TrainingActivity.find(filter)
      .populate('province', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort('-createdAt')
      .cursor();

    let rowIndex = 0;
    for await (const t of cursor) {
      const row = ws.addRow({
        year: t.year,
        quarter: t.quarter,
        trainingCourse: t.trainingCourse,
        province: t.province?.name || '',
        targetSector: t.targetSector,
        venue: t.venue,
        partnerAgency: t.partnerAgency,
        partnerProvision: t.partnerProvision,
        courseCoordinator: t.courseCoordinator,
        trainer: t.trainer,
        trainerEmail: t.trainerEmail,
        maleEnrolled: t.maleEnrolled,
        femaleEnrolled: t.femaleEnrolled,
        totalEnrolled: t.totalEnrolled,
        startDate: fmt(t.startDate),
        endDate: fmt(t.endDate),
        mode: t.mode,
        assessmentDate: fmt(t.assessmentDate),
        graduationDate: fmt(t.graduationDate),
        maleGraduates: t.maleGraduates,
        femaleGraduates: t.femaleGraduates,
        numberOfGraduates: t.numberOfGraduates,
        completionRate: t.completionRate,
        numberOfMedalists: t.numberOfMedalists,
        withOnlineJobs: t.withOnlineJobs,
        freelanceSales: t.freelanceSales,
        trainingStatus: t.trainingStatus,
        status: t.status,
        missingDocuments: t.missingDocuments?.join(', ') || 'None',
        remarks: t.remarks,
      });
      row.getCell('completionRate').numFmt = '0.00"%"';
      if (rowIndex % 2 === 1) {
        row.eachCell(cell => { cell.fill = STRIPE_FILL; });
      }
      row.commit();
      rowIndex++;
    }

    await ws.commit();
    await workbook.commit();
  } catch (err) {
    logger.error('Excel export failed', { context: 'export-excel', error: err.message });
    if (res.headersSent) {
      res.destroy();
    } else {
      res.status(500).json({ message: 'Failed to generate Excel export' });
    }
  }
};

const PDF_COLS = [
  { label: 'Quarter', width: 40 },
  { label: 'Training Course', width: 160 },
  { label: 'Province', width: 80 },
  { label: 'Enrolled', width: 50 },
  { label: 'Graduates', width: 55 },
  { label: 'Comp. Rate', width: 55 },
  { label: 'Mode', width: 60 },
  { label: 'Status', width: 70 },
];

const exportPDF = async (req, res) => {
  let filter;
  let stats = {};
  try {
    filter = buildFilter(req.user, req.query);

    // Aggregate stats without loading all records
    [stats = {}] = await TrainingActivity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $in: ['$status', ['completed', 'consolidated']] }, 1, 0] } },
          totalEnrolled: { $sum: '$totalEnrolled' },
          totalGraduates: { $sum: '$numberOfGraduates' },
        },
      },
    ]);
  } catch (err) {
    logger.error('PDF export failed to prepare report', { context: 'export-pdf', error: err.message });
    return res.status(500).json({ message: 'Failed to generate PDF export' });
  }

  const total = stats.total || 0;
  const completed = stats.completed || 0;
  const totalEnrolled = stats.totalEnrolled || 0;
  const totalGraduates = stats.totalGraduates || 0;
  const avgCompletion = totalEnrolled > 0 ? Math.round((totalGraduates / totalEnrolled) * 100) : 0;

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="SPARK_Summary_Report.pdf"');
  doc.pipe(res);

  // Report header
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1E3A8A')
    .text('SPARK Training Monitoring System', { align: 'center' });
  doc.fontSize(12).font('Helvetica').fillColor('#374151')
    .text('Training Activities Summary Report', { align: 'center' });
  doc.fontSize(9).fillColor('#6B7280')
    .text(`Generated: ${new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}`, { align: 'center' });
  doc.moveDown();

  // Summary stat boxes
  const summaryY = doc.y;
  const boxW = 130;
  const boxes = [
    { label: 'Total Trainings', value: total },
    { label: 'Completed', value: completed },
    { label: 'Total Enrolled', value: totalEnrolled },
    { label: 'Total Graduates', value: totalGraduates },
    { label: 'Avg Completion Rate', value: `${avgCompletion}%` },
  ];
  boxes.forEach((b, i) => {
    const x = 40 + i * (boxW + 8);
    doc.rect(x, summaryY, boxW, 45).fillAndStroke('#EFF6FF', '#BFDBFE');
    doc.fillColor('#1E3A8A').fontSize(18).font('Helvetica-Bold')
      .text(String(b.value), x, summaryY + 5, { width: boxW, align: 'center' });
    doc.fillColor('#6B7280').fontSize(8).font('Helvetica')
      .text(b.label, x, summaryY + 28, { width: boxW, align: 'center' });
  });

  doc.moveDown(4);

  const tableX = 40;
  const totalTableW = PDF_COLS.reduce((a, c) => a + c.width, 0);
  let y = doc.y;
  const rowH = 20;

  const drawTableHeader = () => {
    doc.rect(tableX, y, totalTableW, rowH).fill('#1E3A8A');
    let cx = tableX;
    doc.fillColor('white').fontSize(7).font('Helvetica-Bold');
    PDF_COLS.forEach(c => {
      doc.text(c.label, cx + 3, y + 6, { width: c.width - 6, align: 'center' });
      cx += c.width;
    });
    y += rowH;
  };

  drawTableHeader();

  // Stream records via cursor
  const cursor = TrainingActivity.find(filter)
    .populate('province', 'name')
    .sort('-createdAt')
    .cursor();

  let rowIndex = 0;
  try {
    for await (const t of cursor) {
      if (y > 520) {
        doc.addPage({ layout: 'landscape', margin: 40 });
        y = 40;
        drawTableHeader();
      }

      const bg = rowIndex % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      doc.rect(tableX, y, totalTableW, rowH).fill(bg);

      const vals = [
        t.quarter || '',
        t.trainingCourse || '',
        t.province?.name || '',
        String(t.totalEnrolled || 0),
        String(t.numberOfGraduates || 0),
        `${t.completionRate || 0}%`,
        t.mode || '',
        (t.status || '').replace(/_/g, ' '),
      ];

      let cx = tableX;
      doc.fillColor('#111827').font('Helvetica').fontSize(7);
      vals.forEach((v, vi) => {
        doc.text(v, cx + 3, y + 6, {
          width: PDF_COLS[vi].width - 6,
          align: vi < 2 ? 'left' : 'center',
          ellipsis: true,
          lineBreak: false,
        });
        cx += PDF_COLS[vi].width;
      });

      doc.rect(tableX, y, totalTableW, rowH).stroke('#E5E7EB');
      y += rowH;
      rowIndex++;
    }
  } catch (err) {
    logger.error('PDF export stream error', { context: 'export-pdf', error: err.message });
    res.destroy();
    return;
  }

  doc.end();
};

module.exports = { exportExcel, exportPDF };
