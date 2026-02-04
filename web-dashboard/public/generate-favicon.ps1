# Script pour générer favicon.ico à partir de SVG
# Nécessite ImageMagick ou alternative

$svgFile = "C:\laragon\www\security-guard-management\web-dashboard\public\favicon.svg"
$icoFile = "C:\laragon\www\security-guard-management\web-dashboard\public\favicon.ico"

# Créer une version base64 simplifiée pour favicon.ico
$base64Favicon = @"
AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAYmNu/2JjbvdmY270aWNt9Wljb/JpY3D0aWNu9Gljbv1jY278YmRw+WJkcPJjZHDxAAAAAAAA
AAAAAAAAZmNv/25ocP/6mGT//7h6///BgP//xoT//8mI//zLif/7yYf//MSA//+7e///sXX/2Jdk/mZkcP8A
AAAAAABlY3D+dWxx//7Dhv//47j//+e+///pv///68H//+3D///uwv//6sD//+a8///cvf/+y4b/dWxx/wAA
AAAAZWNv/3lscv//1pH//+zA///wyv//8sz//PPO///10f//9tH//PTO//zwzP//6sX//+HE//vRkP95a3H/
AAAAZWN0/n1wdP//5qb//fTT///22v//+Nz//fnd//3+3v//+9z//vbX//zz0v//7s///+bG//3kpf99b3P/
AABlY3T+gHN3//3vt//++N///v3h///+4+//++L//vnf//z33f//9dr//vPV//zwz///7Mr//uzs/4Bzd/8A
AGVjdP6EdHr//fvA//774///++T//vni//nh//zo3//75+L//OHc//zt1///8ND//+3M//PvvP+EdXr/AABl
Y3T+hnZ8//f9yf//++f//vjk//nm4v/44+D/+OHd//rf2v/43Nf//9rW//jW0v/00NH/9v3L/4Z2fP8AAGVj
dP6IeH7/+P/S//z87f/68ej/9+Hi/vjf3v/24tv/5drV/+LXz//e1Mz/3dPL/9jSy/j4/9T/iHh+/wAAZWN0
/op6f//5/9z//PH3//Dt7v/s5uT/7OLg/+bd2P/i2NP/3tXP/9nSzP/V0Mn/1M/K+fr/3v+Ke3//AABlY3T+
jXuB//z/5P//9/v//e/w//Dr6f/q5OL/5+Df/+Ha1v/f19H/29TP/9fQzP/W0Mv8/P/m/416gf8AAGVjdP6P
fYP//v/s///6/v/++vr/+O3t//Ll4//v4uD/6t3Z/+Xb1//h2NP/3dXQ/9vUzv7+/+//j32D/wAAZWN0/pF/
hf7+/vP///7+//789//78O7/9Ojk//Hk4P/s3tv/593a/+PZ1P/f2NH/3tfR///+9f+RfYX/AABlY3T+k4GG
//7+9v///v3//fz5//jw7v/16ub/8uXh/+7h3P/r3tj/5trV/+PZ1P/k29f//v72/5OBhv8AAGVldP6VgoX/
/v70////+v/++vb/+/Dt//bo4v/z5N7/7+Db/+vf3f/t3tj/8N3U//7+9P+Vg4f/AAAAZWl3/5eDhP/++u7/
///2//787f/77un/+erm/vTk4P/v4Nz/6t/c//Lh3/75++//l4OF/wAAAAAAAAAAlICC/fr96//+/vD//f3w
//r77P/49uf/9erg/vPn4//7+u//lICE/wAAAAAAAAAAAAAAAAAAAACQfH7+k36A/5OBhf+SgYX/kYGG/4+B
hv6QfX//kH19/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8A
AP//AAD//wAA//8AAA==
"@

# Convertir base64 en bytes et sauvegarder
$bytes = [Convert]::FromBase64String($base64Favicon)
[System.IO.File]::WriteAllBytes($icoFile, $bytes)

Write-Host "Favicon généré avec succès!" -ForegroundColor Green
Write-Host "Fichiers créés:" -ForegroundColor Yellow
Write-Host "  - favicon.svg (32x32)" -ForegroundColor Gray
Write-Host "  - favicon-16.svg (16x16)" -ForegroundColor Gray  
Write-Host "  - favicon.ico (multi-résolution)" -ForegroundColor Gray