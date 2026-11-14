# Prepara foto e video della community per il reel: taglio verticale 1080x1920 e volti sfocati.
import os; os.environ.setdefault("OPENCV_LOG_LEVEL", "ERROR")
# Uso: python3 prepara-community.py cartella   (legge cartella/manifest.json, scrive cartella/pronti/)
import json, subprocess, sys, shutil
import cv2
D = sys.argv[1]; M = json.load(open(f'{D}/manifest.json')); OUT = f'{D}/pronti'; os.makedirs(OUT, exist_ok=True)
YU = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'yunet.onnx'); DUR = float(M.get('durata_clip', 2.6)); FPS = 30
def taglia(im, fx=0.5, fy=0.4):
    h, w = im.shape[:2]; s = max(1080 / w, 1920 / h); im = cv2.resize(im, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
    h, w = im.shape[:2]; x = int(min(max(w * fx - 540, 0), w - 1080)); y = int(min(max(h * fy - 960, 0), h - 1920)); return im[y:y + 1920, x:x + 1080].copy()
def sfoca(im):
    n = 0
    for sc in (1, 2):
        big = cv2.resize(im, None, fx=sc, fy=sc) if sc > 1 else im
        d = cv2.FaceDetectorYN.create(YU, '', (big.shape[1], big.shape[0]), 0.5, 0.3, 5000); _, fa = d.detect(big)
        for r in (fa if fa is not None else []):
            a, b, w, h = [v / sc for v in r[:4]]; p = w * .4
            if w > 1080 * .2: continue  # troppo grande: falso volto (facciate, cartelli)
            x0, y0, x1, y1 = int(max(0, a - p)), int(max(0, b - p)), int(min(1080, a + w + p)), int(min(1920, b + h + p))
            if x1 - x0 < 4 or y1 - y0 < 4: continue
            k = (max(x1 - x0, y1 - y0) // 2) | 1; im[y0:y1, x0:x1] = cv2.GaussianBlur(im[y0:y1, x0:x1], (k, k), 0); n += 1
    return n
for i, c in enumerate(M['contenuti']):
    f = f"{D}/{c['file']}"; fx, fy = c.get('centro', [0.5, 0.4])
    if f.lower().endswith(('.mp4', '.mov', '.m4v', '.webm')):
        dst = f'{OUT}/{i}'; shutil.rmtree(dst, ignore_errors=True); os.makedirs(dst)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(c.get('da', 0)), '-t', str(DUR), '-i', f, '-vf', f'fps={FPS}', '-q:v', '2', f'{dst}/r%04d.jpg'], check=True)
        tot = 0; fr = sorted(os.listdir(dst))
        for j, n in enumerate(fr):
            im = taglia(cv2.imread(f'{dst}/{n}'), fx, fy)
            for (a, b, w, h) in c.get('sfoca', []): im[b:b + h, a:a + w] = cv2.GaussianBlur(im[b:b + h, a:a + w], (61, 61), 0)
            tot += sfoca(im); cv2.imwrite(f'{dst}/f{j:04d}.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 90]); os.remove(f'{dst}/{n}')
        c['tipo'] = 'video'; c['frames'] = len(fr); print(i, c['file'], 'video', len(fr), 'fotogrammi, volti sfocati', tot)
    else:
        im = cv2.imread(f); im = taglia(im, fx, fy)
        for (a, b, w, h) in c.get('sfoca', []): im[b:b + h, a:a + w] = cv2.GaussianBlur(im[b:b + h, a:a + w], (61, 61), 0)
        n = sfoca(im); cv2.imwrite(f'{OUT}/{i}.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 92]); c['tipo'] = 'foto'; print(i, c['file'], 'foto, volti sfocati', n)
json.dump(M, open(f'{OUT}/manifest.json', 'w'), ensure_ascii=False, indent=1)
