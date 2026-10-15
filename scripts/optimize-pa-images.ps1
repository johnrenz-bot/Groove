<#
  Downscales the fetched reference images to a web-appropriate size.

  The CCP archives serve 4097px originals (~1 MB each). The cards render at
  roughly 400-700 CSS pixels wide, so shipping the original is wasted bytes for
  every visitor. Images are re-encoded as progressive JPEG at the width the
  largest card needs (1600px), which still looks sharp on a 2x display.

  Run: pwsh -File scripts/optimize-pa-images.ps1
#>
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot '..\public\image\pa'
$MAX_W = 1600
$QUALITY = 82

# ROFG's favicon is a generic house glyph, not a depiction of the company, so it
# is excluded from the published set rather than shipped as a misleading card.
$EXCLUDE = @('rofg-mark.png')

$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
       Where-Object { $_.MimeType -eq 'image/jpeg' }

Get-ChildItem $dir -File | Where-Object {
  $_.Extension -match '\.(jpg|jpeg|png)$' -and $EXCLUDE -notcontains $_.Name
} | ForEach-Object {
  $file = $_
  $img = [System.Drawing.Image]::FromFile($file.FullName)

  # Fully release the source handle before writing anything derived from it.
  $w = $img.Width; $h = $img.Height
  $img.Dispose()

  if ($w -le $MAX_W) {
    Write-Output ("  keep   {0,-40} {1}x{2}" -f $file.Name, $w, $h)
    return
  }

  $src = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $nh = [int][Math]::Round($h * $MAX_W / $w)
    # -ArgumentList is required: passing the dimensions positionally binds them
    # as an array and GDI+ then fails on Save with a generic error.
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList $MAX_W, $nh
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $MAX_W, $nh)
    $g.Dispose()

    # The quality must be typed [long]; an untyped int makes EncoderParameter
    # construction throw on Windows PowerShell 5.1.
    $params = New-Object System.Drawing.Imaging.EncoderParameters 1
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)

    # GDI+ cannot save into a file that is still open as an image source, and
    # for most of these the destination IS the source path. Write to a temp file
    # first, then swap it in.
    $dest = Join-Path $dir ([System.IO.Path]::GetFileNameWithoutExtension($file.Name) + '.jpg')
    $tmp = Join-Path $dir ('.tmp-' + [System.IO.Path]::GetFileName($dest))
    $bmp.Save($tmp, $enc, $params)
    $bmp.Dispose()
    Move-Item $tmp $dest -Force

    Write-Output ("  resize {0,-40} {1}x{2} -> {3}x{4}  {5:N0}B -> {6:N0}B" -f `
      $file.Name, $w, $h, $MAX_W, $nh, $file.Length, (Get-Item $dest).Length)
  }
  finally {
    $src.Dispose()
  }

  # Drop the original PNG now that a JPEG of the same image exists.
  if ($file.Extension -eq '.png') { Remove-Item $file.FullName -Force }
}