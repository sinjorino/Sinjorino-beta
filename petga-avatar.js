import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const VZ = document.getElementById('voz');
if (VZ) {
  const wrap = document.createElement('div');
  wrap.id = 'pg-3d-wrap';
  wrap.style.cssText = [
    'position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0',
    'mix-blend-mode:screen',
    'transition:opacity 1.2s cubic-bezier(.16,1,.3,1)'
  ].join(';');
  VZ.insertBefore(wrap, VZ.firstChild.nextSibling);

  const w = VZ.clientWidth || innerWidth;
  const h = VZ.clientHeight || innerHeight;

  /* 1. Renderer cinematográfico */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); /* preto vira transparente com mix-blend-mode: screen */

  const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 30);
  camera.position.set(0, 0.12, 4.1);

  /* 2. Ambiente físico para reflexos reais no vidro e iridescência */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  /* 3. Iluminação de estúdio escura com rim lights (ciano, magenta e âmbar) */
  const rimCyan = new THREE.SpotLight(0x28e4ff, 26, 14, 0.65, 0.85, 1.2);
  rimCyan.position.set(-2.6, 1.8, -1.6);

  const rimMagenta = new THREE.SpotLight(0xe444ff, 24, 14, 0.65, 0.85, 1.2);
  rimMagenta.position.set(2.5, 1.2, -1.4);

  const rimWarm = new THREE.PointLight(0xff6b3d, 9, 8, 1.5);
  rimWarm.position.set(-1.3, 1.5, 1.4);

  const backAuraLight = new THREE.PointLight(0x7c3aed, 6, 7, 1.6);
  backAuraLight.position.set(0, 0.2, -1.2);

  scene.add(rimCyan, rimMagenta, rimWarm, backAuraLight);

  /* 4. Material físico de vidro líquido + dispersão cromática + iridescência */
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x090b16),
    metalness: 0.06,
    roughness: 0.14,
    transmission: 0.92,
    thickness: 1.25,
    ior: 1.46,
    dispersion: 1.8,
    iridescence: 1.0,
    iridescenceIOR: 1.36,
    iridescenceThicknessRange: [180, 720],
    clearcoat: 1.0,
    clearcoatRoughness: 0.07,
    attenuationColor: new THREE.Color(0x1f0f3d),
    attenuationDistance: 1.2
  });

  const eyeGlowMat = new THREE.MeshStandardMaterial({
    color: 0x05030a,
    emissive: 0xd946ef,
    emissiveIntensity: 2.2,
    roughness: 0.2
  });

  /* 5. Pós-processamento: UnrealBloomPass para glow cinematográfico */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.52, 0.55, 0.62);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  /* 6. Grupo do avatar + aura + fitas translúcidas */
  const rig = new THREE.Group();
  scene.add(rig);

  const morphTargets = []; // guarda { mesh, jawIdx, mouthIdx, blinkL, blinkR }
  let headBone = null, neckBone = null, fallbackGroup = null;

  function buildFallbackBust() {
    const g = new THREE.Group();
    const headGeo = new THREE.SphereGeometry(0.54, 64, 52);
    const p = headGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      y *= 1.25;
      if (y < -0.06) {
        const k = Math.min(1, (-0.06 - y) / 0.58);
        x *= 1 - k * 0.35;
        z *= 1 - k * 0.22;
      }
      if (z > 0.14) {
        const dL = Math.hypot(x + 0.18, y - 0.11);
        const dR = Math.hypot(x - 0.18, y - 0.11);
        z -= Math.max(0, 1 - Math.min(dL, dR) / 0.14) * 0.075;
        const nose = Math.max(0, 1 - Math.abs(x) / 0.065) * Math.max(0, 1 - Math.abs(y + 0.01) / 0.15);
        z += nose * 0.065;
      }
      p.setXYZ(i, x, y, z);
    }
    headGeo.computeVertexNormals();
    const head = new THREE.Mesh(headGeo, glassMat);
    head.position.y = 0.44;

    const torsoGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.88, -0.78),
      new THREE.Vector2(0.72, -0.44),
      new THREE.Vector2(0.38, -0.32),
      new THREE.Vector2(0.19, -0.2),
      new THREE.Vector2(0.18,  0.06),
      new THREE.Vector2(0.22,  0.22)
    ], 56);
    torsoGeo.scale(1, 1, 0.56);
    const torso = new THREE.Mesh(torsoGeo, glassMat);

    const irisGeo = new THREE.RingGeometry(0.044, 0.058, 40);
    const irisL = new THREE.Mesh(irisGeo, eyeGlowMat);
    const irisR = new THREE.Mesh(irisGeo, eyeGlowMat);
    irisL.position.set(-0.18, 0.55, 0.47);
    irisR.position.set(0.18, 0.55, 0.47);
    irisL.rotation.y = -0.18;
    irisR.rotation.y = 0.18;

    g.add(head, torso, irisL, irisR);
    rig.add(g);
    return { g, head, irisL, irisR };
  }

  fallbackGroup = buildFallbackBust();

  /* Tenta carregar o modelo humano realista ./petga.glb (se existir na raiz) */
  new GLTFLoader().load(
    './petga.glb',
    (gltf) => {
      if (fallbackGroup) {
        rig.remove(fallbackGroup.g);
        fallbackGroup = null;
      }
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2.0 / Math.max(0.001, size.y);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));

      model.traverse((obj) => {
        if (obj.isBone) {
          const n = obj.name.toLowerCase();
          if (!headBone && /head/.test(n)) headBone = obj;
          if (!neckBone && /neck/.test(n)) neckBone = obj;
        }
        if (obj.isMesh) {
          const n = obj.name.toLowerCase();
          obj.material = /eye|iris|pupil|cornea/.test(n) ? eyeGlowMat : glassMat;
          if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
            const d = obj.morphTargetDictionary;
            const findKey = (re) => {
              const k = Object.keys(d).find((name) => re.test(name));
              return k !== undefined ? d[k] : -1;
            };
            morphTargets.push({
              mesh: obj,
              jaw: findKey(/jawopen|mouthopen|viseme_aa/i),
              smile: findKey(/mouthsmile/i),
              blinkL: findKey(/eyeblinkleft|blink_l|blink/i),
              blinkR: findKey(/eyeblinkright|blink_r|blink/i)
            });
          }
        }
      });

      rig.add(model);
    },
    undefined,
    () => { /* Sem petga.glb ainda: mantém o busto escultural sem erros */ }
  );

  /* Orbe de aura em partículas + fitas fluidas */
  const N = 220, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), r = 0.08 + Math.random() * 0.24;
    arr[i * 3] = Math.sin(b) * Math.cos(a) * r;
    arr[i * 3 + 1] = Math.cos(b) * r;
    arr[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const aura = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0xf065ff, size: 0.028, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  aura.position.set(0.72, -0.05, 0.55);
  rig.add(aura);

  const ribbons = [];
  for (let r = 0; r < 3; r++) {
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const ang = (k / 20) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(ang) * (1.05 + r * 0.22), Math.sin(ang * 2 + r) * 0.42, Math.sin(ang) * 0.85));
    }
    const rb = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.008, 6, true),
      new THREE.MeshBasicMaterial({ color: r === 1 ? 0x38e4ff : 0xc855ff, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    rb.rotation.set(0.4 * r, 0.6 * r, 0.2 * r);
    rig.add(rb);
    ribbons.push(rb);
  }

  addEventListener('resize', () => {
    const rw = VZ.clientWidth || innerWidth, rh = VZ.clientHeight || innerHeight;
    camera.aspect = rw / rh;
    camera.updateProjectionMatrix();
    renderer.setSize(rw, rh);
    composer.setSize(rw, rh);
    bloomPass.resolution.set(rw, rh);
  });

  let lastT = 0, curOp = 0, blinkT = 0, nextBlink = 3.1, smoothJaw = 0;
  function animate(t) {
    requestAnimationFrame(animate);
    const active = VZ.classList.contains('on') && VZ.classList.contains('petga');
    if (!active) { wrap.style.opacity = '0'; lastT = t; return; }

    const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
    lastT = t;
    const sec = t / 1000;

    const ds = (VZ.dataset.s || 'idle').toLowerCase();
    const isThink = VZ.classList.contains('think') || /think|pens/.test(ds);
    const isSpeak = /speak|fal/.test(ds);

    const targetOp = (isThink || isSpeak) ? 1.0 : 0.0;
    curOp += (targetOp - curOp) * Math.min(1, dt * 2.0);
    wrap.style.opacity = curOp.toFixed(3);
    if (curOp < 0.02) return;

    /* Movimento natural de respiração e cabeça */
    rig.position.y = Math.sin(sec * 1.05) * 0.035;
    rig.rotation.y = Math.sin(sec * 0.42) * 0.14;

    const headRx = isThink ? -0.07 + Math.sin(sec * 1.3) * 0.035 : Math.sin(sec * 0.85) * 0.03;
    const headRz = Math.sin(sec * 0.65) * 0.04;
    if (headBone) { headBone.rotation.x = headRx; headBone.rotation.z = headRz; }

    /* Piscada natural e abertura de boca sincronizada */
    blinkT += dt;
    if (blinkT > nextBlink) { blinkT = 0; nextBlink = 2.4 + Math.random() * 3.5; }
    const blinkVal = blinkT < 0.16 ? Math.sin((blinkT / 0.16) * Math.PI) : 0;

    const targetJaw = isSpeak ? (0.18 + 0.55 * Math.abs(Math.sin(sec * 12.5) * Math.cos(sec * 5.2))) : 0;
    smoothJaw += (targetJaw - smoothJaw) * Math.min(1, dt * 16);

    if (fallbackGroup) {
      fallbackGroup.head.rotation.x = headRx;
      fallbackGroup.head.rotation.z = headRz;
      fallbackGroup.irisL.scale.y = fallbackGroup.irisR.scale.y = Math.max(0.08, 1 - blinkVal);
    }

    for (const mt of morphTargets) {
      const inf = mt.mesh.morphTargetInfluences;
      if (mt.jaw >= 0) inf[mt.jaw] = smoothJaw;
      if (mt.blinkL >= 0) inf[mt.blinkL] = blinkVal;
      if (mt.blinkR >= 0) inf[mt.blinkR] = blinkVal;
    }

    eyeGlowMat.emissiveIntensity = isThink ? (2.2 + Math.sin(sec * 4) * 0.7) : 1.7;
    backAuraLight.intensity = isSpeak ? 8 + smoothJaw * 6 : isThink ? 7 : 4;

    aura.rotation.y += dt * (isThink ? 1.5 : 0.6);
    aura.rotation.x += dt * 0.3;
    aura.position.y = -0.05 + Math.sin(sec * 1.4) * 0.07;

    ribbons.forEach((rb, idx) => {
      rb.rotation.y += dt * (0.2 + idx * 0.07) * (isThink ? 1.7 : 1);
      rb.rotation.z += dt * 0.1;
    });

    composer.render();
  }
  requestAnimationFrame(animate);
}
