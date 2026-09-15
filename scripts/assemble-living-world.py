"""Finish the captured runtime shots with titles, grade, score and sound design."""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/cinematic/living-world'
PLAN=json.loads((ROOT/'docs/cinematic/living-world-shots.json').read_text())
FPS=PLAN['fps']
DURATION=sum(s['duration'] for s in PLAN['shots'])+4
OUT.mkdir(parents=True,exist_ok=True)
FONT='/System/Library/Fonts/Supplemental/Didot.ttc'
SANS='/System/Library/Fonts/Supplemental/Arial.ttf'
def run(args):
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True)
def tracked(draw,text,y,size,spacing,color,font=FONT,x=None):
 f=ImageFont.truetype(font,size)
 width=sum(draw.textlength(c,font=f) for c in text)+spacing*(len(text)-1)
 xx=(1920-width)/2 if x is None else x
 for c in text:
  draw.text((xx,y),c,font=f,fill=color,stroke_width=0)
  xx+=draw.textlength(c,font=f)+spacing

def graphic(name,lines,rule=False):
 im=Image.new('RGBA',(1920,1080));d=ImageDraw.Draw(im)
 for text,y,size,spacing,color,font in lines:tracked(d,text,y,size,spacing,color,font)
 if rule:d.line((860,608,1060,608),fill=(200,174,121,200),width=2)
 path=OUT/(name+'.png');im.save(path);return path
ivory=(237,233,222,255);gold=(193,166,116,255)
end=graphic('end-title',[
 ('S T O R M F A T H E R',418,83,3,ivory,FONT),
 ('A  W O R L D  T H A T  L I V E S',550,24,5,gold,SANS),
 ('CAPTURED IN THE LIVING ATLAS',664,19,5,ivory,SANS),
 ('SEPTEMBER 2026',701,15,4,gold,SANS)],True)
# Lower-bar captions leave the actual world unobscured.
labels={
'01-kholinar':('KHOLINAR','THE WIND-BLADED CAPITAL'),
'02-kharbranth':('KHARBRANTH','CITY OF BELLS'),
'03-thaylen':('THAYLEN CITY','AT THE EDGE OF THE SEA'),
'04-market':('THE MARKET','A THOUSAND ORDINARY LIVES'),
'05-lanterns':('YEDDAW','BENEATH THE SURFACE'),
'06-purelake':('THE PURELAKE','STILL WATER. LIVING WORLD.'),
'07-chull':('NATIVE LIFE','THE CHULL CARAVANS'),
'08-shinovar':('SHINOVAR','BEYOND THE MOUNTAINS'),
'09-listeners':('THE LISTENERS','EVERY LIFE HAS A RHYTHM'),
'10-bridge':('THE SHATTERED PLAINS','FORTY RUNNERS. ONE CROSSING.'),
'12-greatshell':('THE GREATSHELL HUNT','COURAGE IN THE SHADOW OF GIANTS'),
'12b-storm':('THE HIGHSTORM','THE WORLD HOLDS ITS BREATH'),
'13-radiant':('THE RADIANT ARTS','LIGHT BECOMES POSSIBILITY'),
'14-flight':('WINDRUNNERS','THE SKY IS AN OPEN ROAD'),
'15-urithiru':('URITHIRU','ABOVE IT ALL')}
finished=[]
for i,s in enumerate(PLAN['shots']):
 src=OUT/'shots'/(s['id']+'.mp4');target=OUT/'shots'/(s['id']+'-finished.mp4')
 if not src.exists():raise SystemExit('Missing shot: '+str(src))
 dur=s['duration'];filters=['eq=contrast=1.055:brightness=0.006:saturation=0.92:gamma=1.035','vignette=PI/7','pad=1920:1080:0:138:black','setsar=1']
 if i==0:filters+=['fade=t=in:st=0:d=1.3']
 if s['id'] in ['09-listeners','12b-storm']:filters+=['fade=t=in:st=0:d=0.22']
 if s['id']=='15-urithiru':filters+=['fade=t=out:st=6.8:d=2.2']
 inputs=['-i',str(src)];graph='[0:v]'+','.join(filters)+'[base]'
 if s['id'] in labels:
  title,sub=labels[s['id']]
  lines=[(title,969,26,7,ivory,FONT),(sub,1016,13,4,gold,SANS)]
  if i==0:lines.append(('A WORLD THAT LIVES',54,24,9,gold,SANS))
  card=graphic(s['id']+'-caption',lines)
  inputs+=['-loop','1','-i',str(card)]
  graph+=f';[1:v]format=rgba,fade=t=in:st=0.4:d=0.7:alpha=1,fade=t=out:st={dur-1.0}:d=0.7:alpha=1[caption];[base][caption]overlay=shortest=1[v]'
 else:graph+=';[base]null[v]'
 print('FINISH',s['id'],flush=True)
 run([*inputs,'-filter_complex',graph,'-map','[v]','-t',str(dur),'-r',str(FPS),'-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p',str(target)])
 finished.append(target)
# Closing title, with enough hold time to read it.
closing=OUT/'shots'/'closing.mp4'
run(['-loop','1','-i',str(end),'-f','lavfi','-i','color=c=0x05090d:s=1920x1080:r=24:d=4','-filter_complex','[1:v][0:v]overlay=shortest=1,fade=t=in:st=0:d=0.7,fade=t=out:st=3.3:d=0.7[v]','-map','[v]','-t','4','-r','24','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(closing)])
finished.append(closing)
listing=OUT/'concat.txt';listing.write_text(''.join("file '"+str(p)+"'\n" for p in finished))
# Retain the ending of the score supplied for the original cinematic.
source=ROOT/'artifacts/cinematic/roshar-map-cinematic-v3.mp4'
score=OUT/'score.wav'
run(['-sseof','-'+str(DURATION),'-i',str(source),'-vn','-t',str(DURATION),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(score)])
# Original, synthesized ambience and restrained trailer impacts. No fetched media.
sr=48000;n=int(DURATION*sr);rng=np.random.default_rng(7613)
noise=rng.normal(0,1,n).astype(np.float32)
wind=np.convolve(noise,np.ones(128,dtype=np.float32)/128,mode='same')
t=np.arange(n,dtype=np.float32)/sr
sound=wind*.075*(.5+.5*np.sin(t*.19)**2)
for when in [0,45,61,68,72,83,92]:
 k=int(when*sr);length=min(int(2.5*sr),n-k);tt=np.arange(length)/sr
 impact=(np.sin(2*np.pi*(48*tt-5*tt*tt))*np.exp(-tt*3.5)*.14+wind[k:k+length]*np.exp(-tt*2)*.7)
 sound[k:k+length]+=impact
# A moving wind swell under the stormwall, kept well beneath the music.
sound+=wind*.8*np.exp(-((t-70)/2.3)**2)
env=np.minimum(1,t/2)*np.minimum(1,(DURATION-t)/2)
stereo=np.stack([sound*env,np.roll(sound,480)*env],axis=1)
with wave.open(str(OUT/'sound-design.wav'),'wb') as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(stereo,-1,1)*32767).astype('<i2').tobytes())
final=OUT/'stormfather-a-world-that-lives.mp4'
run(['-f','concat','-safe','0','-i',str(listing),'-i',str(score),'-i',str(OUT/'sound-design.wav'),
 '-filter_complex',f'[1:a]afade=t=in:st=0:d=3,afade=t=out:st={DURATION-2}:d=2,volume=0.9[music];[music][2:a]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]',
 '-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-t',str(DURATION),'-movflags','+faststart',
 '-metadata','title=Stormfather — A World That Lives','-metadata','comment=Captured from the current interactive Roshar world; original fan reconstruction. September 2026.',str(final)])
print(final)
