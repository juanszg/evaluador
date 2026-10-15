from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A3
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit
from pathlib import Path

OUT = Path('output/pdf/diagrama-flujo-evalpro.pdf')
OUT.parent.mkdir(parents=True, exist_ok=True)
W, H = landscape(A3)

pdfmetrics.registerFont(TTFont('Segoe', r'C:\Windows\Fonts\segoeui.ttf'))
pdfmetrics.registerFont(TTFont('Segoe-Bold', r'C:\Windows\Fonts\segoeuib.ttf'))

NAVY = HexColor('#173B52')
INK = HexColor('#294A5D')
MUTED = HexColor('#607D8B')
BLUE = HexColor('#3787AC')
TEAL = HexColor('#2D9A8F')
GREEN = HexColor('#318B68')
ORANGE = HexColor('#C97D36')
PURPLE = HexColor('#7662A5')
LINE = HexColor('#AFC8D4')
GRID = HexColor('#E7F0F4')
WHITE = HexColor('#FFFFFF')

c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
c.setTitle('Diagrama de flujo del funcionamiento de EvalPro')
c.setAuthor('EvalPro')
c.setSubject('Flujo de configuración, evaluación, calificación, expedientes y respaldos')

# Fondo suave con retícula tipo blueprint.
c.setFillColor(HexColor('#F5FAFC'))
c.rect(0, 0, W, H, stroke=0, fill=1)
c.setStrokeColor(GRID)
c.setLineWidth(.35)
for x in range(20, int(W), 24):
    c.line(x, 0, x, H)
for y in range(18, int(H), 24):
    c.line(0, y, W, y)

# Encabezado
c.setFillColor(NAVY)
c.setFont('Segoe-Bold', 25)
c.drawString(40, H-47, 'EvalPro | Diagrama de flujo')
c.setFillColor(MUTED)
c.setFont('Segoe', 11)
c.drawString(42, H-67, 'Del alta del alumno al cálculo del parcial, consulta del expediente y respaldo de datos')
c.setFillColor(BLUE)
c.roundRect(W-220, H-59, 180, 28, 8, stroke=0, fill=1)
c.setFillColor(WHITE)
c.setFont('Segoe-Bold', 9)
c.drawCentredString(W-130, H-49, 'MAPA OPERATIVO')


def card(x, y, w, h, title, lines, accent=BLUE, number=None, fill=WHITE, title_size=12, body_size=9.1):
    c.setFillColor(fill)
    c.setStrokeColor(accent)
    c.setLineWidth(1.6)
    c.roundRect(x, y, w, h, 9, stroke=1, fill=1)
    c.setFillColor(accent)
    c.roundRect(x, y+h-7, w, 7, 3, stroke=0, fill=1)
    tx = x+15
    if number is not None:
        c.setFillColor(accent)
        c.circle(x+22, y+h-25, 11, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont('Segoe-Bold', 9)
        c.drawCentredString(x+22, y+h-28, str(number))
        tx = x+42
    c.setFillColor(NAVY)
    c.setFont('Segoe-Bold', title_size)
    c.drawString(tx, y+h-29, title)
    usable = w-30
    body_font = 'Segoe'
    yy = y+h-49
    leading = body_size+3.4
    max_lines = int((h-56)/leading)
    for raw in lines:
        wrapped = simpleSplit(raw, body_font, body_size, usable)
        for part in wrapped:
            if max_lines <= 0:
                break
            c.setFillColor(INK)
            c.setFont(body_font, body_size)
            c.drawString(x+15, yy, part)
            yy -= leading
            max_lines -= 1
        if max_lines <= 0:
            break


def arrow(x1, y1, x2, y2, color=BLUE, width=1.7, head=6):
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)
    import math
    angle = math.atan2(y2-y1, x2-x1)
    left = (x2-head*math.cos(angle-0.48), y2-head*math.sin(angle-0.48))
    right = (x2-head*math.cos(angle+0.48), y2-head*math.sin(angle+0.48))
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(*left)
    p.lineTo(*right)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def route(points, color=BLUE, end_arrow=True, width=1.5):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    p = c.beginPath()
    p.moveTo(points[0][0], points[0][1])
    for px, py in points[1:]:
        p.lineTo(px, py)
    c.drawPath(p, stroke=1, fill=0)
    if end_arrow:
        arrow(*points[-2], *points[-1], color=color, width=width, head=6)

# Flujo inicial: preparación y matrícula.
row_y, row_h, row_w = 650, 100, 252
xs = [40, 326, 612, 898]
card(xs[0], row_y, row_w, row_h, 'Mi perfil', [
    'Consulta estadísticas del semestre:',
    'materias, alumnos, aprobados, tareas',
    'y avance por parcial.'
], accent=PURPLE, number='1', fill=HexColor('#F7F4FC'))
card(xs[1], row_y, row_w, row_h, 'Materias y parciales', [
    'Crea materias y organiza alumnos.',
    'Selecciona el parcial que vas a',
    'configurar o revisar.'
], accent=BLUE, number='2', fill=HexColor('#EFF7FB'))
card(xs[2], row_y, row_w, row_h, 'Configurar evaluación', [
    'Define examen y parámetros de actividad.',
    'El examen se divide en componentes que',
    'suman 100%; los pesos del parcial también.'
], accent=ORANGE, number='3', fill=HexColor('#FFF6EC'), body_size=8.7)
card(xs[3], row_y, row_w, row_h, 'Registrar alumnos', [
    'Crea un alumno o localiza uno existente.',
    'Asígnalo a una o varias materias para',
    'abrir su expediente semestral.'
], accent=GREEN, number='4', fill=HexColor('#EFF9F3'))
for i in range(3):
    arrow(xs[i]+row_w+4, row_y+row_h/2, xs[i+1]-7, row_y+row_h/2, color=BLUE)

# Registro de calificaciones: una sola materia/cohorte puede usar cualquiera de las tres vías.
card(40, 430, 330, 130, 'Examen', [
    'Captura aciertos o puntajes por componente.',
    'EvalPro calcula la nota del examen de 0 a 10',
    'y su aporte según el peso definido.'
], accent=ORANGE, number='5', fill=HexColor('#FFF6EC'))
card(430, 430, 330, 130, 'Registro grupal', [
    'Elige materia, parcial y parámetro de tareas,',
    'cuaderno o trabajos. Marca quién entregó y',
    'agrega observaciones; cada actividad cuenta.'
], accent=TEAL, number='6', fill=HexColor('#EEF9F8'), body_size=8.8)
card(820, 430, 330, 130, 'Registro individual', [
    'Selecciona alumno, materia, parcial y parámetro.',
    'Registra una calificación o tareas entregadas',
    'sobre el total; puedes editar el registro.'
], accent=BLUE, number='7', fill=HexColor('#EFF7FB'), body_size=8.8)

# Derivación desde el alta a las tres rutas de evaluación.
centers = [205, 595, 985]
route([(1024, row_y), (1024, 612), (205, 612), (205, 565)], color=GREEN)
for cx in centers[1:]:
    arrow(cx, 612, cx, 565, color=GREEN, width=1.5)
c.setFillColor(MUTED)
c.setFont('Segoe-Bold', 8.5)
c.drawCentredString(595, 589, 'Una vez inscrito, el alumno puede recibir registros por cualquiera de estas vías')

# Unión de resultados al expediente del estudiante.
route([(205, 430), (205, 397), (595, 397), (595, 375)], color=BLUE)
route([(595, 430), (595, 375)], color=TEAL)
route([(985, 430), (985, 397), (595, 397), (595, 375)], color=BLUE)
card(375, 290, 440, 82, 'Expediente del alumno', [
    'Cada nota queda asociada a alumno + materia + parcial + parámetro.',
    'El historial y la pestaña de calificaciones muestran los registros y pendientes S/R.'
], accent=PURPLE, fill=HexColor('#F7F4FC'), title_size=13, body_size=8.8)

# Salidas principales: cálculo, tabla y consulta por expediente.
route([(595, 290), (595, 260), (205, 260), (205, 240)], color=PURPLE)
for cx in [595, 985]:
    arrow(cx, 260, cx, 240, color=PURPLE, width=1.5)
card(45, 135, 320, 100, 'Calificación del parcial', [
    'Promedio ponderado de los parámetros',
    'registrados. El sistema escala los aportes',
    'a una nota final de 0 a 10.'
], accent=GREEN, number='8', fill=HexColor('#EFF9F3'), body_size=8.7)
card(435, 135, 320, 100, 'Alumnos registrados', [
    'Consulta columnas por parcial y parámetro,',
    'S/R cuando falta un registro, orden por',
    'nombre, género o promedio.'
], accent=BLUE, fill=HexColor('#EFF7FB'), body_size=8.7)
card(825, 135, 320, 100, 'Expedientes', [
    'Revisa el resumen y el historial. En',
    'Calificaciones puedes agregar o editar',
    'valores de cada materia y parcial.'
], accent=PURPLE, fill=HexColor('#F7F4FC'), body_size=8.7)

# Nota de cálculo y persistencia.
c.setFillColor(HexColor('#EAF3F7'))
c.setStrokeColor(LINE)
c.setLineWidth(1.2)
c.roundRect(45, 38, 1100, 66, 8, stroke=1, fill=1)
c.setFillColor(NAVY)
c.setFont('Segoe-Bold', 10)
c.drawString(60, 83, 'Cálculo y datos')
c.setFillColor(INK)
c.setFont('Segoe', 8.5)
c.drawString(60, 65, 'Parcial: suma(nota del parámetro x peso) / suma de los pesos con registro. Los parámetros sin captura se muestran como S/R.')
c.drawString(60, 51, 'Los datos se guardan en el navegador. “Guardar datos” descarga un JSON y conserva hasta 8 copias locales; puedes exportar, cargar o restaurar.')

# Conectar salidas a respaldo local.
route([(205, 135), (205, 116), (595, 116), (595, 105)], color=LINE, width=1.1)
route([(595, 135), (595, 105)], color=LINE, width=1.1)
route([(985, 135), (985, 116), (595, 116), (595, 105)], color=LINE, width=1.1)

# Pie
c.setFillColor(MUTED)
c.setFont('Segoe', 7.3)
c.drawRightString(W-42, 19, 'EvalPro | Mapa de funcionamiento')
c.showPage()
c.save()
print(OUT.resolve())
