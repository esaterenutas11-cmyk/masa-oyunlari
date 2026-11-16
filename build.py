import pathlib
S=pathlib.Path(__file__).parent/'src'
css=(S/'style.css').read_text(); body=(S/'body.html').read_text()
js='\n'.join((S/f).read_text() for f in ['engine-common.js','game-cards.js','game-okey.js','net.js','app.js','render.js'])
html=f'''<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>KIRAATHANE · 3D Online Masa Oyunları</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🃏</text></svg>">
<style>{css}</style></head><body>
{body}
<script>
"use strict";
{js}
</script></body></html>'''
out=pathlib.Path(__file__).parent/'index.html'; out.write_text(html); print(out, len(html))
