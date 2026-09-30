from pathlib import Path
import pymupdf as pdf

source=Path('/mnt/c/Users/saidovkhs/Downloads/Telegram Desktop/ББ Зирва (2).pdf')
doc=pdf.open(source)

page = doc[30]
for rect in page.search_for('31'):
 if rect.y0 > 500:
  page.add_redact_annot(rect, fill=False)
page.apply_redactions(images=0, graphics=0, text=0)
page.get_pixmap(matrix=pdf.Matrix(2,2),clip=pdf.Rect(0,72,841,595)).save('public/assets/cranes.jpg')

for name,box in [('logo',pdf.Rect(327,178,482,312)),('wordmark',pdf.Rect(580,291,754,326))]:
 out=pdf.open();p=out.new_page(width=box.width,height=box.height);p.show_pdf_page(p.rect,doc,6,clip=box)
 Path(f'public/assets/{name}.svg').write_text(p.get_svg_image())
