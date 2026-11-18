from pathlib import Path

ROOT = Path(r"C:\Users\JuanA\OneDrive\Escritorio\EVAL-PRO\evaluador")
CAPTURE_DIR = ROOT / "tmp" / "pdfs" / "evalpro_album"
OUTPUT = ROOT / "output" / "pdf" / "EvalPro_album_ilustrativo.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

PAGES = [
    ("Mi perfil", "Resumen del semestre, indicadores del grupo y acceso al respaldo de datos.", "01-perfil.jpg"),
    ("Examen", "Configura la ponderación del examen y sus parámetros por materia y parcial.", "02-examen.jpg"),
    ("Cuaderno y seguimiento", "Organiza materias y grupos; da seguimiento a tareas, cuaderno y trabajos.", "03-cuaderno.jpg"),
    ("Registro de actividad", "Captura y actualiza calificaciones individuales con los parámetros del parcial.", "04-registro-actividad.jpg"),
    ("Registrar alumnos", "Crea expedientes y asigna estudiantes a sus materias.", "05-registrar-alumnos.jpg"),
    ("Expedientes", "Busca alumnos y accede a su historial académico.", "06-expedientes.jpg"),
]

PAGE_W, PAGE_H = 1190, 842


def jpeg_size(data):
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        while i < len(data) and data[i] == 0xFF:
            i += 1
        marker = data[i]
        i += 1
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            continue
        length = int.from_bytes(data[i:i + 2], "big")
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h = int.from_bytes(data[i + 3:i + 5], "big")
            w = int.from_bytes(data[i + 5:i + 7], "big")
            return w, h
        i += length
    raise ValueError("No se encontró el tamaño JPEG")


def txt(value):
    return "<" + value.encode("cp1252", errors="replace").hex().upper() + ">"


def rect(x, y, w, h, color):
    return f"{color} rg {x} {y} {w} {h} re f\n"


def text(x, y, size, font, color, value):
    return f"BT /{font} {size} Tf {color} rg {x} {y} Td {txt(value)} Tj ET\n"


objects = [None, b"<< /Type /Catalog /Pages 2 0 R >>", None,
           b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
           b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"]
page_refs = []

for idx, (title, subtitle, filename) in enumerate(PAGES, 1):
    image_data = (CAPTURE_DIR / filename).read_bytes()
    img_w, img_h = jpeg_size(image_data)
    max_w, max_h = 1106, 656
    scale = min(max_w / img_w, max_h / img_h)
    draw_w, draw_h = img_w * scale, img_h * scale
    draw_x, draw_y = (PAGE_W - draw_w) / 2, 70 + (656 - draw_h) / 2

    stream = ""
    stream += rect(0, 0, PAGE_W, PAGE_H, "0.953 0.976 0.988")
    stream += rect(0, 805, PAGE_W, 37, "0.055 0.302 0.431")
    stream += text(42, 817, 12, "F2", "1 1 1", "EVALPRO  /  ÁLBUM DE RECORRIDO")
    stream += text(1065, 817, 10, "F1", "0.82 0.93 0.98", f"{idx:02d} / {len(PAGES):02d}")
    stream += text(42, 772, 25, "F2", "0.055 0.302 0.431", title)
    stream += text(42, 747, 11, "F1", "0.24 0.39 0.48", subtitle)
    stream += rect(draw_x - 2, draw_y - 2, draw_w + 4, draw_h + 4, "0.77 0.87 0.92")
    stream += f"q {draw_w:.3f} 0 0 {draw_h:.3f} {draw_x:.3f} {draw_y:.3f} cm /Im0 Do Q\n"
    stream += text(42, 31, 9, "F1", "0.31 0.46 0.54", "EvalPro · Evaluador académico")
    stream += text(1088, 31, 9, "F1", "0.31 0.46 0.54", str(idx))
    stream_bytes = stream.encode("ascii")

    img_obj = len(objects)
    objects.append((f"<< /Type /XObject /Subtype /Image /Width {img_w} /Height {img_h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(image_data)} >>\nstream\n".encode("ascii") + image_data + b"\nendstream"))
    content_obj = len(objects)
    objects.append(f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii") + stream_bytes + b"endstream")
    page_obj = len(objects)
    resources = f"<< /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im0 {img_obj} 0 R >> >>"
    objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] /Resources {resources} /Contents {content_obj} 0 R >>".encode("ascii"))
    page_refs.append(page_obj)

kids = " ".join(f"{ref} 0 R" for ref in page_refs)
objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_refs)} >>".encode("ascii")

pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
offsets = [0]
for number, obj in enumerate(objects[1:], 1):
    offsets.append(len(pdf))
    pdf.extend(f"{number} 0 obj\n".encode("ascii"))
    pdf.extend(obj)
    pdf.extend(b"\nendobj\n")
xref = len(pdf)
pdf.extend(f"xref\n0 {len(objects)}\n".encode("ascii"))
pdf.extend(b"0000000000 65535 f \n")
for offset in offsets[1:]:
    pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
pdf.extend(f"trailer\n<< /Size {len(objects)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii"))
OUTPUT.write_bytes(pdf)
print(f"Created {OUTPUT} ({len(PAGES)} pages, {len(pdf)} bytes)")
