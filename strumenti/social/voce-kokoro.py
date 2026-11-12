import soundfile as sf, json
from kokoro_onnx import Kokoro
k=Kokoro('kokoro-v1.0.onnx','voices-v1.0.bin')
P={'1':"Nel millenovecentoquarantatré, in Italia, scioperare era reato.",
'2a':"Torino, cinque marzo. Alle dieci, a Mirafiori,",'2b':"gli operai si fermano.",
'3a':"In pochi giorni sono centomila.",'3b':"Poi si ferma anche Milano.",
'4a':"Chiedevano soldi per il carovita.",'4b':"E li hanno ottenuti.",
'5a':"Perché uno da solo, non lo ascolta nessuno.",'5b':"In centomila, sì.",
'6':"Ottantatré anni dopo, venerdì venti novembre, si sciopera di nuovo contro il carovita.",
'7':"Sulla mappa ci sono già cinquantadue città. C'è la tua?",
'8':"Condividilo con chi vuole scioperare."}
D={}
for key,t in P.items():
  s,sr=k.create(t,voice='im_nicola',speed=0.92,lang='it')
  # trim silence
  import numpy as np
  a=np.abs(s);idx=np.where(a>0.01)[0];s=s[max(0,idx[0]-800):idx[-1]+2400]
  sf.write(f'v{key}.wav',s,sr);D[key]=round(len(s)/sr,2)
print(json.dumps(D));json.dump(D,open('dur.json','w'))
