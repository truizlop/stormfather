import * as T from 'three';
import { ModelBuilder, type V3 } from './kit';

export type Section = readonly [y: number, width: number, depth: number, z?: number, x?: number];
/** Closed, smooth cross sections. Clothing folds alter silhouette as well as shading. */
export function loft(sections: readonly Section[], sides = 24, folds = 0, steps = 3) {
  const positions: number[] = [], indices: number[] = [];
  const rows = (sections.length - 1) * steps;
  for (let row = 0; row <= rows; row++) {
    const f = row / steps, i = Math.min(sections.length - 2, Math.floor(f)), t = f - i;
    const a = sections[i], b = sections[i + 1];
    const smooth = t * t * (3 - 2 * t);
    const y = T.MathUtils.lerp(a[0], b[0], t);
    const rx = T.MathUtils.lerp(a[1], b[1], smooth), rz = T.MathUtils.lerp(a[2], b[2], smooth);
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const ripple = 1 + folds * (Math.sin(angle * 9 + y * 3) * .65 + Math.sin(angle * 13 - y * 8) * .35);
      positions.push(Math.cos(angle) * rx * ripple + T.MathUtils.lerp(a[4] ?? 0, b[4] ?? 0, smooth), y, Math.sin(angle) * rz * ripple + T.MathUtils.lerp(a[3] ?? 0, b[3] ?? 0, smooth));
      if (row < rows && j < sides) { const k = row * (sides + 1) + j, n = k + sides + 1; indices.push(k, n, k + 1, k + 1, n, n + 1); }
    }
  }
  for (const top of [false, true]) {
    const section = sections[top ? sections.length - 1 : 0], center = positions.length / 3;
    positions.push(section[4] ?? 0, section[0], section[3] ?? 0);
    const start = top ? rows * (sides + 1) : 0;
    for (let j = 0; j < sides; j++) indices.push(center, start + j + (top ? 1 : 0), start + j + (top ? 0 : 1));
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function tube(points: V3[], radii: number[], sides = 10, steps = 24) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  const frames = curve.computeFrenetFrames(steps, false), positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = curve.getPointAt(t), f = t * (radii.length - 1), k = Math.min(radii.length - 2, Math.floor(f));
    const r = T.MathUtils.lerp(radii[k], radii[k + 1], f - k);
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const v = p.clone().addScaledVector(frames.normals[i], Math.cos(angle) * r).addScaledVector(frames.binormals[i], Math.sin(angle) * r);
      positions.push(v.x, v.y, v.z);
      if (i < steps && j < sides) { const a = i * (sides + 1) + j, b = a + sides + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/** Dome-like plates with a flared rim and a low longitudinal ridge. */
export function carapace(width: number, height: number, length: number, segments = 28, rows = 16) {
  const p: number[] = [], idx: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const z = (i / rows - .5) * length, arch = Math.pow(Math.sin(i / rows * Math.PI), .42);
    for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI;
      const ridge = Math.pow(Math.sin(a), 14) * height * .12;
      p.push(Math.cos(a) * width * (.7 + arch * .3), Math.sin(a) * height * arch + ridge * arch, z);
      if (i < rows && j < segments) { const k = i * (segments + 1) + j, n = k + segments + 1; idx.push(k, k + 1, n, k + 1, n + 1, n); }
    }
  }
  // Thin physical rims make overlapping scutes read as shell, not paper.
  const count=p.length/3,topIndices=[...idx],thickness=Math.min(height*.08,.065);
  for(let i=0;i<count;i++)p.push(p[i*3],p[i*3+1]-thickness,p[i*3+2]);
  for(let i=0;i<topIndices.length;i+=3)idx.push(topIndices[i]+count,topIndices[i+2]+count,topIndices[i+1]+count);
  const rim:number[]=[];
  for(let j=0;j<=segments;j++)rim.push(j);
  for(let i=1;i<=rows;i++)rim.push(i*(segments+1)+segments);
  for(let j=segments-1;j>=0;j--)rim.push(rows*(segments+1)+j);
  for(let i=rows-1;i>0;i--)rim.push(i*(segments+1));
  for(let i=0;i<rim.length;i++){const a=rim[i],b=rim[(i+1)%rim.length];idx.push(a,a+count,b,b,a+count,b+count);}
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

const sphere = new T.SphereGeometry(1, 24, 16);
export class OrganicBuilder extends ModelBuilder {
  ellipsoid(p: V3, scale: V3, color: string, surface = 'skin', rotation: V3 = [0, 0, 0]) { this.add(sphere, color, p, scale, rotation, surface); }
  form(sections: readonly Section[], color: string, surface = 'cloth', folds = 0, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0]) {
    const g = loft(sections, 24, folds); this.add(g, color, position, [1, 1, 1], rotation, surface); g.dispose();
  }
  curve(points: V3[], radii: number[], color: string, surface = 'skin', sides = 8, steps = 16) { const g = tube(points, radii, sides, steps); this.add(g, color, [0, 0, 0], [1, 1, 1], [0, 0, 0], surface); g.dispose(); }
  plate(p: V3, dimensions: V3, color: string, rotation: V3 = [0, 0, 0], surface = 'carapace') { const g = carapace(...dimensions); this.add(g, color, p, [1, 1, 1], rotation, surface); g.dispose(); }
  finish(name: string) {
    const group = super.finish(name);
    for (const child of group.children) {
      if (!(child instanceof T.Mesh)) continue;
      const m = child.material as T.MeshStandardMaterial, surface = m.userData.surface;
      const settings: Record<string, [number, number]> = { skin: [.62, 0], cloth: [.96, 0], leather: [.66, 0], hair: [.82, 0], carapace: [.68, .03], horn: [.46, 0], eye: [.12, 0], metal: [.3, .82] };
      if (settings[surface]) [m.roughness, m.metalness] = settings[surface];
    }
    return group;
  }
}
