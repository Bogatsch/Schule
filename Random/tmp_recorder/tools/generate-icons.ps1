param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\icons')
)

Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

function New-RoundedRectanglePath {
  param(
    [System.Drawing.RectangleF]$Rectangle,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rectangle.X, $Rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-SportkameraIcon {
  param(
    [int]$Size,
    [string]$FileName,
    [bool]$Maskable = $false
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#073b4c'))

  $scale = if ($Maskable) { 0.68 } else { 0.78 }
  $markSize = [float]($Size * $scale)
  $offset = [float](($Size - $markSize) / 2)

  $coralBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e5573f'))
  $paperBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#fffdf8'))
  $tealBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#073b4c'))
  $yellowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f5c451'))

  $graphics.FillEllipse($coralBrush, $offset, $offset, $markSize, $markSize)

  $body = [System.Drawing.RectangleF]::new(
    [float]($Size * 0.25),
    [float]($Size * 0.335),
    [float]($Size * 0.50),
    [float]($Size * 0.34)
  )
  $bodyPath = New-RoundedRectanglePath -Rectangle $body -Radius ([float]($Size * 0.065))
  $graphics.FillPath($paperBrush, $bodyPath)

  $top = [System.Drawing.RectangleF]::new(
    [float]($Size * 0.33),
    [float]($Size * 0.275),
    [float]($Size * 0.18),
    [float]($Size * 0.10)
  )
  $topPath = New-RoundedRectanglePath -Rectangle $top -Radius ([float]($Size * 0.025))
  $graphics.FillPath($paperBrush, $topPath)

  $lensOuter = [float]($Size * 0.235)
  $lensOffset = [float](($Size - $lensOuter) / 2)
  $graphics.FillEllipse($yellowBrush, $lensOffset, [float]($Size * 0.385), $lensOuter, $lensOuter)

  $lensInner = [float]($Size * 0.125)
  $lensInnerOffset = [float](($Size - $lensInner) / 2)
  $graphics.FillEllipse($tealBrush, $lensInnerOffset, [float]($Size * 0.44), $lensInner, $lensInner)

  $indicatorSize = [float]($Size * 0.035)
  $graphics.FillEllipse($coralBrush, [float]($Size * 0.65), [float]($Size * 0.38), $indicatorSize, $indicatorSize)

  $path = Join-Path $resolvedOutput $FileName
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $bodyPath.Dispose()
  $topPath.Dispose()
  $coralBrush.Dispose()
  $paperBrush.Dispose()
  $tealBrush.Dispose()
  $yellowBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-SportkameraIcon -Size 64 -FileName 'favicon-64.png'
New-SportkameraIcon -Size 180 -FileName 'apple-touch-icon.png'
New-SportkameraIcon -Size 192 -FileName 'icon-192.png'
New-SportkameraIcon -Size 512 -FileName 'icon-512.png'
New-SportkameraIcon -Size 512 -FileName 'icon-maskable-512.png' -Maskable $true

Write-Output "App-Symbole wurden in $resolvedOutput erzeugt."
