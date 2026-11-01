import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { demoProject } from "./demoData";

export type StudioKind = "engine" | "documents" | "essentials" | "team" | "business" | "folder" | "finale";
export type StudioModel = { group: THREE.Group; update: (progress: number, selection: number) => void; width: number; height: number; resize?: (width: number) => void };
const ink = "#324936", sage = "#abc97c", paper = "#fcfbef", steel = "#b6c3a7";
const ease = (p: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(p, a, b);
const mix = THREE.MathUtils.lerp;
const mat = (color: string, metalness = 0, roughness = 0.4) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
function block(w: number, h: number, d: number, material: THREE.Material, radius = 0.04) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, d / 2)), material);
}
function tube(points: number[][], color = steel, radius = 0.016) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 8, false), mat(color, 0.55, 0.3));
}
function textTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, width = 768, height = 512) {
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  draw(canvas.getContext("2d")!, width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function label(text: string, width: number, height = 0.25, color = ink) {
  const texture = textTexture((ctx, w, h) => {
    ctx.fillStyle = color; ctx.font = "500 44px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, w / 2, h / 2);
  }, 1024, 96);
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
}
function check(size = 1, color = ink) {
  const mesh = tube([[-0.44, 0.03, 0], [-0.12, -0.28, 0], [0.48, 0.38, 0]], color, 0.065);
  mesh.scale.setScalar(size); return mesh;
}
function clockTile(width = 1, color = paper) {
  const group = new THREE.Group();
  group.add(block(width, width * 0.78, 0.12, mat(color, 0.12), 0.055));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(width * 0.2, 0.022, 8, 48), mat(ink, 0.35)); ring.position.z = 0.075;
  const hands = tube([[0, width * 0.13, 0.08], [0, 0, 0.08], [width * 0.11, -width * 0.06, 0.08]], ink, 0.019);
  group.add(ring, hands); return group;
}
function ground(group: THREE.Group, width: number, y: number) {
  const texture = textTexture((ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(40,61,35,.18)"); gradient.addColorStop(0.55, "rgba(40,61,35,.07)"); gradient.addColorStop(1, "rgba(40,61,35,0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  }, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.4), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = y; group.add(shadow);
}
function makeFolder() {
  const group = new THREE.Group();
  const back = block(2.1, 1.5, 0.1, mat("#7d9b59", 0.2), 0.05); group.add(back);
  const tab = block(0.78, 0.28, 0.095, mat("#7d9b59", 0.2)); tab.position.set(-0.58, 0.82, 0); group.add(tab);
  const front = new THREE.Group(); front.position.set(0, -0.7, 0.14);
  const panel = block(2.16, 1.32, 0.1, mat(sage, 0.18), 0.05); panel.position.y = 0.66; front.add(panel); front.rotation.x = -0.22;
  const mark = label("ChronoSync", 1.05, 0.12); mark.position.set(0, 0.57, 0.065); front.add(mark);
  group.add(front); return { group, front };
}
function makeEngine(hu: boolean): StudioModel {
  let compact = false;
  const group = new THREE.Group(); ground(group, 12, -1.6);
  const track = tube([[-5.7, -0.25, -0.2], [-3.6, -0.7, 0.25], [-1.4, -0.55, 0.35], [0, 0, 0], [1.6, 0.4, -0.15], [3.5, 0.05, 0], [5.5, -0.3, 0]], "#a7b99a", 0.018); group.add(track);
  const track2 = tube([[-5.5, 0.1, -0.65], [-3.5, -0.4, -0.4], [-1.4, -0.2, -0.2], [0, 0.3, -0.55], [1.6, 0.75, -0.55], [3.5, 0.4, -0.5], [5.5, 0.05, -0.5]], "#c5cebb", 0.012); group.add(track2);
  const gate = new THREE.Group(); gate.rotation.y = -0.28;
  const outer = new THREE.Mesh(new THREE.TorusGeometry(1.23, 0.13, 16, 96), mat("#718d54", 0.6, 0.24));
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.065, 0.037, 10, 96), mat("#d4dfbf", 0.8, 0.24)); gate.add(outer, inner);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6, tick = block(0.035, 0.12, 0.035, mat(paper, 0.3), 0.012);
    tick.position.set(Math.sin(angle) * 1.23, Math.cos(angle) * 1.23, 0.13); tick.rotation.z = -angle; gate.add(tick);
  }
  const tickMark = check(0.75, "#567a3a"); tickMark.position.z = 0.07; gate.add(tickMark);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.08, 0.18, 48), mat("#c3d6a8", 0.25)); pedestal.position.y = -1.4; gate.add(pedestal);
  const sync = label("CHRONOSYNC", 1.8, 0.16); sync.position.set(0, 1.62, 0); gate.add(sync); group.add(gate);
  const folder = makeFolder(); folder.group.position.set(3.65, -0.08, 0); folder.group.rotation.set(-0.13, -0.3, 0.04); group.add(folder.group);
  const cards = demoProject.entries.map((entry, i) => {
    const card = new THREE.Group(); const texture = textTexture((ctx, w, h) => {
      ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#6c8058"; ctx.font = "28px monospace"; ctx.fillText(`0${i + 1} / ACME STUDIO`, 45, 65);
      ctx.fillStyle = ink; ctx.font = "500 105px sans-serif"; ctx.fillText(`${entry.hours} h`, 43, 195);
      ctx.fillStyle = "#8aa76d"; ctx.fillRect(45, 245, 305, 8); ctx.fillRect(45, 277, 210, 8);
    }, 512, 340);
    card.add(block(1.18, 0.79, 0.07, mat(paper), 0.025));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.13, 0.75), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })); face.position.z = 0.039; card.add(face);
    group.add(card); return card;
  });
  const seal = check(0.22, ink); seal.position.set(4.2, -0.45, 0.3); group.add(seal);
  const folderLabel = label(hu ? "24 ÓRA / JÓVÁHAGYVA" : "24 HOURS / APPROVED", 1.5, 0.12); folderLabel.position.set(3.6, -1.2, 0); group.add(folderLabel);
  // These curves never change with scroll. Reuse them instead of allocating
  // vectors and Beziers for every card on every animation frame.
  const paths = [false, true].map(small => cards.map((_, i) => new THREE.CubicBezierCurve3(
    new THREE.Vector3((small ? -2.7 : -4.5) + (i % 2) * (small ? 0.65 : 1.28), i < 2 ? 0.8 : -0.55, i * 0.09),
    new THREE.Vector3(-1.6, 1.4 - i * 0.26, 0.5), new THREE.Vector3(1.5, 0.15, 0),
    new THREE.Vector3((small ? 2.45 : 3.65) + i * 0.055, 0.3 + i * 0.09, -0.06 + i * 0.07),
  )));
  const model: StudioModel = { group, width: 12.7, height: 4.8, resize(width) { compact = width < 550; model.width = compact ? 7.8 : 12.7; }, update(p) {
    const destination = compact ? 2.45 : 3.65;
    folder.group.position.x = destination; folder.group.scale.setScalar(compact ? 0.86 : 1);
    folderLabel.position.x = destination; folderLabel.scale.setScalar(compact ? 0.8 : 1);
    seal.position.x = destination + 0.55;
    cards.forEach((card, i) => {
      const q = ease(p, 0.04 + i * 0.08, 0.6 + i * 0.08);
      paths[compact ? 1 : 0][i].getPoint(q, card.position); card.rotation.set(mix(-0.12, -0.08, q), mix(-0.2, -0.3, q), mix((i - 1.5) * 0.16, 0.04, q));
      card.scale.setScalar(mix(1, 0.86, ease(q, 0.7, 1)));
    });
    gate.rotation.z = (1 - ease(p, 0, 0.8)) * -0.16;
    tickMark.scale.setScalar(0.75 * ease(p, 0.32, 0.61));
    folder.front.rotation.x = mix(-0.65, -0.18, ease(p, 0.55, 1));
    seal.scale.setScalar(0.22 * ease(p, 0.73, 0.9));
  } }; return model;
}
function documentTexture(kind: number, hu: boolean) {
  return textTexture((ctx, w, h) => {
    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#63824a"; ctx.font = "500 34px sans-serif"; ctx.fillText("◷ ChronoSync", 55, 75);
    ctx.fillStyle = "#7b8c6d"; ctx.font = "18px monospace"; ctx.fillText(hu ? "SZEMLÉLTETŐ MINTA" : "ILLUSTRATIVE SAMPLE", 55, 116);
    ctx.fillStyle = ink; ctx.font = "italic 48px Georgia"; ctx.fillText((hu ? ["Projektösszesítő", "Számlaelőnézet", "Időbejegyzések"] : ["Project summary", "Invoice preview", "Time entries"])[kind], 55, 200);
    ctx.font = "500 26px sans-serif"; ctx.fillText(demoProject.client, 55, 260); ctx.fillStyle = "#6d7e60"; ctx.font = "21px sans-serif"; ctx.fillText(demoProject.project, 55, 295);
    demoProject.entries.forEach((entry, i) => {
      const y = 380 + i * 74; ctx.strokeStyle = "#d6decb"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(55, y - 30); ctx.lineTo(w - 55, y - 30); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = "20px sans-serif"; ctx.fillText(kind === 2 ? entry.date : entry.task, 55, y); ctx.textAlign = "right"; ctx.fillText(`${entry.hours} h`, w - 55, y); ctx.textAlign = "left";
    });
    ctx.fillStyle = "#e4edce"; ctx.fillRect(55, 700, w - 110, 110); ctx.fillStyle = ink; ctx.font = "22px sans-serif"; ctx.fillText("24 h × €75", 78, 745); ctx.font = "500 40px sans-serif"; ctx.textAlign = "right"; ctx.fillText("€1,800", w - 78, 777);
  }, 640, 880);
}
function makeDocuments(hu: boolean): StudioModel {
  const group = new THREE.Group(); ground(group, 7, -2.25);
  const folder = makeFolder(); folder.group.scale.setScalar(1.5); folder.group.position.set(0, -0.9, -0.6); folder.group.rotation.set(-0.18, 0, -0.05); group.add(folder.group);
  const sheets = [0, 1, 2].map(i => {
    const sheet = new THREE.Group(); sheet.add(block(2.25, 3.1, 0.045, mat(paper), 0.018));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.22, 3.055), new THREE.MeshBasicMaterial({ map: documentTexture(i, hu), toneMapped: false })); face.position.z = 0.025; sheet.add(face);
    const tab = block(0.6, 0.25, 0.05, mat(i === 1 ? sage : "#dce4c7")); tab.position.set(0.65, 1.59, 0); sheet.add(tab);
    const name = label(["PDF", "INVOICE", "CSV"][i], 0.45, 0.075); name.position.set(0.65, 1.59, 0.028); sheet.add(name);
    group.add(sheet); return sheet;
  });
  return { group, width: 6.7, height: 5.6, update(p, selection) {
    sheets.forEach((sheet, i) => {
      const active = Math.max(0, 1 - Math.abs(selection - i)), spread = ease(p, 0.1, 0.8);
      sheet.position.set((i - 1) * mix(0.2, 1.15, spread), -0.2 + active * 0.55 + spread * 0.25, i * 0.05 + active * 0.75);
      sheet.rotation.set(mix(-0.3, -0.08, spread), (i - 1) * -0.12, (i - 1) * -0.15 * spread);
      sheet.scale.setScalar(0.82 + active * 0.09);
    });
    folder.front.rotation.x = mix(-0.12, -0.65, ease(p, 0.08, 0.65));
  } };
}
function makePlan(kind: StudioKind): StudioModel {
  const group = new THREE.Group(); ground(group, 5, -1.1);
  const amount = kind === "essentials" ? 1 : kind === "team" ? 3 : 5;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.43, 1.5, 0.12, 64), mat("#ceddb5", 0.35)); base.position.y = -0.94; group.add(base);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.015, 8, 80), mat("#829c64", 0.7)); orbit.rotation.x = Math.PI / 2; orbit.position.y = -0.79; group.add(orbit);
  const tiles = Array.from({ length: amount }, (_, i) => {
    const tile = clockTile(kind === "essentials" ? 1.4 : 1.04, i === amount - 1 ? sage : paper); group.add(tile); return tile;
  });
  let framework: THREE.Group | null = null;
  if (kind === "business") {
    framework = new THREE.Group();
    const back = block(2.65, 1.66, 0.1, mat("#718b54", 0.55)); back.position.set(0, 0.02, -0.5); framework.add(back);
    const heading = label("CHRONOSYNC", 1.5, 0.14, paper); heading.position.set(0, 0.58, -0.44); framework.add(heading);
    const ledge = block(2.85, 0.12, 1.5, mat("#91ac6f", 0.5)); ledge.position.set(0, -0.82, 0.05); framework.add(ledge); group.add(framework);
  }
  return { group, width: 4.7, height: 3.1, update(p) {
    const assembly = ease(p, 0.05, 0.85);
    tiles.forEach((tile, i) => {
      const targetX = amount === 1 ? 0 : (i % 3 - (amount === 3 ? 1 : 1)) * 0.73;
      const targetY = amount === 1 ? 0 : amount === 3 ? (i === 1 ? 0.3 : -0.18) : (i < 3 ? -0.18 : 0.42);
      tile.position.set(mix((i - (amount - 1) / 2) * 1.15, amount === 5 && i > 2 ? (i === 3 ? -0.4 : 0.4) : targetX, assembly), targetY + (1 - assembly) * (i % 2 ? 1 : -0.3), amount === 5 ? 0.05 + i * 0.035 : i * 0.12);
      tile.rotation.set(-0.12, -0.22, mix((i - 1) * 0.28, (i - (amount - 1) / 2) * -0.08, assembly));
      tile.scale.setScalar(amount === 5 ? 0.67 : 1);
    });
    group.rotation.y = -0.2 + (1 - assembly) * 0.15;
    if (framework) framework.position.y = (1 - assembly) * -0.45;
  } };
}
function makeIndexFolder(): StudioModel {
  const group = new THREE.Group(); ground(group, 5.5, -1.3);
  const folder = makeFolder(); folder.group.scale.setScalar(1.5); folder.group.rotation.set(-0.15, -0.25, -0.07); group.add(folder.group);
  const files = [0, 1, 2, 3].map(i => {
    const file = new THREE.Group(); file.add(block(2.6, 1.7, 0.035, mat(i === 0 ? paper : "#e9eddb")));
    const tab = block(0.56, 0.3, 0.04, mat(i % 2 ? sage : "#d5dfbf")); tab.position.set(-0.94 + i * 0.62, 0.95, 0); file.add(tab);
    const number = label(`0${i + 1}`, 0.3, 0.1); number.position.set(-0.94 + i * 0.62, 0.95, 0.025); file.add(number);
    for (let j = 0; j < 3; j++) { const line = block(1.8 - j * 0.25, 0.035, 0.01, mat("#b6c79d"), 0.002); line.position.set(-j * 0.12, 0.45 - j * 0.22, 0.025); file.add(line); }
    group.add(file); return file;
  });
  return { group, width: 5.4, height: 4.2, update(p, selection) {
    files.forEach((file, i) => {
      const active = Math.max(0, 1 - Math.abs(selection - i));
      file.position.set((i - 1.5) * 0.04, 0.12 + active * 0.48 + ease(p) * 0.12, -0.1 + i * 0.065 + active * 0.12);
      file.rotation.set(-0.12, -0.25, -0.07 + active * 0.035);
    });
    folder.front.rotation.x = -0.36 - ease(p) * 0.2;
  } };
}
function makeFinale(): StudioModel {
  const group = new THREE.Group(); ground(group, 6.5, -1.9);
  const mechanism = new THREE.Group(); group.add(mechanism);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, 0.17, 64), mat(paper, 0.1)); face.rotation.x = Math.PI / 2; mechanism.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 16, 96), mat("#728f51", 0.65, 0.25)); mechanism.add(rim);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.025, 8, 96), mat(steel, 0.9, 0.2)); mechanism.add(inner);
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const tile = block(i % 3 === 0 ? 0.075 : 0.035, i % 3 === 0 ? 0.21 : 0.12, 0.065, mat(ink, 0.3), 0.014); mechanism.add(tile); return tile;
  });
  const hands = new THREE.Group(); hands.position.z = 0.19;
  const minute = block(0.055, 0.87, 0.05, mat(ink, 0.4)); minute.position.set(0.25, 0.23, 0); minute.rotation.z = -0.82;
  const hour = block(0.085, 0.6, 0.05, mat(ink, 0.4)); hour.position.set(-0.19, 0.17, 0); hour.rotation.z = 0.85; hands.add(minute, hour);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 12), mat(sage, 0.7)); pin.scale.z = 0.5; hands.add(pin); mechanism.add(hands);
  const brand = label("ChronoSync", 1.1, 0.15); brand.position.set(0, -0.62, 0.1); mechanism.add(brand);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.012, 8, 96), mat("#77995c", 0.6)); orbit.rotation.set(0.35, -0.5, 0); mechanism.add(orbit);
  return { group, width: 5.4, height: 4.8, update(p) {
    const assembly = ease(p, 0.12, 0.84);
    mechanism.rotation.set(mix(0.48, 0.08, assembly), mix(-0.5, -0.18, assembly), mix(-0.24, -0.07, assembly));
    face.position.z = mix(-1.6, 0, assembly); rim.position.z = mix(1.6, 0.08, assembly); inner.position.z = mix(0.8, 0.15, assembly);
    ticks.forEach((tick, i) => {
      const angle = i / 12 * Math.PI * 2, r = mix(2.05 + (i % 3) * 0.2, 1.12, assembly);
      tick.position.set(Math.sin(angle) * r, Math.cos(angle) * r, mix((i % 3 - 1) * 0.9, 0.13, assembly)); tick.rotation.z = -angle + (1 - assembly) * 0.6;
    });
    hands.position.z = mix(2.4, 0.19, assembly); hands.rotation.z = (1 - assembly) * -1.3;
    orbit.rotation.z = (1 - assembly) * 0.8; orbit.scale.setScalar(mix(1.13, 1, assembly));
  } };
}


export function createStudioModel(kind: StudioKind, language: "en" | "hu"): StudioModel {
  return kind === "engine" ? makeEngine(language === "hu") : kind === "documents" ? makeDocuments(language === "hu") : kind === "folder" ? makeIndexFolder() : kind === "finale" ? makeFinale() : makePlan(kind);
}
