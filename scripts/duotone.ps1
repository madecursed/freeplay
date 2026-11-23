# Фиолетовый дуотон в стиле Nocturne: тени → #07050c, середина → #5b21b6, свет → #f3e8ff,
# + контраст, виньетка, зерно. Использование:
#   powershell -File scripts/duotone.ps1 -In src.jpg -Out out.jpg [-Width 900] [-Height 0]
param([string]$In, [string]$Out, [int]$Width = 900, [int]$Height = 0, [int]$Quality = 80)
Add-Type -AssemblyName System.Drawing
if (-not ('Duo' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Duo {
  static double S(double t){ return t*t*(3-2*t); }
  public static void Apply(Bitmap b, int seed){
    var r = new Rectangle(0,0,b.Width,b.Height);
    var d = b.LockBits(r, ImageLockMode.ReadWrite, PixelFormat.Format24bppRgb);
    int n = d.Stride*b.Height; var px = new byte[n]; Marshal.Copy(d.Scan0, px, 0, n);
    var rnd = new Random(seed);
    double[] c0 = {8,5,13}, c1 = {98,42,138}, c2 = {244,226,255};
    double cx = b.Width/2.0, cy = b.Height/2.0, maxd = Math.Sqrt(cx*cx+cy*cy);
    for (int y=0;y<b.Height;y++) for (int x=0;x<b.Width;x++){
      int i = y*d.Stride + x*3;
      double l = (0.114*px[i] + 0.587*px[i+1] + 0.299*px[i+2]) / 255.0;
      l = S(Math.Min(1, Math.Max(0, (l-0.06)*1.18)));            // контраст
      double dist = Math.Sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy))/maxd;
      l *= 1 - 0.55*Math.Pow(dist, 2.2);                           // виньетка
      double[] a, z; double t;
      if (l < 0.5) { a=c0; z=c1; t=l/0.5; } else { a=c1; z=c2; t=(l-0.5)/0.5; t = t*t; }
      double g = (rnd.NextDouble()-0.5)*16;                        // зерно
      for (int k=0;k<3;k++){ int ch = 2-k; double v = a[ch]+(z[ch]-a[ch])*t+g; px[i+k] = (byte)Math.Max(0,Math.Min(255,v)); }
    }
    Marshal.Copy(px, 0, d.Scan0, n); b.UnlockBits(d);
  }
}
"@
}
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
if ($Height -le 0) { $Height = [int]($src.Height * $Width / $src.Width) }
# заполнение с обрезкой по центру
$scale = [math]::Max($Width / $src.Width, $Height / $src.Height)
$sw = [int]($Width / $scale); $sh = [int]($Height / $scale)
$sx = [int](($src.Width - $sw) / 2); $sy = [int](($src.Height - $sh) / 2)
$bmp = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $Width, $Height), (New-Object System.Drawing.Rectangle $sx, $sy, $sw, $sh), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $src.Dispose()
[Duo]::Apply($bmp, $Width * 7 + $Height)
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
$bmp.Save($Out, $enc, $ep); $bmp.Dispose()
