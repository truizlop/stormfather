import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../public/models/v2/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
assert.equal(manifest.models.length,16);assert.equal(manifest.creatures.length,6);assert.equal(manifest.characters.length,14);
for(const entry of [...manifest.models,...manifest.creatures,...manifest.characters]){
  const bytes=await readFile(new URL(entry.file,root));
  assert.equal(bytes.toString('ascii',0,4),'glTF',entry.file);
  assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const jsonLength=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
  const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
  const binStart=20+jsonLength+8,binLength=bytes.readUInt32LE(20+jsonLength);
  assert.ok(binStart+binLength<=bytes.length);assert.equal(gltf.asset.version,'2.0');
  assert.ok(gltf.meshes.length>0);assert.ok(gltf.scenes.length>0);
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
    const a=gltf.accessors[primitive.attributes.POSITION],view=gltf.bufferViews[a.bufferView];
    assert.equal(a.componentType,5126);assert.equal(a.type,'VEC3');
    assert.ok(a.min.every(Number.isFinite)&&a.max.every(Number.isFinite));
    const start=binStart+(view.byteOffset??0)+(a.byteOffset??0),stride=view.byteStride??12;
    assert.ok(start+(a.count-1)*stride+12<=bytes.length);
    for(let i=0;i<a.count;i++)for(let axis=0;axis<3;axis++)assert.ok(Number.isFinite(bytes.readFloatLE(start+i*stride+axis*4)),`${entry.file}: non-finite vertex`);
  }
  if(entry.species){
    const limbs=gltf.nodes.filter(n=>/^leg_\d+_-?1$/.test(n.name??''));
    assert.equal(limbs.length,entry.legs,`${entry.species}: articulated limb count`);
  }else if(entry.kind){
    assert.equal(bytes.length,entry.bytes);assert.equal(gltf.nodes.filter(n=>/^upper_arm(_\d+)?$/.test(n.name??'')).length,entry.arms);assert.equal(gltf.nodes.filter(n=>/^thigh(_\d+)?$/.test(n.name??'')).length,entry.legs);
  }else{
    assert.equal(bytes.length,entry.bytes);assert.ok(entry.sources.length>0);
    const routes=gltf.nodes.find(n=>n.extras?.routes)?.extras.routes;
    assert.equal(routes.length,entry.routes);
    if(entry.id==='akinah')assert.ok(routes.every(r=>r.species!=='human'));
  }
  console.log(`Valid: ${entry.file}`);
}
console.log('All 36 GLBs have valid buffers, finite positions, documented places and expected articulated limbs.');
