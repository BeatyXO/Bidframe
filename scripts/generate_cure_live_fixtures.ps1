$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = (git rev-parse --show-toplevel).Trim()
$target = Join-Path $repoRoot 'docs/fixtures/cure-live'
function Draw-Wall([string]$Path, [bool]$LeftCrack, [bool]$RightCrack) {
    $bitmap = [System.Drawing.Bitmap]::new(1200, 800)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::FromArgb(236, 231, 217))
    $wall = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(229, 224, 211))
    $graphics.FillRectangle($wall, 0, 0, 1200, 680)
    $light = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(238, 234, 224), 4)
    $graphics.DrawLine($light, 0, 24, 1200, 24)
    $seam = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(207, 201, 188), 3)
    $graphics.DrawLine($seam, 600, 42, 600, 660)
    $baseboard = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(151, 111, 76))
    $graphics.FillRectangle($baseboard, 0, 640, 1200, 40)
    $floor = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(174, 137, 98))
    $graphics.FillRectangle($floor, 0, 680, 1200, 120)
    $grain = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(142, 108, 78), 2)
    foreach ($y in @(710, 750, 785)) { $graphics.DrawLine($grain, 0, $y, 1200, $y) }
    foreach ($x in @(170, 420, 770, 1030)) { $graphics.DrawLine($grain, $x, 681, $x - 80, 800) }
    $switchOuter = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 247, 239))
    $switchInner = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(194, 190, 179))
    $graphics.FillRectangle($switchOuter, 78, 245, 58, 92)
    $graphics.FillRectangle($switchInner, 101, 265, 12, 52)
    $graphics.FillRectangle($switchOuter, 1060, 245, 58, 92)
    $graphics.FillRectangle($switchInner, 1083, 265, 12, 52)
    if ($LeftCrack) { Draw-Crack $graphics 380 170 }
    if ($RightCrack) { Draw-Crack $graphics 830 220 }
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose()
    $wall.Dispose(); $light.Dispose(); $seam.Dispose(); $baseboard.Dispose(); $floor.Dispose(); $grain.Dispose(); $switchOuter.Dispose(); $switchInner.Dispose()
}
function Draw-Crack($Graphics, [int]$X, [int]$Y) {
    $dark = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(55, 52, 48), 12)
    $inner = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(105, 99, 88), 4)
    $main = [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new($X, $Y), [System.Drawing.Point]::new($X - 18, $Y + 48),
        [System.Drawing.Point]::new($X + 12, $Y + 94), [System.Drawing.Point]::new($X - 8, $Y + 142),
        [System.Drawing.Point]::new($X + 19, $Y + 195), [System.Drawing.Point]::new($X - 5, $Y + 248)
    )
    $Graphics.DrawLines($dark, $main); $Graphics.DrawLines($inner, $main)
    $Graphics.DrawLines($dark, [System.Drawing.Point[]]@([System.Drawing.Point]::new($X - 5, $Y + 66), [System.Drawing.Point]::new($X - 74, $Y + 94), [System.Drawing.Point]::new($X - 102, $Y + 132)))
    $Graphics.DrawLines($dark, [System.Drawing.Point[]]@([System.Drawing.Point]::new($X + 6, $Y + 148), [System.Drawing.Point]::new($X + 70, $Y + 168), [System.Drawing.Point]::new($X + 96, $Y + 208)))
    $Graphics.DrawLines($dark, [System.Drawing.Point[]]@([System.Drawing.Point]::new($X + 12, $Y + 92), [System.Drawing.Point]::new($X + 52, $Y + 62), [System.Drawing.Point]::new($X + 86, $Y + 55)))
    $dark.Dispose(); $inner.Dispose()
}
Draw-Wall (Join-Path $target 'move-in-baseline.png') $false $false
Draw-Wall (Join-Path $target 'move-out-damaged.png') $true $true
Draw-Wall (Join-Path $target 'cure-item-a-restored.png') $false $true
Draw-Wall (Join-Path $target 'cure-item-b-not-restored.png') $true $true
