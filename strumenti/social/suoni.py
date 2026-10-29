# "Bling" tipo notifica: due note brevi e cristalline (campanella), volume da sottofondo.
import sys, wave, numpy as np
SR = 44100
def nota(f, dur=0.35):
    t = np.arange(int(SR*dur))/SR
    env = (1-np.exp(-t*2500))*np.exp(-t*11)
    # timbro di campanella: fondamentale + armoniche non intere
    return env*(np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*20) + 0.15*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*35))
def bling(f1, f2):
    a, b = nota(f1, 0.25), nota(f2, 0.45)
    out = np.zeros(int(SR*0.55)); out[:len(a)] += 0.8*a; o = int(SR*0.075); out[o:o+len(b)] += b
    return out
def accordo(dur=1.6):
    t = np.arange(int(SR*dur))/SR; env=(1-np.exp(-t*80))*np.exp(-t*2.2)
    return env*sum(np.sin(2*np.pi*f*t)*w for f,w in ((1046.5,1),(1318.5,.7),(1568,.5)))
out, durata, tempi = sys.argv[1], float(sys.argv[2]), [float(x) for x in sys.argv[3].split(',') if x]
fin = float(sys.argv[4]) if len(sys.argv) > 4 else None
a = np.zeros(int(SR*(durata+2)))
coppie = [(1318.5,1975.5),(1396.9,2093.0),(1568.0,2349.3),(1318.5,1760.0)]
for i, t0 in enumerate(tempi):
    s = bling(*coppie[i % len(coppie)]); i0 = int(t0*SR); a[i0:i0+len(s)] += s
if fin is not None:
    s = accordo(); i0 = int(fin*SR); a[i0:i0+len(s)] += 0.6*s
a = a[:int(SR*durata)]
a = a/max(1e-9, np.abs(a).max())*0.09          # circa -21 dB: bling molto di sottofondo (richiesta utente 29/10)
d = (np.stack([a, a], 1)*32767).astype(np.int16)
with wave.open(out, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())
