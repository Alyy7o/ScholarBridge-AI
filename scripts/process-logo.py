"""Derive transparent mark + sized app icons from logo-01-bridge-cap.png."""
from PIL import Image
import os

src = r"D:\me\ScholarBridge AI\public\brand\logos\logo-01-bridge-cap.png"
out_dir = r"D:\me\ScholarBridge AI\public\brand\logos"
img = Image.open(src).convert("RGBA")
w, h = img.size
print("size", w, h)

px = img.load()
out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
opx = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        # Dark rounded square bg → transparent
        if lum < 28 and max(r, g, b) < 45:
            continue
        if r < 35 and g < 40 and b < 50 and lum < 40:
            continue
        opx[x, y] = (r, g, b, a)

bbox = out.getbbox()
print("bbox", bbox)
trimmed = out.crop(bbox) if bbox else out
tw, th = trimmed.size
side = int(max(tw, th) * 1.12)
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(trimmed, ((side - tw) // 2, (side - th) // 2), trimmed)

for size, name in [
    (512, "logo-mark.png"),
    (128, "logo-mark-128.png"),
    (64, "logo-mark-64.png"),
]:
    path = os.path.join(out_dir, name)
    canvas.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)
    print("wrote", name)

app = img.copy()
for size, name in [
    (512, "logo-app.png"),
    (180, "logo-app-180.png"),
    (64, "logo-app-64.png"),
    (32, "favicon-32.png"),
]:
    path = os.path.join(out_dir, name)
    app.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)
    print("wrote", name)

# Also drop into /public and /app for Next favicon conventions
public = r"D:\me\ScholarBridge AI\public"
app_dir = r"D:\me\ScholarBridge AI\app"
ico32 = app.resize((32, 32), Image.Resampling.LANCZOS)
ico16 = app.resize((16, 16), Image.Resampling.LANCZOS)
ico32.save(
    os.path.join(public, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32)],
    append_images=[ico16],
)
ico32.save(os.path.join(public, "favicon-32.png"))
app.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(public, "apple-touch-icon.png"))
# Next.js App Router file-based metadata icons (with bg)
app.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(app_dir, "icon.png"))
app.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(app_dir, "apple-icon.png"))
print("wrote public/app favicons")
print("done")
