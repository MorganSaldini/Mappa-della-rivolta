import soundfile as sf, json, numpy as np
from kokoro_onnx import Kokoro
k=Kokoro('kokoro-v1.0.onnx','voices-v1.0.bin')
P={'1':"nel millenovetʃentokwaɾantatrˈe in iˈtalja ʃoperˈare ˌɛra reˈato.",
'2a':"torˈino tʃˈinkwe mˈartso. ˌalle djˈɛtʃi a mirafjˈori,",'2b':"ʎi opˌerˈai si fˈermano.",
'3a':"in pˈɔki dʒˈorni sˌono tʃentomˈila.",'3b':"pˈɔi si fˈerma ˌanke milˈano.",
'4a':"kjedˈevano sˈɔldi per il karovˈita.",'4b':"e li ˌanno otːenˈuti.",
'5a':"perkˈe ˈuno da sˈolo non lo askˈolta nessˈuno.",'5b':"in tʃentomˈila sˈi.",
'6':"otːantatrˈe ˈanni dˈɔpo, venerdˈi vˈenti novˈɛmbre si ʃˈɔpera di nwˈɔvo kˌontro il karovˈita.",
'7':"sˌulla mˈapːa tʃi sˌono dʒˈa tʃinkwantadˈue tʃitːˈa. tʃˈɛ la tˈua.",
'8':"kondivˈidilo kon ki vwˈɔle ʃoperˈare."}
D={}
for key,t in P.items():
  s,sr=k.create(t,voice='im_nicola',speed=1.1,lang='it',is_phonemes=True)
  a=np.abs(s);idx=np.where(a>0.01)[0];s=s[max(0,idx[0]-800):idx[-1]+2400]
  sf.write(f'w{key}.wav',s,sr);D[key]=round(len(s)/sr,2)
print(json.dumps(D))
