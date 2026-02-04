/**
 * Analytics & IA Predictive Service
 * Analyses avancees et predictions basees sur les donnees
 */

const { Op, fn, col, literal } = require('sequelize');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Event = require('../models/Event');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');

class AnalyticsService {
  /**
   * Analyser les patterns de presence d'un agent
   * @param {number} agentId - ID de l'agent
   * @param {number} days - Nombre de jours a analyser
   */
  async analyzeAgentPatterns(agentId, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendances = await Attendance.findAll({
      where: {
        agentId,
        date: { [Op.gte]: startDate }
      },
      order: [['date', 'ASC']]
    });

    // Calculer les statistiques
    const stats = {
      totalDays: attendances.length,
      presentDays: attendances.filter(a => a.status === 'present').length,
      lateDays: attendances.filter(a => a.status === 'late').length,
      absentDays: attendances.filter(a => a.status === 'absent').length,
      avgCheckInTime: null,
      avgCheckOutTime: null,
      avgWorkHours: 0,
      lateByDayOfWeek: {},
      performanceTrend: [],
    };

    // Calculer les moyennes
    const checkInTimes = attendances
      .filter(a => a.checkInTime)
      .map(a => new Date(a.checkInTime).getHours() * 60 + new Date(a.checkInTime).getMinutes());

    const checkOutTimes = attendances
      .filter(a => a.checkOutTime)
      .map(a => new Date(a.checkOutTime).getHours() * 60 + new Date(a.checkOutTime).getMinutes());

    if (checkInTimes.length > 0) {
      const avgMinutes = checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length;
      stats.avgCheckInTime = `${Math.floor(avgMinutes / 60).toString().padStart(2, '0')}:${Math.floor(avgMinutes % 60).toString().padStart(2, '0')}`;
    }

    if (checkOutTimes.length > 0) {
      const avgMinutes = checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length;
      stats.avgCheckOutTime = `${Math.floor(avgMinutes / 60).toString().padStart(2, '0')}:${Math.floor(avgMinutes % 60).toString().padStart(2, '0')}`;
    }

    const workHours = attendances
      .filter(a => a.totalHours)
      .map(a => parseFloat(a.totalHours));
    if (workHours.length > 0) {
      stats.avgWorkHours = (workHours.reduce((a, b) => a + b, 0) / workHours.length).toFixed(2);
    }

    // Analyser les retards par jour de la semaine
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    for (let i = 0; i < 7; i++) {
      stats.lateByDayOfWeek[dayNames[i]] = attendances
        .filter(a => new Date(a.date).getDay() === i && a.status === 'late')
        .length;
    }

    // Calculer la tendance de performance sur les dernieres semaines
    const weeks = Math.ceil(days / 7);
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekAttendances = attendances.filter(a => {
        const date = new Date(a.date);
        return date >= weekStart && date < weekEnd;
      });

      if (weekAttendances.length > 0) {
        const presentRate = (weekAttendances.filter(a => a.status === 'present').length / weekAttendances.length) * 100;
        stats.performanceTrend.push({
          week: w + 1,
          startDate: weekStart.toISOString().split('T')[0],
          presentRate: Math.round(presentRate),
          totalDays: weekAttendances.length
        });
      }
    }

    return stats;
  }

  /**
   * Predire le risque d'absence d'un agent
   * @param {number} agentId - ID de l'agent
   */
  async predictAbsenceRisk(agentId) {
    const patterns = await this.analyzeAgentPatterns(agentId, 60);

    // Facteurs de risque
    let riskScore = 0;
    const riskFactors = [];

    // Taux d'absence recent
    if (patterns.totalDays > 0) {
      const absentRate = (patterns.absentDays / patterns.totalDays) * 100;
      if (absentRate > 20) {
        riskScore += 30;
        riskFactors.push({
          factor: 'high_absence_rate',
          description: `Taux d'absence eleve (${absentRate.toFixed(1)}%)`,
          impact: 'high'
        });
      } else if (absentRate > 10) {
        riskScore += 15;
        riskFactors.push({
          factor: 'moderate_absence_rate',
          description: `Taux d'absence modere (${absentRate.toFixed(1)}%)`,
          impact: 'medium'
        });
      }
    }

    // Taux de retard
    if (patterns.totalDays > 0) {
      const lateRate = (patterns.lateDays / patterns.totalDays) * 100;
      if (lateRate > 30) {
        riskScore += 25;
        riskFactors.push({
          factor: 'high_late_rate',
          description: `Taux de retard eleve (${lateRate.toFixed(1)}%)`,
          impact: 'high'
        });
      } else if (lateRate > 15) {
        riskScore += 10;
        riskFactors.push({
          factor: 'moderate_late_rate',
          description: `Taux de retard modere (${lateRate.toFixed(1)}%)`,
          impact: 'medium'
        });
      }
    }

    // Tendance negative
    if (patterns.performanceTrend.length >= 3) {
      const recent = patterns.performanceTrend.slice(-3);
      const trend = recent[2].presentRate - recent[0].presentRate;
      if (trend < -10) {
        riskScore += 20;
        riskFactors.push({
          factor: 'negative_trend',
          description: 'Tendance de performance en baisse',
          impact: 'high'
        });
      }
    }

    // Jour de la semaine problematique
    const maxLateDay = Object.entries(patterns.lateByDayOfWeek)
      .sort((a, b) => b[1] - a[1])[0];
    if (maxLateDay && maxLateDay[1] > 3) {
      riskScore += 10;
      riskFactors.push({
        factor: 'problematic_day',
        description: `${maxLateDay[0]} est un jour problematique (${maxLateDay[1]} retards)`,
        impact: 'medium'
      });
    }

    // Determiner le niveau de risque
    let riskLevel = 'low';
    if (riskScore >= 60) {
      riskLevel = 'high';
    } else if (riskScore >= 30) {
      riskLevel = 'medium';
    }

    return {
      agentId,
      riskScore: Math.min(100, riskScore),
      riskLevel,
      riskFactors,
      recommendations: this.generateRecommendations(riskFactors),
      analyzedDays: patterns.totalDays,
      patterns
    };
  }

  /**
   * Generer des recommandations basees sur les facteurs de risque
   */
  generateRecommendations(riskFactors) {
    const recommendations = [];

    riskFactors.forEach(factor => {
      switch (factor.factor) {
        case 'high_absence_rate':
          recommendations.push({
            type: 'action',
            priority: 'high',
            message: 'Planifier un entretien avec l\'agent pour comprendre les raisons des absences'
          });
          break;
        case 'high_late_rate':
          recommendations.push({
            type: 'action',
            priority: 'high',
            message: 'Verifier si les horaires sont compatibles avec les contraintes de l\'agent'
          });
          break;
        case 'negative_trend':
          recommendations.push({
            type: 'monitoring',
            priority: 'medium',
            message: 'Mettre en place un suivi renforce pour les prochaines semaines'
          });
          break;
        case 'problematic_day':
          recommendations.push({
            type: 'scheduling',
            priority: 'low',
            message: `Eviter les affectations critiques ce jour si possible`
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Analyser les incidents et detecter les zones a risque
   */
  async analyzeIncidentHotspots(days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const incidents = await Incident.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      include: [{ model: Event, as: 'event' }]
    });

    // Grouper par localisation
    const locationGroups = {};
    incidents.forEach(incident => {
      const location = incident.event?.location || incident.locationAddress || 'Unknown';
      if (!locationGroups[location]) {
        locationGroups[location] = {
          total: 0,
          bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
          byType: {},
          incidents: []
        };
      }
      locationGroups[location].total++;
      locationGroups[location].bySeverity[incident.severity]++;
      locationGroups[location].byType[incident.type] =
        (locationGroups[location].byType[incident.type] || 0) + 1;
      locationGroups[location].incidents.push({
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        date: incident.createdAt
      });
    });

    // Calculer le score de risque pour chaque location
    const hotspots = Object.entries(locationGroups).map(([location, data]) => {
      let riskScore = data.total * 10;
      riskScore += data.bySeverity.critical * 40;
      riskScore += data.bySeverity.high * 20;
      riskScore += data.bySeverity.medium * 10;

      return {
        location,
        riskScore: Math.min(100, riskScore),
        ...data
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    return {
      period: `${days} jours`,
      totalIncidents: incidents.length,
      hotspots: hotspots.slice(0, 10), // Top 10
      incidentsByType: this.aggregateByType(incidents),
      incidentsBySeverity: this.aggregateBySeverity(incidents),
      trend: await this.calculateIncidentTrend(days)
    };
  }

  /**
   * Agreger les incidents par type
   */
  aggregateByType(incidents) {
    const byType = {};
    incidents.forEach(i => {
      byType[i.type] = (byType[i.type] || 0) + 1;
    });
    return Object.entries(byType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Agreger les incidents par severite
   */
  aggregateBySeverity(incidents) {
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    incidents.forEach(i => {
      bySeverity[i.severity]++;
    });
    return bySeverity;
  }

  /**
   * Calculer la tendance des incidents
   */
  async calculateIncidentTrend(days) {
    const weeks = Math.ceil(days / 7);
    const trend = [];

    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weeks - w) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = await Incident.count({
        where: {
          createdAt: {
            [Op.gte]: weekStart,
            [Op.lt]: weekEnd
          }
        }
      });

      trend.push({
        week: w + 1,
        startDate: weekStart.toISOString().split('T')[0],
        count
      });
    }

    return trend;
  }

  /**
   * Predire les besoins en personnel pour un evenement
   */
  async predictStaffingNeeds(eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Evenement non trouve');
    }

    // Analyser les evenements similaires passes
    const similarEvents = await Event.findAll({
      where: {
        type: event.type,
        status: 'completed',
        id: { [Op.ne]: eventId }
      },
      include: [
        { model: Assignment, as: 'assignments' },
        { model: Incident, as: 'incidents' }
      ],
      limit: 20
    });

    let recommendedStaff = event.requiredAgents || 1;
    const factors = [];

    // Facteur 1: Incidents dans les evenements similaires
    const avgIncidents = similarEvents.length > 0
      ? similarEvents.reduce((sum, e) => sum + (e.incidents?.length || 0), 0) / similarEvents.length
      : 0;

    if (avgIncidents > 2) {
      recommendedStaff = Math.ceil(recommendedStaff * 1.3);
      factors.push({
        factor: 'incident_history',
        description: `Moyenne de ${avgIncidents.toFixed(1)} incidents pour ce type d'evenement`,
        adjustment: '+30%'
      });
    }

    // Facteur 2: Duree de l'evenement
    const durationHours = this.calculateEventDuration(event);
    if (durationHours > 8) {
      recommendedStaff = Math.ceil(recommendedStaff * 1.2);
      factors.push({
        factor: 'long_duration',
        description: `Evenement de longue duree (${durationHours}h)`,
        adjustment: '+20%'
      });
    }

    // Facteur 3: Weekend
    const eventDate = new Date(event.startDate);
    if (eventDate.getDay() === 0 || eventDate.getDay() === 6) {
      recommendedStaff = Math.ceil(recommendedStaff * 1.1);
      factors.push({
        factor: 'weekend',
        description: 'Evenement le weekend',
        adjustment: '+10%'
      });
    }

    return {
      eventId,
      eventName: event.name,
      currentRequirement: event.requiredAgents,
      recommendedStaff: Math.max(1, recommendedStaff),
      factors,
      confidence: similarEvents.length >= 5 ? 'high' : similarEvents.length >= 2 ? 'medium' : 'low',
      basedOn: `${similarEvents.length} evenements similaires`
    };
  }

  /**
   * Calculer la duree d'un evenement
   */
  calculateEventDuration(event) {
    if (event.checkInTime && event.checkOutTime) {
      const [inH, inM] = event.checkInTime.split(':').map(Number);
      const [outH, outM] = event.checkOutTime.split(':').map(Number);
      return (outH * 60 + outM - inH * 60 - inM) / 60;
    }
    return 8; // Default 8 heures
  }

  /**
   * Generer le tableau de bord analytique
   */
  async generateDashboard() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // KPIs principaux
    const [
      totalAgents,
      activeAgents,
      attendancesToday,
      incidentsMonth,
      eventsMonth
    ] = await Promise.all([
      User.count({ where: { role: 'agent' } }),
      User.count({ where: { role: 'agent', status: 'active' } }),
      Attendance.count({
        where: {
          date: today.toISOString().split('T')[0]
        }
      }),
      Incident.count({
        where: {
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      }),
      Event.count({
        where: {
          startDate: { [Op.gte]: thirtyDaysAgo }
        }
      })
    ]);

    // Top performers
    const topPerformers = await User.findAll({
      where: {
        role: 'agent',
        status: 'active'
      },
      order: [['overallScore', 'DESC']],
      limit: 5,
      attributes: ['id', 'firstName', 'lastName', 'overallScore']
    });

    // Agents a risque
    const agentsAtRisk = [];
    const agents = await User.findAll({
      where: { role: 'agent', status: 'active' },
      limit: 50
    });

    for (const agent of agents) {
      const risk = await this.predictAbsenceRisk(agent.id);
      if (risk.riskLevel === 'high' || risk.riskLevel === 'medium') {
        agentsAtRisk.push({
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          ...risk
        });
      }
    }

    return {
      kpis: {
        totalAgents,
        activeAgents,
        attendancesToday,
        incidentsMonth,
        eventsMonth,
        attendanceRate: activeAgents > 0
          ? Math.round((attendancesToday / activeAgents) * 100)
          : 0
      },
      topPerformers,
      agentsAtRisk: agentsAtRisk.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5),
      incidentAnalysis: await this.analyzeIncidentHotspots(30),
      generatedAt: new Date()
    };
  }
}

module.exports = new AnalyticsService();
