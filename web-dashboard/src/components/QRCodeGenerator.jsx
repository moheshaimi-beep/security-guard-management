import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { FiDownload, FiCopy, FiRefreshCw, FiCheck, FiPrinter } from 'react-icons/fi';
import { toast } from 'react-toastify';

/**
 * Générateur de QR Codes pour:
 * - Pointage événement (check-in/check-out)
 * - Badge agent
 * - Accès événement
 */
const QRCodeGenerator = ({
  type = 'event', // 'event' | 'agent' | 'attendance' | 'custom'
  data,
  title,
  subtitle,
  size = 256,
  showActions = true,
  onGenerated,
  className = ''
}) => {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  // Générer les données du QR selon le type
  const generateQRData = () => {
    const timestamp = Date.now();
    const baseUrl = window.location.origin;

    switch (type) {
      case 'event':
        return JSON.stringify({
          type: 'event_checkin',
          eventId: data.eventId,
          eventName: data.eventName,
          validFrom: data.validFrom || new Date().toISOString(),
          validUntil: data.validUntil,
          generated: timestamp,
          checkUrl: `${baseUrl}/checkinout?event=${data.eventId}`
        });

      case 'agent':
        return JSON.stringify({
          type: 'agent_badge',
          agentId: data.agentId,
          employeeId: data.employeeId,
          name: data.name,
          generated: timestamp,
          verifyUrl: `${baseUrl}/verify-agent/${data.agentId}`
        });

      case 'attendance':
        return JSON.stringify({
          type: 'quick_attendance',
          eventId: data.eventId,
          agentId: data.agentId,
          date: data.date || new Date().toISOString().split('T')[0],
          action: data.action || 'checkin', // 'checkin' | 'checkout'
          generated: timestamp
        });

      case 'custom':
        return typeof data === 'string' ? data : JSON.stringify(data);

      default:
        return JSON.stringify({ type: 'unknown', data, timestamp });
    }
  };

  // Générer le QR Code
  const generateQR = async () => {
    setLoading(true);
    try {
      const qrData = generateQRData();
      const options = {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      };

      const dataUrl = await QRCode.toDataURL(qrData, options);
      setQrDataUrl(dataUrl);

      if (onGenerated) {
        onGenerated({ dataUrl, rawData: qrData });
      }
    } catch (error) {
      console.error('Erreur génération QR:', error);
      toast.error('Erreur lors de la génération du QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQR();
  }, [data, type, size]);

  // Télécharger le QR code
  const downloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `qrcode-${type}-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success('QR Code téléchargé');
  };

  // Copier le QR code dans le presse-papier
  const copyQR = async () => {
    if (!qrDataUrl) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('QR Code copié');
    } catch (error) {
      // Fallback: copier les données brutes
      const qrData = generateQRData();
      navigator.clipboard.writeText(qrData);
      toast.info('Données QR copiées');
    }
  };

  // Imprimer le QR code
  const printQR = () => {
    if (!qrDataUrl) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${title || type}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
              padding: 20px;
              border: 2px solid #000;
              border-radius: 10px;
            }
            img { max-width: 300px; }
            h2 { margin: 10px 0 5px; }
            p { margin: 5px 0; color: #666; }
            .footer { margin-top: 15px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            ${title ? `<h2>${title}</h2>` : ''}
            ${subtitle ? `<p>${subtitle}</p>` : ''}
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="footer">
              Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Labels selon le type
  const getTypeLabel = () => {
    switch (type) {
      case 'event': return 'QR Événement';
      case 'agent': return 'Badge Agent';
      case 'attendance': return 'Pointage Rapide';
      default: return 'QR Code';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'event': return 'bg-blue-500';
      case 'agent': return 'bg-green-500';
      case 'attendance': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-4 py-2 ${getTypeColor()} text-white`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{getTypeLabel()}</span>
          <button
            onClick={generateQR}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Régénérer"
          >
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="p-4 flex flex-col items-center">
        {title && (
          <h3 className="font-semibold text-gray-800 mb-1 text-center">{title}</h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-500 mb-3 text-center">{subtitle}</p>
        )}

        <div className="relative">
          {loading ? (
            <div
              className="flex items-center justify-center bg-gray-100 rounded-lg"
              style={{ width: size, height: size }}
            >
              <FiRefreshCw className="animate-spin text-gray-400" size={32} />
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="rounded-lg"
              style={{ width: size, height: size }}
            />
          ) : (
            <div
              className="flex items-center justify-center bg-red-50 text-red-500 rounded-lg"
              style={{ width: size, height: size }}
            >
              Erreur
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && qrDataUrl && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={downloadQR}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Télécharger"
            >
              <FiDownload className="mr-1" size={14} />
              Télécharger
            </button>
            <button
              onClick={copyQR}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Copier"
            >
              {copied ? (
                <FiCheck className="mr-1 text-green-500" size={14} />
              ) : (
                <FiCopy className="mr-1" size={14} />
              )}
              {copied ? 'Copié!' : 'Copier'}
            </button>
            <button
              onClick={printQR}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Imprimer"
            >
              <FiPrinter className="mr-1" size={14} />
              Imprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Composant pour afficher plusieurs QR codes d'événement
 */
export const EventQRCodes = ({ event }) => {
  if (!event) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <QRCodeGenerator
        type="event"
        data={{
          eventId: event.id,
          eventName: event.name,
          validFrom: event.startDate,
          validUntil: event.endDate
        }}
        title={event.name}
        subtitle="Scanner pour pointer"
        size={200}
      />

      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-700 mb-3">Instructions</h4>
        <ol className="text-sm text-gray-600 space-y-2">
          <li>1. Imprimez ce QR code</li>
          <li>2. Affichez-le à l'entrée de l'événement</li>
          <li>3. Les agents scannent pour pointer leur arrivée</li>
          <li>4. Scanner à nouveau pour pointer le départ</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600">
            💡 Le QR code contient l'ID de l'événement et redirige vers la page de pointage.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Composant badge agent avec QR
 */
export const AgentBadgeQR = ({ agent }) => {
  if (!agent) return null;

  return (
    <QRCodeGenerator
      type="agent"
      data={{
        agentId: agent.id,
        employeeId: agent.employeeId,
        name: `${agent.firstName} ${agent.lastName}`
      }}
      title={`${agent.firstName} ${agent.lastName}`}
      subtitle={agent.employeeId}
      size={180}
    />
  );
};

export default QRCodeGenerator;
