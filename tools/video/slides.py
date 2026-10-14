import sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
U='/root/.claude/uploads/f2f60c89-5ac7-5a44-8cf0-0388e8396d74/'; A='/home/user/equistasipoint/img/'
OUT=sys.argv[1]; W,H=1080,1920
NAVY=(35,38,111); BLUE=(47,123,255); BG=(244,246,252)
F='/usr/share/fonts/opentype/inter/Inter-%s.otf'
def font(w,s): return ImageFont.truetype(F%w,s)
logo=Image.open(A+'logo.png').convert('RGBA')
def wrap(d,t,f,maxw):
    out=[]
    for para in t.split('\n'):
        line=''
        for w in para.split():
            tt=(line+' '+w).strip()
            if d.textlength(tt,font=f)<=maxw: line=tt
            else: out.append(line); line=w
        out.append(line)
    return out
def text(d,y,t,f,fill,maxw=920,gap=1.25,center=True):
    for l in wrap(d,t,f,maxw):
        x=(W-d.textlength(l,font=f))/2 if center else 80
        d.text((x,y),l,font=f,fill=fill); y+=int(f.size*gap)
    return y
def cover(im,w,h):
    r=max(w/im.width,h/im.height); im=im.resize((int(im.width*r)+1,int(im.height*r)+1),Image.LANCZOS)
    x=(im.width-w)//2; y=(im.height-h)//2; return im.crop((x,y,x+w,y+h))
def rounded(im,rad=48):
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).rounded_rectangle([0,0,im.width-1,im.height-1],rad,fill=255)
    o=im.convert('RGBA'); o.putalpha(m); return o
def base():
    c=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(c)
    l=logo.copy(); l.thumbnail((360,90)); c.paste(l,((W-l.width)//2,90),l)
    return c,d
def step_slide(n,title,body,photo,name):
    c,d=base()
    p=rounded(cover(photo,920,980)); c.paste(p,(80,250),p)
    y=1290
    if n:
        d.ellipse([80,y,180,y+100],fill=NAVY); f=font('Bold',60)
        d.text((130-d.textlength(str(n),font=f)/2,y+12),str(n),font=f,fill='white')
        text(d,y+8,title,font('Bold',58),NAVY,maxw=780,center=False) if False else None
        yy=y
        for l in wrap(d,title,font('Bold',56),780): d.text((210,yy+14),l,font=font('Bold',56),fill=NAVY); yy+=70
        y=max(yy,y+100)+30
    else:
        y=text(d,y,title,font('Bold',62),NAVY)+20
    text(d,y,body,font('Medium',44),(60,64,90),maxw=920,gap=1.3,center=not n) if n==0 else [d.text((80,yy2),l,font=font('Medium',44),fill=(60,64,90)) for yy2,l in zip(range(y,2000,58),wrap(d,body,font('Medium',44),920))]
    c.save(f'{OUT}/{name}.png')
dev=Image.open(U+'f7f8178d-image.jpg').convert('RGB')
shot=Image.open(U+'bfa5c4c7-image.jpg').convert('RGB')
kit=shot.crop((0,0,535,930)); app_=Image.open(A+'applicazione.jpg').convert('RGB')
cust=Image.open(U+'17f2a5f7-image.jpg').convert('RGB'); busta=Image.open(U+'ad30ce66-image.jpg').convert('RGB')
# 1 titolo
c,d=base(); p=rounded(cover(dev,820,820),410); c.paste(p,(130,330),p)
y=text(d,1260,'Come applicare\nEquistasi gel',font('Bold',96),NAVY,gap=1.15)
text(d,y+40,'Guida passo passo in 1 minuto',font('Medium',48),BLUE); c.save(f'{OUT}/01.png')
# 2 cosa serve
c,d=base(); a=rounded(cover(kit,440,700)); b=rounded(cover(busta,440,700)); c.paste(a,(80,260),a); c.paste(b,(560,260),b)
d.text((80,985),'Dispositivo',font=font('SemiBold',38),fill=(60,64,90)); d.text((560,985),'Custodie usa e getta',font=font('SemiBold',38),fill=(60,64,90))
y=text(d,1120,'Cosa ti serve',font('Bold',72),NAVY)+30
for t in ['• Il dispositivo Equistasi gel','• Una custodia usa e getta (nuova ogni volta)','• Il cerotto applicatore adesivo, in omaggio nella confezione']:
    for l in wrap(d,t,font('Medium',46),900): d.text((90,y),l,font=font('Medium',46),fill=(60,64,90)); y+=60
    y+=14
c.save(f'{OUT}/02.png')
# 3 punto
plate=Image.open(A+'anatomy/trapezio_sup-back.webp').convert('RGBA'); bgp=Image.new('RGB',plate.size,(28,31,48)); bgp.paste(plate,(0,0),plate)
ov=Image.new('RGBA',bgp.size,(0,0,0,0)); od=ImageDraw.Draw(ov)
for cx,cy,rx,ry in ((396,269,16,52),(380,190,18,26)): od.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=(47,123,255,190))
ov=ov.filter(ImageFilter.GaussianBlur(5)); bgp=Image.alpha_composite(bgp.convert('RGBA'),ov).convert('RGB')
pc=bgp.crop((60,40,760,760)); dd=ImageDraw.Draw(pc); X,Y=376-60,282-40
for col,w in (('white',22),((20,20,30),10)): dd.line([X-30,Y-30,X+30,Y+30],fill=col,width=w); dd.line([X+30,Y-30,X-30,Y+30],fill=col,width=w)
step_slide(1,'Trova il punto nell’app','Scegli dove senti dolore: la X indica dove mettere il dispositivo, il blu è dove si irradia il dolore. Pulisci e asciuga bene la pelle (niente creme o oli).',pc,'03')
step_slide(2,'Inserisci il dispositivo nella custodia','Usa una custodia nuova a ogni applicazione.',cust,'04')
step_slide(3,'Fissalo sul cerotto e applicalo sulla pelle','Appoggia la custodia al centro della parte adesiva, poi applica il cerotto con il dispositivo a contatto con la pelle, centrato sulla X.',app_,'05')
# 6 tempi
c,d=base(); y=text(d,260,'Quanto tenerlo',font('Bold',80),NAVY)+50
for i,(t,s) in enumerate([('Mattina','2 ore'),('Pomeriggio','2 ore')]):
    x=80+i*480; d.rounded_rectangle([x,y,x+440,y+300],40,fill='white')
    d.text((x+220-d.textlength(s,font=font('Bold',90))/2,y+50),s,font=font('Bold',90),fill=BLUE)
    d.text((x+220-d.textlength(t,font=font('Medium',46))/2,y+190),t,font=font('Medium',46),fill=(60,64,90))
y+=380; days='LMMGVSD'
for i,ch in enumerate(days):
    x=80+i*134; on=i<5; d.rounded_rectangle([x,y,x+118,y+150],28,fill=NAVY if on else (220,224,236))
    f=font('Bold',56); d.text((x+59-d.textlength(ch,font=f)/2,y+40),ch,font=f,fill='white' if on else (120,124,150))
y=text(d,y+200,'5 giorni di utilizzo,\n2 giorni di riposo',font('SemiBold',54),NAVY)
c.save(f'{OUT}/06.png')
# 7 fastidio
c,d=base(); d.rounded_rectangle([80,300,1000,1350],48,fill='white')
d.ellipse([440,370,640,570],fill=(255,236,200)); f=font('Bold',140); d.text((540-d.textlength('!',font=f)/2,385),'!',font=f,fill=(200,120,0))
y=text(d,630,'Senti un fastidio?',font('Bold',70),NAVY,maxw=820)+30
y=text(d,y,'Più dolore, nausea o un leggero mal di testa: togli il dispositivo anche prima delle 2 ore.',font('Medium',46),(60,64,90),maxw=820,gap=1.3)+30
text(d,y,'Non è preoccupante: passa in pochi minuti.',font('SemiBold',46),BLUE,maxw=820)
text(d,1480,'Se il dolore è forte o persiste, rivolgiti al medico.',font('Medium',40),(110,114,140),maxw=900)
c.save(f'{OUT}/07.png')
# 8 fine
c,d=base(); l=logo.copy(); l.thumbnail((760,200)); c.paste(l,((W-l.width)//2,620),l)
y=text(d,900,'Trovi tutti i punti di applicazione nell’app',font('SemiBold',56),NAVY,maxw=860)+40
text(d,y,'Equistasi Point',font('Bold',80),BLUE); text(d,1500,'milenaba71.github.io/equistasipoint',font('Medium',40),(110,114,140))
c.save(f'{OUT}/08.png')
