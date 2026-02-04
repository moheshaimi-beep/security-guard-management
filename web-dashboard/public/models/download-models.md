# Modèles Face-API.js

## Téléchargement des modèles

Les modèles de reconnaissance faciale doivent être téléchargés et placés dans ce dossier.

### Option 1: Téléchargement manuel

Téléchargez les fichiers depuis:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Fichiers requis:
- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1
- face_landmark_68_model-weights_manifest.json
- face_landmark_68_model-shard1
- face_recognition_model-weights_manifest.json
- face_recognition_model-shard1
- face_recognition_model-shard2
- face_expression_model-weights_manifest.json
- face_expression_model-shard1
- ssd_mobilenetv1_model-weights_manifest.json
- ssd_mobilenetv1_model-shard1
- ssd_mobilenetv1_model-shard2

### Option 2: Script automatique

Exécutez dans PowerShell:

```powershell
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$models = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2",
    "face_expression_model-weights_manifest.json",
    "face_expression_model-shard1",
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2"
)

foreach ($model in $models) {
    Write-Host "Téléchargement de $model..."
    Invoke-WebRequest -Uri "$baseUrl/$model" -OutFile $model
}
```

### Option 3: CDN (Alternative)

Modifiez le fichier `src/services/faceRecognition.js`:

```javascript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
```
