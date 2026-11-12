import soundfile as sf, json, numpy as np, sys
from kokoro_onnx import Kokoro
k=Kokoro('kokoro-v1.0.onnx','voices-v1.0.bin')
exec(open('gen2.py').read().split("D={}")[0].split("k=Kokoro")[1].split("\n",1)[1])
V={'A':k.get_voice_style('im_nicola'),'B':0.75*k.get_voice_style('im_nicola')+0.25*k.get_voice_style('em_alex')}
for tag,v in V.items():
  D={}
  for key,t in P.items():
    s,sr=k.create(t,voice=v,speed=1.2,lang='it',is_phonemes=True)
    a=np.abs(s);idx=np.where(a>0.01)[0];s=s[max(0,idx[0]-800):idx[-1]+2400]
    sf.write(f'{tag}{key}.wav',s,sr);D[key]=round(len(s)/sr,2)
  print(tag,json.dumps(D))
