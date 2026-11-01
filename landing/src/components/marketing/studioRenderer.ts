import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { RefObject } from "react";
import type { StudioModel } from "./studioModels";

type Live = { paused: boolean; selection: number };
type Entry = {
  host: HTMLDivElement; model: StudioModel; scene: THREE.Scene; camera: THREE.OrthographicCamera;
  progress: RefObject<number>; live: () => Live; selection: number; p: number; width: number; height: number;
  x: number; y: number; tiltX: number; tiltY: number; pointerX: number; pointerY: number;
};

function disposeModel(model: StudioModel) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  model.group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
      materials.add(material); const map = (material as THREE.MeshStandardMaterial).map; if (map) textures.add(map);
    });
  });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
}

/** All lower-page objects share one context, environment, and shader cache. */
function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.2 : 1.5));
  renderer.setClearColor(0, 0); renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.domElement.className = "chrono-studio-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  document.body.appendChild(renderer.domElement);
  const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = generator.fromScene(room, 0.04); generator.dispose(); room.dispose();
  const entries = new Set<Entry>();
  let width = 0, height = 0, lastTime = 0, dirty = true;
  let disposal: ReturnType<typeof setTimeout> | undefined;
  const resize = () => { width = window.innerWidth; height = window.innerHeight; renderer.setSize(width, height, false); dirty = true; };
  resize(); window.addEventListener("resize", resize, { passive: true });
  const reset = () => { dirty = true; }; document.addEventListener("visibilitychange", reset);
  renderer.setAnimationLoop(time => {
    if (document.hidden) return;
    const dt = Math.min((time - lastTime) / 1000, 0.05); lastTime = time;
    const visible: { entry: Entry; rect: DOMRect; p: number }[] = [];
    let draw = dirty;
    entries.forEach(entry => {
      const rect = entry.host.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= height || rect.right <= 0 || rect.left >= width || !rect.width || !rect.height) {
        if (entry.x !== -99999) { entry.x = -99999; draw = true; }
        return;
      }
      const live = entry.live(), p = live.paused ? 1 : entry.progress.current;
      const selection = live.paused ? live.selection : THREE.MathUtils.lerp(entry.selection, live.selection, 1 - Math.exp(-dt * 22));
      const targetX = live.paused ? 0 : entry.pointerY * 0.06, targetY = live.paused ? 0 : entry.pointerX * 0.1;
      const tiltX = THREE.MathUtils.lerp(entry.tiltX, targetX, 1 - Math.exp(-dt * 20));
      const tiltY = THREE.MathUtils.lerp(entry.tiltY, targetY, 1 - Math.exp(-dt * 20));
      if (Math.abs(p - entry.p) > 0.00001 || Math.abs(selection - entry.selection) > 0.0001 || Math.abs(tiltX - entry.tiltX) > 0.0001 || Math.abs(tiltY - entry.tiltY) > 0.0001 || Math.abs(rect.left - entry.x) > 0.1 || Math.abs(rect.top - entry.y) > 0.1) draw = true;
      if (entry.width !== rect.width || entry.height !== rect.height) {
        entry.model.resize?.(rect.width);
        const aspect = rect.width / rect.height, viewHeight = Math.max(entry.model.height, entry.model.width / aspect);
        Object.assign(entry.camera, { left: -viewHeight * aspect / 2, right: viewHeight * aspect / 2, top: viewHeight / 2, bottom: -viewHeight / 2 });
        entry.camera.updateProjectionMatrix(); entry.width = rect.width; entry.height = rect.height; draw = true;
      }
      Object.assign(entry, { selection, tiltX, tiltY, x: rect.left, y: rect.top, p });
      visible.push({ entry, rect, p });
    });
    if (!draw) return;
    renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
    visible.forEach(({ entry, rect, p }) => {
      entry.model.update(p, entry.selection);
      entry.model.group.rotation.x += entry.tiltX; entry.model.group.rotation.y += entry.tiltY;
      renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
      const left = Math.max(0, rect.left), bottom = Math.max(0, height - rect.bottom);
      renderer.setScissor(left, bottom, Math.min(width, rect.right) - left, Math.min(height, height - rect.top) - bottom);
      renderer.clearDepth(); renderer.render(entry.scene, entry.camera);
      entry.model.group.rotation.x -= entry.tiltX; entry.model.group.rotation.y -= entry.tiltY;
      entry.host.dataset.ready = "true";
    });
    dirty = false;
  });
  const lost = (event: Event) => {
    event.preventDefault(); renderer.setAnimationLoop(null);
    entries.forEach(entry => { delete entry.host.dataset.ready; entry.host.dataset.failed = "true"; });
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  return {
    add(host: HTMLDivElement, model: StudioModel, progress: RefObject<number>, live: () => Live) {
      if (disposal) clearTimeout(disposal);
      const scene = new THREE.Scene(); scene.environment = environment.texture; scene.add(model.group);
      scene.add(new THREE.AmbientLight(0xfffcea, 2));
      const key = new THREE.DirectionalLight(0xfff8df, 3.5); key.position.set(-3, 5, 7); scene.add(key);
      const fill = new THREE.DirectionalLight(0xdcebd0, 2.5); fill.position.set(4, 2, -2); scene.add(fill);
      const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 40); camera.position.set(0, 2, 12); camera.lookAt(0, 0, 0);
      const entry: Entry = { host, model, scene, camera, progress, live, selection: live().selection, p: -1, width: 0, height: 0, x: -99999, y: 0, tiltX: 0, tiltY: 0, pointerX: 0, pointerY: 0 };
      entries.add(entry); dirty = true;
      const pointerHost = host.parentElement?.parentElement;
      const pointer = (event: PointerEvent) => {
        if (coarse || live().paused) return;
        const rect = host.getBoundingClientRect();
        entry.pointerX = (event.clientX - rect.left) / rect.width - 0.5; entry.pointerY = (event.clientY - rect.top) / rect.height - 0.5;
      };
      const leave = () => { entry.pointerX = 0; entry.pointerY = 0; };
      pointerHost?.addEventListener("pointermove", pointer, { passive: true }); pointerHost?.addEventListener("pointerleave", leave);
      return () => {
        pointerHost?.removeEventListener("pointermove", pointer); pointerHost?.removeEventListener("pointerleave", leave);
        entries.delete(entry); disposeModel(model); delete host.dataset.ready; dirty = true;
        if (!entries.size) disposal = setTimeout(() => {
          if (entries.size) return;
          renderer.setAnimationLoop(null); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", reset);
          renderer.domElement.removeEventListener("webglcontextlost", lost);
          environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); shared = undefined;
        }, 1500);
      };
    },
  };
}

let shared: ReturnType<typeof createRenderer> | undefined;
export function registerStudioScene(host: HTMLDivElement, model: StudioModel, progress: RefObject<number>, live: () => Live) {
  try { shared ??= createRenderer(); return shared.add(host, model, progress, live); }
  catch { disposeModel(model); host.dataset.failed = "true"; return () => {}; }
}
