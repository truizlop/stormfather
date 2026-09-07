import * as T from 'three';
import { OrganicBuilder } from './organic';
import type { V3 } from './kit';
import { peopleProfiles, type PersonAppearance } from './peopleProfiles';

/** A rolled band between two shaped edges, with a closed underside and rim. */
function band(left:V3[],right:V3[],roll=.004){
  const a=new T.CatmullRomCurve3(left.map(p=>new T.Vector3(...p))),b=new T.CatmullRomCurve3(right.map(p=>new T.Vector3(...p)));
  const p:number[]=[],uv:number[]=[],idx:number[]=[],rows=24,cols=6,count=(rows+1)*(cols+1);
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
    const t=i/8,w=width*Math.pow(Math.sin(Math.PI*t/2),.52)*(.91+.09*Math.sin(t*22));
    left.push([-w,(t-.5)*length,0]);right.push([w,(t-.5)*length,0]);
  }
  const g=band(left,right,0),p=g.getAttribute('position'),uv=g.getAttribute('uv');
  for(let i=0;i<p.count;i++){
    const u=uv.getX(i),t=uv.getY(i),edge=Math.pow(Math.max(0,Math.sin(u*Math.PI)*Math.sin(t*Math.PI)),.6);
    const keel=Math.exp(-Math.pow((u-.5)*14,2))*Math.sin(t*Math.PI)*depth*.3;
    const growth=Math.sin(t*100+Math.sin(u*17+seed)*.35)*.0008*edge;
    p.setZ(i,p.getZ(i)+edge*depth+keel+growth);
  }
  g.computeVertexNormals();return g;
}

export function addTailoredLayers(b:OrganicBuilder,look:PersonAppearance,body:T.BufferGeometry){
  const profile=peopleProfiles[look.culture],cloth=look.cloth,dark=new T.Color(cloth).multiplyScalar(.67).getStyle(),trim=profile.trim;
  const fit=carapaceFitter(body,.012);
  const edge=(g:T.BufferGeometry,col:number):V3[]=>Array.from({length:25},(_,i)=>{const p=g.getAttribute('position'),k=i*7+col;return [p.getX(k),p.getY(k),p.getZ(k)+.001];});
  // A standing collar bridges the cropped neckline with a smooth finished edge.
  b.form([[1.478,.106,.079,0],[1.510,.088,.073,.018],[1.534,.079,.071,.027]],dark,'cloth',.008);
  for(const side of [-1,1]){
    const collar:V3[]=[];for(let i=0;i<13;i++){const a=i/12*Math.PI;collar.push([side*Math.sin(a)*.079,1.535,.027+Math.cos(a)*.071]);}
    b.curve(collar,Array(13).fill(.0015),trim,'cloth',4,24);
  }
  if(profile.garment==='coat')for(const side of [-1,1]){
    const inner:V3[]=[[side*.035,1.49,.098],[side*.028,1.416,.156],[side*.027,1.32,.185],[side*.025,1.205,.176]];
    const outer:V3[]=[[side*.092,1.487,.102],[side*.124,1.41,.173],[side*.085,1.323,.201],[side*.025,1.205,.176]];
    const g=band(inner,outer,.012);fit(g);b.add(g,dark,[0,0,0],[1,1,1],[0,0,0],'cloth');
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

/** Fit shell roots to the actual sex/culture body. A small front/back height
 * field avoids an expensive triangle ray cast for every plate vertex. */
function carapaceFitter(body:T.BufferGeometry,clearance=.019){
  const cell=.01,cols=128,rows=190,front=new Float32Array(cols*rows).fill(-Infinity),back=new Float32Array(cols*rows).fill(Infinity);
  const p=body.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=Math.floor(p.getX(i)/cell+cols/2),y=Math.floor(p.getY(i)/cell);
    if(x<0||x>=cols||y<0||y>=rows)continue;
    const k=y*cols+x,z=p.getZ(i);front[k]=Math.max(front[k],z);back[k]=Math.min(back[k],z);
  }
  return (g:T.BufferGeometry)=>{
    const p=g.getAttribute('position');
    const half=p.count/2;
    for(let i=0;i<half;i++){
      const x=p.getX(i)/cell+cols/2,y=p.getY(i)/cell,z=p.getZ(i),field=z>0?front:back;
      let sum=0,total=0;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        const cx=Math.floor(x)+dx,cy=Math.floor(y)+dy;if(cx<0||cx>=cols||cy<0||cy>=rows)continue;
        const v=field[cy*cols+cx];if(!Number.isFinite(v))continue;
        const w=1/(.3+Math.pow(cx+.5-x,2)+Math.pow(cy+.5-y,2));sum+=v*w;total+=w;
      }
      if(total>0){
        const fitted=z>0?Math.max(z,sum/total+clearance):Math.min(z,sum/total-clearance),offset=fitted-z;
        p.setZ(i,fitted);p.setZ(i+half,p.getZ(i+half)+offset);
      }
    }
    g.computeVertexNormals();
  };
}

export function addGrownCarapace(b:OrganicBuilder,body:T.BufferGeometry){
  const fit=carapaceFitter(body);
  const add=(at:V3,width:number,length:number,depth:number,seed:number,rotation:V3=[0,0,0],color='#644435')=>{
    const g=scute(width,length,depth,seed),matrix=new T.Matrix4().compose(new T.Vector3(...at),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));
    g.applyMatrix4(matrix);fit(g);b.add(g,color,[0,0,0],[1,1,1],[0,0,0],'carapace');g.dispose();
  };
  // Bilateral chest shields overlap the sternum and the smaller abdominal fans.
  for(const side of [-1,1]){
    add([side*.083,1.315,.145],.112,.266,.023,side,[0,side*.18,side*-.12]);
    for(let i=0;i<3;i++)add([side*(.205+i*.023),1.415-i*.038,.077],.100-i*.01,.142,.028,3+i,[.12,side*.50,side*-.52]);
    for(let i=0;i<3;i++)add([side*(.363-i*.016),1.025+i*.048,.046],.064,.112,.021,8+i,[0,side*.12,side*.29]);
    for(let i=0;i<4;i++)add([side*.171,.162+i*.052,.042],.066,.112,.020,4+i,[0,side*.13,0]);
    // Back plates make the shell stay convincing through a complete orbit.
    add([side*.088,1.319,-.108],.101,.281,.033,6,[0,Math.PI+side*.14,side*.13]);
  }
  for(let i=0;i<4;i++)add([0,1.018+i*.060,.128],.163+i*.004,.117,.015,i,[0,0,0],i%2?'#74503b':'#674333');
  add([0,1.428,.119],.057,.155,.031,10);
}
