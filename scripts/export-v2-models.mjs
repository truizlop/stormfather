import { mkdir,writeFile,stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {createServer} from 'vite';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

// GLTFExporter uses this browser reader API for generated buffers; no image/network I/O.
class NodeFileReader {
  result=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.();});}
}
globalThis.FileReader=NodeFileReader;
const root=process.cwd();const destination=resolve(root,'public/models/v2');await mkdir(destination,{recursive:true});
const server=await createServer({root,server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try{
 const {buildPlace,disposePlace}=await server.ssrLoadModule('/src/atlas/models/index.ts');
 const {places,sources}=await server.ssrLoadModule('/src/atlas/data.ts');
 const {buildCreature}=await server.ssrLoadModule('/src/atlas/models/creatures.ts');
 const manifest={version:2,units:'metres',generatedBy:'npm run export:v2',references:sources,models:[],creatures:[],characters:[]};
 const exporter=new GLTFExporter();
 for(const place of places){
   const model=buildPlace(place.id);const bytes=await exporter.parseAsync(model.group,{binary:true});const file=resolve(destination,`${place.id}.glb`);await writeFile(file,Buffer.from(bytes));
   let triangles=0;model.group.traverse(o=>{if(o.geometry)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
   manifest.models.push({id:place.id,file:`${place.id}.glb`,bytes:(await stat(file)).size,triangles,routes:model.routes.length,sources:place.sources,interpretation:place.interpretation});disposePlace(model);console.log(`${place.name}: ${Math.round(triangles).toLocaleString()} triangles; ${model.routes.length} safe routes`);
 }
 for(const species of ['chull','axehound','chasmfiend','skyeel','goat','cremling']){
   const rig=buildCreature(species);const bytes=await exporter.parseAsync(rig.group,{binary:true});const file=`${species}.glb`;await writeFile(resolve(destination,file),Buffer.from(bytes));manifest.creatures.push({species,file,...rig.group.userData});
 }
 const {buildPerson}=await server.ssrLoadModule('/src/atlas/models/person.ts');
 const {orders}=await server.ssrLoadModule('/src/atlas/experiences.ts');
 for(const [index,character] of [...orders.map(o=>({id:o.id,kind:'radiant',cloth:o.cloth})),...['workform','warform','bridger','hunter'].map(kind=>({id:kind,kind,cloth:'#827052'}))].entries()){
   const rig=buildPerson(index,character.kind,character.cloth),file=`${character.id}.glb`;const bytes=await exporter.parseAsync(rig.group,{binary:true});await writeFile(resolve(destination,file),Buffer.from(bytes));manifest.characters.push({id:character.id,kind:character.kind,file,bytes:bytes.byteLength,arms:2,legs:2});disposePlace({group:rig.group});
 }
 await writeFile(resolve(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(`Exported ${manifest.models.length} places and ${manifest.creatures.length} creatures and ${manifest.characters.length} articulated characters.`);
}finally{await server.close();}
