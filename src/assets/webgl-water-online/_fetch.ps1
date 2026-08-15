$d = 'c:\DEV\react3js\game-money\src\assets\webgl-water-online'
New-Item -ItemType Directory -Force -Path $d | Out-Null

$urls = @{
  'water.js'    = 'https://raw.githubusercontent.com/evanw/webgl-water/master/water.js'
  'main.js'     = 'https://raw.githubusercontent.com/evanw/webgl-water/master/main.js'
  'renderer.js' = 'https://raw.githubusercontent.com/evanw/webgl-water/master/renderer.js'
}

foreach ($name in $urls.Keys) {
  $out = Join-Path $d $name
  Invoke-WebRequest -Uri $urls[$name] -OutFile $out
  Write-Output ("OK: " + $name + " (" + (Get-Item $out).Length + " bytes)")
}

Get-ChildItem $d | Format-Table Name, Length
