import numpy as np, os, soundfile as sf, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sr=44100; bpm=116; beat=60/bpm; dur=float(sys.argv[1]) if len(sys.argv)>1 else 40
rng=np.random.default_rng(7)
t=np.arange(int(sr*dur))/sr; mix=np.zeros_like(t)
def add(sig, start, amp=1.0):
    i0=int(start*sr); seg=mix[i0:i0+len(sig)]; seg+=sig[:len(seg)]*amp
def pluck(f, length=0.35, decay=9):
    tt=np.arange(int(length*sr))/sr; env=np.exp(-decay*tt)*np.minimum(1,tt*200)
    return env*(np.sin(2*np.pi*f*tt)+0.5*np.sin(2*np.pi*2*f*tt)+0.2*np.sin(2*np.pi*3*f*tt))
def pad(fs, length):
    tt=np.arange(int(length*sr))/sr; env=np.minimum(1,tt*3)*np.minimum(1,(length-tt)*3)
    return env*sum(np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*f*1.003*tt) for f in fs)/len(fs)
hz=lambda m: 440*2**((m-69)/12)
prog=[[62,66,69],[59,62,66],[55,59,62],[57,61,64]]  # D Bm G A
bass=[38,35,31,33]
bar=4*beat; s=0.0; b=0
arp=[0,1,2,1,0,2,1,2]
while s<dur:
    ch=prog[b%4]
    add(pad([hz(n) for n in ch], bar), s, 0.05)
    for k in range(8): add(pluck(hz(ch[arp[k]]+12), 0.3), s+k*beat/2, 0.055)
    for k in range(4):
        add(pluck(hz(bass[b%4]), beat*0.9, 4), s+k*beat, 0.16)
        tt=np.arange(int(0.22*sr))/sr
        add(np.sin(2*np.pi*(50+110*np.exp(-35*tt))*tt)*np.exp(-11*tt), s+k*beat, 0.42)
        n=int(0.04*sr); add(np.diff(np.r_[0,rng.standard_normal(n)])*np.exp(-np.arange(n)/sr*90), s+k*beat+beat/2, 0.05)
        if k in (1,3):
            n=int(0.12*sr); cl=rng.standard_normal(n)*np.exp(-np.arange(n)/sr*30)
            add(np.convolve(cl,[1,-0.6],'same'), s+k*beat, 0.10)
    s+=bar; b+=1
mix/=np.abs(mix).max()*1.12
mix*=np.minimum(1,(dur-t)/1.2)*np.minimum(1,t/0.05)
sf.write(os.path.join(HERE, 'music.wav'), np.c_[mix,mix], sr)
# riser (for map reveal) and tap pop
tt=np.arange(int(1.2*sr))/sr
riser=rng.standard_normal(len(tt))*np.linspace(0,1,len(tt))**2*0.25
sf.write(os.path.join(HERE, 'riser.wav'), np.convolve(riser,np.ones(30)/30,'same'), sr)
n=int(0.08*sr); tt=np.arange(n)/sr
sf.write(os.path.join(HERE, 'tap.wav'), np.sin(2*np.pi*(900-500*tt/0.08)*tt)*np.exp(-45*tt)*0.6, sr)
print('ok')
