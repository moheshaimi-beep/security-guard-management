import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

// Sample test data
const mockAttendanceData = [
  {
    id: 1,
    agentId: 'AG001',
    agent: {
      firstName: 'Ahmed',
      lastName: 'Bennani',
      employeeId: 'EMP001'
    },
    eventId: 'EV001',
    event: {
      name: 'Événement Sécurité 1'
    },
    date: '2026-01-14',
    checkInTime: '08:30:00',
    checkOutTime: '17:00:00',
    checkInLatitude: 48.8566,
    checkInLongitude: 2.3522,
    checkOutLatitude: 48.8566,
    checkOutLongitude: 2.3522,
    distanceFromLocation: 150,
    isWithinGeofence: true,
    deviceFingerprint: 'DEVICE_FP_12345',
    deviceInfo: {
      browser: 'Chrome',
      os: 'Windows 10'
    },
    facialVerified: true,
    facialVerifiedAt: '2026-01-14T08:32:15.000Z',
    facialMatchScore: 0.95,
    status: 'present'
  },
  {
    id: 2,
    agentId: 'AG002',
    agent: {
      firstName: 'Fatima',
      lastName: 'Hassan',
      employeeId: 'EMP002'
    },
    eventId: 'EV001',
    event: {
      name: 'Événement Sécurité 1'
    },
    date: '2026-01-14',
    checkInTime: '09:15:00',
    checkOutTime: '17:00:00',
    checkInLatitude: 48.8600,
    checkInLongitude: 2.3550,
    checkOutLatitude: 48.8600,
    checkOutLongitude: 2.3550,
    distanceFromLocation: 200,
    isWithinGeofence: true,
    deviceFingerprint: 'DEVICE_FP_67890',
    deviceInfo: {
      browser: 'Firefox',
      os: 'Windows 11'
    },
    facialVerified: false,
    facialVerifiedAt: null,
    facialMatchScore: null,
    status: 'late'
  }
];

// Safe date formatting
const safeFormatDate = (dateString, formatStr = 'dd/MM/yyyy') => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    return '-';
  }
};

const safeFormatTime = (timeString) => {
  if (!timeString) return '-';
  try {
    return timeString.substring(0, 5);
  } catch (e) {
    return '-';
  }
};

// Export to Excel
const exportToExcel = async (attendances) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Présences');

    // Headers
    worksheet.columns = [
      { header: 'Nom Agent', key: 'agentName', width: 20 },
      { header: 'Prénom', key: 'agentFirstName', width: 15 },
      { header: 'Événement', key: 'eventName', width: 25 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Heure Entrée', key: 'checkInTime', width: 15 },
      { header: 'Heure Sortie', key: 'checkOutTime', width: 15 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'Adresse', key: 'address', width: 30 },
      { header: 'Appareil', key: 'deviceInfo', width: 20 },
      { header: 'Heure Facial', key: 'facialVerifiedAt', width: 15 },
      { header: 'Facial Vérifié', key: 'facialVerified', width: 15 },
      { header: 'Score Match', key: 'facialMatchScore', width: 12 },
      { header: 'État', key: 'status', width: 12 },
      { header: 'Heures Travaillées', key: 'totalHours', width: 15 }
    ];

    // Add data
    attendances.forEach(record => {
      worksheet.addRow({
        agentName: record.agent?.lastName || '-',
        agentFirstName: record.agent?.firstName || '-',
        eventName: record.event?.name || '-',
        date: safeFormatDate(record.date),
        checkInTime: safeFormatTime(record.checkInTime),
        checkOutTime: safeFormatTime(record.checkOutTime),
        latitude: record.checkInLatitude || '-',
        longitude: record.checkInLongitude || '-',
        address: record.checkInLatitude ? `${record.checkInLatitude}, ${record.checkInLongitude}` : '-',
        deviceInfo: record.deviceInfo ? `${record.deviceInfo.browser} / ${record.deviceInfo.os}` : '-',
        facialVerifiedAt: record.facialVerifiedAt ? safeFormatDate(record.facialVerifiedAt) : '-',
        facialVerified: record.facialVerified ? 'Oui' : 'Non',
        facialMatchScore: record.facialMatchScore ? `${Math.round(record.facialMatchScore * 100)}%` : '-',
        status: record.status || '-',
        totalHours: record.totalHours || '-'
      });
    });

    // Style header
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const buffer = await workbook.xlsx.writeBuffer();
    console.log('✅ Excel export successful. File size:', buffer.length, 'bytes');
    return buffer;
  } catch (error) {
    console.error('❌ Excel export error:', error.message);
    throw error;
  }
};

// Export to PDF
const exportToPDF = (attendances, startDate = '2026-01-01', endDate = '2026-01-31', stats = {}) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    doc.setFontSize(16);
    doc.text('Rapport de Présences', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date range
    doc.setFontSize(10);
    doc.text(`Période: ${startDate} à ${endDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Stats
    doc.setFontSize(11);
    doc.text(
      `Total: ${stats?.total || 0} | Présents: ${stats?.present || 0} | Absents: ${stats?.absent || 0} | Vérification Faciale: ${stats?.facialVerified || 0}`,
      15,
      yPosition
    );
    yPosition += 12;

    // Table headers
    const headers = ['Agent', 'Événement', 'Date', 'Entrée', 'Sortie', 'Latitude', 'Longitude', 'État', 'Facial'];
    const colWidth = (pageWidth - 30) / headers.length;

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(59, 130, 246);

    headers.forEach((header, index) => {
      doc.rect(15 + index * colWidth, yPosition, colWidth, 10, 'F');
      doc.text(header, 15 + index * colWidth + 2, yPosition + 7);
    });
    yPosition += 12;

    // Table data
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    attendances.slice(0, 20).forEach(record => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      const data = [
        `${record.agent?.firstName || ''} ${record.agent?.lastName || ''}`,
        record.event?.name || '-',
        safeFormatDate(record.date),
        safeFormatTime(record.checkInTime),
        safeFormatTime(record.checkOutTime),
        `${record.checkInLatitude || '-'}`,
        `${record.checkInLongitude || '-'}`,
        record.status || '-',
        record.facialVerified ? '✓' : '✗'
      ];

      data.forEach((cell, index) => {
        doc.text(cell, 15 + index * colWidth + 2, yPosition);
      });
      yPosition += 8;
    });

    const pdfData = doc.output('arraybuffer');
    console.log('✅ PDF export successful. File size:', pdfData.byteLength, 'bytes');
    return pdfData;
  } catch (error) {
    console.error('❌ PDF export error:', error.message);
    throw error;
  }
};

// Test exports
console.log('\n🧪 Testing Export Functions...\n');

console.log('Testing Excel Export...');
exportToExcel(mockAttendanceData).then(() => {
  console.log('Excel export test completed.\n');
}).catch(error => {
  console.error('Excel export test failed:', error);
});

console.log('Testing PDF Export...');
exportToPDF(mockAttendanceData, '2026-01-01', '2026-01-31', {
  total: 2,
  present: 1,
  absent: 0,
  facialVerified: 1
});

console.log('\n✅ All export tests completed!');
