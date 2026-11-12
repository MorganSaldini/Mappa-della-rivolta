import soundfile as sf, json, numpy as np
from kokoro_onnx import Kokoro
k=Kokoro('kokoro-v1.0.onnx','voices-v1.0.bin')
exec(open('gen2.py').read().split("D={}")[0].split("k=Kokoro")[1].split("\n",1)[1])
v=k.get_voice_style('im_nicola'); print(v.shape)
n1=len(k.tokenizer.tokenize(P['1'])); print('token riga 1',n1)
fixed=np.repeat(v[n1:n1+1],v.shape[0],axis=0)
D={}
for key,t in P.items():
  s,sr=k.create(t,voice=fixed,speed=1.2,lang='it',is_phonemes=True)
  a=np.abs(s);idx=np.where(a>0.01)[0];s=s[max(0,idx[0]-800):idx[-1]+2400]
  sf.write(f'F{key}.wav',s,sr);D[key]=round(len(s)/sr,2)
print(json.dumps(D))
