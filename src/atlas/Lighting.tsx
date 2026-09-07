import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as T from 'three';
import { atmosphereRange,hazeLimit } from './renderPrecision';
import { placementById, toAtlas } from './integration';
import { experienceById } from './experiences';
import { useAtlas, worldClock } from './store';

/** A small, local sky texture supplies both the backdrop and broad reflections.
 * Linear float pixels keep the environment in the renderer's lighting space. */
function createSky() {
  const width = 32, height = 128;
  const pixels = new Float32Array(width * height * 4);
  const texture = new T.DataTexture(pixels, width, height, T.RGBAFormat, T.FloatType);
  texture.mapping = T.EquirectangularReflectionMapping;
  texture.minFilter = texture.magFilter = T.LinearFilter;
  const zenith = new T.Color(), horizon = new T.Color(), ground = new T.Color();
  const color = new T.Color(), night = new T.Color('#071321');
  const blue = new T.Color('#527f9f'), pale = new T.Color('#c5d3d7');
  const dusk = new T.Color('#b58c78'), overcast = new T.Color('#53616b');
  return { texture, horizon, update(daylight: number, storm: number) {
    const day = T.MathUtils.smoothstep(daylight, 0, .65);
    const sunset = Math.exp(-Math.pow((daylight - .38) / .18, 2));
    zenith.copy(night).lerp(blue, day).lerp(overcast, storm * .8);
    horizon.copy(night).lerp(pale, day).lerp(dusk, sunset * .6).lerp(overcast, storm * .85);
    ground.set('#373e39').multiplyScalar(.12 + day * .88);
    for (let y = 0; y < height; y++) {
      const elevation = Math.sin((y / (height - 1) - .5) * Math.PI);
      color.copy(horizon).lerp(elevation >= 0 ? zenith : ground, Math.pow(Math.abs(elevation), .45));
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        pixels[i] = color.r; pixels[i + 1] = color.g; pixels[i + 2] = color.b; pixels[i + 3] = 1;
      }
    }
    texture.needsUpdate = true;
  } };
}

export function Lighting() {
  const local = useAtlas(s => s.view === 'place');
  const placeId = useAtlas(s => s.placeId);
  const sceneId = useAtlas(s => s.sceneId);
  const close = useAtlas(s => s.closeView);
  const extent = (sceneId === 'radiant-arts' ? 42 : sceneId === 'listener-village' ? 85 : sceneId ? 140 : close ? 85 : placeId === 'urithiru' ? 1400 : 900) * .002;
  const get = useThree(s => s.get);
  const controls = useThree(s => s.controls as OrbitControlsImpl | null);
  const sun = useRef<T.DirectionalLight>(null);
  const fill = useRef<T.HemisphereLight>(null);
  const hazeRef = useRef<T.Fog | null>(null);
  const sunOffset = useMemo(() => new T.Vector3(), []);
  const skyRef = useRef<ReturnType<typeof createSky> | null>(null);
  const lastSky = useRef('');
  const backgroundRef = useRef<T.WebGLCubeRenderTarget | null>(null);

  useEffect(() => {
    const { scene, gl } = get();
    const haze = new T.Fog('#c5d3d7', 1.1, 8);
    hazeRef.current = haze;
    const sky = createSky();
    sky.update(.8, 0);
    const background = new T.WebGLCubeRenderTarget(32, { type: T.HalfFloatType });
    background.fromEquirectangularTexture(gl, sky.texture);
    backgroundRef.current = background;
    const generator = new T.PMREMGenerator(gl);
    const environment = generator.fromEquirectangular(sky.texture);
    generator.dispose();
    const oldBackground = scene.background, oldEnvironment = scene.environment;
    const oldIntensity = scene.environmentIntensity, oldFog = scene.fog;
    scene.background = background.texture;
    scene.environment = environment.texture;
    scene.fog = haze;
    skyRef.current = sky;
    lastSky.current = '';
    return () => {
      skyRef.current = null; hazeRef.current = null; backgroundRef.current = null;
      scene.background = oldBackground; scene.environment = oldEnvironment;
      scene.environmentIntensity = oldIntensity; scene.fog = oldFog;
      background.dispose(); environment.dispose(); sky.texture.dispose();
    };
  }, [get]);

  useFrame(({ scene, camera, gl }) => {
    const haze = hazeRef.current;
    if (!haze) return;
    const state = useAtlas.getState(), d = state.daylight;
    const shelter = state.view !== 'place' ? 1 : state.placeId === 'urithiru' ? 0 : state.placeId === 'shinovar' ? .2 : 1;
    const storm = worldClock.storm * shelter;
    const skyKey = `${Math.round(d * 100)}:${Math.round(storm * 40)}`;
    if (skyRef.current && lastSky.current !== skyKey) {
      skyRef.current.update(d, storm);
      // Update the existing cube explicitly: Three caches equirectangular
      // backgrounds even when their source pixels change.
      backgroundRef.current?.fromEquirectangularTexture(gl, skyRef.current.texture);
      haze.color.copy(skyRef.current.horizon);
      lastSky.current = skyKey;
    }
    // The prefiltered sky remains broad and neutral; direct light supplies the
    // moving sun. Night and storms reduce the reflected light as well.
    scene.environmentIntensity = (.24 + d * .7) * (1 - storm * .42);
    if (fill.current) {
      fill.current.intensity = (.46 + d * .53) * (1 - storm * .2);
      fill.current.color.set(d < .3 ? '#a0b4ce' : '#c2d9ec');
    }
    if (sun.current) {
      const light = sun.current;
      light.intensity = (.2 + d * 2.72) * (1 - storm * .85);
      light.color.set(d < .25 ? '#9ab9e8' : d < .6 ? '#ffd0a0' : '#fff0d9');
      const placement = placementById.get(state.placeId)!;
      const activity = state.sceneId ? experienceById.get(state.sceneId) : undefined;
      if (activity) toAtlas(placement, activity.target, light.target.position);
      else if (state.closeView && controls) light.target.position.copy(controls.target);
      else light.target.position.set(...placement.origin);
      light.target.updateMatrixWorld();
      light.position.copy(light.target.position).add(sunOffset.set(-6, 3 + d * 8, 5));
      light.shadow.bias = activity || state.closeView ? -.00001 : -.00005;
      light.shadow.normalBias = activity || state.closeView ? .0001 : .0015;
      light.shadow.camera.updateProjectionMatrix();
    }
    const distance = controls ? camera.position.distanceTo(controls.target) : 100;
    const atmosphere = atmosphereRange(distance);
    // At walking scale, far terrain recedes into the sky; the continental map
    // retains its restrained haze so every region stays readable.
    hazeLimit.value=state.view==='place'&&state.closeView?1:.32;
    haze.near = state.view==='place'&&state.closeView?Math.max(.18,distance*2.8):atmosphere.near; haze.far = state.view==='place'&&state.closeView?Math.max(1.8,distance*12):atmosphere.far;
  });

  return <>
    <hemisphereLight ref={fill} args={['#c2d9ec', '#5b5142', .55]} />
    <directionalLight ref={sun} castShadow={local} shadow-mapSize={[4096, 4096]}
      shadow-camera-left={-extent} shadow-camera-right={extent}
      shadow-camera-top={extent} shadow-camera-bottom={-extent}
      shadow-camera-near={.01} shadow-camera-far={25} />
  </>;
}
