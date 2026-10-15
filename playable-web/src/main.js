import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';

// MegaRush Sunset Harbor — a new browser WebGL game. The Unity project at
// repository root remains untouched. Real 3D models load from credited assets;
// no fabricated cloud balances, paid game content, or PS5 runtime.
const $ = id => document.getElementById(id);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const lerp = THREE.MathUtils.lerp;
const rand = (a, b, salt = 0) => {
  const n = Math.sin(a * 12.9898 + b * 78.233 + salt * 123.711) * 43758.5453;
  return n - Math.floor(n);
};

const els = {
  scene: $('scene'),
  start: $('startPanel'),
  hud: $('hud'),
  indicator: $('loadIndicator'),
  fatal: $('fatal'),
  fatalText: $('fatalMessage'),
  menuTitle: $('menuTitle'),
  menuText: $('menuText'),
  chase: $('chaseButton'),
  roam: $('roamButton'),
  radar: $('radar'),
  speed: $('speed'),
  health: $('health'),
  wanted: $('wanted'),
  distance: $('distance'),
  objective: $('objectiveTitle'),
  label: $('chaseLabel'),
  notice: $('notice'),
  stick: $('stick'),
  joy: $('joystick')
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: els.scene,
    antialias: true,
    powerPreference: 'high-performance'
  });
} catch (err) {
  els.fatal.classList.remove('hidden');
  els.fatalText.textContent = 'WebGL2 is required on this browser. ' + (err?.message || '');
  els.indicator.classList.add('hidden');
  throw err;
}

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb88493);
scene.fog = new THREE.FogExp2(0xc18895, 0.0068);
const camera = new THREE.PerspectiveCamera(61, 1, 0.12, 640);
camera.position.set(0, 4.7, -104);

const sky = new THREE.HemisphereLight(0xffdfb6, 0x25344a, 2.7);
scene.add(sky);
const sun = new THREE.DirectionalLight(0xffb881, 3.25);
sun.position.set(-85, 58, 100);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 280;
sun.shadow.bias = -0.001;
scene.add(sun, sun.target);

const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const asphalt = mat(0x303640, 0.31, 0.22);
const footpath = mat(0xa6a0a5, 0.95);
const concrete = mat(0x777a87, 0.87);
const whitePaint = mat(0xe1dcd1, 0.85);
const amberPaint = mat(0xf2c173, 0.74);
const chrome = mat(0xb0bfc9, 0.23, 0.78);
const darkGlass = mat(0x162941, 0.18, 0.4);
const goldLight = new THREE.MeshBasicMaterial({ color: 0xffbb7e });
const neonTeal = new THREE.MeshBasicMaterial({ color: 0x75fff2 });
const policeRed = new THREE.MeshBasicMaterial({ color: 0xff2846 });
const policeBlue = new THREE.MeshBasicMaterial({ color: 0x3f83ff });
const tyre = mat(0x14171c, 0.96);
const buildings = [];
const colliders = [];
const cars = [];
const lampGlows = [];
const city = new THREE.Group();
scene.add(city);

function addBox(w, h, d, material, x, y, z, parent = city) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = h > 2;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addPlane(w, h, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  city.add(mesh);
  return mesh;
}
function labelTexture(text, size = 512, fill = '#ffe3a4', back = '#142138') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 4;
  const cx = canvas.getContext('2d');
  cx.fillStyle = back;
  cx.fillRect(0, 0, canvas.width, canvas.height);
  cx.strokeStyle = '#a6f7f8';
  cx.lineWidth = 5;
  cx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  cx.font = '900 55px Arial';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillStyle = fill;
  cx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 22);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const harborText = labelTexture('HARBOR EXIT', 512, '#fff1c0');
const harborSign = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 3),
  new THREE.MeshBasicMaterial({ map: harborText, side: THREE.DoubleSide })
);
harborSign.position.set(0, 10.5, 150);
harborSign.rotation.y = Math.PI;
city.add(harborSign);

function makeAsphaltMap() {
  const cn = document.createElement('canvas');
  cn.width = 256;
  cn.height = 256;
  const c = cn.getContext('2d');
  c.fillStyle = '#353943';
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 10500; i++) {
    const x = Math.floor(rand(i, 2) * 256);
    const y = Math.floor(rand(3, i) * 256);
    const tone = Math.floor(38 + rand(i, 4) * 50);
    c.fillStyle = 'rgba(' + (tone + 7) + ',' + (tone + 10) + ',' + (tone + 13) + ',' + (0.17 + rand(i, 6) * 0.35) + ')';
    c.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(cn);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 36);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
asphalt.map = makeAsphaltMap();
asphalt.needsUpdate = true;
const ground = addPlane(730, 760, mat(0x555965, 0.94), 0, -0.07, 0);
ground.material.color.set(0x3e454b);
addPlane(20.8, 525, asphalt, 0, 0.01, 0);
for (const sign of [-1, 1]) {
  addPlane(6.1, 525, footpath, sign * 13.5, 0.035, 0);
  addBox(0.25, 0.17, 525, concrete, sign * 10.35, 0.09, 0);
  addBox(0.16, 0.13, 525, concrete, sign * 16.62, 0.08, 0);
}
for (let z = -252; z <= 255; z += 12) {
  for (const x of [-5.1, 5.1]) addPlane(0.19, 6.1, whitePaint, x, 0.035, z);
  addPlane(0.16, 6.2, amberPaint, 0.35, 0.045, z);
  addPlane(0.16, 6.2, amberPaint, -0.35, 0.045, z);
}
for (const zone of [-155, -65, 35, 112]) {
  for (let i = 0; i < 10; i++) {
    addPlane(1.25, 2.2, whitePaint, -8.3 + i * 1.85, 0.055, zone);
  }
}
for (const x of [-8.1, 8.1]) {
  const path = addPlane(0.7, 500,
    new THREE.MeshStandardMaterial({ color: 0xd5b29c, transparent: true, opacity: 0.08, roughness: 0.22, metalness: 0.25 }),
    x, 0.058, 0);
  path.receiveShadow = false;
}

const waterMat = new THREE.MeshPhysicalMaterial({
  color: 0x1e6e83, metalness: 0.53, roughness: 0.22,
  transparent: true, opacity: 0.9,
  clearcoat: 0.8, clearcoatRoughness: 0.1
});
addPlane(500, 540, waterMat, 320, -0.1, 0);
addBox(1.6, 1.8, 520, concrete, 66, 0.65, 0);
for (let z = -220; z < 210; z += 23) {
  addBox(21, 0.5, 3.8, mat(0x826c62, 0.95), 76, 0.3, z);
  for (const x of [70, 86]) {
    addBox(0.5, 2.2, 0.5, mat(0x53423b), x, 1.2, z);
  }
}

function buildingWindows(index, floors) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const bases = ['#222c43', '#304056', '#343746', '#283c4b', '#394450'];
  ctx.fillStyle = bases[index % bases.length];
  ctx.fillRect(0, 0, 256, 512);
  for (let floor = 0; floor < 19; floor++) {
    for (let col = 0; col < 7; col++) {
      const lit = rand(floor + index * 17, col) > 0.67;
      ctx.fillStyle = lit ? ['#d2a587', '#ffe1a7', '#aec7d9'][Math.floor(rand(col, floor) * 3)] : '#152738';
      ctx.fillRect(8 + col * 35, 9 + floor * 26, 23, 16);
      ctx.fillStyle = lit ? '#ffe8b536' : '#435d6533';
      ctx.fillRect(10 + col * 35, 11 + floor * 26, 18, 13);
    }
  }
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = '#d2d7df1d';
    ctx.fillRect(i * 35, 0, 3, 512);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, floors / 20);
  return texture;
}
const facadeTextures = Array.from({ length: 8 }, (_, i) => buildingWindows(i, 20));
const titles = ['NEON MARINA', 'AURORA', 'HARBOR TECH', 'SUNSET', 'COASTLINE', 'HOTEL LUNA'];
const signMaterials = titles.map(text =>
  new THREE.MeshBasicMaterial({ map: labelTexture(text, 512, '#ffdaa0', '#15223b'), transparent: true })
);
let towerCount = 0;
for (let z = -238; z <= 232; z += 27) {
  for (const xBase of [-67, -46, -27, 27, 47]) {
    if (xBase > 40 && z > 100) continue;
    const seed = towerCount++;
    const w = 13 + rand(seed, 1) * 6.4;
    const d = 13 + rand(seed, 2) * 7;
    const h = 17 + rand(seed, 3) * (xBase === -46 || xBase === 27 ? 86 : 48);
    const offsetX = (rand(seed, 4) - 0.5) * 6;
    const offsetZ = (rand(seed, 5) - 0.5) * 6;
    const x = xBase + offsetX;
    const zPos = z + offsetZ;
    const win = new THREE.MeshStandardMaterial({
      map: facadeTextures[seed % facadeTextures.length],
      color: new THREE.Color().setHSL(0.57, 0.19, 0.68),
      metalness: 0.28,
      roughness: 0.48,
      emissive: new THREE.Color(0x17131c),
      emissiveIntensity: 0.13
    });
    const mesh = addBox(w, h, d, win, x, h / 2, zPos);
    mesh.castShadow = seed % 4 === 0;
    buildings.push(mesh);
    colliders.push({ x, z: zPos, w, d });
    const lid = addBox(w + 1.4, 0.56, d + 1.4, concrete, x, h + 0.2, zPos);
    lid.castShadow = false;
    if (seed % 3 === 0) addBox(w - 1.5, 1.9, d - 1.5, darkGlass, x, h + 1.4, zPos);
    if (seed % 5 === 0) {
      const billboard = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.84, 2.25),
        signMaterials[seed % signMaterials.length]
      );
      billboard.position.set(x, 5.2, zPos - d / 2 - 0.06);
      billboard.rotation.y = Math.PI;
      city.add(billboard);
    }
  }
}

function makePalm(x, z) {
  const tree = new THREE.Group();
  const trunkMat = mat(0x76583f, 0.95);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x286f57, side: THREE.DoubleSide, roughness: 0.86
  });
  const h = 7.4 + rand(x, z) * 2.3;
  for (let i = 0; i < 4; i++) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(
      0.22 - i * 0.036, 0.3 - i * 0.033, h / 4 + 0.07, 8
    ), trunkMat);
    trunk.position.set(i * 0.08, h / 8 + i * h / 4, 0);
    trunk.rotation.z = -0.055;
    trunk.castShadow = false;
    tree.add(trunk);
  }
  const crown = new THREE.Group();
  crown.position.set(0.31, h + 0.2, 0);
  for (let j = 0; j < 9; j++) {
    const angle = j / 9 * Math.PI * 2;
    const vertices = new Float32Array([
      0, 0, 0,
      Math.cos(angle - 0.28) * 3.5, -0.9, Math.sin(angle - 0.28) * 3.5,
      Math.cos(angle) * 5.2, -2.2, Math.sin(angle) * 5.2,
      0, 0, 0,
      Math.cos(angle) * 5.2, -2.2, Math.sin(angle) * 5.2,
      Math.cos(angle + 0.28) * 3.5, -0.9, Math.sin(angle + 0.28) * 3.5
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.castShadow = false;
    crown.add(leaf);
  }
  tree.add(crown);
  tree.position.set(x, 0, z);
  city.add(tree);
}
for (let z = -228; z < 220; z += 19) {
  makePalm(-18.2, z);
  if (z < 90) makePalm(18.8, z + 7);
}

function streetlight(x, z) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 7.1, 9), chrome);
  post.position.y = 3.6;
  group.add(post);
  const arm = addBox(2.3, 0.12, 0.14, chrome, 0.99, 7.15, 0, group);
  arm.castShadow = false;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 8), goldLight);
  dome.scale.set(1.7, 0.25, 0.9);
  dome.position.set(2, 7.05, 0);
  group.add(dome);
  if (Math.abs(z % 84) < 23) {
    const light = new THREE.PointLight(0xffc994, 3.4, 17, 2.1);
    light.position.set(2, 6.95, 0);
    group.add(light);
    lampGlows.push(dome);
  }
  group.position.set(x, 0, z);
  city.add(group);
}
for (let z = -216; z <= 209; z += 42) {
  streetlight(-10.6, z);
  streetlight(10.6, z + 21);
}

const sunDisk = new THREE.Mesh(
  new THREE.SphereGeometry(17, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0xffcc9e, fog: false })
);
sunDisk.position.set(95, 67, 320);
scene.add(sunDisk);

const finish = new THREE.Group();
finish.position.set(0, 0, 150);
const finishMat = mat(0x294659, 0.34, 0.72);
for (const x of [-8.5, 8.5]) {
  addBox(0.9, 11.5, 0.9, finishMat, x, 5.75, 150);
  const light = new THREE.PointLight(0x5bffec, 7, 17, 2);
  light.position.set(x, 8.7, 150);
  finish.add(light);
}
addBox(18, 0.78, 1.12, finishMat, 0, 11.45, 150);
const checkpoint = new THREE.Mesh(
  new THREE.TorusGeometry(7.3, 0.12, 12, 80, Math.PI),
  neonTeal
);
checkpoint.position.set(0, 1, 149.5);
finish.add(checkpoint);
scene.add(finish);
const finishLight = new THREE.PointLight(0x70ffe8, 8, 34, 1.5);
finishLight.position.set(0, 5, 150);
scene.add(finishLight);

const playerGroup = new THREE.Group();
scene.add(playerGroup);
playerGroup.position.set(0, 0, -91);
const board = new THREE.Group();
const deck = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.095, 2.0),
  new THREE.MeshPhysicalMaterial({ color: 0x0ecabb, roughness: 0.36, metalness: 0.42, clearcoat: 0.65 })
);
deck.position.y = 0.24;
deck.castShadow = true;
board.add(deck);
const grip = addBox(0.6, 0.018, 1.79, mat(0x111b28), 0, 0.295, 0, board);
grip.castShadow = false;
for (const z of [-0.69, 0.69]) {
  addBox(0.75, 0.08, 0.14, chrome, 0, 0.115, z, board);
  for (const x of [-0.28, 0.28]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.11, 16), tyre);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.15, z);
    board.add(wheel);
  }
}
playerGroup.add(board);

let riderObject = null;
let riderMixer = null;
let riderAnimations = {};
function addEmergencyRider() {
  // Only a temporary safety silhouette while the licensed remote GLB loads.
  // This is NOT accepted as a substitute for the authored 3D model.
  const silhouette = new THREE.Group();
  const basic = mat(0x283247, 0.72);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 7, 18), basic);
  body.position.y = 1.32;
  silhouette.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), mat(0xbb7d65));
  head.position.y = 2.17;
  silhouette.add(head);
  silhouette.name = 'Temporary model-load fallback (not reference fidelity)';
  playerGroup.add(silhouette);
  riderObject = silhouette;
}
addEmergencyRider();

const modelSource = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/';
const loader = new GLTFLoader();
function standardizedModel(sceneObject, length, isCar = false) {
  const bounds = new THREE.Box3().setFromObject(sceneObject);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const horizontalLength = isCar ? Math.max(size.x, size.z) : size.y;
  const factor = length / Math.max(0.01, horizontalLength);
  const group = new THREE.Group();
  sceneObject.position.set(-center.x, -bounds.min.y, -center.z);
  if (isCar && size.x > size.z) sceneObject.rotation.y = Math.PI / 2;
  sceneObject.scale.multiplyScalar(factor);
  group.add(sceneObject);
  return group;
}
function loadRider() {
  loader.load(
    modelSource + 'CesiumMan/glTF-Binary/CesiumMan.glb',
    gltf => {
      if (riderObject) playerGroup.remove(riderObject);
      riderObject = standardizedModel(gltf.scene, 2.0);
      riderObject.position.y = 0.33;
      playerGroup.add(riderObject);
      riderObject.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      if (gltf.animations?.length) {
        riderMixer = new THREE.AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) riderAnimations[clip.name] = clip;
        riderMixer.clipAction(gltf.animations[0]).play();
      }
      els.indicator.classList.add('hidden');
      notify('3D character loaded • ready to play', 3);
    },
    undefined,
    err => {
      els.indicator.classList.add('hidden');
      notify('Character download unavailable — check internet connection', 7);
      console.warn('Official CesiumMan asset could not load:', err);
    }
  );
}

function createCar(x, z, police = false) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = mat(police ? 0x182a45 : (rand(x, z) > 0.56 ? 0xc0b2a9 : 0x304f63), 0.3, 0.48);
  const under = addBox(1.9, 0.47, 4.15, paint, 0, 0.67, 0, body);
  under.castShadow = true;
  const roof = addBox(1.6, 0.65, 2.25, darkGlass, 0, 1.27, -0.3, body);
  roof.castShadow = true;
  addBox(1.92, 0.23, 0.15, chrome, 0, 0.69, -2.14, body);
  for (const dz of [-1.34, 1.34]) {
    for (const dx of [-0.89, 0.89]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 20), tyre);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(dx, 0.42, dz);
      body.add(wheel);
    }
  }
  const lamps = [];
  if (police) {
    const bar = addBox(1.22, 0.13, 0.22, chrome, 0, 1.66, -0.4, group);
    bar.castShadow = false;
    lamps.push(addBox(0.57, 0.16, 0.25, policeRed, -0.31, 1.74, -0.4, group));
    lamps.push(addBox(0.57, 0.16, 0.25, policeBlue, 0.31, 1.74, -0.4, group));
  }
  group.position.set(x, 0, z);
  scene.add(group);
  const item = {
    group, body, lamps,
    police, x, z, initialZ: z,
    direction: rand(x, z) > .48 ? 1 : -1,
    speed: police ? 0 : 3.4 + rand(x, z, 6) * 3.6,
    loaded: false
  };
  cars.push(item);
  return item;
}
for (let i = 0; i < 9; i++) {
  const x = i % 2 ? 5 : -5;
  const z = -175 + i * 42 + rand(i, 8) * 17;
  const c = createCar(x, z, false);
  c.direction = i % 2 ? -1 : 1;
}
const policeA = createCar(-4.1, -108, true);
const policeB = createCar(4.1, -125, true);
const allPolice = [policeA, policeB];

function loadCarMeshes() {
  loader.load(
    modelSource + 'CarConcept/glTF-Binary/CarConcept.glb',
    gltf => {
      // Imported PBR glTF car body replaces the emergency-only first-pass mesh.
      // CC-BY attribution & trademark caveats: see ASSET_CREDITS.md.
      for (const car of cars) {
        const clone = gltf.scene.clone(true);
        const wrapper = standardizedModel(clone, 4.5, true);
        // Preserve sirens separately on police cars.
        car.group.remove(car.body);
        car.body = wrapper;
        car.group.add(wrapper);
        wrapper.traverse(o => { if (o.isMesh) o.castShadow = false; });
        car.loaded = true;
      }
    },
    undefined,
    err => {
      console.warn('Official CarConcept 3D model not available:', err);
      notify('Detailed car model offline — reconnect to load it', 6);
    }
  );
}

const helicopter = new THREE.Group();
const fuselage = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 26, 18), mat(0x29374b, 0.3, 0.44)
);
fuselage.scale.set(1.1, 0.62, 1.7);
helicopter.add(fuselage);
const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.13, 26, 18),
  new THREE.MeshPhysicalMaterial({ color: 0x253c5e, roughness: 0.15, metalness: 0.27, transmission: 0.15, thickness: 0.9 })
);
cockpit.scale.set(1, 0.55, 1.05);
cockpit.position.set(0, -0.03, 1.0);
helicopter.add(cockpit);
addBox(0.28, 0.31, 4.8, mat(0x28374b), 0, 0.1, -3.1, helicopter);
const rotor = new THREE.Group();
rotor.position.set(0, 1.27, 0);
for (let i = 0; i < 4; i++) {
  const blade = addBox(0.27, 0.05, 7.6, mat(0x222a33, 0.85), 0, 0, 0, rotor);
  blade.rotation.y = i / 4 * Math.PI * 2;
}
helicopter.add(rotor);
const searchBeam = new THREE.SpotLight(0xffe9c4, 9, 62, 0.34, 0.8, 1.2);
searchBeam.position.set(0, -0.5, 0.2);
helicopter.add(searchBeam);
const searchTarget = new THREE.Object3D();
scene.add(searchTarget);
searchBeam.target = searchTarget;
helicopter.position.set(-20, 30, -125);
scene.add(helicopter);

const state = {
  mode: 'menu', pausedFrom: 'free', running: false,
  x: 0, z: -91, y: 0, vy: 0, angle: 0,
  vx: 0, vz: 0, hearts: 3, vehicle: 'skate',
  cooldown: 0, trickT: 0, wanted: false, elapsed: 0,
  lastFrame: performance.now(), tipUntil: 0, time: 0,
  lookYaw: 0, lookPitch: 0.13, car: null
};
const input = {
  keys: new Set(), joyX: 0, joyY: 0, sprint: false,
  jump: false, trick: false, swap: false, car: false, pause: false
};
let heroReady = false;

function notify(text, seconds = 3) {
  els.notice.textContent = text;
  state.tipUntil = state.time + seconds;
}
function makeStartTitle(title, subtitle) {
  els.menuTitle.textContent = title;
  els.menuText.textContent = subtitle;
}
function setMode(mode) {
  if (mode === 'menu') {
    state.running = false;
    state.mode = 'menu';
    els.hud.classList.add('hidden');
    els.start.classList.remove('hidden');
    return;
  }
  state.mode = mode;
  state.running = true;
  state.x = 0;
  state.z = -91;
  state.y = 0;
  state.vy = 0;
  state.vx = 0;
  state.vz = 0;
  state.hearts = 3;
  state.vehicle = 'skate';
  state.cooldown = 3;
  state.trickT = 0;
  state.wanted = mode === 'chase';
  state.elapsed = 0;
  state.car = null;
  playerGroup.visible = true;
  board.visible = true;
  state.lookYaw = 0;
  helicopter.visible = mode === 'chase';
  allPolice.forEach((p, index) => {
    p.z = state.z - 16 - index * 13;
    p.x = index ? 4.1 : -4.1;
    p.group.visible = mode === 'chase';
  });
  els.start.classList.add('hidden');
  els.hud.classList.remove('hidden');
  notify(mode === 'chase' ? 'ESCAPE THE CHASE · Reach the Harbor!' : 'FREE ROAM · Explore Sunset City!', 5);
}
function pauseGame() {
  if (state.mode === 'paused') {
    state.mode = state.pausedFrom;
    state.running = true;
    els.start.classList.add('hidden');
    els.hud.classList.remove('hidden');
    return;
  }
  if (!state.running) return;
  state.pausedFrom = state.mode;
  state.mode = 'paused';
  state.running = false;
  input.keys.clear();
  input.joyX = 0;
  input.joyY = 0;
  input.sprint = false;
  els.start.classList.remove('hidden');
  els.hud.classList.add('hidden');
  makeStartTitle('THE CITY IS WAITING.', 'You are paused. Continue from your current street or start a fresh Harbor chase.');
  els.chase.textContent = '▶ RESUME GAME';
}
function loseGame() {
  state.running = false;
  state.mode = 'crashed';
  els.start.classList.remove('hidden');
  els.hud.classList.add('hidden');
  makeStartTitle('THE CHASE CAUGHT YOU.', 'Your three hearts are gone. Restart the Harbor run for free.');
  els.chase.textContent = '🚨 TRY HARBOR CHASE AGAIN';
  els.roam.textContent = '🛹 FREE ROAM';
}
function winGame() {
  state.running = false;
  state.mode = 'escaped';
  state.wanted = false;
  els.start.classList.remove('hidden');
  els.hud.classList.add('hidden');
  makeStartTitle('YOU REACHED THE HARBOR.', 'Real checkpoint crossed. This is a local practice escape; no cloud coins or XP were awarded.');
  els.chase.textContent = '🚨 PLAY AGAIN';
  els.roam.textContent = '🛹 FREE ROAM';
}
els.chase.addEventListener('click', () => {
  if (state.mode === 'paused') pauseGame();
  else setMode('chase');
});
els.roam.addEventListener('click', () => setMode('free'));
$('pause').addEventListener('click', pauseGame);
$('swap').addEventListener('click', () => { input.swap = true; });
$('car').addEventListener('click', () => { input.car = true; });
$('trick').addEventListener('click', () => { input.trick = true; });
$('jump').addEventListener('pointerdown', ev => {
  ev.preventDefault();
  input.jump = true;
});
const sprintButton = $('sprint');
sprintButton.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  input.sprint = true;
  sprintButton.setPointerCapture(ev.pointerId);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  sprintButton.addEventListener(type, () => { input.sprint = false; });
}
const keyAliases = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0]
};
window.addEventListener('keydown', ev => {
  const code = ev.code;
  if (code in keyAliases || code === 'Space') ev.preventDefault();
  input.keys.add(code);
  if (ev.repeat) return;
  if (code === 'Escape') pauseGame();
  if (code === 'KeyK') input.trick = true;
  if (code === 'KeyB') input.swap = true;
  if (code === 'KeyV' || code === 'KeyE') input.car = true;
  if (code === 'Space') input.jump = true;
});
window.addEventListener('keyup', ev => input.keys.delete(ev.code));
window.addEventListener('blur', () => {
  input.keys.clear();
  input.sprint = false;
  if (state.running) pauseGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running) pauseGame();
});

let stickPointer = -1;
function moveStick(ev) {
  if (ev.pointerId !== stickPointer) return;
  const b = els.joy.getBoundingClientRect();
  const radius = b.width * .33;
  const x = clamp((ev.clientX - b.left - b.width / 2) / radius, -1, 1);
  const y = clamp(-(ev.clientY - b.top - b.height / 2) / radius, -1, 1);
  const norm = Math.max(1, Math.hypot(x, y));
  input.joyX = x / norm;
  input.joyY = y / norm;
  els.stick.style.transform = 'translate(calc(-50% + ' + input.joyX * radius + 'px),calc(-50% - ' + input.joyY * radius + 'px))';
}
els.joy.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  if (stickPointer !== -1) return;
  stickPointer = ev.pointerId;
  els.joy.setPointerCapture(ev.pointerId);
  moveStick(ev);
});
els.joy.addEventListener('pointermove', moveStick);
function endStick(ev) {
  if (ev.pointerId !== stickPointer) return;
  stickPointer = -1;
  input.joyX = 0;
  input.joyY = 0;
  els.stick.style.transform = 'translate(-50%,-50%)';
}
els.joy.addEventListener('pointerup', endStick);
els.joy.addEventListener('pointercancel', endStick);

let cameraPointer = null;
els.scene.addEventListener('pointerdown', ev => {
  if (!state.running) return;
  cameraPointer = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
  els.scene.setPointerCapture(ev.pointerId);
});
els.scene.addEventListener('pointermove', ev => {
  if (!cameraPointer || cameraPointer.id !== ev.pointerId) return;
  state.lookYaw += clamp((ev.clientX - cameraPointer.x) * .0043, -.25, .25);
  state.lookPitch = clamp(state.lookPitch + (ev.clientY - cameraPointer.y) * .0021, -.15, .40);
  cameraPointer.x = ev.clientX;
  cameraPointer.y = ev.clientY;
});
els.scene.addEventListener('pointerup', () => { cameraPointer = null; });
els.scene.addEventListener('pointercancel', () => { cameraPointer = null; });

function moveAxis() {
  const k = input.keys;
  let x = input.joyX
    + Number(k.has('KeyD') || k.has('ArrowRight'))
    - Number(k.has('KeyA') || k.has('ArrowLeft'));
  let z = input.joyY
    + Number(k.has('KeyW') || k.has('ArrowUp'))
    - Number(k.has('KeyS') || k.has('ArrowDown'));
  const norm = Math.max(1, Math.hypot(x, z));
  x /= norm;
  z /= norm;
  return {
    x: x * Math.cos(state.lookYaw) + z * Math.sin(state.lookYaw),
    z: z * Math.cos(state.lookYaw) - x * Math.sin(state.lookYaw)
  };
}
function movementHits(x, z) {
  if (x < -9.3 || x > 9.3) return true;
  return colliders.some(c =>
    Math.abs(x - c.x) < c.w / 2 + .6 &&
    Math.abs(z - c.z) < c.d / 2 + .6
  );
}
function touchTraffic(x, z) {
  for (const car of cars) {
    if (car === state.car) continue;
    if (Math.abs(car.x - x) < 2.2 && Math.abs(car.z - z) < 2.9) return true;
  }
  return false;
}
function swapVehicle() {
  if (state.car) {
    state.car.group.visible = true;
    const c = state.car;
    state.x = clamp(c.x + 2.7, -8.5, 8.5);
    state.z = c.z + 1.5;
    state.car = null;
    state.vehicle = 'foot';
    playerGroup.visible = true;
    board.visible = false;
    notify('Exited vehicle • walking', 3);
    return;
  }
  let best = null;
  let bestDist = Infinity;
  for (const car of cars) {
    if (car.police) continue;
    const dist = Math.hypot(car.x - state.x, car.z - state.z);
    if (dist < bestDist) { best = car; bestDist = dist; }
  }
  if (!best || bestDist > 7.5) {
    notify('Get close to a traffic car to enter', 3);
    return;
  }
  state.car = best;
  state.vehicle = 'car';
  state.x = best.x;
  state.z = best.z;
  playerGroup.visible = false;
  if (state.mode === 'free') {
    state.wanted = true;
    helicopter.visible = true;
    allPolice.forEach(p => p.group.visible = true);
    notify('POLICE ALERT • vehicle taken!', 5);
  } else {
    notify('Vehicle acquired • drive to Harbor', 4);
  }
}
function updateTraffic(dt) {
  for (const c of cars) {
    if (c.police || c === state.car) continue;
    c.z += c.direction * c.speed * dt;
    if (c.z > 249) c.z = -249;
    if (c.z < -249) c.z = 249;
    c.group.position.set(c.x, 0, c.z);
    c.group.rotation.y = c.direction === -1 ? Math.PI : 0;
  }
}
function updatePolice(dt) {
  const chase = state.wanted && state.running;
  helicopter.visible = chase;
  for (const [i, p] of allPolice.entries()) {
    p.group.visible = chase;
    if (!chase) continue;
    const desiredX = clamp(state.x + (i === 0 ? -2.5 : 2.5), -7.3, 7.3);
    const desiredZ = state.z - (i === 0 ? 7.3 : 14);
    p.x = lerp(p.x, desiredX, 1 - Math.exp(-2.25 * dt));
    p.z = THREE.MathUtils.damp(p.z, desiredZ, 1.25, dt);
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = Math.atan2(state.x - p.x, state.z - p.z);
    p.lamps[0].visible = Math.sin(state.time * 14 + i) > 0;
    p.lamps[1].visible = !p.lamps[0].visible;
    if (Math.hypot(state.x - p.x, state.z - p.z) < 2.25 && state.cooldown <= 0) {
      state.hearts--;
      state.cooldown = 2.8;
      notify('POLICE HIT! ' + state.hearts + ' hearts left', 3);
      if (state.hearts <= 0) loseGame();
    }
  }
  if (chase) {
    const goalX = state.x - 22 + Math.sin(state.time * .43) * 12;
    const goalZ = state.z - 10;
    helicopter.position.lerp(
      new THREE.Vector3(goalX, 28 + Math.sin(state.time * 1.2) * 1.3, goalZ),
      1 - Math.exp(-0.6 * dt)
    );
    helicopter.lookAt(state.x, 0, state.z);
    rotor.rotation.y += dt * 35;
    searchTarget.position.set(state.x, 0, state.z);
  }
}
function physics(dt) {
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.trickT = Math.max(0, state.trickT - dt);
  const m = moveAxis();
  if (input.swap) {
    if (state.vehicle === 'car') notify('Leave the car before changing board', 3);
    else {
      state.vehicle = state.vehicle === 'skate' ? 'foot' : 'skate';
      board.visible = state.vehicle === 'skate';
      notify(state.vehicle === 'skate' ? 'Neon skateboard equipped' : 'Walking mode', 2.5);
    }
  }
  if (input.car) swapVehicle();
  if (input.trick && state.vehicle === 'skate') {
    state.trickT = .84;
    if (state.y < .05) state.vy = 6;
    notify('KICKFLIP ✦', 1.8);
  }
  input.swap = input.car = input.trick = false;

  const keys = input.keys;
  const running = input.sprint || keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = state.vehicle === 'car' ? (running ? 23 : 17)
    : state.vehicle === 'skate' ? (running ? 16 : 10.3)
    : (running ? 9.5 : 5.5);
  const resistance = state.vehicle === 'car' ? 3.2 : 5.9;
  const approach = 1 - Math.exp(-resistance * dt);
  state.vx = lerp(state.vx, m.x * speed, approach);
  state.vz = lerp(state.vz, m.z * speed, approach);

  if (state.y < .005 && (input.jump || keys.has('Space')) && state.vehicle !== 'car') {
    state.vy = state.vehicle === 'skate' ? 6.2 : 5.8;
  }
  input.jump = false;
  state.vy -= 18 * dt;
  state.y = Math.max(0, state.y + state.vy * dt);
  if (state.y === 0 && state.vy < 0) state.vy = 0;

  const nextX = state.x + state.vx * dt;
  const nextZ = state.z + state.vz * dt;
  // Collision is gameplay physics; the world mesh is not a non-interactive backdrop.
  if (!movementHits(nextX, state.z)) state.x = nextX;
  else state.vx = 0;
  if (!movementHits(state.x, nextZ)) state.z = nextZ;
  else state.vz = 0;
  state.z = clamp(state.z, -246, 248);

  if (touchTraffic(state.x, state.z) && state.cooldown <= 0) {
    state.cooldown = 2.6;
    state.hearts--;
    notify('TRAFFIC COLLISION! ' + state.hearts + ' hearts remain', 4);
    if (state.hearts <= 0) loseGame();
  }
  if (Math.hypot(m.x, m.z) > .08) {
    state.angle = Math.atan2(m.x, m.z);
  }
  playerGroup.position.set(state.x, state.y, state.z);
  playerGroup.rotation.y = THREE.MathUtils.damp(playerGroup.rotation.y, state.angle, 9, dt);

  if (state.car) {
    state.car.x = state.x;
    state.car.z = state.z;
    state.car.group.position.set(state.x, 0, state.z);
    state.car.group.rotation.y = state.angle;
  } else {
    playerGroup.visible = true;
  }
  board.rotation.z = state.trickT > 0 ? Math.sin((1 - state.trickT / .84) * Math.PI * 2) * 1.2 : 0;
  if (riderMixer) {
    const moving = Math.hypot(state.vx, state.vz) > 1;
    riderMixer.update(dt * (moving ? 1.4 : .11));
  }
  if (state.mode === 'chase' && state.z >= 147 && Math.abs(state.x) <= 9) winGame();
}

function updateHud() {
  els.speed.textContent = Math.round(Math.hypot(state.vx, state.vz) * 3.6);
  const healthy = '♥ '.repeat(state.hearts);
  els.health.textContent = healthy + '♡ '.repeat(3 - state.hearts);
  els.wanted.textContent = state.wanted ? '🚨 CHASE' : '✓ CLEAR';
  els.label.textContent = state.mode === 'free' ? '● FREE ROAM' : '● ACTIVE PURSUIT';
  els.objective.textContent = state.mode === 'free' ? 'EXPLORE SUNSET CITY' : 'ESCAPE THE CHASE';
  els.distance.textContent = state.mode === 'free' ?
    'SKATE · RUN · EXPLORE' : '↗ ' + Math.max(0, Math.round(Math.hypot(state.x, state.z - 150))) + ' M · REACH HARBOR';
  if (state.time > state.tipUntil) els.notice.textContent =
    state.mode === 'chase' ? 'Reach Harbor Boulevard to escape!' : 'Free roam • Explore the city!';
}
function drawRadar() {
  const cx = els.radar.getContext('2d');
  if (!cx) return;
  const W = els.radar.width, H = els.radar.height;
  cx.clearRect(0, 0, W, H);
  cx.fillStyle = '#183448';
  cx.fillRect(0, 0, W, H);
  const s = .72;
  const sx = x => W / 2 + (x - state.x) * s;
  const sy = z => H / 2 - (z - state.z) * s;
  cx.fillStyle = '#286b82';
  cx.fillRect(sx(67), 0, W, H);
  cx.strokeStyle = '#b7c9c6';
  cx.lineWidth = 17;
  cx.beginPath();
  cx.moveTo(sx(0), 0);
  cx.lineTo(sx(0), H);
  cx.stroke();
  cx.strokeStyle = '#414e58';
  cx.lineWidth = 14;
  cx.beginPath();
  cx.moveTo(sx(0), 0);
  cx.lineTo(sx(0), H);
  cx.stroke();
  cx.fillStyle = '#394e61';
  for (const building of colliders) {
    const z = sy(building.z);
    if (z < -30 || z > H + 30) continue;
    cx.fillRect(sx(building.x - building.w / 2), sy(building.z + building.d / 2), building.w * s, building.d * s);
  }
  if (state.mode === 'chase') {
    cx.strokeStyle = '#ffd47d';
    cx.lineWidth = 2;
    cx.setLineDash([6, 4]);
    cx.beginPath();
    cx.moveTo(W / 2, H / 2);
    cx.lineTo(sx(0), sy(150));
    cx.stroke();
    cx.setLineDash([]);
    cx.fillStyle = '#ffe09b';
    cx.beginPath();
    cx.arc(sx(0), sy(150), 5, 0, Math.PI * 2);
    cx.fill();
  }
  if (state.wanted) for (const p of allPolice) {
    cx.fillStyle = '#ff4a74';
    cx.fillRect(sx(p.x) - 3, sy(p.z) - 3, 6, 6);
  }
  cx.save();
  cx.translate(W / 2, H / 2);
  cx.rotate(state.angle);
  cx.beginPath();
  cx.moveTo(0, -11);
  cx.lineTo(-7, 8);
  cx.lineTo(0, 4);
  cx.lineTo(7, 8);
  cx.closePath();
  cx.fillStyle = '#6cfff4';
  cx.fill();
  cx.strokeStyle = '#fff';
  cx.lineWidth = 1.3;
  cx.stroke();
  cx.restore();
}

function resize() {
  const w = els.scene.clientWidth;
  const h = els.scene.clientHeight;
  if (!w || !h) return;
  const mobile = window.matchMedia('(pointer:coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.75));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = h > w ? 72 : 61;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const lookAt = new THREE.Vector3(0, 1.6, state.z + 3);
let hudClock = 0;
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(.055, clock.getDelta());
  state.time += dt;
  state.elapsed += state.running ? dt : 0;
  const moveDt = state.running ? dt : Math.min(dt, .018);
  if (state.running) {
    physics(moveDt);
    updateTraffic(moveDt);
    updatePolice(moveDt);
  } else {
    // Keep the title-screen city alive without pretending it is active gameplay.
    if (state.mode === 'menu') {
      updateTraffic(moveDt * .44);
      playerGroup.position.set(0, .03 * Math.sin(state.time * 2), -91);
      helicopter.visible = false;
      allPolice.forEach(p => { p.group.visible = false; });
    }
    if (riderMixer) riderMixer.update(dt * .14);
  }

  const target = state.running || state.mode === 'paused' ?
    new THREE.Vector3(state.x, state.y + 1.65, state.z + 1.45) :
    new THREE.Vector3(0, 1.7, -86);
  lookAt.lerp(target, 1 - Math.exp(-6.5 * dt));
  const offset = new THREE.Vector3(
    -Math.sin(state.lookYaw) * 11.7,
    4.2 + state.lookPitch * 8,
    -Math.cos(state.lookYaw) * 11.7
  );
  camera.position.lerp(lookAt.clone().add(offset), 1 - Math.exp(-7.5 * dt));
  camera.lookAt(lookAt);

  sun.target.position.copy(lookAt);
  sun.position.set(lookAt.x - 85, 58, lookAt.z + 95);
  sun.target.updateMatrixWorld();
  renderer.render(scene, camera);
  hudClock += dt;
  if (hudClock > .16 && state.running) {
    hudClock = 0;
    updateHud();
    drawRadar();
  }
}
loadRider();
loadCarMeshes();
setTimeout(() => { els.indicator.classList.add('hidden'); }, 8500);
tick();

// Development aid: any genuine GPU/model failure is visible, not silently hidden.
window.addEventListener('unhandledrejection', event => {
  console.warn('MegaRush async graphics/asset problem:', event.reason);
});
