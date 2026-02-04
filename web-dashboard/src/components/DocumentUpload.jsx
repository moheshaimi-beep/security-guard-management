import React, { useState, useRef, useCallback } from 'react';
import {
  FiUpload, FiFile, FiImage, FiFileText, FiX, FiEye,
  FiDownload, FiAlertCircle, FiCheckCircle, FiTrash2,
  FiPlus
} from 'react-icons/fi';

// Types de documents disponibles
const DOCUMENT_TYPES = [
  { value: 'cin_recto', label: 'CIN Recto', icon: FiFileText },
  { value: 'cin_verso', label: 'CIN Verso', icon: FiFileText },
  { value: 'photo', label: 'Photo d\'identite', icon: FiImage },
  { value: 'cv', label: 'CV', icon: FiFile },
  { value: 'fiche_anthropometrique', label: 'Fiche anthropometrique', icon: FiFileText },
  { value: 'permis', label: 'Permis de conduire', icon: FiFileText },
  { value: 'diplome', label: 'Diplome', icon: FiFileText },
  { value: 'autre', label: 'Autre document', icon: FiFile }
];

// Extensions et tailles autorisees
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB par defaut

const DocumentUpload = ({
  documents = [],
  onChange,
  disabled = false,
  showExisting = false,
  existingDocuments = []
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Gestion du drag & drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  }, [disabled]);

  // Validation du fichier
  const validateFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Extension non autorisee: .${ext}. Extensions autorisees: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Maximum: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`;
    }

    return null;
  };

  // Conversion du fichier en base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Traitement des fichiers uploades
  const handleFiles = async (files) => {
    setError(null);
    const newDocs = [];
    const errors = [];

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        const ext = file.name.split('.').pop().toLowerCase();

        newDocs.push({
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          documentType: 'autre', // Type par defaut
          customName: '',
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type || `application/${ext}`,
          fileExtension: ext,
          fileContent: base64,
          description: '',
          expiryDate: null,
          isNew: true
        });
      } catch (err) {
        errors.push(`${file.name}: Erreur lors de la lecture du fichier`);
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (newDocs.length > 0) {
      onChange([...documents, ...newDocs]);
    }
  };

  // Gestion du clic sur input file
  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    // Reset input pour permettre de re-selectionner le meme fichier
    e.target.value = '';
  };

  // Mise a jour du type de document
  const updateDocumentType = (docId, type) => {
    onChange(documents.map(doc =>
      doc.id === docId ? { ...doc, documentType: type } : doc
    ));
  };

  // Mise a jour du nom personnalise (pour type 'autre')
  const updateCustomName = (docId, name) => {
    onChange(documents.map(doc =>
      doc.id === docId ? { ...doc, customName: name } : doc
    ));
  };

  // Mise a jour de la description
  const updateDescription = (docId, description) => {
    onChange(documents.map(doc =>
      doc.id === docId ? { ...doc, description } : doc
    ));
  };

  // Suppression d'un document
  const removeDocument = (docId) => {
    onChange(documents.filter(doc => doc.id !== docId));
  };

  // Previsualisation d'un document
  const openPreview = (doc) => {
    setPreviewDoc(doc);
  };

  // Fermer la previsualisation
  const closePreview = () => {
    setPreviewDoc(null);
  };

  // Obtenir l'icone selon le type de fichier
  const getFileIcon = (doc) => {
    if (doc.mimeType?.startsWith('image/')) return FiImage;
    if (doc.mimeType === 'application/pdf') return FiFileText;
    return FiFile;
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="document-upload-container">
      {/* Zone de drop */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <FiUpload className={`mx-auto h-12 w-12 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold text-blue-600">Cliquez pour selectionner</span> ou glissez-deposez vos fichiers
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, JPG, PNG (max. {Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB par fichier)
        </p>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" />
          <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {/* Liste des documents uploades */}
      {documents.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <FiFile className="text-gray-400" />
            Documents a uploader ({documents.length})
          </h4>

          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc);
            return (
              <div
                key={doc.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Apercu miniature */}
                  <div
                    className="w-16 h-16 bg-white border rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-gray-50"
                    onClick={() => openPreview(doc)}
                  >
                    {doc.mimeType?.startsWith('image/') && doc.fileContent ? (
                      <img
                        src={doc.fileContent}
                        alt={doc.originalFilename}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <FileIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>

                  {/* Informations du document */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {doc.originalFilename}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({formatFileSize(doc.fileSize)})
                      </span>
                    </div>

                    {/* Type de document */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <select
                        value={doc.documentType}
                        onChange={(e) => updateDocumentType(doc.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={disabled}
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      {/* Nom personnalise si type "autre" */}
                      {doc.documentType === 'autre' && (
                        <input
                          type="text"
                          value={doc.customName || ''}
                          onChange={(e) => updateCustomName(doc.id, e.target.value)}
                          placeholder="Nom du document..."
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={disabled}
                        />
                      )}
                    </div>

                    {/* Description */}
                    <input
                      type="text"
                      value={doc.description || ''}
                      onChange={(e) => updateDescription(doc.id, e.target.value)}
                      placeholder="Description / commentaire (optionnel)..."
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={disabled}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => openPreview(doc)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Previsualiser"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                      disabled={disabled}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Documents existants (mode edition) */}
      {showExisting && existingDocuments.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <FiCheckCircle className="text-green-500" />
            Documents deja enregistres ({existingDocuments.length})
          </h4>

          {existingDocuments.map((doc) => {
            const docType = DOCUMENT_TYPES.find(t => t.value === doc.documentType);
            const FileIcon = docType?.icon || FiFile;

            return (
              <div
                key={doc.id}
                className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3"
              >
                <FileIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.originalFilename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {docType?.label || doc.documentType}
                    {doc.customName && ` - ${doc.customName}`}
                    {doc.isVerified && (
                      <span className="ml-2 text-green-600 font-medium">Verifie</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openPreview(doc)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded"
                    title="Voir"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de previsualisation */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-medium text-gray-900">{previewDoc.originalFilename}</h3>
                <p className="text-sm text-gray-500">
                  {DOCUMENT_TYPES.find(t => t.value === previewDoc.documentType)?.label || previewDoc.documentType}
                  {previewDoc.description && ` - ${previewDoc.description}`}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)] flex items-center justify-center bg-gray-100">
              {previewDoc.mimeType?.startsWith('image/') ? (
                <img
                  src={previewDoc.fileContent || `/api/documents/${previewDoc.id}/download`}
                  alt={previewDoc.originalFilename}
                  className="max-w-full max-h-full object-contain"
                />
              ) : previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewDoc.fileContent || `/api/documents/${previewDoc.id}/download`}
                  title={previewDoc.originalFilename}
                  className="w-full h-[70vh]"
                />
              ) : (
                <div className="text-center py-12">
                  <FiFile className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Apercu non disponible pour ce type de fichier</p>
                  <p className="text-sm text-gray-500 mt-1">{previewDoc.mimeType}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Information:</strong> Cette section est optionnelle. Vous pouvez creer l'utilisateur sans ajouter de documents.
          Les documents peuvent etre ajoutes ou modifies ulterieurement.
        </p>
      </div>
    </div>
  );
};

export default DocumentUpload;
