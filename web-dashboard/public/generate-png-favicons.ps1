# Script pour créer des versions PNG des favicons
# Utilise la conversion base64 pour créer différentes tailles

# Favicon 32x32 PNG (base64)
$favicon32Base64 = @"
iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVFiFrZc7aBRBFIafzWGMhYWFhY2NjYWNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2N/wMzs7uzs5mdmZ1dFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXF5f/Af8BM7M7uzs5mdmZ1d
"@

# Créer favicon-32.png
$bytes32 = [Convert]::FromBase64String($favicon32Base64)
[System.IO.File]::WriteAllBytes("favicon-32.png", $bytes32)

# Favicon 16x16 PNG (base64)
$favicon16Base64 = @"
iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAHCSURBVDiNpZM7SwNBEIafJBYWFhYWNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2Nv4BM7M7uzs5mdmZ1d
"@

$bytes16 = [Convert]::FromBase64String($favicon16Base64)
[System.IO.File]::WriteAllBytes("favicon-16.png", $bytes16)

# Favicon 180x180 PNG pour Apple Touch Icon (base64)
$favicon180Base64 = @"
iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAYAAAA9zQYyAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAoCSURBVHic7Z27bhNBFIafJBYWFhYWNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2Nv4BM7M7uzs5mdmZ1d
"@

$bytes180 = [Convert]::FromBase64String($favicon180Base64)
[System.IO.File]::WriteAllBytes("favicon-180.png", $bytes180)

Write-Host "Favicons PNG générés avec succès!" -ForegroundColor Green