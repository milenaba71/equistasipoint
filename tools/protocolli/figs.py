from PIL import Image, ImageDraw, ImageFont
k=4.3; sc=2
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',52)
def plate(view, box, marks):
  im=Image.open('/home/user/equistasipoint/img/anatomy/base-%s.webp'%view).convert('RGBA')
  x0,y0,x1,y1=box
  c=im.crop((int(x0*k),int(y0*k),int(x1*k),int(y1*k))); c=c.resize((c.size[0]*sc,c.size[1]*sc),Image.LANCZOS)
  bg=Image.new('RGBA',c.size,(30,26,70,255)); bg.alpha_composite(c); d=ImageDraw.Draw(bg)
  for lab,(x,y),side in marks:
    cx,cy=(x-x0)*k*sc,(y-y0)*k*sc; s=44
    for w,col in ((30,(255,255,255,255)),(15,(20,20,30,255))):
      d.line([cx-s,cy-s,cx+s,cy+s],fill=col,width=w); d.line([cx-s,cy+s,cx+s,cy-s],fill=col,width=w)
    bx=cx+side*95; by=cy; r=40
    d.ellipse([bx-r-5,by-r-5,bx+r+5,by+r+5],fill=(41,35,92,255)); d.ellipse([bx-r,by-r,bx+r,by+r],fill=(250,220,0,255))
    d.text((bx,by),lab,font=F,fill=(41,35,92,255),anchor='mm')
  return bg.convert('RGB')
B=(40,40,160,400)
plate('back',B,[('1',(100,73.6),1),('3',(83,364),-1),('2',(117,364),1)]).save('fig_c7_soleo.jpg',quality=90)
plate('back',B,[('1',(100,73.6),1),('2',(100,180.8),1),('3',(83,364),-1),('3',(117,364),1)]).save('fig_sm_eq.jpg',quality=90)
plate('back',B,[('1',(100,178),1),('2',(76,335),-1),('3',(124,335),1)]).save('fig_derm.jpg',quality=90)
a=plate('back',(50,40,150,400),[('1',(100,73.6),1),('2',(127,186),1),('4',(123,335),1)])
b=plate('front',(50,40,150,400),[('3',(80,286),-1),('4',(76,360),-1)])
s=Image.new('RGB',(a.width+b.width+24,a.height),(30,26,70)); s.paste(a,(0,0)); s.paste(b,(a.width+24,0)); s.save('fig_sm_sp.jpg',quality=90)
# ginocchio del dolore cronico: X e numeri più grandi
im=Image.open('/home/user/equistasipoint/img/anatomy/base-front.webp').convert('RGBA')
x0,y0,x1,y1=52,228,112,330
c=im.crop((int(x0*k),int(y0*k),int(x1*k),int(y1*k))); c=c.resize((c.size[0]*2,c.size[1]*2),Image.LANCZOS)
bg=Image.new('RGBA',c.size,(30,26,70,255)); bg.alpha_composite(c); d=ImageDraw.Draw(bg)
F2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',34)
for lab,(x,y),side in [('1',(82,314),-1),('2',(90.5,283),1),('3',(80,260),-1)]:
  cx,cy=(x-x0)*k*2,(y-y0)*k*2; s=22
  for w,col in ((16,(255,255,255,255)),(8,(20,20,30,255))):
    d.line([cx-s,cy-s,cx+s,cy+s],fill=col,width=w); d.line([cx-s,cy+s,cx+s,cy-s],fill=col,width=w)
  bx=cx+side*52; r=24
  d.ellipse([bx-r-4,cy-r-4,bx+r+4,cy+r+4],fill=(41,35,92,255)); d.ellipse([bx-r,cy-r,bx+r,cy+r],fill=(250,220,0,255))
  d.text((bx,cy),lab,font=F2,fill=(41,35,92,255),anchor='mm')
bg.convert('RGB').save('fig_knee.jpg',quality=90)
print('ok')
# dolore cronico: ginocchio (davanti) + vertebra del metamero L3-L4 (dietro)
knee = Image.open('fig_knee.jpg')
im = Image.open('/home/user/equistasipoint/img/anatomy/base-back.webp').convert('RGBA')
x0, y0, x1, y1 = 60, 120, 140, 256
c = im.crop((int(x0*k), int(y0*k), int(x1*k), int(y1*k))); c = c.resize(knee.size, Image.LANCZOS)
sx = knee.width / ((x1-x0)*k); sy = knee.height / ((y1-y0)*k)
bg = Image.new('RGBA', c.size, (30, 26, 70, 255)); bg.alpha_composite(c); d = ImageDraw.Draw(bg)
F2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
cx, cy = (100-x0)*k*sx, (172.8-y0)*k*sy; s = 22
for w, col in ((16, (255,255,255,255)), (8, (20,20,30,255))):
  d.line([cx-s,cy-s,cx+s,cy+s], fill=col, width=w); d.line([cx-s,cy+s,cx+s,cy-s], fill=col, width=w)
bx = cx+52; r = 24
d.ellipse([bx-r-4,cy-r-4,bx+r+4,cy+r+4], fill=(41,35,92,255)); d.ellipse([bx-r,cy-r,bx+r,cy+r], fill=(250,220,0,255))
d.text((bx,cy), '4', font=F2, fill=(41,35,92,255), anchor='mm')
gap = 16
out = Image.new('RGB', (knee.width*2+gap, knee.height), (255,255,255)); out.paste(knee, (0,0)); out.paste(bg.convert('RGB'), (knee.width+gap, 0))
out.save('fig_knee_meta.jpg', quality=90)
print('knee_meta', out.size)
