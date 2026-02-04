const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Attendance, User, Event, Assignment } = require('../models');
const { Op } = require('sequelize');

class ReportService {
  // Generate attendance PDF report
  async generateAttendancePDF(options) {
    const { startDate, endDate, eventId, agentId } = options;

    const where = {};
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }
    if (eventId) where.eventId = eventId;
    if (agentId) where.agentId = agentId;

    const attendances = await Attendance.findAll({
      where,
      include: [
        { model: User, as: 'agent', attributes: ['firstName', 'lastName', 'employeeId'] },
        { model: Event, as: 'event', attributes: ['name', 'location'] }
      ],
      order: [['date', 'DESC'], ['checkInTime', 'DESC']]
    });

    return new Promise((resolve, reject) => {
      const chunks = [];
      const doc = new PDFDocument({ margin: 50 });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Rapport de Présence', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Période: ${startDate || 'Début'} - ${endDate || 'Fin'}`, { align: 'center' });
      doc.moveDown(2);

      // Statistics
      const stats = this.calculateStats(attendances);
      doc.fontSize(14).text('Statistiques:', { underline: true });
      doc.fontSize(11)
        .text(`Total enregistrements: ${stats.total}`)
        .text(`Présents: ${stats.present} (${stats.presentPercent}%)`)
        .text(`Retards: ${stats.late} (${stats.latePercent}%)`)
        .text(`Absents: ${stats.absent} (${stats.absentPercent}%)`)
        .text(`Heures totales: ${stats.totalHours}h`);
      doc.moveDown(2);

      // Table header
      doc.fontSize(14).text('Détails:', { underline: true });
      doc.moveDown();

      const tableTop = doc.y;
      const tableHeaders = ['Date', 'Agent', 'Événement', 'Arrivée', 'Départ', 'Statut'];
      const colWidths = [70, 100, 120, 60, 60, 70];
      let x = 50;

      // Draw header
      doc.fontSize(10).font('Helvetica-Bold');
      tableHeaders.forEach((header, i) => {
        doc.text(header, x, tableTop, { width: colWidths[i] });
        x += colWidths[i];
      });

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Draw rows
      doc.font('Helvetica');
      let y = tableTop + 25;

      attendances.forEach((att, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        x = 50;
        const row = [
          new Date(att.date).toLocaleDateString('fr-FR'),
          `${att.agent?.firstName || ''} ${att.agent?.lastName || ''}`.substring(0, 15),
          (att.event?.name || '').substring(0, 18),
          att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
          att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
          this.translateStatus(att.status)
        ];

        row.forEach((cell, i) => {
          doc.text(cell, x, y, { width: colWidths[i] });
          x += colWidths[i];
        });

        y += 20;
      });

      // Footer
      doc.fontSize(8)
        .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 50, 750, { align: 'center' });

      doc.end();
    });
  }

  // Generate attendance Excel report
  async generateAttendanceExcel(options) {
    const { startDate, endDate, eventId, agentId } = options;

    const where = {};
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }
    if (eventId) where.eventId = eventId;
    if (agentId) where.agentId = agentId;

    const attendances = await Attendance.findAll({
      where,
      include: [
        { model: User, as: 'agent', attributes: ['firstName', 'lastName', 'employeeId', 'phone'] },
        { model: Event, as: 'event', attributes: ['name', 'location', 'checkInTime', 'checkOutTime'] }
      ],
      order: [['date', 'DESC'], ['checkInTime', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Security Guard Management';
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Résumé');
    const stats = this.calculateStats(attendances);

    summarySheet.columns = [
      { header: 'Métrique', key: 'metric', width: 25 },
      { header: 'Valeur', key: 'value', width: 15 }
    ];

    summarySheet.addRows([
      { metric: 'Période', value: `${startDate || 'Début'} - ${endDate || 'Fin'}` },
      { metric: 'Total enregistrements', value: stats.total },
      { metric: 'Présents', value: stats.present },
      { metric: 'Retards', value: stats.late },
      { metric: 'Absents', value: stats.absent },
      { metric: 'Taux de présence', value: `${stats.presentPercent}%` },
      { metric: 'Heures totales', value: `${stats.totalHours}h` }
    ]);

    // Style summary header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2C3E50' }
    };
    summarySheet.getRow(1).font = { color: { argb: 'FFFFFF' }, bold: true };

    // Details sheet
    const detailsSheet = workbook.addWorksheet('Détails');
    detailsSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'ID Employé', key: 'employeeId', width: 12 },
      { header: 'Agent', key: 'agent', width: 25 },
      { header: 'Téléphone', key: 'phone', width: 15 },
      { header: 'Événement', key: 'event', width: 25 },
      { header: 'Lieu', key: 'location', width: 20 },
      { header: 'Heure prévue', key: 'scheduledTime', width: 12 },
      { header: 'Arrivée', key: 'checkIn', width: 12 },
      { header: 'Départ', key: 'checkOut', width: 12 },
      { header: 'Statut', key: 'status', width: 12 },
      { header: 'Heures', key: 'hours', width: 8 },
      { header: 'Dans zone', key: 'inZone', width: 10 },
      { header: 'Distance (m)', key: 'distance', width: 12 }
    ];

    attendances.forEach(att => {
      detailsSheet.addRow({
        date: new Date(att.date).toLocaleDateString('fr-FR'),
        employeeId: att.agent?.employeeId || '',
        agent: `${att.agent?.firstName || ''} ${att.agent?.lastName || ''}`,
        phone: att.agent?.phone || '',
        event: att.event?.name || '',
        location: att.event?.location || '',
        scheduledTime: att.event?.checkInTime || '',
        checkIn: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('fr-FR') : '',
        checkOut: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('fr-FR') : '',
        status: this.translateStatus(att.status),
        hours: att.totalHours || 0,
        inZone: att.isWithinGeofence ? 'Oui' : 'Non',
        distance: att.distanceFromLocation || ''
      });
    });

    // Style details header
    detailsSheet.getRow(1).font = { bold: true };
    detailsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2C3E50' }
    };
    detailsSheet.getRow(1).font = { color: { argb: 'FFFFFF' }, bold: true };

    // Add conditional formatting for status
    detailsSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const statusCell = row.getCell('status');
        if (statusCell.value === 'Retard') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC107' } };
        } else if (statusCell.value === 'Absent') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DC3545' } };
        } else if (statusCell.value === 'Présent') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '28A745' } };
        }
      }
    });

    return await workbook.xlsx.writeBuffer();
  }

  // Calculate statistics
  calculateStats(attendances) {
    const total = attendances.length;
    const present = attendances.filter(a => a.status === 'present').length;
    const late = attendances.filter(a => a.status === 'late').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const totalHours = attendances.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0);

    return {
      total,
      present,
      late,
      absent,
      presentPercent: total ? Math.round((present / total) * 100) : 0,
      latePercent: total ? Math.round((late / total) * 100) : 0,
      absentPercent: total ? Math.round((absent / total) * 100) : 0,
      totalHours: Math.round(totalHours * 100) / 100
    };
  }

  // Translate status to French
  translateStatus(status) {
    const translations = {
      present: 'Présent',
      late: 'Retard',
      absent: 'Absent',
      excused: 'Excusé',
      early_departure: 'Départ anticipé'
    };
    return translations[status] || status;
  }

  // Generate agent performance report
  async generateAgentReport(agentId, startDate, endDate) {
    const attendances = await Attendance.findAll({
      where: {
        agentId,
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Event, as: 'event' }
      ],
      order: [['date', 'DESC']]
    });

    const stats = this.calculateStats(attendances);
    const agent = await User.findByPk(agentId);

    return {
      agent: {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        employeeId: agent.employeeId
      },
      period: { startDate, endDate },
      statistics: stats,
      attendances: attendances.map(a => ({
        date: a.date,
        event: a.event?.name,
        status: a.status,
        checkIn: a.checkInTime,
        checkOut: a.checkOutTime,
        hours: a.totalHours
      }))
    };
  }
}

module.exports = new ReportService();
