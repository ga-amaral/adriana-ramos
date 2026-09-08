# -*- coding: utf-8 -*-
"""Checagem local de responsividade: sintaxe + simulacao da cadeia de larguras."""
import io, re, sys
from html.parser import HTMLParser

FAIL = []

def ok(label, cond, detail=""):
    print(("  OK   " if cond else "  FALHA") + "  " + label + (("  -> " + detail) if detail else ""))
    if not cond:
        FAIL.append(label)

css = io.open("css/styles.css", encoding="utf-8").read()

# ---------- 1. Sintaxe ----------
print("\n[1] SINTAXE")
ok("CSS chaves balanceadas", css.count("{") == css.count("}"),
   "%d abre / %d fecha" % (css.count("{"), css.count("}")))
ok("CSS parenteses balanceados", css.count("(") == css.count(")"),
   "%d / %d" % (css.count("("), css.count(")")))

VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param",
        "source","track","wbr","path","circle","rect","polyline","line","use","stop"}
class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.stack=[]; self.err=[]
    def handle_starttag(self, t, a):
        if t not in VOID: self.stack.append((t, self.getpos()))
    def handle_endtag(self, t):
        if t in VOID: return
        if not self.stack: self.err.append("</%s> sem abertura %s" % (t, self.getpos())); return
        top, pos = self.stack.pop()
        if top != t: self.err.append("esperado </%s> (%s), veio </%s> (%s)" % (top, pos, t, self.getpos()))

for f in ("horas-extras-cargo-confianca.html", "politica-de-privacidade.html"):
    html = io.open(f, encoding="utf-8").read()
    p = P(); p.feed(html)
    ok("%s: HTML balanceado" % f, not p.stack and not p.err,
       str([t for t,_ in p.stack] + p.err))

# ---------- 2. Simulacao da cadeia de larguras ----------
print("\n[2] LARGURA UTIL POR VIEWPORT (px de conteudo real)")

def clamp(lo, pref, hi):
    return max(lo, min(pref, hi))

WIDTHS = [320, 375, 414, 768, 1024, 1440, 1920]
CONTAINER_MAX = 1120

rows = []
for vw in WIDTHS:
    # .container padding-inline: clamp(16, 4.5vw, 24); >=768 -> 32; >=1024 -> 40
    if vw >= 1024:   cpad = 40
    elif vw >= 768:  cpad = 32
    else:            cpad = clamp(16, 0.045 * vw, 24)
    cont = min(vw, CONTAINER_MAX) - 2 * cpad
    # .cta-final padding-inline: clamp(18, 5vw, 48)
    ctapad = clamp(18, 0.05 * vw, 48)
    card = cont - 2 * ctapad - 2  # -2 = borda 1px de cada lado
    # .cta-form max-width 640
    form = min(card, 640)
    # .form-grid auto-fit minmax(min(100%,230px), 1fr), gap 14
    cols = 2 if form >= 230 * 2 + 14 else 1
    field = (form - 14) / 2 if cols == 2 else form
    inner = field - 30  # input: padding 14+14 + borda 1+1
    rows.append((vw, cpad, cont, ctapad, card, form, cols, field, inner))

print("  vw   |cpad| container |ctapad| card | form |cols| campo | texto no input")
for r in rows:
    print("  %-5d| %-3.0f| %-9.0f| %-5.0f| %-5.0f| %-5.0f| %-3d| %-6.0f| %.0f"
          % (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]))

print()
for r in rows:
    vw, card, form, cols, field, inner = r[0], r[4], r[5], r[6], r[7], r[8]
    ok("%dpx: card CTA nao estoura a viewport" % vw, card > 0 and card <= vw)
    ok("%dpx: input com area de texto usavel (>=140px)" % vw, inner >= 140, "%.0fpx" % inner)
    ok("%dpx: grid do form colapsa quando o campo ficaria < 230px" % vw,
       not (cols == 2 and field < 230), "%d col x %.0fpx" % (cols, field))

# ganho vs. valores antigos (container 24 fixo, cta-final 26/48 com salto em 768)
print("\n[3] GANHO DE LARGURA UTIL NO CARD DA SECAO 11 (antes -> depois)")
for vw in (320, 375, 414, 768):
    old_cpad = 32 if 768 <= vw < 1024 else (40 if vw >= 1024 else 24)
    old_ctapad = 48 if vw >= 768 else 26
    old_card = min(vw, CONTAINER_MAX) - 2 * old_cpad - 2 * old_ctapad - 2
    new_card = [r[4] for r in rows if r[0] == vw][0]
    print("  %-5d %.0fpx -> %.0fpx  (%+.0fpx)" % (vw, old_card, new_card, new_card - old_card))

# ---------- 3. Anti-padroes remanescentes ----------
print("\n[4] VARREDURA DE ANTI-PADROES")
ok("nenhum width fixo em px (fora de icones/marks)",
   not re.findall(r"(?<![-a-z])width:\s*\d{3,}px", css),
   str(re.findall(r"(?<![-a-z])width:\s*\d{3,}px", css)))
ok("nenhum min-width em px que force scroll",
   not re.findall(r"[;{]\s*min-width:\s*[3-9]\d\dpx", css),
   str(re.findall(r"[;{]\s*min-width:\s*[3-9]\d\dpx", css)))
ok("body tem overflow-x:clip como rede de seguranca", "overflow-x: clip" in css)
ok("body tem overflow-wrap:break-word", "overflow-wrap: break-word" in css)
ok(".cta-final sem overflow:hidden (nao corta outline de foco)",
   "overflow" not in re.search(r"^\.cta-final \{(.*?)\}", re.sub(r"/\*.*?\*/", "", css, flags=re.S), re.S | re.M).group(1))
ok(".cta-final::before com border-radius:inherit",
   "border-radius: inherit" in css)
ok("form-grid usa auto-fit (nao media query de viewport)",
   "repeat(auto-fit, minmax(min(100%, 230px), 1fr))" in css)
ok("textarea com resize:vertical (nunca both)",
   "resize: vertical" in css and "resize: both" not in css)
ok("inputs com font-size >= 16px (sem zoom no iOS)",
   re.search(r"\.form-field input, \.form-field textarea \{[^}]*font-size: 1rem", css, re.S) is not None)
ok("todo grid multi-coluna usa minmax(0/min-content) ou auto-fit",
   not re.findall(r"grid-template-columns:\s*\d+fr \d+fr(?! )", css),
   str(re.findall(r"grid-template-columns:\s*\d+fr \d+fr(?! )", css)))

for f in ("horas-extras-cargo-confianca.html", "politica-de-privacidade.html"):
    html = io.open(f, encoding="utf-8").read()
    inline = re.findall(r'style="[^"]*"', html)
    ok("%s: sem style= inline de layout" % f, not inline, str(inline))
    ok("%s: viewport meta correta" % f,
       'name="viewport" content="width=device-width, initial-scale=1' in html)

print("\n" + ("TODAS AS CHECAGENS PASSARAM" if not FAIL else "FALHAS: " + str(FAIL)))
sys.exit(1 if FAIL else 0)
