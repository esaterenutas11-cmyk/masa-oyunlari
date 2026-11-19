import pathlib, re, json, html
ROOT=pathlib.Path(__file__).parent; S=ROOT/'src'
def inline(t):
    t=html.escape(t,quote=False)
    t=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',t)
    return t
def md2html(md):
    out=[]; lines=md.strip('\n').split('\n'); i=0; inlist=False
    while i<len(lines):
        l=lines[i]
        if l.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                if not re.match(r'^\|[-| ]+\|$',lines[i]): rows.append([c.strip() for c in lines[i].strip('|').split('|')])
                i+=1
            h='<table class="rtbl">'+''.join('<tr>'+''.join(('<th>' if k==0 else '<td>')+inline(c)+('</th>' if k==0 else '</td>') for c in r)+'</tr>' for k,r in enumerate(rows))+'</table>'
            out.append(h); continue
        m=re.match(r'^(\s*)(- |\d+\. )(.*)',l)
        if m:
            if not inlist: out.append('<ul>'); inlist=True
            out.append('<li>'+inline(m.group(3))+'</li>'); i+=1; continue
        if inlist: out.append('</ul>'); inlist=False
        if l.startswith('### '): out.append('<h4>'+inline(l[4:])+'</h4>')
        elif l.startswith('## '): out.append('<h3>'+inline(l[3:])+'</h3>')
        elif l.startswith('# ') or l.startswith('<!--') or not l.strip(): pass
        else: out.append('<p>'+inline(l)+'</p>')
        i+=1
    if inlist: out.append('</ul>')
    return '\n'.join(out)
md=(ROOT/'KURALLAR.md').read_text()
rules={}
for g in ['okey101','okey','batak','pisti']:
    a=md.index(f'<!-- game:{g} -->'); b=md.index('<!--',a+5)
    rules[g]=md2html(md[a:b])
end=md.index('<!-- end -->'); rules['_common']=md2html(md[end:])
css=(S/'style.css').read_text(); body=(S/'body.html').read_text()
js='const RULES_HTML='+json.dumps(rules,ensure_ascii=False)+';\n'+'\n'.join((S/f).read_text() for f in ['engine-common.js','game-cards.js','game-okey.js','net.js','app.js','render.js'])
page=f'''<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>KIRAATHANE · 3D Online Masa Oyunları</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🃏</text></svg>">
<style>{css}</style></head><body>
{body}
<script>
"use strict";
{js}
</script></body></html>'''
(ROOT/'index.html').write_text(page); print('ok',len(page))
