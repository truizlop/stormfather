import * as T from 'three';
import { OrganicBuilder } from './organic';
import type { V3 } from './kit';
import { peopleProfiles, type PersonAppearance } from './peopleProfiles';

/** A rolled band between two shaped edges, with a closed underside and rim. */
function band(left:V3[],right:V3[],roll=.004,rows=24,cols=6){
  const a=new T.CatmullRomCurve3(left.map(p=>new T.Vector3(...p))),b=new T.CatmullRomCurve3(right.map(p=>new T.Vector3(...p)));
  const p:number[]=[],uv:number[]=[],idx:number[]=[],count=(rows+1)*(cols+1);
  for(let layer=0;layer<2;layer++)for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
    const t=i/rows,u=j/cols,v=a.getPoint(t).lerp(b.getPoint(t),u);
    v.z+=(layer===0?Math.sin(u*Math.PI)*roll:-.002);p.push(...v.toArray());uv.push(u,t);
    if(i<rows&&j<cols){const k=layer*count+i*(cols+1)+j,n=k+cols+1;if(layer===0)idx.push(k,k+1,n,k+1,n+1,n);else idx.push(k,n,k+1,k+1,n,n+1);}
  }
  const rim:number[]=[];for(let j=0;j<=cols;j++)rim.push(j);for(let i=1;i<=rows;i++)rim.push(i*(cols+1)+cols);for(let j=cols-1;j>=0;j--)rim.push(rows*(cols+1)+j);for(let i=rows-1;i>0;i--)rim.push(i*(cols+1));
  for(let i=0;i<rim.length;i++){const k=rim[i],n=rim[(i+1)%rim.length];idx.push(k,k+count,n,n,k+count,n+count);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

/** A pointed grown scute with a raised keel, growth lines and a physical rim. */
function scute(width:number,length:number,depth:number,seed:number){
  const left:V3[]=[],right:V3[]=[];
  for(let i=0;i<9;i++){
    const t=i/8,w=width*Math.pow(Math.max(.0005,Math.sin(Math.PI*t)),.55)*(.85+.25*t);
    left.push([-w,(t-.5)*length,0]);right.push([w,(t-.5)*length,0]);
  }
  const g=band(left,right,0,18,8),p=g.getAttribute('position'),uv=g.getAttribute('uv');
  for(let i=0;i<p.count;i++){
    const u=uv.getX(i),t=uv.getY(i),edge=Math.pow(Math.max(0,Math.sin(u*Math.PI)*Math.sin(t*Math.PI)),.6);
    const keel=Math.exp(-Math.pow((u-.5)*14,2))*Math.sin(t*Math.PI)*depth*.3;
    const growth=Math.sin(t*13+seed)*.0007*edge;
    p.setZ(i,p.getZ(i)+edge*depth+keel+growth);
  }
  g.computeVertexNormals();return g;
}

export function addTailoredLayers(b:OrganicBuilder,look:PersonAppearance,body:T.BufferGeometry){
  const profile=peopleProfiles[look.culture],cloth=look.cloth,dark=new T.Color(cloth).multiplyScalar(.67).getStyle(),trim=profile.trim;
  const fit=carapaceFitter(body,.005);
  const edge=(g:T.BufferGeometry,col:number):V3[]=>Array.from({length:25},(_,i)=>{const p=g.getAttribute('position'),k=i*7+col;return [p.getX(k),p.getY(k),p.getZ(k)+.001];});
  // A standing collar bridges the cropped neckline with a smooth finished edge.
  const collarScale=look.sex==='female'?.93:1;
  const collar=new T.LatheGeometry([[.105,1.506],[.098,1.519],[.088,1.537],[.084,1.540],[.081,1.536],[.092,1.518],[.101,1.506],[.105,1.506]].map(p=>new T.Vector2(...p)),64);
  const cp=collar.getAttribute('position');for(let i=0;i<cp.count;i++){const t=T.MathUtils.clamp((cp.getY(i)-1.506)/.034,0,1);cp.setXYZ(i,cp.getX(i)*collarScale,cp.getY(i),cp.getZ(i)*.94+.022+t*.010);}
  collar.computeVertexNormals();b.add(collar,dark,[0,0,0],[1,1,1],[0,0,0],'cloth');collar.dispose();
  for(const side of [-1,1]){
    const collar:V3[]=[];for(let i=0;i<13;i++){const a=i/12*Math.PI;collar.push([side*Math.sin(a)*.084*collarScale,1.540,.032+Math.cos(a)*.084*.94]);}
    b.curve(collar,Array(13).fill(.0015),trim,'cloth',4,24);
  }
  if(profile.garment==='coat')for(const side of [-1,1]){
    const inner:V3[]=[[side*.035,1.49,.098],[side*.028,1.416,.156],[side*.027,1.32,.185],[side*.025,1.205,.176]];
    const outer:V3[]=[[side*.092,1.487,.102],[side*.124,1.41,.173],[side*.085,1.323,.201],[side*.025,1.205,.176]];
    const g=band(inner,outer,.006);fit(g);b.add(g,dark,[0,0,0],[1,1,1],[0,0,0],'cloth');
    b.curve(edge(g,6),Array(25).fill(.0012),trim,'cloth',4,24);g.dispose();
    // Low pocket welts and two rows of tailoring stitches belong to the cloth.
    b.curve([[side*.067,1.075,.162],[side*.115,1.09,.141],[side*.155,1.12,.10]],[.004,.004,.003],dark,'cloth',6,16);
    b.curve([[side*.14,1.39,.155],[side*.135,1.24,.155],[side*.115,1.09,.147]],[.001,.001,.001],dark,'cloth',4,20);
  }
  const path:V3[]=[[-.156,1.449,.143],[-.092,1.36,.219],[-.03,1.17,.197],[.128,.988,.177]];
  const left=path.map(p=>[p[0]-.017,p[1],p[2]] as V3),right=path.map(p=>[p[0]+.017,p[1],p[2]] as V3);
  const strap=band(left,right,.0018);fit(strap);b.add(strap,'#3c2a20',[0,0,0],[1,1,1],[0,0,0],'leather');
  for(const col of [0,6])b.curve(edge(strap,col),Array(25).fill(.0007),'#a48c62','cloth',3,24);
  const center=edge(strap,3).reduce((a,p)=>Math.abs(p[1]-1.32)<Math.abs(a[1]-1.32)?p:a);
  b.box([center[0],center[1],center[2]+.005],[.044,.053,.006],trim,[0,0,-.3],'metal');
  b.box([center[0],center[1],center[2]+.01],[.030,.038,.005],'#39271f',[0,0,-.3],'leather');strap.dispose();
}

/** Rasterize triangles, rather than scattered vertices, into a continuous
 * front/back body surface. Interpolation stays smooth across source edges and
 * makes the same garment fit both anatomical bodies without floating patches. */
function carapaceFitter(body:T.BufferGeometry,clearance=.006){
  const cell=.004,cols=300,rows=455,front=new Float32Array(cols*rows).fill(-Infinity),back=new Float32Array(cols*rows).fill(Infinity);
  const p=body.getAttribute('position'),index=body.index,count=index?.count??p.count;
  for(let i=0;i<count;i+=3){
    const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
    const ax=p.getX(a)/cell+cols/2,ay=p.getY(a)/cell,bx=p.getX(b)/cell+cols/2,by=p.getY(b)/cell,cx=p.getX(c)/cell+cols/2,cy=p.getY(c)/cell;
    const denominator=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(denominator)<1e-8)continue;
    const minX=Math.max(0,Math.ceil(Math.min(ax,bx,cx))),maxX=Math.min(cols-1,Math.floor(Math.max(ax,bx,cx)));
    const minY=Math.max(0,Math.ceil(Math.min(ay,by,cy))),maxY=Math.min(rows-1,Math.floor(Math.max(ay,by,cy)));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/denominator,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/denominator;
      if(u<0||v<0||u+v>1)continue;
      const z=u*p.getZ(a)+v*p.getZ(b)+(1-u-v)*p.getZ(c),k=y*cols+x;
      front[k]=Math.max(front[k],z);back[k]=Math.min(back[k],z);
    }
  }
  return (g:T.BufferGeometry,relief?:Float32Array,backSide=false)=>{
    const p=g.getAttribute('position'),half=p.count/2;
    for(let i=0;i<half;i++){
      const x=p.getX(i)/cell+cols/2,y=p.getY(i)/cell,z=p.getZ(i),sign=backSide?-1:1,field=(relief?backSide:z<0)?back:front;
      const ix=Math.floor(x),iy=Math.floor(y);let sum=0,total=0;
      for(let dx=0;dx<=1;dx++)for(let dy=0;dy<=1;dy++){
        const cx=ix+dx,cy=iy+dy;if(cx<0||cx>=cols||cy<0||cy>=rows)continue;
        const v=field[cy*cols+cx];if(!Number.isFinite(v))continue;
        const w=(dx?x-ix:1-x+ix)*(dy?y-iy:1-y+iy);sum+=v*w;total+=w;
      }
      if(total>.01){
        const fitted=relief?sum/total+sign*(clearance+relief[i]):z>0?Math.max(z,sum/total+clearance):Math.min(z,sum/total-clearance),offset=fitted-z;
        p.setZ(i,fitted);p.setZ(i+half,p.getZ(i+half)+offset);
      }
    }
    g.computeVertexNormals();
  };
}

export function addGrownCarapace(b:OrganicBuilder,body:T.BufferGeometry){
  const fit=carapaceFitter(body,.007);
  const add=(at:V3,width:number,length:number,depth:number,seed:number,rotation:V3=[0,0,0],color='#644435')=>{
    const g=scute(width,length,depth,seed),matrix=new T.Matrix4().compose(new T.Vector3(...at),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));
    const p=g.getAttribute('position'),relief=Float32Array.from({length:p.count/2},(_,i)=>p.getZ(i));
    g.applyMatrix4(matrix);fit(g,relief,at[2]<0);b.add(g,color,[0,0,0],[1,1,1],[0,0,0],'grown-shell');g.dispose();
  };
  // Bilateral chest shields overlap the sternum and the smaller abdominal fans.
  for(const side of [-1,1]){
    add([side*.083,1.315,.145],.112,.266,.023,side,[0,side*.18,side*-.12]);
    for(let i=0;i<3;i++)add([side*(.202+i*.027),1.377-i*.036,.077],.070-i*.003,.108,.019,3+i,[.08,side*.35,side*-.32]);
    for(let i=0;i<3;i++)add([side*(.363-i*.016),1.025+i*.048,.046],.064,.112,.021,8+i,[0,side*.12,side*.29]);
    for(let i=0;i<4;i++)add([side*.171,.162+i*.052,.042],.066,.112,.020,4+i,[0,side*.13,0]);
    // Back plates make the shell stay convincing through a complete orbit.
    add([side*.088,1.319,-.108],.101,.281,.033,6,[0,Math.PI+side*.14,side*.13]);
  }
  for(let i=0;i<4;i++)add([0,1.018+i*.060,.128],.163+i*.004,.117,.015,i,[0,0,0],i%2?'#74503b':'#674333');
  add([0,1.405,.119],.048,.116,.023,10);
}

/** Thin cheek and brow shields emerge from the face instead of framing the jaw
 * with free-standing tubes. Their asymmetric contours follow the source skin. */
export function addFacialCarapace(b:OrganicBuilder,body:T.BufferGeometry,war:boolean){
  const fit=carapaceFitter(body,.0025);
  for(const side of [-1,1]){
    const cheek=band([[side*.084,1.641,.1],[side*.075,1.608,.12],[side*.048,1.557,.12]],[[side*.099,1.638,.1],[side*.096,1.591,.1],[side*.048,1.557,.12]],war?.005:.002);
    fit(cheek);cheek.translate(0,-1.5,0);b.add(cheek,'#ffffff',[0,0,0],[1,1,1],[0,0,0],'grown-shell');cheek.dispose();
    const brow=band([[side*.012,1.704,.12],[side*.056,1.712,.10],[side*.084,1.682,.08]],[[side*.013,1.694,.12],[side*.057,1.695,.11],[side*.084,1.682,.08]],war?.006:.003);
    fit(brow);brow.translate(0,-1.5,0);b.add(brow,'#ffffff',[0,0,0],[1,1,1],[0,0,0],'grown-shell');brow.dispose();
  }
}
