import json, os, math, subprocess
from PIL import Image, ImageDraw
L={x['nome']+('' if x['nome']!='scrivi' else str(i)):x for i,x in enumerate(json.load(open('cap/log.json')))}
logl=json.load(open('cap/log.json')); by={}
for x in logl: by.setdefault(x['nome'],[]).append(x)
T={k:Image.open(f'tpl/{k}.png').convert('RGB') for k in ('a','b','c','d','intro','fine')}
SX,SY,SW=220,440,640; SH=int(2337*SW/1080); R=46
mask=Image.new('L',(SW,SH),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,SW-1,SH-1),R,fill=255)
cache={}
def scr(f):
  if f not in cache: cache[f]=Image.open(f).convert('RGB').resize((SW,SH),Image.LANCZOS)
  return cache[f]
tc=by['tap-cisaro'][0]['tap']
# (template, file, durata, tap)
S=[('intro',None,1.8,None),
 ('a',by['home'][0]['f'],0.6,None),('a',by['tap-campo'][0]['f'],0.55,by['tap-campo'][0]['tap']),
 ('a',by['scrivi'][0]['f'],0.35,None),('a',by['scrivi'][1]['f'],0.35,None),('a',by['scrivi'][2]['f'],0.45,None),('a',by['tap-cerca'][0]['f'],0.55,by['tap-cerca'][0]['tap']),
 ('b',by['bologna'][0]['f'],0.7,None),('b',by['tap-marker'][0]['f'],0.55,by['tap-marker'][0]['tap']),('b',by['popup'][0]['f'],1.6,None),
 ('c',by['tap-cisaro'][0]['f'],0.5,tc),('c',by['cisaro-fatto'][0]['f'],1.6,None),
 ('d',by['tap-aggiungi'][0]['f'],0.55,by['tap-aggiungi'][0]['tap']),('d',by['aggiungi'][0]['f'],1.7,None),
 ('fine',None,3.3,None)]
def frame(i,u):
  t,f,d,tap=S[i]; im=T[t].copy()
  if f:
    im.paste(scr(f),(SX,SY),mask)
    if tap:
      dr=ImageDraw.Draw(im,'RGBA'); x=SX+tap[0]*SW/1080; y=SY+tap[1]*SW/1080; r=30+40*min(1,u*d/0.4)
      a=int(200*(1-min(1,u*d/0.5))) if u*d>0.15 else 200
      dr.ellipse((x-34,y-34,x+34,y+34),fill=(200,50,42,150)); dr.ellipse((x-r,y-r,x+r,y+r),outline=(200,50,42,a),width=8)
  return im
os.makedirs('fr',exist_ok=True); [os.remove('fr/'+x) for x in os.listdir('fr')]
FPS=30; n=0; tempi=[]; t0=0
for i,(t,f,d,tap) in enumerate(S):
  if i==0 or S[i-1][0]!=t: tempi.append(t0)
  k=int(round(d*FPS)); prev=frame(i-1,1.0) if i>0 else None
  for j in range(k):
    im=frame(i,j/k)
    if prev is not None and S[i-1][0]!=t and j<5: im=Image.blend(prev,im,(j+1)/6)
    im.save(f'fr/f{n:04d}.jpg',quality=92); n+=1
  t0+=d
json.dump({'tot':t0,'tempi':tempi},open('fr/info.json','w')); print(n,t0,tempi)
