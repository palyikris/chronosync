import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { getClockSweepState } from "./clockSweep";

type SceneProps = {
  kind: "clock" | "laptop";
  progress: RefObject<number>;
  paused: boolean;
  image?: string;
};

const material = (color: string, metalness = 0, roughness = 0.45) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

function box(w: number, h: number, d: number, mat: THREE.Material, radius = 0.06) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), mat);
}

function makeClock() {
  const group = new THREE.Group();
  const green = material("#8ba953", 0.45, 0.3);
  const dark = material("#334425", 0.35, 0.28);
  const cream = material("#f5f4e5", 0.08, 0.6);
  const steel = material("#d8dec6", 0.82, 0.23);
  const cylinder = (radius: number, depth: number, mat: THREE.Material, z: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 64), mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = z;
    group.add(mesh);
  };
  cylinder(1.52, 0.38, green, 0);
  cylinder(1.47, 0.09, dark, 0.21);
  cylinder(1.35, 0.025, cream, 0.268);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.415, 0.055, 16, 96), steel);
  rim.position.z = 0.265;
  group.add(rim);
  const majorTicks = new THREE.InstancedMesh(new RoundedBoxGeometry(0.039, 0.15, 0.012, 2, 0.006), dark, 12);
  const minorTicks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 0.055, 0.012), dark, 48);
  const tick = new THREE.Object3D();
  let majorIndex = 0;
  let minorIndex = 0;
  for (let i = 0; i < 60; i++) {
    const angle = i / 60 * Math.PI * 2;
    tick.position.set(Math.sin(angle) * 1.2, Math.cos(angle) * 1.2, 0.292);
    tick.rotation.z = -angle;
    tick.updateMatrix();
    if (i % 5 === 0) majorTicks.setMatrixAt(majorIndex++, tick.matrix);
    else minorTicks.setMatrixAt(minorIndex++, tick.matrix);
  }
  group.add(majorTicks, minorTicks);
  const hand = (length: number, width: number, mat: THREE.Material, z: number) => {
    const pivot = new THREE.Group();
    const mesh = box(width, length, 0.035, mat, width / 2);
    mesh.position.set(0, length / 2 - 0.08, z);
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  };
  const hours = hand(0.69, 0.095, dark, 0.33);
  const minutes = hand(0.99, 0.065, dark, 0.38);
  const seconds = hand(1.1, 0.018, green, 0.42);
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 16), steel);
  center.scale.z = 0.45;
  center.position.z = 0.43;
  group.add(center);

  const dial = document.createElement("canvas");
  dial.width = 512;
  dial.height = 512;
  const ctx = dial.getContext("2d")!;
  ctx.fillStyle = "#5d6b45";
  ctx.font = "500 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ChronoSync", 256, 350);
  ctx.font = "12px sans-serif";
  ctx.fillText("MAKE TIME", 256, 375);
  const dialTexture = new THREE.CanvasTexture(dial);
  dialTexture.colorSpace = THREE.SRGBColorSpace;
  const dialMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: dialTexture, transparent: true, depthWrite: false }));
  dialMesh.position.z = 0.3;
  group.add(dialMesh);
  return { group, hours, minutes, seconds };
}

function makeLaptop() {
  const group = new THREE.Group();
  const shell = material("#727e66", 0.88, 0.3);
  const dark = material("#242c23", 0.35, 0.45);
  const keyMaterial = material("#37412f", 0.25, 0.65);
  const base = box(5.25, 0.15, 3.25, shell, 0.12);
  group.add(base);
  const keyboard = box(4.55, 0.025, 1.45, dark.clone(), 0.08);
  keyboard.position.set(0, 0.085, -0.35);
  group.add(keyboard);
  const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.268, 0.028, 0.205, 2, 0.025), keyMaterial, 70);
  const key = new THREE.Object3D();
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 14; col++) {
      key.position.set(-2.06 + col * 0.317, 0.11, -0.88 + row * 0.265);
      key.updateMatrix();
      keys.setMatrixAt(row * 14 + col, key.matrix);
    }
  }
  group.add(keys);
  const trackpad = box(1.65, 0.012, 0.79, material("#89957b", 0.65, 0.38), 0.06);
  trackpad.position.set(0, 0.088, 0.99);
  group.add(trackpad);
  for (const mesh of [keys, keyboard, trackpad]) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.transparent = true;
  }
  const notch = box(0.8, 0.025, 0.06, dark, 0.015);
  notch.position.set(0, 0.05, 1.61);
  group.add(notch);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.09, -1.48);
  const lid = box(5.25, 3.25, 0.13, shell, 0.13);
  lid.position.y = 1.625;
  hinge.add(lid);
  const bezel = box(5.05, 3.05, 0.03, dark, 0.08);
  bezel.position.set(0, 1.625, 0.075);
  hinge.add(bezel);
  const screenMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.85, 2.78), screenMaterial);
  screen.position.set(0, 1.63, 0.095);
  hinge.add(screen);
  const paperCanvas = document.createElement("canvas");
  paperCanvas.width = 1024;
  paperCanvas.height = 600;
  const paperContext = paperCanvas.getContext("2d")!;
  paperContext.fillStyle = "#fffdf1";
  paperContext.fillRect(0, 0, 1024, 600);
  paperContext.strokeStyle = "#dce3cb";
  for (let y = 54; y < 600; y += 42) { paperContext.beginPath(); paperContext.moveTo(0, y); paperContext.lineTo(1024, y); paperContext.stroke(); }
  paperContext.fillStyle = "#667d43";
  paperContext.font = "italic 45px Georgia";
  paperContext.fillText("Acme Studio", 75, 135);
  paperContext.font = "26px sans-serif";
  paperContext.fillText("Brand exploration", 75, 205);
  paperContext.fillText("22 h + 2 h = 24 h", 75, 295);
  const paperTexture = new THREE.CanvasTexture(paperCanvas);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  const paperMaterial = new THREE.MeshBasicMaterial({ map: paperTexture, transparent: true, depthWrite: false, toneMapped: false });
  const paperScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.86, 2.79), paperMaterial);
  paperScreen.position.set(0, 1.63, 0.105);
  hinge.add(paperScreen);
  const bindings = new THREE.Group();
  const bindingMaterial = material("#7a8268", 0.3, 0.4);
  bindingMaterial.transparent = true;
  const bindingGeometry = new THREE.TorusGeometry(0.09, 0.015, 6, 16);
  for (let i = 0; i < 12; i++) {
    const ring = new THREE.Mesh(bindingGeometry, bindingMaterial);
    ring.position.set(-2.2 + i * 0.4, 0.17, -1.45);
    ring.rotation.y = Math.PI / 2;
    bindings.add(ring);
  }
  group.add(bindings);
  const webcam = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), material("#77916b", 0.7));
  webcam.position.set(0, 3.115, 0.095);
  hinge.add(webcam);
  group.add(hinge);
  group.position.y = -1.25;
  return { group, hinge, screenMaterial, shell, paperMaterial, bindingMaterial, bindings, keys, keyboard, trackpad, framingMeshes: [base, lid] };
}

export function ThreeScene({ kind, progress, paused, image = "/marketing/app-timesheets.png" }: SceneProps) {
  const mount = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const invalidation = useRef(0);
  const screenRef = useRef<THREE.MeshBasicMaterial | null>(null);
  useEffect(() => { pausedRef.current = paused; invalidation.current++; }, [paused]);

  useEffect(() => {
    if (kind !== "laptop" || !screenRef.current) return;
    let cancelled = false;
    const mat = screenRef.current;
    const loader = new THREE.TextureLoader();
    let loaded: THREE.Texture | undefined;
    loader.load(image, (texture) => {
      loaded = texture;
      if (cancelled) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      mat.map?.dispose();
      mat.map = texture;
      mat.needsUpdate = true;
      invalidation.current++;
    });
    return () => { cancelled = true; loaded?.dispose(); };
  }, [image, kind]);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      host.dataset.failed = "true";
      return;
    }
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.2 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    host.dataset.ready = "true";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(kind === "clock" ? 35 : 28, 1, 0.1, 40);
    camera.position.set(0, kind === "clock" ? 0 : 2.2, kind === "clock" ? 7.2 : 6.3);
    camera.lookAt(0, 0, 0);
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    generator.dispose();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const keyLight = new THREE.DirectionalLight(0xfffbe7, 4);
    keyLight.position.set(-3, 5, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xc9e7aa, 2.5);
    rimLight.position.set(4, -1, 1);
    scene.add(rimLight);
    const clock = kind === "clock" ? makeClock() : null;
    const laptop = kind === "laptop" ? makeLaptop() : null;
    if (clock) scene.add(clock.group);
    let initialTexture: THREE.Texture | undefined;
    let disposed = false;
    if (laptop) {
      scene.add(laptop.group);
      screenRef.current = laptop.screenMaterial;
      new THREE.TextureLoader().load(image, (texture) => {
        initialTexture = texture;
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        laptop.screenMaterial.map = texture;
        laptop.screenMaterial.needsUpdate = true;
        invalidation.current++;
      });
    }
    const orbit = new THREE.Group();
    if (clock) {
      for (let i = 0; i < 2; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.98 + i * 0.17, 0.008, 6, 120), material("#6b8949", 0.6, 0.5));
        ring.rotation.set(0.65 + i * 0.5, -0.5, i * 0.4);
        orbit.add(ring);
      }
      [[-1.8, 1.2, 0.1], [1.9, -0.7, 0.3], [1.4, 1.8, -0.4]].forEach(([x, y, z], i) => {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(i === 1 ? 0.09 : 0.05, 20, 16), material(i === 1 ? "#f0f2dc" : "#536c31", 0.6, 0.3));
        ball.position.set(x, y, z);
        orbit.add(ball);
      });
      scene.add(orbit);
    }
    let visible = true;
    let pointerX = 0;
    let pointerY = 0;
    const pointer = (event: PointerEvent) => {
      if (pausedRef.current || mobile) return;
      const rect = host.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.16;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.1;
    };
    host.addEventListener("pointermove", pointer, { passive: true });
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) invalidation.current++; });
    observer.observe(host);
    const laptopBounds = new THREE.Box3();
    const laptopFramingPoints: THREE.Vector3[] = [];
    if (laptop) {
      // Frame the whole opening motion, including the front edge of the base.
      for (const angle of [1.5, 0.7, -0.15]) {
        laptop.hinge.rotation.x = angle;
        laptop.group.scale.setScalar(angle === 1.5 ? 0.76 : angle === 0.7 ? 0.88 : 1);
        for (const rotation of [-0.15, 0.25]) {
          laptop.group.rotation.y = rotation;
          laptop.group.updateMatrixWorld(true);
          for (const mesh of laptop.framingMeshes) {
            mesh.geometry.computeBoundingBox();
            const bounds = mesh.geometry.boundingBox!;
            for (const x of [bounds.min.x, bounds.max.x]) {
              for (const y of [bounds.min.y, bounds.max.y]) {
                for (const z of [bounds.min.z, bounds.max.z]) {
                  laptopFramingPoints.push(new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld));
                }
              }
            }
          }
        }
      }
      laptop.hinge.rotation.x = -0.15;
      laptop.group.scale.setScalar(1);
      laptop.group.rotation.y = -0.12;
      laptop.group.updateMatrixWorld(true);
      laptopBounds.setFromObject(laptop.group);
    }
    const resize = new ResizeObserver(() => {
      // Layout dimensions stay stable while GSAP transforms the stage.
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      if (laptop) {
        const target = laptopBounds.getCenter(new THREE.Vector3());
        const direction = new THREE.Vector3(0, 0.3, 1).normalize();
        camera.position.copy(target).add(direction);
        camera.lookAt(target);
        const inverseRotation = camera.quaternion.clone().invert();
        const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        let distance = 0;
        for (const worldPoint of laptopFramingPoints) {
          const point = worldPoint.clone().sub(target).applyQuaternion(inverseRotation);
          distance = Math.max(distance, point.z + Math.max(Math.abs(point.y) / (tangent * 0.9), Math.abs(point.x) / (tangent * camera.aspect * 0.9)));
        }
        camera.position.copy(target).addScaledVector(direction, distance);
        camera.lookAt(target);
      }
      camera.updateProjectionMatrix();
      invalidation.current++;
    });
    resize.observe(host);
    let activeTime = 0;
    let lastTime = 0;
    let lastProgress = -1;
    let lastPointerX = -1;
    let lastInvalidation = -1;
    const paperColor = new THREE.Color("#e7e8d5");
    const metalColor = new THREE.Color("#727e66");
    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (!visible || document.hidden) return;
      if (!pausedRef.current) activeTime += delta;
      const p = progress.current;
      // The clock is completely covered after its sweep; its canvas can still
      // intersect the viewport beneath the notebook during the sticky handoff.
      if (clock && p >= 0.97) return;
      if ((laptop || pausedRef.current) && invalidation.current === lastInvalidation && Math.abs(p - lastProgress) < 0.00001 && Math.abs(pointerX - lastPointerX) < 0.0001) return;
      lastProgress = p; lastPointerX = pointerX;
      lastInvalidation = invalidation.current;
      if (clock) {
        const state = getClockSweepState(p);
        const tilt = 1 - state.settle;
        clock.group.rotation.set((0.16 + pointerY) * tilt, (-0.38 + pointerX) * tilt, -0.15 * tilt);
        clock.group.position.y = Math.sin(activeTime * 0.9) * 0.055 * tilt;
        clock.group.scale.setScalar(1 - state.settle * 0.07);
        clock.hours.rotation.z = -Math.PI / 3 - state.sweep * Math.PI / 6;
        clock.minutes.rotation.z = -state.minuteAngle;
        clock.minutes.visible = p < 0.3;
        clock.seconds.rotation.z = -Math.floor(activeTime * 2) * Math.PI / 30;
        orbit.rotation.z = activeTime * 0.025;
        orbit.rotation.y = state.settle * 0.12;
      }
      if (laptop) {
        const morph = THREE.MathUtils.smoothstep(p, 0.1, 0.72);
        laptop.shell.color.copy(paperColor).lerp(metalColor, morph);
        laptop.shell.metalness = morph * 0.88;
        laptop.paperMaterial.opacity = 1 - THREE.MathUtils.smoothstep(p, 0.18, 0.65);
        laptop.bindingMaterial.opacity = 1 - THREE.MathUtils.smoothstep(p, 0.12, 0.55);
        laptop.bindings.visible = p < 0.56;
        const hardware = THREE.MathUtils.smoothstep(p, 0.22, 0.62);
        for (const mesh of [laptop.keys, laptop.keyboard, laptop.trackpad]) {
          mesh.visible = hardware > 0.001;
          (mesh.material as THREE.MeshStandardMaterial).opacity = hardware;
        }
        const opening = THREE.MathUtils.smoothstep(p, 0.1, 0.96);
        laptop.hinge.rotation.x = 1.5 - opening * 1.65;
        laptop.group.scale.setScalar(0.76 + opening * 0.24);
        laptop.group.rotation.y = -0.12 + (1 - opening) * 0.14 + pointerX * 0.15 * opening;
        laptop.group.rotation.z = (1 - opening) * -0.025;
        laptop.group.position.y = -1.25 + (1 - opening) * 0.75;
      }
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(render);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      renderer.setAnimationLoop(null);
      delete host.dataset.ready;
      host.dataset.failed = "true";
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    return () => {
      disposed = true;
      observer.disconnect();
      resize.disconnect();
      host.removeEventListener("pointermove", pointer);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.setAnimationLoop(null);
      const textures = new Set<THREE.Texture>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach((mat) => {
          materials.add(mat);
          const map = (mat as THREE.MeshStandardMaterial).map;
          if (map) textures.add(map);
        });
      });
      textures.forEach((texture) => texture.dispose());
      materials.forEach((mat) => mat.dispose());
      initialTexture?.dispose();
      screenRef.current = null;
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete host.dataset.ready;
    };
    // Scene geometry is built once; changing demo tabs replaces only the texture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, progress]);

  return <div className={`chrono-three chrono-three--${kind}`} ref={mount} aria-hidden="true">
    {kind === "clock" ? <div className="chrono-clock-fallback"><span /><i /><b /></div> : <div className="chrono-laptop-fallback"><img src={image} alt="" /></div>}
  </div>;
}
