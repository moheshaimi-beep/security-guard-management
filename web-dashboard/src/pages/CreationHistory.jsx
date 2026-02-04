import React, { useState, useEffect } from 'react';
import { FiUser, FiUsers, FiCheckCircle, FiClock, FiFilter, FiDownload, FiEye, FiCalendar, FiChevronDown, FiChevronRight, FiFileText } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useSync, useSyncEvent } from '../hooks/useSync';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import 'jspdf-autotable';

const CreationHistory = () => {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, admin, supervisor, self_registration
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive, suspended
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  // 🔄 WEBSOCKET - Synchronisation temps réel
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { isConnected } = useSync(user?.id, ['user:all', 'admin']);

  // Notification de connexion
  useEffect(() => {
    if (isConnected) {
      toast.success('🔄 Historique temps réel activé', { autoClose: 2000 });
    }
  }, [isConnected]);

  // Événement: Nouvel utilisateur créé
  useSyncEvent('user:created', (newUser) => {
    toast.info(`👤 Nouvel agent créé: ${newUser.firstName} ${newUser.lastName}`);
    fetchCreationHistory();
  });

  // Événement: Utilisateur mis à jour
  useSyncEvent('user:updated', (updatedUser) => {
    setAgents(prev => prev.map(a => a.id === updatedUser.id ? { ...a, ...updatedUser } : a));
  });

  // Événement: Affectation créée
  useSyncEvent('assignment:created', () => {
    fetchCreationHistory(); // Recharger pour mettre à jour les événements des agents
  });

  const filteredAgents = agents.filter(agent => {
    if (filter !== 'all' && agent.creation.type !== filter) return false;
    if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
    return true;
  });

  // Grouper les agents par événements
  const groupAgentsByEvent = () => {
    const grouped = {};
    
    filteredAgents.forEach(agent => {
      if (agent.events && agent.events.length > 0) {
        agent.events.forEach(event => {
          const eventId = event.id || event.name;
          if (!grouped[eventId]) {
            grouped[eventId] = {
              eventId: eventId,
              eventName: event.name,
              eventDates: `${new Date(event.startDate).toLocaleDateString('fr-FR')} → ${new Date(event.endDate).toLocaleDateString('fr-FR')}`,
              agents: []
            };
          }
          grouped[eventId].agents.push(agent);
        });
      } else {
        if (!grouped['no-event']) {
          grouped['no-event'] = {
            eventId: 'no-event',
            eventName: 'Sans événement',
            eventDates: '',
            agents: []
          };
        }
        grouped['no-event'].agents.push(agent);
      }
    });
    
    return Object.values(grouped);
  };

  const eventGroups = groupAgentsByEvent();

  useEffect(() => {
    fetchCreationHistory();
  }, []);

  // Développer tous les événements automatiquement après le chargement des agents
  useEffect(() => {
    if (filteredAgents.length > 0 && expandedEvents.size === 0) {
      setExpandedEvents(new Set(eventGroups.map(g => g.eventId)));
    }
  }, [filteredAgents.length]);

  const fetchCreationHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/creation-history/agents', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
        setStats(data.stats);
      } else {
        toast.error(data.message || 'Erreur lors du chargement');
      }
    } catch (error) {
      console.error('Error fetching creation history:', error);
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentDetails = async (agentId) => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/creation-history/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedAgent(data.agent);
        setShowDetailsModal(true);
      } else {
        toast.error(data.message || 'Erreur lors du chargement des détails');
      }
    } catch (error) {
      console.error('Error fetching agent details:', error);
      toast.error('Erreur réseau');
    }
  };

  const getCreationTypeBadge = (type) => {
    const badges = {
      admin: { bg: 'bg-gradient-to-r from-purple-600 to-purple-700', icon: '👑', text: 'Administrateur' },
      supervisor: { bg: 'bg-gradient-to-r from-blue-600 to-blue-700', icon: '👨‍💼', text: 'Responsable' },
      self_registration: { bg: 'bg-gradient-to-r from-green-600 to-green-700', icon: '✍️', text: 'Auto-inscription' }
    };
    const badge = badges[type] || badges.admin;
    return (
      <span className={`${badge.bg} text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg`}>
        <span className="text-sm">{badge.icon}</span>
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-gradient-to-r from-green-500 to-emerald-600', icon: '✅', text: 'Actif', pulse: true },
      inactive: { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', icon: '⏸️', text: 'Inactif', pulse: false },
      suspended: { bg: 'bg-gradient-to-r from-red-500 to-red-600', icon: '🚫', text: 'Suspendu', pulse: false }
    };
    const badge = badges[status] || badges.inactive;
    return (
      <span className={`${badge.bg} text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg ${badge.pulse ? 'animate-pulse' : ''}`}>
        <span className="text-sm">{badge.icon}</span>
        {badge.text}
      </span>
    );
  };

  const exportToExcel = async () => {
    try {
      toast.info('📊 Génération du fichier Excel en cours...');
      
      // Créer un nouveau classeur
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Historique Agents');

      // Configuration des colonnes
      worksheet.columns = [
        { header: 'Photo', key: 'photo', width: 15 },
        { header: 'ID', key: 'id', width: 12 },
        { header: 'Nom Complet', key: 'fullName', width: 25 },
        { header: 'Téléphone', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Zones', key: 'zones', width: 20 },
        { header: 'Type de création', key: 'creationType', width: 15 },
        { header: 'Créé par', key: 'createdBy', width: 20 },
        { header: 'Statut', key: 'status', width: 12 },
        { header: 'Date de création', key: 'createdAt', width: 18 }
      ];

      // Style des en-têtes
      const headerRow = worksheet.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' }
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Ajouter les données des agents
      for (let i = 0; i < filteredAgents.length; i++) {
        const agent = filteredAgents[i];
        const rowIndex = i + 2; // +2 car les en-têtes sont à la ligne 1
        
        const zones = agent.events && agent.events.length > 0
          ? agent.events
              .filter(e => e.zone)
              .map(e => e.zone.name)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(', ')
          : 'Non assigné';

        // Ajouter les données texte
        const row = worksheet.addRow({
          photo: '', // La photo sera ajoutée séparément
          id: agent.employeeId,
          fullName: agent.fullName,
          phone: agent.phone,
          email: agent.email,
          zones: zones,
          creationType: agent.creation.type === 'admin' ? 'Admin' : 
                       agent.creation.type === 'supervisor' ? 'Responsable' : 'Auto-inscription',
          createdBy: agent.creation.createdBy?.name || 'N/A',
          status: agent.status === 'active' ? 'Actif' : 
                 agent.status === 'inactive' ? 'Inactif' : 'Suspendu',
          createdAt: new Date(agent.createdAt).toLocaleDateString('fr-FR')
        });

        // Configurer la hauteur de ligne pour les images
        row.height = 60;

        // Ajouter l'image si elle existe  
        if (agent.profilePhoto && agent.profilePhoto.startsWith('data:image/')) {
          try {
            // Image base64 déjà prête dans la réponse API
            const mimeMatch = agent.profilePhoto.match(/data:image\/(\w+);base64,/);
            const imageExtension = mimeMatch && mimeMatch[1] === 'png' ? 'png' : 'jpeg';
            const base64Data = agent.profilePhoto.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Ajouter l'image au classeur
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: imageExtension,
            });

            // Insérer l'image dans la cellule
            worksheet.addImage(imageId, {
              tl: { col: 0, row: rowIndex - 1 },
              ext: { width: 50, height: 50 },
              editAs: 'oneCell'
            });
            
            worksheet.getCell(rowIndex, 1).value = '';
          } catch (error) {
            console.error(`Erreur photo agent ${agent.fullName}:`, error);
            worksheet.getCell(rowIndex, 1).value = 'Erreur photo';
            worksheet.getCell(rowIndex, 1).alignment = { vertical: 'middle', horizontal: 'center' };
          }
        } else {
          // Pas de photo base64 disponible
          worksheet.getCell(rowIndex, 1).value = 'Pas de photo';
          worksheet.getCell(rowIndex, 1).alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Style des cellules
        row.eachCell((cell, colIndex) => {
          if (colIndex > 1) { // Ignorer la colonne photo pour le texte
            cell.alignment = {
              vertical: 'middle',
              horizontal: colIndex === 2 || colIndex === 3 ? 'left' : 'center'
            };
          }
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Couleur alternée des lignes
          if (i % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' }
            };
          }
        });
      }

      // Générer le fichier Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historique-agents-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('📊 Fichier Excel généré avec succès!');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast.error('Erreur lors de la génération du fichier Excel');
    }
  };

  const exportToPDF = async () => {
    try {
      toast.info('📄 Génération du PDF en cours...');
      const doc = new jsPDF('l', 'mm', 'a4'); // Format paysage pour le tableau
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;

      // Configuration UTF-8
      doc.setFont('helvetica');
      
      // Titre plus compact
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text('Historique des Creations d\'Agents', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Date du rapport plus compacte
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Statistiques plus compactes
      if (stats) {
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`Total: ${stats.total} | Admin: ${stats.byCreationType.admin} | Responsable: ${stats.byCreationType.supervisor} | Actifs: ${stats.byStatus.active}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;
      }

      // Grouper par événements
      const agentsByEvent = filteredAgents.reduce((acc, agent) => {
        if (agent.events && agent.events.length > 0) {
          agent.events.forEach(event => {
            const eventId = event.id || event.name;
            if (!acc[eventId]) {
              acc[eventId] = {
                eventName: event.name,
                agents: []
              };
            }
            acc[eventId].agents.push(agent);
          });
        } else {
          if (!acc['no-event']) {
            acc['no-event'] = {
              eventName: 'Sans événement',
              agents: []
            };
          }
          acc['no-event'].agents.push(agent);
        }
        return acc;
      }, {});

      // Configuration optimisée du tableau pour A4 paysage
      const tableConfig = {
        marginLeft: 8,
        marginTop: yPosition,
        // Colonnes optimisées pour 297mm de largeur A4 paysage
        columnWidths: [20, 35, 18, 50, 28, 30, 20, 18, 25], // Total: ~244mm, marge: 8+8=16mm
        rowHeight: 18, // Réduit de 20 à 18
        headerHeight: 12 // Réduit de 15 à 12
      };

      // Pour chaque événement
      for (const [eventKey, eventData] of Object.entries(agentsByEvent)) {
        // Vérifier si on a assez d'espace pour l'en-tête + quelques lignes
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        // En-tête de l'événement plus compact
        doc.setFillColor(59, 130, 246);
        doc.rect(tableConfig.marginLeft, yPosition, pageWidth - 16, 10, 'F');
        doc.setFontSize(11); // Réduit de 14 à 11
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(`${eventData.eventName} (${eventData.agents.length} agent${eventData.agents.length > 1 ? 's' : ''})`, tableConfig.marginLeft + 4, yPosition + 7);
        yPosition += 13; // Réduit de 17 à 13

        // En-tête du tableau
        doc.setFillColor(226, 232, 240);
        doc.rect(tableConfig.marginLeft, yPosition, pageWidth - 16, tableConfig.headerHeight, 'F');
        
        // Lignes de séparation verticales
        let xPos = tableConfig.marginLeft;
        doc.setDrawColor(156, 163, 175);
        doc.setLineWidth(0.5);
        
        const headers = ['Photo', 'Nom', 'ID', 'Email', 'Tel', 'Zones', 'Type', 'Statut', 'Date'];
        
        // Dessiner les en-têtes avec police plus petite
        doc.setFontSize(8); // Réduit de 10 à 8
        doc.setTextColor(51, 65, 85);
        doc.setFont(undefined, 'bold');
        
        headers.forEach((header, index) => {
          // Ligne verticale
          doc.line(xPos, yPosition, xPos, yPosition + tableConfig.headerHeight);
          
          // Texte centré dans la colonne
          const colWidth = tableConfig.columnWidths[index];
          doc.text(header, xPos + colWidth / 2, yPosition + 8, { align: 'center' });
          xPos += colWidth;
        });
        
        // Dernière ligne verticale
        doc.line(xPos, yPosition, xPos, yPosition + tableConfig.headerHeight);
        // Ligne horizontale du bas de l'en-tête
        doc.line(tableConfig.marginLeft, yPosition + tableConfig.headerHeight, pageWidth - 8, yPosition + tableConfig.headerHeight);
        
        yPosition += tableConfig.headerHeight;

        // Lignes des agents
        for (const agent of eventData.agents) {
          // Vérifier l'espace pour une nouvelle ligne
          if (yPosition > pageHeight - 25) {
            doc.addPage();
            yPosition = 20;
          }

          // Fond alterné pour lisibilité
          if (eventData.agents.indexOf(agent) % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(tableConfig.marginLeft, yPosition, pageWidth - 16, tableConfig.rowHeight, 'F');
          }

          // Dessiner les lignes verticales
          xPos = tableConfig.marginLeft;
          doc.setDrawColor(156, 163, 175);
          doc.setLineWidth(0.3);
          
          // Données de l'agent avec troncature intelligente
          const zones = agent.events && agent.events.length > 0
            ? agent.events
                .filter(e => e.zone)
                .map(e => e.zone.name)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(', ')
            : 'Non assigné';

          const agentData = [
            '', // Photo - sera ajoutée séparément
            agent.fullName.length > 12 ? agent.fullName.substring(0, 12) + '...' : agent.fullName,
            agent.employeeId,
            agent.email.length > 18 ? agent.email.substring(0, 15) + '...' : agent.email,
            agent.phone,
            zones.length > 12 ? zones.substring(0, 9) + '...' : zones,
            agent.creation?.type === 'admin' ? 'Admin' : agent.creation?.type === 'supervisor' ? 'Resp' : 'Auto',
            agent.status === 'active' ? 'Actif' : agent.status === 'inactive' ? 'Inactif' : 'Susp',
            new Date(agent.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          ];

          // Dessiner chaque cellule avec police réduite
          doc.setFontSize(7); // Réduit de 8 à 7
          doc.setTextColor(51, 65, 85);
          doc.setFont(undefined, 'normal');

          agentData.forEach((data, index) => {
            // Ligne verticale
            doc.line(xPos, yPosition, xPos, yPosition + tableConfig.rowHeight);
            
            if (index === 0) {
              // Photo dans la première colonne - plus petite
              if (agent.profilePhoto) {
                try {
                  const photoUrl = agent.profilePhoto.startsWith('data:') 
                    ? agent.profilePhoto 
                    : (agent.profilePhoto.startsWith('/uploads') ? 
                        `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${agent.profilePhoto}` : 
                        agent.profilePhoto
                      );
                  
                  // Photo plus petite: 12x12 au lieu de 16x16
                  doc.addImage(photoUrl, 'JPEG', xPos + 4, yPosition + 3, 12, 12);
                } catch (error) {
                  console.error('Erreur photo:', error);
                  doc.text('-', xPos + tableConfig.columnWidths[index] / 2, yPosition + 10, { align: 'center' });
                }
              } else {
                doc.text('-', xPos + tableConfig.columnWidths[index] / 2, yPosition + 10, { align: 'center' });
              }
            } else {
              // Texte centré verticalement et horizontalement selon la colonne
              const textY = yPosition + (tableConfig.rowHeight / 2) + 2;
              if (index === 1) { // Nom - aligné à gauche
                doc.text(data, xPos + 2, textY);
              } else if (index === 3 || index === 5) { // Email et zones - aligné à gauche
                doc.text(data, xPos + 2, textY);
              } else { // Autres colonnes - centrées
                doc.text(data, xPos + tableConfig.columnWidths[index] / 2, textY, { align: 'center' });
              }
            }
            
            xPos += tableConfig.columnWidths[index];
          });
          
          // Dernière ligne verticale de la ligne
          doc.line(xPos, yPosition, xPos, yPosition + tableConfig.rowHeight);
          // Ligne horizontale du bas
          doc.line(tableConfig.marginLeft, yPosition + tableConfig.rowHeight, pageWidth - 8, yPosition + tableConfig.rowHeight);
          
          yPosition += tableConfig.rowHeight;
        }

        yPosition += 10; // Espace entre les événements réduit
      }

      // Pied de page sur toutes les pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Security Guard Management System', pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      // Télécharger le PDF
      doc.save(`historique-agents-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF genere avec succes!');
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error('Erreur lors de la generation du PDF');
    }
  };

  const toggleEvent = (eventId) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const toggleAllEvents = () => {
    if (expandedEvents.size === eventGroups.length) {
      setExpandedEvents(new Set());
    } else {
      setExpandedEvents(new Set(eventGroups.map(g => g.eventId)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-3 py-4">
      {/* Header */}
      <div className="max-w-full mx-auto mb-4 px-2">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FiUsers size={32} />
                Historique des Créations d'Agents
              </h1>
              <p className="text-white/70 mt-2">
                Consultation centralisée de tous les agents créés dans le système
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleAllEvents}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                title={expandedEvents.size === eventGroups.length ? "Tout Replier" : "Tout Développer"}
              >
                {expandedEvents.size === eventGroups.length ? (
                  <>
                    <FiChevronRight size={20} />
                    Tout Replier
                  </>
                ) : (
                  <>
                    <FiChevronDown size={20} />
                    Tout Développer
                  </>
                )}
              </button>
              <button
                onClick={exportToPDF}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
              >
                <FiFileText size={20} />
                Exporter PDF
              </button>
              <button
                onClick={exportToExcel}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
              >
                <FiDownload size={20} />
                Exporter Excel
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-400/40 rounded-2xl p-4 hover:scale-105 transition-transform shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/30 rounded-lg">
                    <FiUsers className="text-blue-300" size={24} />
                  </div>
                  <span className="text-white font-semibold">Total</span>
                </div>
                <p className="text-4xl font-bold text-white">{stats.total}</p>
                <p className="text-blue-200 text-xs mt-2">Agents créés</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/30 to-purple-600/20 border-2 border-purple-400/40 rounded-2xl p-4 hover:scale-105 transition-transform shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/30 rounded-lg">
                    <span className="text-2xl">👑</span>
                  </div>
                  <span className="text-white font-semibold">Admin</span>
                </div>
                <p className="text-4xl font-bold text-white">{stats.byCreationType.admin}</p>
                <p className="text-purple-200 text-xs mt-2">Par administrateur</p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border-2 border-cyan-400/40 rounded-2xl p-4 hover:scale-105 transition-transform shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-500/30 rounded-lg">
                    <span className="text-2xl">👨‍💼</span>
                  </div>
                  <span className="text-white font-semibold">Responsable</span>
                </div>
                <p className="text-4xl font-bold text-white">{stats.byCreationType.supervisor}</p>
                <p className="text-cyan-200 text-xs mt-2">Par responsable</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/30 to-emerald-600/20 border-2 border-green-400/40 rounded-2xl p-4 hover:scale-105 transition-transform shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-500/30 rounded-lg">
                    <FiCheckCircle className="text-green-300" size={24} />
                  </div>
                  <span className="text-white font-semibold">Actifs</span>
                </div>
                <p className="text-4xl font-bold text-white animate-pulse">{stats.byStatus.active}</p>
                <p className="text-green-200 text-xs mt-2">En service</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/30 to-orange-600/20 border-2 border-amber-400/40 rounded-2xl p-4 hover:scale-105 transition-transform shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-500/30 rounded-lg">
                    <FiClock className="text-amber-300" size={24} />
                  </div>
                  <span className="text-white font-semibold">Temporaires</span>
                </div>
                <p className="text-4xl font-bold text-white">{stats.temporary}</p>
                <p className="text-amber-200 text-xs mt-2">Contrats courts</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-white/70" size={20} />
              <span className="text-white/70">Type de création:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous</option>
                <option value="admin">Administrateur</option>
                <option value="supervisor">Responsable</option>
                <option value="self_registration">Auto-inscription</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/70">Statut:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Table - Grouped by Event */}
      <div className="max-w-full mx-auto px-2">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
          {eventGroups.length === 0 ? (
            <div className="p-8 text-center text-white/50">
              Aucun agent trouvé avec ces filtres
            </div>
          ) : (
            eventGroups.map(group => (
              <div key={group.eventId} className="border-b border-white/10 last:border-b-0">
                {/* Event Header */}
                <div 
                  className="bg-gradient-to-r from-blue-600/40 to-indigo-600/30 border-b-2 border-blue-400/50 px-5 py-4 flex items-center justify-between cursor-pointer hover:from-blue-500/50 hover:to-indigo-500/40 transition-all duration-300 group"
                  onClick={() => toggleEvent(group.eventId)}
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-500/30 rounded-xl group-hover:bg-blue-500/40 transition-all">
                      {expandedEvents.has(group.eventId) ? (
                        <FiChevronDown className="text-blue-200 transition-transform" size={28} />
                      ) : (
                        <FiChevronRight className="text-blue-200 transition-transform" size={28} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-4">
                        <span className="text-3xl">🎯</span>
                        {group.eventName}
                        <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
                          <FiUsers size={16} />
                          {group.agents.length} agent{group.agents.length > 1 ? 's' : ''}
                        </span>
                      </h3>
                      {group.eventDates && (
                        <p className="text-blue-100 text-sm mt-2 flex items-center gap-2">
                          <FiCalendar size={14} />
                          {group.eventDates}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-blue-200 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Cliquez pour {expandedEvents.has(group.eventId) ? 'replier' : 'développer'}
                  </div>
                </div>

                {/* Agents in this event */}
                {expandedEvents.has(group.eventId) && (
                  <div className="animate-fadeIn">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-white/10">
                          <tr>
                            <th className="px-6 py-4 text-center text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-2">
                                <span>📸</span> Photo
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <span>🆔</span> ID
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <FiUser size={16} /> Nom Complet
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <span>📞</span> Téléphone
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <span>📍</span> Zone
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <span>🏷️</span> Type
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <span>👤</span> Créé par
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <FiCheckCircle size={16} /> Statut
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <FiCalendar size={16} /> Date
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center text-white font-bold text-sm uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-2">
                                <FiEye size={16} /> Actions
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {group.agents.map((agent) => (
                            <tr key={agent.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center">
                                  {agent.profilePhoto ? (
                                    <div className="relative group/photo">
                                      <img 
                                        src={agent.profilePhoto.startsWith('data:') ? agent.profilePhoto : `http://localhost:5000${agent.profilePhoto}`} 
                                        alt={agent.fullName}
                                        data-agent-id={agent.id}
                                        crossOrigin="anonymous"
                                        className="w-16 h-16 rounded-xl object-cover border-3 border-blue-400/50 shadow-lg group-hover/photo:scale-110 transition-transform"
                                      />
                                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg border-3 border-blue-400/50">
                                      <FiUser className="text-white text-2xl" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="bg-blue-500/20 px-3 py-1 rounded-lg inline-block">
                                  <span className="text-white font-mono text-sm font-bold">{agent.employeeId}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-white font-bold text-base">{agent.fullName}</div>
                                  <div className="text-white/50 text-xs mt-1">{agent.email}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-white/90">
                                  <span className="text-blue-400">📞</span>
                                  {agent.phone}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {agent.events && agent.events.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {agent.events
                                      .filter(e => e.zone)
                                      .map((e, idx) => (
                                        <span 
                                          key={idx}
                                          className="text-xs bg-gradient-to-r from-purple-500/40 to-indigo-500/40 text-purple-100 px-3 py-1.5 rounded-full border border-purple-400/30 font-semibold shadow-lg"
                                          title={e.name}
                                        >
                                          📍 {e.zone.name}
                                        </span>
                                      ))
                                    }
                                    {agent.events.filter(e => e.zone).length === 0 && (
                                      <span className="text-white/50 text-sm italic">Non assigné</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-white/50 text-sm italic">Non assigné</span>
                                )}
                              </td>
                              <td className="px-6 py-4">{getCreationTypeBadge(agent.creation.type)}</td>
                              <td className="px-6 py-4 text-white/80">
                                {agent.creation.createdBy ? (
                                  <div>
                                    <p className="font-semibold">{agent.creation.createdBy.name}</p>
                                    <p className="text-xs text-white/50">{agent.creation.createdBy.role}</p>
                                  </div>
                                ) : (
                                  <span className="text-white/50">N/A</span>
                                )}
                              </td>
                              <td className="px-6 py-4">{getStatusBadge(agent.status)}</td>
                              <td className="px-6 py-4 text-white/80 text-sm">
                                {new Date(agent.createdAt).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => fetchAgentDetails(agent.id)}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 mx-auto transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
                                >
                                  <FiEye size={18} />
                                  Voir Détails
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedAgent.fullName}</h2>
                <p className="text-white/70">{selectedAgent.employeeId}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Profile Photo & Info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-start gap-6">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    {selectedAgent.profilePhoto ? (
                      <img 
                        src={selectedAgent.profilePhoto.startsWith('data:') ? selectedAgent.profilePhoto : `http://localhost:5000${selectedAgent.profilePhoto}`} 
                        alt={selectedAgent.fullName}
                        className="w-32 h-32 rounded-xl object-cover border-4 border-white/20 shadow-xl"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white/20 shadow-xl">
                        <FiUser className="text-white text-5xl" />
                      </div>
                    )}
                  </div>

                  {/* Personal Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-4">Informations Personnelles</h3>
                    <div className="grid grid-cols-2 gap-4 text-white/80">
                      <div><span className="text-white/50">Email:</span> {selectedAgent.email}</div>
                      <div><span className="text-white/50">Téléphone:</span> {selectedAgent.phone}</div>
                      <div><span className="text-white/50">CIN:</span> {selectedAgent.cin}</div>
                      <div><span className="text-white/50">Statut:</span> {getStatusBadge(selectedAgent.status)}</div>
                      <div><span className="text-white/50">Vecteur facial:</span> {selectedAgent.hasFacialVector ? '✅ Oui' : '❌ Non'}</div>
                      {selectedAgent.address && (
                        <div className="col-span-2"><span className="text-white/50">Adresse:</span> {selectedAgent.address}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Creation Info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4">Informations de Création</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Type:</span>
                    {getCreationTypeBadge(selectedAgent.creation.type)}
                  </div>
                  {selectedAgent.creation.createdBy && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/50 text-sm mb-1">Créé par:</p>
                      <p className="text-white font-semibold">{selectedAgent.creation.createdBy.name}</p>
                      <p className="text-white/70 text-sm">{selectedAgent.creation.createdBy.email}</p>
                      <p className="text-white/50 text-xs">{selectedAgent.creation.createdBy.role}</p>
                    </div>
                  )}
                  {selectedAgent.supervisor && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/50 text-sm mb-1">Superviseur:</p>
                      <p className="text-white font-semibold">{selectedAgent.supervisor.name}</p>
                      <p className="text-white/70 text-sm">{selectedAgent.supervisor.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignments */}
              {selectedAgent.assignments && selectedAgent.assignments.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4">Affectations ({selectedAgent.assignments.length})</h3>
                  <div className="space-y-2">
                    {selectedAgent.assignments.map((assignment) => (
                      <div key={assignment.id} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">{assignment.eventName}</p>
                          <p className="text-white/70 text-sm">{assignment.zoneName}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          assignment.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                        } text-white`}>
                          {assignment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Attendance */}
              {selectedAgent.recentAttendance && selectedAgent.recentAttendance.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4">Pointages Récents</h3>
                  <div className="space-y-2">
                    {selectedAgent.recentAttendance.map((attendance) => (
                      <div key={attendance.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <p className="text-white">{new Date(attendance.date).toLocaleDateString()}</p>
                          <div className="text-white/70 text-sm">
                            {attendance.checkInTime && <span>Entrée: {attendance.checkInTime}</span>}
                            {attendance.checkOutTime && <span className="ml-4">Sortie: {attendance.checkOutTime}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreationHistory;
