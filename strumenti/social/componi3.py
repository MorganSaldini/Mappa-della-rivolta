import json, os, math
from PIL import Image, ImageDraw
log=json.load(open('cap/log.json')); by={}
for x in log: by.setdefault(x['nome'],[]).append(x)
T={k:Image.open(f'tpl/{k}.png').convert('RGB') for k in ('intro','fine')}
O={k:Image.open(f'tpl/o-{k}.png').convert('RGBA') for k in 'abcd'}
TM={s:Image.open(f'tpl/t-{s}.png').convert('RGBA') for s in range(11)}; TM['ok']=Image.open('tpl/t-ok.png').convert('RGBA')
S2=2; CW,CH=1080*S2,1920*S2; SX,SY,SW=220,440,640; SH=int(2337*SW/1080); R=46
bg=Image.new('RGB',(CW,CH),'#f6f3ee'); d=ImageDraw.Draw(bg); d.rounded_rectangle(((SX-14)*S2,(SY-14)*S2,(SX+SW+14)*S2,(SY+SH+14)*S2),(R+14)*S2,fill='#1c1b1f')
mask=Image.new('L',(SW*S2,SH*S2),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,SW*S2-1,SH*S2-1),R*S2,fill=255)
cache={}
def scr(f):
  if f not in cache: cache[f]=Image.open(f).convert('RGB').resize((SW*S2,SH*S2),Image.LANCZOS)
  return cache[f]
P=lambda xy:(SX+xy[0]*SW/1080, SY+xy[1]*SW/1080)
F=lambda n:by[n][0]['f']; TP=lambda n:by[n][0]['tap']
campo=P(TP('tap-campo')); cerca=P(TP('tap-cerca')); mid=((campo[0]+cerca[0])/2,campo[1])
W=(540,1130,1.0)
S=[('intro',None,2.0,None,W),
 ('a',F('home'),1.2,None,W),('a',F('tap-campo'),0.9,TP('tap-campo'),(*mid,1.4))]+[('a',x['f'],0.3,None,(*mid,1.4)) for x in by['scrivi']]+[
 ('a',F('tap-cerca'),0.9,TP('tap-cerca'),(*mid,1.4)),
 ('b',F('bologna'),2.4,None,(540,1060,1.15)),('b',F('tap-marker'),1.0,TP('tap-marker'),(*P(TP('tap-marker')),1.3)),('b',F('popup'),2.4,None,(540,1100,1.15)),
 ('c',F('tap-cisaro'),1.0,TP('tap-cisaro'),(*P(TP('tap-cisaro')),1.4)),('c',F('cisaro-fatto'),2.2,None,(*P(TP('tap-cisaro')),1.4)),
 ('d',F('tap-aggiungi'),0.9,TP('tap-aggiungi'),(*P(TP('tap-aggiungi')),1.15)),('d',F('aggiungi'),2.2,None,W),
 ('fine',None,3.8,None,W)]
def base(f,tap,u,dur):
  im=bg.copy(); im.paste(scr(f),(SX*S2,SY*S2),mask)
  if tap:
    dr=ImageDraw.Draw(im,'RGBA'); x,y=P(tap); x*=S2;y*=S2; tt=u*dur; r=(34+46*min(1,tt/0.4))*S2; a=int(220*(1-min(1,max(0,tt-0.1)/0.4)))
    dr.ellipse((x-34*S2,y-34*S2,x+34*S2,y+34*S2),fill=(200,50,42,150)); dr.ellipse((x-r,y-r,x+r,y+r),outline=(200,50,42,a),width=8*S2)
  return im
def cam(im,c):
  fx,fy,z=c; w,h=1080/z,1920/z; cx=fx; cy=fy-(1150-960)/z
  cx=min(max(cx,w/2),1080-w/2); cy=min(max(cy,h/2),1920-h/2)
  box=tuple(int(v*S2) for v in (cx-w/2,cy-h/2,cx+w/2,cy+h/2)); return im.crop(box).resize((1080,1920),Image.BILINEAR if z<1.01 else Image.LANCZOS)
ez=lambda v:(lambda v: v*v*(3-2*v))(max(0,min(1,v)))
os.makedirs('fr3',exist_ok=True); [os.remove('fr3/'+x) for x in os.listdir('fr3')]
FPS=30; n=0; t0=0; tempi=[]; ta=sum(s[2] for s in S[:1]); tc=sum(s[2] for s in S if s[0] in 'abc')+ta
prevc=W; previm=None; prevf=None
for i,(t,f,dur,tap,c) in enumerate(S):
  if i==0 or S[i-1][0]!=t: tempi.append(t0)
  k=int(round(dur*FPS)); startc=prevc
  for j in range(k):
    tt=t0+j/FPS
    if f is None: out=T[t].copy()
    else:
      e=ez(j/FPS/0.75); cc=tuple(startc[q]+(c[q]-startc[q])*e for q in range(3))
      bi=base(f,tap,j/k,dur)
      if prevf and prevf!=f and j<6: bi=Image.blend(base(prevf,None,1,1),bi,(j+1)/7)
      out=cam(bi,cc).convert('RGBA'); ov=O[t]
      if i>0 and S[i-1][0]!=t and S[i-1][1] and j<8: ov=Image.blend(O[S[i-1][0]],O[t],(j+1)/9)
      out.alpha_composite(ov)
      out=out.convert('RGB')
    if previm is not None and (f is None or S[i-1][1] is None) and j<8: out=Image.blend(previm,out,(j+1)/9)
    out.save(f'fr3/f{n:04d}.jpg',quality=92); n+=1
    if j==k-1: previm=out
  prevc=c; t0+=dur; prevf=f
json.dump({'tot':t0,'tempi':tempi},open('fr3/info.json','w')); print(n,round(t0,2),[round(x,2) for x in tempi], round(tc-ta,2))
