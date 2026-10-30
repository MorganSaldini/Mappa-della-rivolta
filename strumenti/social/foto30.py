import cv2, numpy as np, sys
A='/mnt/user-data/attachments/52969c55-587b-5e5e-b125-f96f62bd19e4/'
S=1.2
# nome, file, (x,y,w,h) in coordinate 900x2000, zone da sfocare (x,y,w,h) nelle stesse coordinate
F=[('milano','b7339572-image.jpg',(90,590,720,900),[]),
   ('milano2','ad2a27fd-image.jpg',(0,520,900,420),[(0,520,900,140)]),
   ('brescia','8fd07827-image.jpg',(90,505,720,900),[]),
   ('bologna','e601750b-image.jpg',(130,615,640,800),[]),
   ('pescara','30b13db1-image.jpg',(90,640,720,900),[]),
   ('catania','1a289acc-image.jpg',(90,420,720,900),[])]

def blur(img,x,y,w,h,k=0):
    x,y=max(0,int(x)),max(0,int(y)); w,h=int(w),int(h); r=img[y:y+h,x:x+w]
    if r.size==0: return
    k=k or (max(w,h)//2)|1; img[y:y+h,x:x+w]=cv2.GaussianBlur(r,(k,k),0)
for n,f,(x,y,w,h),zz in F:
    im=cv2.imread(A+f)
    for (a,b,c,d) in zz: blur(im,a*S,b*S,c*S,d*S,61)
    X,Y,Wd,Ht=[int(v*S) for v in (x,y,w,h)]
    c=im[Y:Y+Ht,X:X+Wd].copy(); n_=0
    for sc in (1,2):
        big=cv2.resize(c,None,fx=sc,fy=sc)
        d=cv2.FaceDetectorYN.create('yunet.onnx','',(big.shape[1],big.shape[0]),0.5,0.3,5000)
        _,fa=d.detect(big)
        if fa is None: continue
        for r in fa:
            a,b,ww,hh=[v/sc for v in r[:4]]; p=ww*.35
            if ww>c.shape[1]*.2: continue
            blur(c,a-p,b-p,ww+2*p,hh+2*p); n_+=1
    cv2.imwrite(f'foto30/{n}.jpg',c,[cv2.IMWRITE_JPEG_QUALITY,93]); print(n,c.shape,'volti sfocati',n_)
