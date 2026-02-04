/**
 * Service d'export PDF
 * Génération de rapports PDF côté client avec jsPDF
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Configuration
const COMPANY_NAME = 'Security Guard Management';
const PRIMARY_COLOR = [59, 130, 246]; // Blue-500
const GRAY_COLOR = [107, 114, 128];

/**
 * Créer un nouveau document PDF avec en-tête
 */
const createPDF = (title, orientation = 'portrait') => {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  // Ajouter l'en-tête
  addHeader(doc, title);

  return doc;
};

/**
 * Ajouter l'en-tête standard
 */
const addHeader = (doc, title) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barre colorée en haut
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 20, 'F');

  // Nom de l'entreprise
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, 10, 13);

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(dateStr, pageWidth - 10, 13, { align: 'right' });

  // Titre du rapport
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 35, { align: 'center' });

  return 45; // Position Y après l'en-tête
};

/**
 * Ajouter le pied de page
 */
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Ligne
    doc.setDrawColor(...GRAY_COLOR);
    doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);

    // Texte
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_COLOR);
    doc.text(
      `Généré le ${new Date().toLocaleString('fr-FR')}`,
      10,
      pageHeight - 10
    );
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageWidth - 10,
      pageHeight - 10,
      { align: 'right' }
    );
  }
};

/**
 * Export des pointages
 */
export const exportAttendanceReport = (attendances, options = {}) => {
  const {
    title = 'Rapport de Présences',
    dateRange = null,
    eventName = null
  } = options;

  const doc = createPDF(title);
  let yPos = 45;

  // Sous-titre avec filtres
  if (dateRange || eventName) {
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_COLOR);
    let filterText = [];
    if (dateRange) filterText.push(`Période: ${dateRange}`);
    if (eventName) filterText.push(`Événement: ${eventName}`);
    doc.text(filterText.join(' | '), doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Statistiques résumées
  const stats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === 'present').length,
    late: attendances.filter(a => a.status === 'late').length,
    absent: attendances.filter(a => a.status === 'absent').length,
    totalHours: attendances.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0)
  };

  // Box statistiques
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(10, yPos, doc.internal.pageSize.getWidth() - 20, 25, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const statsX = 20;
  doc.text(`Total: ${stats.total}`, statsX, yPos + 10);
  doc.setTextColor(34, 197, 94);
  doc.text(`Présents: ${stats.present}`, statsX + 40, yPos + 10);
  doc.setTextColor(234, 179, 8);
  doc.text(`Retards: ${stats.late}`, statsX + 85, yPos + 10);
  doc.setTextColor(239, 68, 68);
  doc.text(`Absents: ${stats.absent}`, statsX + 125, yPos + 10);
  doc.setTextColor(59, 130, 246);
  doc.text(`Heures: ${stats.totalHours.toFixed(1)}h`, statsX + 165, yPos + 10);

  yPos += 35;

  // Tableau des pointages
  const tableData = attendances.map(a => [
    `${a.agent?.firstName || ''} ${a.agent?.lastName || ''}`,
    a.event?.name || '-',
    new Date(a.date).toLocaleDateString('fr-FR'),
    a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
    a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
    a.totalHours ? `${a.totalHours}h` : '-',
    a.status === 'present' ? 'Présent' : a.status === 'late' ? 'Retard' : a.status === 'absent' ? 'Absent' : a.status
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Agent', 'Événement', 'Date', 'Arrivée', 'Départ', 'Durée', 'Statut']],
    body: tableData,
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      6: { cellWidth: 20 }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    didDrawCell: (data) => {
      // Colorer le statut
      if (data.column.index === 6 && data.section === 'body') {
        const status = data.cell.raw;
        if (status === 'Présent') {
          doc.setTextColor(34, 197, 94);
        } else if (status === 'Retard') {
          doc.setTextColor(234, 179, 8);
        } else if (status === 'Absent') {
          doc.setTextColor(239, 68, 68);
        }
      }
    }
  });

  addFooter(doc);
  return doc;
};

/**
 * Export des incidents
 */
export const exportIncidentsReport = (incidents, options = {}) => {
  const { title = 'Rapport des Incidents' } = options;

  const doc = createPDF(title);
  let yPos = 45;

  // Stats
  const stats = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    high: incidents.filter(i => i.severity === 'high').length,
    resolved: incidents.filter(i => i.status === 'resolved').length
  };

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(10, yPos, doc.internal.pageSize.getWidth() - 20, 20, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total: ${stats.total} | Critiques: ${stats.critical} | Hauts: ${stats.high} | Résolus: ${stats.resolved}`, 20, yPos + 12);
  yPos += 30;

  // Tableau
  const tableData = incidents.map(i => [
    new Date(i.createdAt).toLocaleDateString('fr-FR'),
    i.type || '-',
    i.severity?.toUpperCase() || '-',
    i.location || '-',
    (i.description || '').substring(0, 50) + (i.description?.length > 50 ? '...' : ''),
    i.status === 'resolved' ? 'Résolu' : i.status === 'in_progress' ? 'En cours' : 'Ouvert'
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Date', 'Type', 'Sévérité', 'Lieu', 'Description', 'Statut']],
    body: tableData,
    headStyles: {
      fillColor: [239, 68, 68],
      textColor: [255, 255, 255]
    },
    styles: { fontSize: 8 }
  });

  addFooter(doc);
  return doc;
};

/**
 * Export des agents
 */
export const exportAgentsReport = (agents, options = {}) => {
  const { title = 'Liste des Agents' } = options;

  const doc = createPDF(title);
  let yPos = 45;

  const tableData = agents.map(a => [
    a.employeeId || '-',
    `${a.firstName || ''} ${a.lastName || ''}`,
    a.email || '-',
    a.phone || '-',
    a.role === 'admin' ? 'Admin' : a.role === 'supervisor' ? 'Superviseur' : 'Agent',
    a.status === 'active' ? 'Actif' : a.status === 'inactive' ? 'Inactif' : 'Suspendu',
    a.overallScore || 0
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['ID', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Score']],
    body: tableData,
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255]
    },
    styles: { fontSize: 8 }
  });

  addFooter(doc);
  return doc;
};

/**
 * Export des événements
 */
export const exportEventsReport = (events, options = {}) => {
  const { title = 'Liste des Événements' } = options;

  const doc = createPDF(title, 'landscape');
  let yPos = 45;

  const tableData = events.map(e => [
    e.name || '-',
    e.type || '-',
    e.location || '-',
    new Date(e.startDate).toLocaleDateString('fr-FR'),
    new Date(e.endDate).toLocaleDateString('fr-FR'),
    e.requiredAgents || '-',
    e.status === 'active' ? 'Actif' : e.status === 'completed' ? 'Terminé' : e.status
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Nom', 'Type', 'Lieu', 'Début', 'Fin', 'Agents req.', 'Statut']],
    body: tableData,
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255]
    },
    styles: { fontSize: 9 }
  });

  addFooter(doc);
  return doc;
};

/**
 * Rapport de synthèse mensuel
 */
export const exportMonthlySummary = (data, month, year) => {
  const doc = createPDF(`Synthèse ${month}/${year}`, 'portrait');
  let yPos = 45;

  const { attendanceStats, incidentStats, agentStats } = data;

  // Section Présences
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Présences', 10, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`• Total pointages: ${attendanceStats?.total || 0}`, 15, yPos);
  yPos += 6;
  doc.text(`• Taux de présence: ${attendanceStats?.presenceRate || 0}%`, 15, yPos);
  yPos += 6;
  doc.text(`• Heures totales: ${attendanceStats?.totalHours || 0}h`, 15, yPos);
  yPos += 15;

  // Section Incidents
  doc.setFontSize(14);
  doc.setTextColor(239, 68, 68);
  doc.text('Incidents', 10, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`• Total incidents: ${incidentStats?.total || 0}`, 15, yPos);
  yPos += 6;
  doc.text(`• Résolus: ${incidentStats?.resolved || 0}`, 15, yPos);
  yPos += 6;
  doc.text(`• En cours: ${incidentStats?.pending || 0}`, 15, yPos);
  yPos += 15;

  // Section Agents
  doc.setFontSize(14);
  doc.setTextColor(34, 197, 94);
  doc.text('Agents', 10, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`• Agents actifs: ${agentStats?.active || 0}`, 15, yPos);
  yPos += 6;
  doc.text(`• Score moyen: ${agentStats?.avgScore || 0}`, 15, yPos);

  addFooter(doc);
  return doc;
};

/**
 * Télécharger le PDF
 */
export const downloadPDF = (doc, filename) => {
  doc.save(`${filename}-${Date.now()}.pdf`);
};

/**
 * Ouvrir le PDF dans un nouvel onglet
 */
export const openPDF = (doc) => {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

export default {
  exportAttendanceReport,
  exportIncidentsReport,
  exportAgentsReport,
  exportEventsReport,
  exportMonthlySummary,
  downloadPDF,
  openPDF
};
