import * as THREE from 'three';

const C = { compute: 0xff9900, storage: 0x3fae29, database: 0x3b6ef5, net: 0x8c4fff, sec: 0xdd344c, integ: 0xe7157b, mgmt: 0xc925d1 };
const DARK = 0x2a2f3a, MID = 0x4a5263, LIGHT = 0xdfe6f0;

// M(g, geometry, color, x, y, z, opts{em, op, rot:[x,y,z], met, rough})
function M(g, geo, color, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.55, metalness: o.met ?? 0.25,
    emissive: o.em ? (o.emc ?? color) : 0x000000, emissiveIntensity: o.em || 0,
    transparent: o.op !== undefined, opacity: o.op ?? 1, flatShading: true,
  }));
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(...o.rot);
  m.castShadow = true;
  g.add(m);
  return m;
}
const box = (g, w, h, d, c, x, y, z, o) => M(g, new THREE.BoxGeometry(w, h, d), c, x, y, z, o);
const cyl = (g, rt, rb, h, c, x, y, z, o, s = 12) => M(g, new THREE.CylinderGeometry(rt, rb, h, s), c, x, y, z, o);
const sph = (g, r, c, x, y, z, o) => M(g, new THREE.SphereGeometry(r, 14, 10), c, x, y, z, o);
const cone = (g, r, h, c, x, y, z, o, s = 10) => M(g, new THREE.ConeGeometry(r, h, s), c, x, y, z, o);
const tor = (g, r, t, c, x, y, z, o) => M(g, new THREE.TorusGeometry(r, t, 8, 24), c, x, y, z, o);
const oct = (g, r, c, x, y, z, o) => M(g, new THREE.OctahedronGeometry(r), c, x, y, z, o);
const arrowUp = (g, c, x, y, z, s = 1, flip = false, o = {}) => {
  const a = cone(g, 0.1 * s, 0.2 * s, c, x, y + 0.15 * s, z, { em: 0.6, ...o });
  const b = box(g, 0.07 * s, 0.25 * s, 0.07 * s, c, x, y, z, { em: 0.6, ...o });
  if (flip) { a.rotation.z = Math.PI; a.position.y = y - 0.15 * s; }
  return [a, b];
};
const pad = (g, c, r = 0.6, h = 0.08) => cyl(g, r, r * 1.05, h, DARK, 0, h / 2, 0, { met: 0.5 }, 16);
const slabShape = (pts, depth, bevel = 0) => {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2); return geo;
};
const bolt = (g, c, x, y, z, s = 1, o = {}) => M(g, slabShape([[0.1, 0.5], [-0.15, 0], [0, 0], [-0.1, -0.5], [0.15, 0.05], [0.02, 0.05]].map(p => [p[0] * s, p[1] * s]), 0.08 * s), c, x, y, z, { em: 0.9, ...o });
const dbStack = (g, c, x, z, r, n, h = 0.28, o = {}) => {
  const ms = [];
  for (let i = 0; i < n; i++) {
    ms.push(cyl(g, r, r, h * 0.85, c, x, h / 2 + i * h, z, { met: 0.4, ...o }, 20));
    cyl(g, r * 1.03, r * 1.03, 0.03, LIGHT, x, h * 0.9 + i * h, z, { em: 0.4, emc: c, ...o }, 20);
  }
  return ms;
};
const globe = (g, c, y, r = 0.45) => {
  sph(g, r, 0x1d3a6a, 0, y, 0, { met: 0.1 });
  tor(g, r * 1.01, 0.015, c, 0, y, 0, { em: 0.8 });
  tor(g, r * 1.01, 0.015, c, 0, y, 0, { em: 0.8, rot: [0, Math.PI / 2, 0] });
  tor(g, r * 1.01, 0.015, c, 0, y, 0, { em: 0.8, rot: [Math.PI / 2, 0, 0] });
};
const head = (g, c, x, y, z, r = 0.14) => sph(g, r, c, x, y, z);

const B = {
  // ---------- compute
  ec2(g, A) {
    pad(g); box(g, 0.7, 1.5, 0.6, DARK, 0, 0.83, 0, { met: 0.6 });
    const leds = [];
    for (let i = 0; i < 6; i++) {
      box(g, 0.6, 0.15, 0.04, MID, 0, 0.3 + i * 0.22, 0.31);
      box(g, 0.25, 0.04, 0.02, C.compute, -0.12, 0.3 + i * 0.22, 0.33, { em: 0.4 });
      leds.push(sph(g, 0.03, C.compute, 0.22, 0.3 + i * 0.22, 0.33, { em: 1 }));
    }
    box(g, 0.74, 0.06, 0.64, C.compute, 0, 1.6, 0, { em: 0.5 });
    A.push(t => leds.forEach((l, i) => l.material.emissiveIntensity = 0.2 + 1.2 * (Math.sin(t * 5 + i * 2.1) > 0 ? 1 : 0.1)));
  },
  asg(g, A) {
    pad(g, 0, 0.62);
    const s = [[0.3, -0.38], [0.42, 0], [0.56, 0.4]], ups = [];
    s.forEach(([w, x], i) => {
      const h = 0.4 + i * 0.4;
      box(g, w, h, w * 0.9, DARK, x - (i === 2 ? 0.05 : 0), 0.08 + h / 2, -0.1, { met: 0.6 });
      for (let k = 0; k < 2 + i * 2; k++) box(g, w * 0.8, 0.04, 0.02, C.compute, x - (i === 2 ? 0.05 : 0), 0.2 + k * 0.17, -0.1 + w * 0.45 + 0.01, { em: 0.7 });
    });
    const a = arrowUp(g, C.compute, 0.0, 1.45, 0.35, 1.2), b = arrowUp(g, C.compute, 0.0, 1.45, 0.35, 1.2);
    a[0].position.x = b[0].position.x = -0.12; a[1].position.x = -0.12; b[1].position.x = b[0].position.x = 0.15;
    A.push(t => { const k = Math.sin(t * 2) * 0.06; a.forEach(m => m.position.y += 0); a[0].scale.setScalar(1 + k * 3); b[0].scale.setScalar(1 - k * 3); });
  },
  lambda(g, A) {
    cyl(g, 0.5, 0.6, 0.15, DARK, 0, 0.08, 0, { met: 0.5 }, 6);
    cyl(g, 0.3, 0.4, 0.1, C.compute, 0, 0.2, 0, { em: 0.5 }, 6);
    const l = new THREE.Group(); l.position.y = 1.0; g.add(l);
    box(l, 0.16, 0.9, 0.16, C.compute, -0.08, 0.0, 0, { em: 0.8, rot: [0, 0, -0.38] });
    box(l, 0.16, 0.5, 0.16, C.compute, 0.22, -0.2, 0, { em: 0.8, rot: [0, 0, 0.45] });
    const sp = [0, 1, 2].map(i => oct(g, 0.05, 0xffe0a0, 0, 1, 0, { em: 1 }));
    A.push(t => { l.position.y = 1.0 + Math.sin(t * 2) * 0.07; l.rotation.y = Math.sin(t) * 0.5;
      sp.forEach((s, i) => s.position.set(Math.cos(t * 3 + i * 2.1) * 0.5, 1 + Math.sin(t * 4 + i) * 0.5, Math.sin(t * 3 + i * 2.1) * 0.5)); });
  },
  ecs(g) {
    pad(g);
    const cs = [0xff9900, 0xd9822b, 0xffb84d, 0xb36b00];
    for (let i = 0; i < 4; i++) {
      const x = (i % 2 ? 0.08 : -0.06), y = 0.08 + i * 0.36 + 0.17;
      box(g, 1.0, 0.34, 0.5, cs[i], x, y, 0, { met: 0.4 });
      for (let k = -4; k <= 4; k++) box(g, 0.02, 0.3, 0.52, 0x00000, x + k * 0.1, y, 0, { rough: 1 });
      box(g, 0.04, 0.2, 0.52, LIGHT, x + 0.5, y, 0, { em: 0.2 });
    }
  },
  // ---------- networking
  route53(g, A) {
    pad(g); cyl(g, 0.05, 0.07, 1.6, MID, 0, 0.88, 0, { met: 0.5 }, 8);
    const signs = [];
    [[0.6, 0.25, 0.1], [-0.5, 0.55, -0.4], [0.45, 0.9, 0.7], [-0.4, 1.2, -1.0]].forEach(([y, x, r], i) => {
      const s = new THREE.Group(); s.position.y = 0.4 + i * 0.32; s.rotation.y = [0.2, -0.6, 0.9, -0.2][i]; g.add(s);
      box(s, 0.55, 0.2, 0.04, C.net, 0.22, 0, 0, { em: 0.4 });
      cone(s, 0.12, 0.18, C.net, 0.55, 0, 0, { em: 0.4, rot: [0, 0, -Math.PI / 2] }, 3);
      signs.push(s);
    });
    sph(g, 0.09, 0xffffff, 0, 1.72, 0, { em: 0.8 });
    A.push(t => signs.forEach((s, i) => s.rotation.y += Math.sin(t + i) * 0.002));
  },
  cloudfront(g, A) {
    pad(g, 0, 0.5); globe(g, C.net, 0.95, 0.5);
    const ring = new THREE.Group(); ring.position.y = 0.95; ring.rotation.x = 0.5; g.add(ring);
    tor(ring, 0.8, 0.02, C.net, 0, 0, 0, { em: 0.7, rot: [Math.PI / 2, 0, 0] });
    const dots = [0, 1, 2, 3].map(i => { const d = sph(ring, 0.07, 0xd9c2ff, Math.cos(i * 1.57) * 0.8, 0, Math.sin(i * 1.57) * 0.8, { em: 1 }); return d; });
    A.push(t => { ring.rotation.y = t * 0.8; });
  },
  alb(g, A) {
    pad(g, 0, 0.62);
    box(g, 0.7, 0.18, 0.2, C.net, -0.1, 0.35, 0, { em: 0.3 }); // inlet
    cone(g, 0.2, 0.3, C.net, 0.35, 0.35, 0, { em: 0.5, rot: [0, 0, -Math.PI / 2] }, 4);
    sph(g, 0.2, 0xffffff, 0.25, 0.7, 0, { em: 0.5, emc: C.net });
    const outs = [];
    [-0.45, 0, 0.45].forEach((z, i) => {
      const o = new THREE.Group(); o.position.set(0.25, 0.7, 0); o.rotation.y = -z * 1.0; g.add(o);
      box(o, 0.55, 0.1, 0.1, C.net, 0.4, 0, 0, { em: 0.5 });
      cone(o, 0.12, 0.2, C.net, 0.78, 0, 0, { em: 0.8, rot: [0, 0, -Math.PI / 2] }, 4);
      outs.push(o);
    });
    const tgts = [-0.55, 0, 0.55].map(z => box(g, 0.2, 0.3 + 0.2, 0.2, DARK, 0.62, 0.3, z * 1.0 + (z ? z * 0.3 : 0), { met: 0.6 }));
    A.push(t => outs.forEach((o, i) => o.children[1].scale.setScalar(1 + 0.3 * Math.max(0, Math.sin(t * 3 - i)))));
  },
  nlb(g, A) {
    pad(g, 0, 0.62);
    cyl(g, 0.17, 0.17, 1.1, C.net, 0, 0.9, 0, { rot: [0, 0, Math.PI / 2], met: 0.7 });
    [-0.35, 0, 0.35].forEach(x => { cyl(g, 0.12, 0.12, 0.8, MID, x, 0.5, 0, { met: 0.7 }); cyl(g, 0.15, 0.15, 0.06, LIGHT, x, 0.15, 0, { met: 0.8 }); });
    [-0.55, 0.55].forEach(x => cyl(g, 0.23, 0.23, 0.1, C.net, x, 0.9, 0, { rot: [0, 0, Math.PI / 2], em: 0.4 }));
    const wh = cyl(g, 0.12, 0.12, 0.06, 0xffffff, 0, 1.2, 0, { em: 0.8, emc: C.net }, 3);
    box(g, 0.08, 0.3, 0.08, C.net, 0, 1.05, 0);
    const bars = [-0.2, 0.2].map(x => box(g, 0.12, 0.05, 0.12, 0xd9c2ff, x, 0.9, 0.0, { em: 1, rot: [0, 0, 0] }));
    cyl(g, 0.19, 0.19, 0.04, 0xd9c2ff, 0, 0.9, 0, { rot: [0, 0, Math.PI / 2], em: 0.5 });
    A.push(t => { wh.rotation.y = t * 8; bars.forEach((b, i) => b.position.x = -0.5 + ((t * 1.6 + i * 0.5) % 1)); });
  },
  apigw(g, A) {
    pad(g);
    [-0.45, 0.45].forEach(x => box(g, 0.2, 1.3, 0.35, MID, x, 0.73, 0, { met: 0.4 }));
    box(g, 1.1, 0.25, 0.4, C.net, 0, 1.5, 0, { em: 0.4 });
    cone(g, 0.2, 0.25, C.net, 0, 1.75, 0, { em: 0.6 }, 4);
    const arm = new THREE.Group(); arm.position.set(-0.35, 0.7, 0.25); g.add(arm);
    box(arm, 0.7, 0.08, 0.06, 0xffffff, 0.35, 0, 0, { em: 0.2 });
    for (let i = 0; i < 4; i++) box(arm, 0.08, 0.085, 0.07, C.sec, 0.12 + i * 0.17, 0, 0, { em: 0.4 });
    A.push(t => arm.rotation.z = (Math.sin(t * 1.2) * 0.5 + 0.5) * 1.1);
  },
  natgw(g, A) {
    pad(g);
    box(g, 0.25, 1.2, 1.1, MID, -0.2, 0.68, 0, { met: 0.3 });
    box(g, 0.12, 0.7, 0.5, 0x0b0b12, -0.06, 0.45, 0);
    const ar = new THREE.Group(); ar.position.set(0.3, 0.8, 0); g.add(ar);
    box(ar, 0.5, 0.18, 0.18, C.net, 0, 0, 0, { em: 0.7 });
    cone(ar, 0.22, 0.3, C.net, 0.38, 0, 0, { em: 0.9, rot: [0, 0, -Math.PI / 2] }, 4);
    box(g, 0.04, 0.3, 0.3, C.sec, -0.05, 1.45, 0, { em: 0.6 });
    A.push(t => ar.position.x = 0.3 + ((t * 0.5) % 1) * 0.3);
  },
  vpn(g, A) {
    pad(g);
    const t = cyl(g, 0.4, 0.4, 1.2, MID, 0, 0.5, 0, { rot: [0, 0, Math.PI / 2], met: 0.6, op: 0.55 }, 16);
    [-0.55, 0, 0.55].forEach(x => cyl(g, 0.43, 0.43, 0.08, C.net, x, 0.5, 0, { rot: [0, 0, Math.PI / 2], em: 0.5 }, 16));
    const p = sph(g, 0.1, 0xd9c2ff, 0, 0.5, 0, { em: 1 });
    box(g, 0.4, 0.3, 0.2, 0xe0b040, 0, 1.1, 0, { met: 0.7, em: 0.2 });
    M(g, new THREE.TorusGeometry(0.14, 0.035, 6, 14, Math.PI), 0xcccccc, 0, 1.25, 0, { met: 0.8 });
    A.push(tm => p.position.x = -0.55 + ((tm * 0.7) % 1) * 1.1);
  },
  directconnect(g, A) {
    pad(g, 0, 0.62);
    [-0.45, 0.45].forEach(x => { cyl(g, 0.06, 0.18, 1.3, MID, x, 0.73, 0, { met: 0.5 }, 6); box(g, 0.4, 0.07, 0.07, MID, x, 1.3, 0); sph(g, 0.08, C.net, x, 1.45, 0, { em: 0.9 }); });
    cyl(g, 0.09, 0.09, 0.95, C.net, 0, 1.05, 0, { rot: [0, 0, Math.PI / 2], em: 0.4 });
    const bits = [0, 1, 2].map(i => box(g, 0.1, 0.12, 0.12, 0xffffff, 0, 1.05, 0, { em: 1, emc: C.net }));
    A.push(t => bits.forEach((b, i) => b.position.x = -0.4 + ((t * 0.8 + i / 3) % 1) * 0.8));
  },
  globalaccelerator(g, A) {
    pad(g, 0, 0.55); globe(g, C.net, 0.8, 0.42);
    const r = new THREE.Group(); r.position.y = 0.8; g.add(r);
    const rk = new THREE.Group(); rk.position.set(0.75, 0, 0); r.add(rk);
    cyl(rk, 0.07, 0.07, 0.4, LIGHT, 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
    cone(rk, 0.07, 0.15, C.net, 0.27, 0, 0, { em: 0.8, rot: [0, 0, -Math.PI / 2] });
    cone(rk, 0.08, 0.25, 0xffcc66, -0.3, 0, 0, { em: 1, rot: [0, 0, Math.PI / 2] }, 6);
    box(rk, 0.12, 0.02, 0.35, C.net, -0.1, 0, 0, { em: 0.5 });
    for (let i = 1; i < 4; i++) box(g, 0.3, 0.03, 0.03, C.net, -0.75, 0.45 + i * 0.2, 0.5, { em: 0.8 });
    A.push(t => { r.rotation.y = t * 1.5; r.rotation.z = 0.3; });
  },
  // ---------- storage
  s3(g, A) {
    pad(g);
    cyl(g, 0.55, 0.38, 1.1, C.storage, 0, 0.65, 0, { met: 0.2 }, 14);
    tor(g, 0.55, 0.04, 0x2f8a20, 0, 1.2, 0, { rot: [Math.PI / 2, 0, 0] });
    cyl(g, 0.5, 0.5, 0.04, 0x1d5a14, 0, 1.15, 0, {}, 14);
    tor(g, 0.46, 0.03, 0x2f8a20, 0, 0.5, 0, { rot: [Math.PI / 2, 0, 0] });
    M(g, new THREE.TorusGeometry(0.5, 0.03, 6, 14, Math.PI), 0xcccccc, 0, 1.2, 0, { met: 0.8 });
    const it = [oct(g, 0.12, 0xb7f0a8, -0.15, 1.3, 0, { em: 0.6 }), box(g, 0.2, 0.2, 0.2, 0x7fd66b, 0.15, 1.3, 0.05, { em: 0.5 }), sph(g, 0.1, 0xffffff, 0, 1.45, -0.1, { em: 0.5, emc: C.storage })];
    A.push(t => it.forEach((m, i) => { m.position.y = 1.35 + Math.sin(t * 2 + i * 2) * 0.06; m.rotation.y = t; }));
  },
  glacier(g, A) {
    cyl(g, 0.6, 0.6, 0.08, 0x1b6a9a, 0, 0.04, 0, { op: 0.8, met: 0.1 }, 8);
    const ice = 0xcdeeff;
    cone(g, 0.5, 1.2, ice, 0, 0.7, 0, { em: 0.15, emc: 0x88ccff, rough: 0.2 }, 5);
    cone(g, 0.28, 0.8, 0xffffff, -0.3, 0.45, 0.15, { em: 0.1, emc: 0x88ccff }, 5);
    cone(g, 0.22, 0.6, 0x9fd8f5, 0.35, 0.35, -0.1, { em: 0.2, emc: 0x66bbee }, 4);
    oct(g, 0.2, 0xaee4ff, 0.05, 1.4, 0.05, { em: 0.5, emc: 0x88ddff, op: 0.85 });
    const fl = [0, 1, 2].map(i => oct(g, 0.04, 0xffffff, 0, 1, 0, { em: 1 }));
    A.push(t => fl.forEach((f, i) => f.position.set(Math.cos(t + i * 2.1) * 0.6, 0.6 + ((t * 0.2 + i / 3) % 1) * 0.9, Math.sin(t + i * 2.1) * 0.6)));
  },
  ebs(g, A) {
    pad(g);
    box(g, 0.9, 0.18, 0.9, DARK, 0, 0.17, 0, { met: 0.6 });
    const plat = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Group(); p.position.y = 0.38 + i * 0.28; g.add(p);
      cyl(p, 0.42, 0.42, 0.05, 0xc9d3dc, 0, 0, 0, { met: 0.9, rough: 0.2 }, 18);
      cyl(p, 0.12, 0.12, 0.07, C.storage, 0, 0, 0, { em: 0.5 }, 12);
      box(p, 0.3, 0.02, 0.04, MID, 0.2, 0.03, 0);
      plat.push(p);
    }
    box(g, 0.55, 0.05, 0.08, C.storage, 0.1, 1.28, 0.3, { em: 0.7, rot: [0, -0.5, 0] });
    box(g, 0.9, 0.2, 0.9, 0x2a7a1d, 0, 1.42, 0, { met: 0.5 });
    A.push(t => plat.forEach((p, i) => p.rotation.y = t * (1 + i * 0.5)));
  },
  efs(g, A) {
    pad(g);
    box(g, 0.8, 1.4, 0.6, C.storage, 0, 0.78, 0, { met: 0.4 });
    for (let i = 0; i < 3; i++) { box(g, 0.68, 0.38, 0.04, 0x2a7a1d, 0, 0.35 + i * 0.45, 0.31); box(g, 0.25, 0.05, 0.05, LIGHT, 0, 0.4 + i * 0.45, 0.35, { met: 0.8 }); }
    const cs = [];
    [[-0.55, 0.3], [0.55, 0.8], [-0.5, 1.2]].forEach(([x, y], i) => {
      cyl(g, 0.04, 0.04, 0.5, 0x222222, x * 0.9, y, 0.1, { rot: [0, 0, Math.PI / 2 + (x > 0 ? 0 : 0)] });
      cs.push(sph(g, 0.08, C.storage, x * 1.25, y, 0.1, { em: 1 }));
    });
    A.push(t => cs.forEach((c, i) => c.material.emissiveIntensity = 0.3 + 0.9 * (0.5 + 0.5 * Math.sin(t * 4 + i * 2))));
  },
  // ---------- database
  rds(g) {
    pad(g); dbStack(g, C.database, 0, 0, 0.5, 4);
    cyl(g, 0.52, 0.52, 0.04, 0x9db8ff, 0, 1.14, 0, { em: 0.4, emc: C.database }, 20);
    sph(g, 0.06, 0xffffff, 0.35, 0.4, 0.38, { em: 1 });
  },
  rdsmultiaz(g, A) {
    pad(g, 0, 0.7);
    dbStack(g, C.database, -0.35, 0, 0.3, 4, 0.3);
    dbStack(g, C.database, 0.35, 0, 0.3, 4, 0.3, { op: 0.5, em: 0.0 });
    const bar = box(g, 0.45, 0.1, 0.1, 0xffffff, 0, 0.6, 0, { em: 0.8, emc: C.database });
    const pk = sph(g, 0.07, 0x9db8ff, 0, 0.6, 0.0, { em: 1 });
    box(g, 0.5, 0.05, 0.6, DARK, 0, 1.4, 0, { op: 0.0 }).visible = false;
    A.push(t => { pk.position.x = Math.sin(t * 3) * 0.2; bar.material.emissiveIntensity = 0.5 + 0.4 * Math.sin(t * 3); });
  },
  readreplica(g, A) {
    pad(g, 0, 0.65);
    dbStack(g, C.database, -0.18, 0, 0.36, 4, 0.3);
    const r = [0.4, -0.15].map((z, i) => dbStack(g, 0x7fa0ff, 0.35, z * 1.3, 0.2, 2, 0.28, { op: 0.5, em: 0.3 }));
    [0.5, -0.2].forEach(z => box(g, 0.25, 0.04, 0.04, 0xffffff, 0.12, 0.5, z * 0.5, { em: 0.7, emc: C.database }));
    A.push(t => r.forEach((s, i) => s.forEach(m => m.position.y += 0)));
  },
  aurora(g, A) {
    pad(g); dbStack(g, C.database, 0, 0, 0.42, 4);
    const h = tor(g, 0.65, 0.05, 0x44ffcc, 0, 1.0, 0, { em: 1, rot: [Math.PI / 2, 0, 0] });
    const h2 = tor(g, 0.52, 0.035, 0xb06bff, 0, 1.15, 0, { em: 1, rot: [Math.PI / 2, 0, 0] });
    const h3 = tor(g, 0.4, 0.03, 0x66aaff, 0, 1.3, 0, { em: 1, rot: [Math.PI / 2, 0, 0] });
    A.push(t => { [h, h2, h3].forEach((m, i) => { m.rotation.x = Math.PI / 2 + Math.sin(t * 1.5 + i) * 0.25; m.rotation.y = Math.cos(t * 1.2 + i) * 0.25; m.material.emissiveIntensity = 0.6 + 0.5 * Math.sin(t * 2 + i); }); });
  },
  dynamodb(g, A) {
    pad(g);
    const slabs = [];
    for (let i = 0; i < 5; i++) slabs.push(cyl(g, 0.5, 0.5, 0.18, i % 2 ? 0x2f58d6 : C.database, 0, 0.22 + i * 0.24, 0, { met: 0.4 }, 6));
    const b = bolt(g, 0xffe066, 0, 0.8, 0.5, 1.2);
    A.push(t => { b.material.emissiveIntensity = 0.5 + 0.6 * Math.abs(Math.sin(t * 5)); slabs.forEach((s, i) => s.rotation.y = Math.sin(t + i) * 0.1); });
  },
  elasticache(g, A) {
    pad(g); dbStack(g, C.database, 0, 0, 0.42, 3, 0.3);
    for (let i = 0; i < 5; i++) { const a = i * 1.257; box(g, 0.04, 0.5, 0.35, 0xbcd0ff, Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5, { em: 0.6, emc: C.database, rot: [0, -a, 0] }); }
    const chip = new THREE.Group(); chip.position.y = 1.3; g.add(chip);
    box(chip, 0.5, 0.08, 0.5, DARK, 0, 0, 0, { met: 0.6 });
    for (let i = -2; i <= 2; i++) { box(chip, 0.04, 0.04, 0.64, 0xe0b040, i * 0.1, 0, 0, { met: 0.9 }); box(chip, 0.64, 0.04, 0.04, 0xe0b040, 0, 0, i * 0.1, { met: 0.9 }); }
    box(chip, 0.25, 0.1, 0.25, C.database, 0, 0.02, 0, { em: 0.8 });
    A.push(t => { chip.rotation.y = t; chip.position.y = 1.3 + Math.sin(t * 3) * 0.05; });
  },
  redshift(g, A) {
    pad(g, 0, 0.65);
    box(g, 1.1, 0.7, 0.8, MID, 0, 0.45, 0, { met: 0.3 });
    box(g, 1.2, 0.1, 0.9, DARK, 0, 0.85, 0);
    cone(g, 0.8, 0.3, C.sec === 0 ? 0 : 0x8a2020, 0, 1.0, 0, { rot: [0, Math.PI / 4, 0] }, 4).scale.set(1, 1, 0.75);
    const bars = [];
    [0.2, 0.5, 0.35, 0.7, 0.45].forEach((h, i) => bars.push(box(g, 0.13, 1, 0.13, i % 2 ? C.database : 0x7fa0ff, -0.4 + i * 0.2, 0.9, 0.45, { em: 0.5 })));
    box(g, 0.3, 0.3, 0.04, 0xffffff, 0.35, 0.4, 0.41, { em: 0.5, emc: C.database });
    A.push(t => bars.forEach((b, i) => { const h = 0.3 + 0.25 * (1 + Math.sin(t * 1.5 + i * 1.7)); b.scale.y = h; b.position.y = 0.9 + h / 2 - 0.5 + 0.0; b.position.y = 0.9 + h / 2 - 0.5 + 0.5 - 0.5 + 0.0 + 0.0 + 0.0; b.position.y = 0.95 + h / 2 - 0.5 + 0.5 - 0.5 + 0.0; }));
  },
  // ---------- integration
  sqs(g, A) {
    pad(g, 0, 0.65);
    box(g, 1.3, 0.12, 0.5, DARK, 0, 0.2, 0, { met: 0.6 });
    [-0.2, 0.2].forEach(z => box(g, 1.3, 0.1, 0.05, C.integ, 0, 0.32, z * 1.4, { em: 0.4 }));
    const ms = [];
    for (let i = 0; i < 4; i++) ms.push(box(g, 0.26, 0.26, 0.3, C.integ, 0, 0.5, 0, { em: 0.3 }));
    const roll = [-0.5, 0.5].map(x => cyl(g, 0.08, 0.08, 0.5, MID, x, 0.2, 0, { rot: [Math.PI / 2, 0, 0] }));
    box(g, 0.3, 0.04, 0.2, 0xffffff, 0, 1.1, 0, { em: 0.2 }).visible = false;
    A.push(t => ms.forEach((m, i) => { const p = (t * 0.25 + i / 4) % 1; m.position.x = 0.55 - p * 1.1; m.position.y = 0.46 + 0.0; m.scale.setScalar(0.6 + Math.sin(p * Math.PI) * 0.4); }));
  },
  sns(g, A) {
    pad(g, 0, 0.55);
    cyl(g, 0.05, 0.18, 1.2, MID, 0, 0.65, 0, { met: 0.5 }, 4);
    cone(g, 0.12, 0.25, C.integ, 0, 1.35, 0, { em: 0.5 });
    sph(g, 0.1, 0xffffff, 0, 1.55, 0, { em: 1, emc: C.integ });
    const rings = [0, 1, 2].map(i => tor(g, 0.3, 0.025, C.integ, 0, 1.55, 0, { em: 1, rot: [Math.PI / 2, 0, 0] }));
    box(g, 0.5, 0.04, 0.04, C.integ, 0, 0.9, 0, { rot: [0, 0, 0.0] });
    A.push(t => rings.forEach((r, i) => { const p = (t * 0.5 + i / 3) % 1; r.scale.setScalar(0.3 + p * 1.7); r.material.opacity = 1 - p; r.material.transparent = true; }));
  },
  kinesis(g, A) {
    pad(g, 0, 0.65);
    const fl = [];
    [0.28, 0.0, -0.28].forEach((z, k) => {
      const pts = []; for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(-0.6 + i * 0.06, 0.45 + k * 0.18 + Math.sin(i * 0.5 + k) * 0.12, z));
      const tb = M(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 6), k === 1 ? 0xff6fb5 : C.integ, 0, 0, 0, { em: 0.6 });
      for (let j = 0; j < 2; j++) fl.push([sph(g, 0.08, 0xffffff, 0, 0, z, { em: 1, emc: C.integ }), k, j]);
    });
    A.push(t => fl.forEach(([s, k, j]) => { const p = (t * 0.3 + j * 0.5 + k * 0.13) % 1, i = p * 20; s.position.set(-0.6 + i * 0.06, 0.45 + k * 0.18 + Math.sin(i * 0.5 + k) * 0.12, [0.28, 0, -0.28][k]); }));
  },
  eventbridge(g, A) {
    pad(g);
    const hub = new THREE.Group(); hub.position.y = 0.85; g.add(hub);
    oct(hub, 0.25, C.integ, 0, 0, 0, { em: 0.8 });
    const n = [];
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, d = 0.6;
      cyl(hub, 0.025, 0.025, d, 0xffffff, Math.cos(a) * d / 2, Math.sin(a) * d / 2 * 0.0, Math.sin(a) * d / 2, { em: 0.5, emc: C.integ, rot: [Math.PI / 2 * 0 + 0, -a, Math.PI / 2] });
      n.push(box(hub, 0.16, 0.16, 0.16, i % 2 ? 0xff6fb5 : C.integ, Math.cos(a) * d, 0, Math.sin(a) * d, { em: 0.6 }));
    }
    A.push(t => { hub.rotation.y = t * 0.5; hub.children[0].rotation.x = t; n.forEach((m, i) => m.scale.setScalar(1 + 0.3 * Math.sin(t * 3 + i))); });
  },
  // ---------- security
  iam(g, A) {
    pad(g, 0, 0.6);
    cyl(g, 0.22, 0.3, 0.6, C.sec, -0.15, 0.45, 0, { em: 0.1 }, 8);
    head(g, 0xf2c9a0, -0.15, 0.95, 0, 0.18);
    sph(g, 0.19, 0x3a2a2a, -0.15, 1.0, -0.03, {});
    const k = new THREE.Group(); k.position.set(0.4, 1.0, 0.2); k.rotation.z = 0.6; g.add(k);
    tor(k, 0.12, 0.04, 0xffd24a, 0, 0.3, 0, { em: 0.5, met: 0.8 });
    box(k, 0.07, 0.6, 0.07, 0xffd24a, 0, 0, 0, { em: 0.4, met: 0.8 });
    box(k, 0.14, 0.07, 0.07, 0xffd24a, 0.08, -0.2, 0, { em: 0.4, met: 0.8 });
    box(g, 0.35, 0.22, 0.03, LIGHT, 0.0, 0.5, 0.32, { em: 0.3 });
    A.push(t => { k.position.y = 1.0 + Math.sin(t * 2) * 0.06; k.rotation.y = t; });
  },
  kms(g, A) {
    pad(g, 0, 0.6);
    const k = new THREE.Group(); k.position.y = 0.95; k.rotation.z = Math.PI / 2 - 0.0; g.add(k);
    const kk = new THREE.Group(); kk.rotation.z = -Math.PI / 2; kk.position.y = 0; k.add(kk); k.rotation.z = 0;
    k.add(new THREE.Group());
    const key = k;
    tor(key, 0.3, 0.1, C.sec, 0, 0.55, 0, { em: 0.5, met: 0.8 });
    cyl(key, 0.08, 0.08, 1.0, C.sec, 0, 0.0, 0, { em: 0.4, met: 0.8 }, 8);
    box(key, 0.3, 0.12, 0.12, C.sec, 0.18, -0.35, 0, { em: 0.4, met: 0.8 });
    box(key, 0.22, 0.12, 0.12, C.sec, 0.15, -0.15, 0, { em: 0.4, met: 0.8 });
    sph(key, 0.08, 0xffffff, 0, 0.55, 0.1, { em: 1, emc: C.sec });
    key.position.y = 0.95;
    A.push(t => { key.rotation.y = t * 0.8; key.position.y = 0.95 + Math.sin(t * 2) * 0.05; });
  },
  waf(g, A) {
    pad(g);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) box(g, 0.32, 0.2, 0.3, r % 2 ? 0x9a3a2a : 0xb04a38, -0.34 + c * 0.34 + (r % 2 ? 0.17 : 0) * 0 + (r % 2 ? 0.12 : 0) - 0.06, 0.2 + r * 0.22, 0, { rough: 0.9 });
    const f = new THREE.Group(); f.position.set(0, 0.7, 0.2); g.add(f);
    const a = cone(f, 0.22, 0.6, 0xff6a00, 0, 0.1, 0, { em: 1 }, 6);
    const b = cone(f, 0.13, 0.4, 0xffd23a, 0, 0.0, 0.03, { em: 1 }, 6);
    A.push(t => { a.scale.set(1 + 0.1 * Math.sin(t * 9), 1 + 0.15 * Math.sin(t * 7), 1); b.scale.y = 1 + 0.2 * Math.sin(t * 11); f.rotation.y = Math.sin(t * 2) * 0.3; });
  },
  shield(g, A) {
    pad(g, 0, 0.55);
    const s = new THREE.Group(); s.position.y = 0.95; g.add(s);
    const pts = [[-0.5, 0.6], [0.5, 0.6], [0.5, 0.0], [0.0, -0.7], [-0.5, 0.0]];
    M(s, slabShape(pts, 0.14), C.sec, 0, 0, 0, { em: 0.2, met: 0.6 });
    M(s, slabShape(pts.map(p => [p[0] * 0.8, p[1] * 0.8 - 0.02]), 0.2), 0x8f1f32, 0, 0, 0, { met: 0.4 });
    M(s, slabShape([[0.0, 0.4], [0.13, 0.05], [0.4, 0.0], [0.13, -0.1], [0.0, -0.4], [-0.13, -0.1], [-0.4, 0.0], [-0.13, 0.05]], 0.24), 0xffd24a, 0, 0, 0, { em: 0.6, met: 0.8 });
    A.push(t => { s.rotation.y = Math.sin(t * 0.8) * 0.5; s.position.y = 0.95 + Math.sin(t * 2) * 0.04; });
  },
  cognito(g, A) {
    pad(g, 0, 0.65);
    const c = new THREE.Group(); c.position.y = 0.85; g.add(c);
    box(c, 1.1, 0.7, 0.08, LIGHT, 0, 0, 0, { rough: 0.5 });
    box(c, 1.1, 0.14, 0.09, C.sec, 0, 0.28, 0, { em: 0.4 });
    sph(c, 0.15, 0xf2c9a0, -0.3, 0.05, 0.08);
    cyl(c, 0.12, 0.2, 0.2, C.sec, -0.3, -0.17, 0.06, {}, 8);
    for (let i = 0; i < 3; i++) box(c, 0.45 - i * 0.08, 0.06, 0.03, MID, 0.2, 0.05 - i * 0.14, 0.06);
    const lan = box(g, 0.1, 0.5, 0.06, C.sec, 0, 0.3, 0, { visible: false });
    lan.visible = false;
    A.push(t => { c.rotation.y = Math.sin(t) * 0.4; c.position.y = 0.85 + Math.sin(t * 2) * 0.05; });
  },
  secretsmanager(g, A) {
    pad(g);
    box(g, 1.0, 1.2, 0.8, MID, 0, 0.7, 0, { met: 0.8, rough: 0.35 });
    box(g, 0.85, 1.05, 0.04, 0x39414f, 0, 0.7, 0.42, { met: 0.8 });
    const d = new THREE.Group(); d.position.set(0, 0.8, 0.46); g.add(d);
    cyl(d, 0.22, 0.22, 0.06, 0xe0b040, 0, 0, 0, { met: 0.9, rot: [Math.PI / 2, 0, 0], em: 0.2 }, 14);
    box(d, 0.04, 0.2, 0.05, C.sec, 0, 0.1, 0.04, { em: 0.8 });
    box(g, 0.35, 0.06, 0.06, 0xe0b040, 0.0, 0.3, 0.46, { met: 0.9 });
    [-0.4, 0.4].forEach(x => box(g, 0.1, 0.15, 0.08, DARK, x, 0.15, 0.3));
    sph(g, 0.05, C.sec, 0.35, 1.15, 0.43, { em: 1 });
    A.push(t => d.rotation.z = Math.sin(t * 0.8) * 2);
  },
  // ---------- management
  cloudwatch(g, A) {
    pad(g, 0, 0.6);
    cyl(g, 0.06, 0.1, 0.5, MID, 0, 0.3, 0, { met: 0.5 });
    const e = new THREE.Group(); e.position.y = 1.0; g.add(e);
    tor(e, 0.5, 0.07, C.mgmt, 0, 0, 0, { em: 0.5, met: 0.6 });
    cyl(e, 0.46, 0.46, 0.05, 0x1a1030, 0, 0, 0, { rot: [Math.PI / 2, 0, 0] }, 20);
    const pts = [[-0.35, -0.05], [-0.2, -0.05], [-0.1, 0.2], [0.05, -0.2], [0.15, 0.05], [0.35, 0.05]];
    for (let i = 0; i < 5; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; const L = Math.hypot(c - a, d - b); box(e, L, 0.04, 0.04, 0xff7aff, (a + c) / 2, (b + d) / 2, 0.05, { em: 1, rot: [0, 0, Math.atan2(d - b, c - a)] }); }
    const pu = sph(e, 0.06, 0xffffff, -0.35, -0.05, 0.08, { em: 1, emc: C.mgmt });
    box(g, 0.1, 0.5, 0.1, C.mgmt, 0.5, 0.45, 0.0, { rot: [0, 0, -0.5], em: 0.3 }).rotation.z = -0.9;
    A.push(t => { pu.position.x = -0.35 + ((t * 0.6) % 1) * 0.7; e.rotation.y = Math.sin(t * 0.7) * 0.3; });
  },
  cloudtrail(g, A) {
    pad(g, 0, 0.65);
    const fp = [];
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1, z = 0.5 - i * 0.2;
      const f = new THREE.Group(); f.position.set(s * 0.14 - 0.3 + i * 0.03, 0.1, z); f.rotation.y = -0.2 + s * 0.1; g.add(f);
      box(f, 0.14, 0.04, 0.2, C.mgmt, 0, 0, 0, { em: 0.4 }); sph(f, 0.07, C.mgmt, 0, 0.0, -0.13, { em: 0.4 }).scale.y = 0.4;
      fp.push(f);
    }
    const sc = new THREE.Group(); sc.position.set(0.3, 0.75, 0); g.add(sc);
    box(sc, 0.5, 0.8, 0.04, 0xf1e6c8, 0, 0, 0, { rough: 0.9 });
    cyl(sc, 0.07, 0.07, 0.56, 0x9a6a3a, 0, 0.42, 0, { rot: [0, 0, Math.PI / 2] }, 8);
    cyl(sc, 0.07, 0.07, 0.56, 0x9a6a3a, 0, -0.42, 0, { rot: [0, 0, Math.PI / 2] }, 8);
    for (let i = 0; i < 4; i++) box(sc, 0.34, 0.04, 0.03, C.mgmt, 0, 0.25 - i * 0.16, 0.03, { em: 0.5 });
    A.push(t => { fp.forEach((f, i) => f.children[0].material.emissiveIntensity = 0.1 + 0.8 * Math.max(0, Math.sin(t * 3 - i * 0.9))); sc.rotation.y = Math.sin(t) * 0.3; });
  },
};

const CAT = {
  compute: ['ec2', 'asg', 'lambda', 'ecs'], net: ['route53', 'cloudfront', 'alb', 'nlb', 'apigw', 'natgw', 'vpn', 'directconnect', 'globalaccelerator'],
  storage: ['s3', 'glacier', 'ebs', 'efs'], database: ['rds', 'rdsmultiaz', 'readreplica', 'aurora', 'dynamodb', 'elasticache', 'redshift'],
  integ: ['sqs', 'sns', 'kinesis', 'eventbridge'], sec: ['iam', 'kms', 'waf', 'shield', 'cognito', 'secretsmanager'], mgmt: ['cloudwatch', 'cloudtrail'],
};

function fallback(g) {
  pad(g); box(g, 0.8, 0.8, 0.8, 0x8a6a3a, 0, 0.5, 0, { rough: 0.9 });
  box(g, 0.84, 0.1, 0.84, 0x5a4220, 0, 0.5, 0); box(g, 0.1, 0.84, 0.84, 0x5a4220, 0, 0.5, 0);
}

export function createServiceModel(id) {
  const g = new THREE.Group();
  const anims = [];
  try {
    const fn = B[id];
    (fn || fallback)(g, anims);
  } catch (e) {
    g.clear(); anims.length = 0; fallback(g);
  }
  if (anims.length) g.userData.animate = t => { for (const a of anims) { try { a(t); } catch (e) {} } };
  g.userData.category = Object.keys(CAT).find(k => CAT[k].includes(id)) || 'unknown';
  return g;
}

// ================= batch 2 =================
C.analytics = 0x01a88d;
const PI = Math.PI, HP = PI / 2;
const srv = (g, x, y, z, c = C.compute, s = 1, o = {}) => {
  box(g, 0.4 * s, 0.7 * s, 0.35 * s, DARK, x, y + 0.35 * s, z, { met: 0.6 });
  for (let i = 0; i < 3; i++) box(g, 0.32 * s, 0.05 * s, 0.02, c, x, y + (0.2 + i * 0.2) * s, z + 0.18 * s, { em: 0.7, ...o });
};
const lens = (g, c, x, y, z, r = 0.35, rot = 0) => {
  const m = new THREE.Group(); m.position.set(x, y, z); m.rotation.z = rot; g.add(m);
  tor(m, r, r * 0.2, c, 0, 0, 0, { em: 0.5, met: 0.7 });
  cyl(m, r * 0.9, r * 0.9, 0.03, 0xbfe9ff, 0, 0, 0, { rot: [HP, 0, 0], op: 0.35, met: 0.1 }, 18);
  box(m, r * 0.25, r * 1.4, r * 0.25, MID, 0, -r * 1.55, 0, { met: 0.6 });
  return m;
};
const bucket = (g, c, x, y, z, r = 0.35, h = 0.5) => { cyl(g, r, r * 0.7, h, c, x, y + h / 2, z, { met: 0.2 }, 12); tor(g, r, 0.03, c, x, y + h, z, { rot: [HP, 0, 0], em: 0.2 }); };
const spokes = (g, n, d, c, y = 0, o = {}) => { for (let i = 0; i < n; i++) { const a = i * 2 * PI / n; cyl(g, 0.04, 0.04, d, c, Math.cos(a) * d / 2, y, Math.sin(a) * d / 2, { rot: [0, -a, HP], em: 0.4, ...o }, 6); } };
const wheel = (g, c, x, y, z, r = 0.4, n = 8) => { const w = new THREE.Group(); w.position.set(x, y, z); g.add(w); tor(w, r, 0.04, c, 0, 0, 0, { em: 0.5 }); sph(w, 0.09, c, 0, 0, 0, { em: 0.5 }); for (let i = 0; i < n; i++) { const a = i * 2 * PI / n; box(w, 0.05, r * 1.7, 0.05, c, 0, 0, 0, { rot: [0, 0, a], em: 0.4 }); sph(w, 0.05, 0xffffff, Math.sin(a) * r * 1.0 * 1.0 + Math.sin(a) * 0.15, Math.cos(a) * r + Math.cos(a) * 0.15, 0, { em: 0.5, emc: c }); } return w; };
const pulse = (m, t, k = 1, a = 0.4) => m.material.emissiveIntensity = 0.4 + a * (1 + Math.sin(t * 3 * k));

Object.assign(B, {
  eks(g, A) {
    pad(g);
    for (let i = 0; i < 3; i++) box(g, 0.9, 0.3, 0.5, [0xff9900, 0xd9822b, 0xffb84d][i], (i - 1) * 0.04, 0.23 + i * 0.32, -0.15, { met: 0.4 });
    const w = wheel(g, 0xffcf70, 0, 1.3, 0.2, 0.4, 8);
    box(g, 0.1, 0.5, 0.1, MID, 0, 1.0, 0.1);
    A.push(t => w.rotation.z = Math.sin(t * 0.8) * 1.2);
  },
  fargate(g, A) {
    cyl(g, 0.6, 0.65, 0.08, DARK, 0, 0.04, 0, { met: 0.5 }, 16);
    const d = cyl(g, 0.55, 0.55, 0.05, C.compute, 0, 0.3, 0, { em: 0.9, op: 0.8 }, 20);
    tor(g, 0.55, 0.03, 0xffd08a, 0, 0.3, 0, { em: 1, rot: [HP, 0, 0] });
    const cs = [[-0.2, 0, 0xff9900], [0.2, 0.1, 0xffb84d], [0, -0.2, 0xd9822b]].map(([x, z, c], i) => { const b = box(g, 0.45, 0.28, 0.28, c, x, 0.7 + i * 0.2, z, { met: 0.4 }); box(g, 0.47, 0.03, 0.3, DARK, x, 0.7 + i * 0.2, z); return b; });
    A.push(t => { cs.forEach((c, i) => c.position.y = 0.65 + i * 0.25 + Math.sin(t * 2 + i * 2) * 0.06); pulse(d, t); });
  },
  beanstalk(g, A) {
    pad(g, 0, 0.6); srv(g, 0, 0.08, 0, C.compute, 1.1);
    const pts = []; for (let i = 0; i <= 24; i++) { const a = i * 0.5; pts.push(new THREE.Vector3(Math.cos(a) * 0.3, 0.1 + i * 0.07, Math.sin(a) * 0.3)); }
    M(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 6), 0x3fae29, 0, 0, 0, { em: 0.2 });
    const lv = [0, 1, 2, 3, 4].map(i => { const a = (i * 5 + 2) * 0.5; const p = pts[i * 5 + 2]; return sph(g, 0.12, 0x6fe04f, p.x + Math.cos(a) * 0.12, p.y, p.z + Math.sin(a) * 0.12, { em: 0.3 }); });
    lv.forEach(l => l.scale.set(1, 0.4, 1.6));
    const top = cone(g, 0.1, 0.25, 0xff9900, 0, 1.85, 0, { em: 0.8 }, 5);
    A.push(t => { lv.forEach((l, i) => l.rotation.y = Math.sin(t * 2 + i) * 0.4); top.rotation.y = t; });
  },
  vpc(g, A) {
    pad(g, 0, 0.62);
    const dome = sph(g, 0.65, C.net, 0, 0.2, 0, { op: 0.22, em: 0.3 }); dome.scale.y = 1.05;
    for (let i = 0; i < 12; i++) { const a = i * PI / 6; box(g, 0.28, 0.25, 0.06, MID, Math.cos(a) * 0.6, 0.2, Math.sin(a) * 0.6, { rot: [0, -a + HP, 0] }); }
    [[-0.2, -0.1, 0.3], [0.2, 0.15, 0.4], [0, -0.25, 0.25]].forEach(([x, z, h]) => box(g, 0.25, h, 0.25, C.net, x, 0.08 + h / 2, z, { em: 0.3 }));
    const l = sph(g, 0.07, 0xd9c2ff, 0, 0.9, 0, { em: 1 });
    A.push(t => { dome.material.opacity = 0.18 + 0.08 * Math.sin(t * 2); l.position.y = 0.95 + Math.sin(t * 3) * 0.05; });
  },
  igw(g, A) {
    pad(g);
    [-0.45, 0.45].forEach(x => { box(g, 0.2, 1.0, 0.3, MID, x, 0.58, 0); cone(g, 0.18, 0.2, C.net, x, 1.18, 0, { em: 0.4 }, 4); });
    M(g, new THREE.TorusGeometry(0.45, 0.1, 6, 14, PI), C.net, 0, 1.0, 0, { em: 0.4 });
    const gl = new THREE.Group(); gl.position.y = 1.65; g.add(gl); globe(gl, C.net, 0, 0.26);
    box(g, 0.5, 0.04, 0.5, 0xd9c2ff, 0, 0.1, 0.0, { em: 0.5 });
    A.push(t => gl.rotation.y = t);
  },
  transitgateway(g, A) {
    pad(g);
    cyl(g, 0.4, 0.4, 0.2, C.net, 0, 0.3, 0, { em: 0.3 }, 16);
    const h = cyl(g, 0.22, 0.22, 0.3, 0xd9c2ff, 0, 0.55, 0, { em: 0.9 }, 8);
    const bits = [];
    for (let i = 0; i < 4; i++) { const a = i * HP + PI / 4; cyl(g, 0.09, 0.09, 0.45, MID, Math.cos(a) * 0.62, 0.3, Math.sin(a) * 0.62, { rot: [0, -a, HP], met: 0.6 }); cyl(g, 0.17, 0.17, 0.12, C.net, Math.cos(a) * 0.82, 0.3, Math.sin(a) * 0.82, { rot: [0, -a, HP], em: 0.5 }); bits.push([a, sph(g, 0.06, 0xffffff, 0, 0.3, 0, { em: 1, emc: C.net })]); }
    A.push(t => { h.rotation.y = t * 2; bits.forEach(([a, b], i) => { const p = ((t * 0.6 + i * 0.25) % 1) * 0.8; b.position.set(Math.cos(a) * p, 0.4, Math.sin(a) * p); }); });
  },
  vpcendpoint(g, A) {
    pad(g, 0, 0.62);
    bucket(g, C.storage, 0.3, 0.08, 0, 0.3, 0.55);
    cyl(g, 0.17, 0.17, 0.6, C.net, -0.2, 0.35, 0, { rot: [0, 0, HP], op: 0.6, em: 0.4 }, 12);
    cyl(g, 0.22, 0.22, 0.08, C.net, -0.5, 0.35, 0, { rot: [0, 0, HP], em: 0.7 }, 12);
    box(g, 0.1, 0.5, 0.4, MID, 0.0, 0.35, 0);
    const p = sph(g, 0.07, 0xd9c2ff, 0, 0.35, 0, { em: 1 });
    cone(g, 0.12, 0.25, C.net, -0.55, 0.9, 0, { em: 0.7, rot: [0, 0, PI] }, 4);
    A.push(t => p.position.x = -0.45 + ((t * 0.7) % 1) * 0.7);
  },
  securitygroup(g, A) {
    pad(g); srv(g, 0, 0.08, 0, C.net, 1.1);
    box(g, 0.5, 0.5, 0.5, 0, 0, 0, 0, { visible: false }).visible = false;
    const post = box(g, 0.34, 0.6, 0.34, C.sec, 0.62, 0.38, 0.4, { em: 0.2 }); cone(g, 0.28, 0.2, 0x8f1f32, 0.62, 0.78, 0.4, {}, 4).rotation.y = PI / 4;
    sph(g, 0.1, 0xf2c9a0, 0.62, 0.95, 0.4);
    const arm = new THREE.Group(); arm.position.set(-0.2, 0.45, 0.55); g.add(arm);
    box(arm, 0.8, 0.07, 0.06, 0xffffff, 0.4, 0, 0, { em: 0.2 }); for (let i = 0; i < 4; i++) box(arm, 0.08, 0.075, 0.07, C.sec, 0.15 + i * 0.2, 0, 0, { em: 0.5 });
    for (let i = 0; i < 4; i++) { const a = i * HP + PI / 4; box(g, 0.06, 0.8, 0.06, C.net, Math.cos(a) * 0.4, 0.5, Math.sin(a) * 0.4, { em: 0.3 }).visible = false; }
    A.push(t => arm.rotation.z = 0.2 + (0.5 + 0.5 * Math.sin(t * 1.3)) * 0.2);
  },
  nacl(g, A) {
    pad(g);
    box(g, 0.5, 0.7, 0.5, MID, -0.25, 0.43, 0.15); box(g, 0.62, 0.08, 0.62, C.net, -0.25, 0.82, 0.15, { em: 0.3 });
    box(g, 0.25, 0.25, 0.04, 0xbfe9ff, -0.25, 0.55, 0.42, { em: 0.4, emc: C.net });
    const board = new THREE.Group(); board.position.set(0.35, 0.85, -0.2); g.add(board);
    cyl(g, 0.04, 0.04, 0.8, MID, 0.35, 0.45, -0.2);
    box(board, 0.55, 0.7, 0.05, DARK, 0, 0, 0);
    for (let i = 0; i < 4; i++) { box(board, 0.1, 0.08, 0.02, C.net, -0.16, 0.22 - i * 0.15, 0.04, { em: 0.6 }); box(board, 0.28, 0.05, 0.02, i % 2 ? C.sec : 0x3fae29, 0.08, 0.22 - i * 0.15, 0.04, { em: 0.6 }); }
    const lights = [C.sec, 0xffcc33, 0x3fae29].map((c, i) => sph(g, 0.07, c, -0.25, 1.25 - i * 0.0 + 0.0, 0.15, { em: 0.2 }));
    lights.forEach((l, i) => l.position.set(-0.25, 1.4 - i * 0.18, 0.15 - 0.0));
    cyl(g, 0.1, 0.1, 0.55, DARK, -0.25, 1.15, 0.0 + 0.15, { rot: [0, 0, 0] }).visible = false;
    A.push(t => lights.forEach((l, i) => l.material.emissiveIntensity = Math.floor(t * 0.8) % 3 === i ? 1.2 : 0.05));
  },
  fsx(g, A) {
    pad(g); box(g, 0.8, 1.3, 0.6, 0x3a7a30, 0, 0.73, 0, { met: 0.4 });
    for (let i = 0; i < 2; i++) { box(g, 0.68, 0.4, 0.04, 0x2a5a22, 0, 0.35 + i * 0.45, 0.31); box(g, 0.2, 0.05, 0.05, LIGHT, 0, 0.4 + i * 0.45, 0.35, { met: 0.8 }); }
    const w = new THREE.Group(); w.position.set(0, 1.12, 0.33); g.add(w);
    [[-0.1, 0.1], [0.1, 0.1], [-0.1, -0.1], [0.1, -0.1]].forEach(([x, y], i) => box(w, 0.17, 0.17, 0.04, [C.storage, 0x7fd66b, 0xb7f0a8, 0x2f8a20][i], x, y, 0, { em: 0.8 }));
    A.push(t => { w.rotation.y = Math.sin(t * 1.5) * 0.4; });
  },
  storagegateway(g, A) {
    pad(g, 0, 0.7); srv(g, -0.4, 0.08, 0, 0x888888, 1.3, { em: 0.2 });
    box(g, 0.9, 0.08, 0.3, C.storage, 0.1, 0.95, 0, { em: 0.4 });
    [-0.05, 0.25].forEach(x => box(g, 0.05, 0.28, 0.05, MID, x, 0.8, 0.12)); [-0.05, 0.25].forEach(x => box(g, 0.05, 0.28, 0.05, MID, x, 0.8, -0.12));
    const cl = new THREE.Group(); cl.position.set(0.45, 1.25, 0); g.add(cl);
    sph(cl, 0.2, 0xeaffea, 0, 0, 0, { em: 0.4, emc: C.storage }); sph(cl, 0.16, 0xeaffea, 0.2, -0.04, 0, { em: 0.4, emc: C.storage }); sph(cl, 0.16, 0xeaffea, -0.2, -0.05, 0, { em: 0.4, emc: C.storage });
    const b = sph(g, 0.06, 0xffffff, 0, 1.0, 0, { em: 1, emc: C.storage });
    A.push(t => { cl.position.y = 1.25 + Math.sin(t * 2) * 0.05; b.position.x = -0.3 + ((t * 0.6) % 1) * 0.8; });
  },
  snowball(g, A) {
    pad(g);
    box(g, 1.0, 0.7, 0.65, 0x6b7280, 0, 0.45, 0, { met: 0.5 });
    box(g, 1.05, 0.08, 0.7, 0x4b5563, 0, 0.45, 0); box(g, 0.1, 0.72, 0.68, 0x4b5563, -0.35, 0.45, 0); box(g, 0.1, 0.72, 0.68, 0x4b5563, 0.35, 0.45, 0);
    M(g, new THREE.TorusGeometry(0.2, 0.04, 6, 12, PI), 0x222222, 0, 0.8, 0, {});
    const f = new THREE.Group(); f.position.set(0, 0.45, 0.34); g.add(f);
    for (let i = 0; i < 3; i++) box(f, 0.05, 0.4, 0.02, 0xdff4ff, 0, 0, 0, { rot: [0, 0, i * PI / 3], em: 0.8, emc: C.storage });
    [-0.45, 0.45].forEach(x => box(g, 0.07, 0.07, 0.7, C.storage, x, 0.3, 0, { em: 0.4 }).position.y = 0.2);
    const fl = [0, 1, 2].map(() => oct(g, 0.04, 0xffffff, 0, 1, 0, { em: 1 }));
    A.push(t => { f.rotation.z = t; fl.forEach((s, i) => s.position.set(Math.cos(i * 2.1 + t) * 0.5, 1.9 - ((t * 0.3 + i / 3) % 1) * 1.5, Math.sin(i * 2.1 + t) * 0.5)); });
  },
  datasync(g, A) {
    pad(g, 0, 0.7);
    [-0.45, 0.45].forEach(x => { cyl(g, 0.25, 0.25, 0.3, DARK, x, 0.28, 0, { met: 0.6 }, 16); cyl(g, 0.2, 0.2, 0.04, 0xc9d3dc, x, 0.45, 0, { met: 0.9 }, 16); sph(g, 0.04, C.storage, x, 0.47, 0.1, { em: 1 }); });
    const r = new THREE.Group(); r.position.set(0, 0.9, 0); g.add(r);
    [0, PI].forEach(a => { const arc = M(r, new THREE.TorusGeometry(0.3, 0.05, 6, 12, 2.4), C.storage, 0, 0, 0, { em: 0.8, rot: [0, 0, a] }); const tip = cone(r, 0.1, 0.2, C.storage, Math.cos(a + 2.4) * 0.3, Math.sin(a + 2.4) * 0.3, 0, { em: 0.8, rot: [0, 0, a + 2.4 + PI] }, 4); });
    A.push(t => r.rotation.z = -t * 2);
  },
  backup(g, A) {
    pad(g); box(g, 1.0, 1.2, 0.8, 0x39604a, 0, 0.7, 0, { met: 0.7 });
    box(g, 0.8, 1.0, 0.04, 0x2f4d3a, 0, 0.7, 0.42, { met: 0.7 });
    const cl = new THREE.Group(); cl.position.set(0, 0.8, 0.46); g.add(cl);
    cyl(cl, 0.28, 0.28, 0.05, 0xf1f5f0, 0, 0, 0, { rot: [HP, 0, 0], em: 0.2 }, 18);
    const hand = box(cl, 0.04, 0.2, 0.03, C.storage, 0, 0.1, 0.04, { em: 1 }); hand.geometry.translate(0, 0.08, 0);
    hand.position.y = 0;
    const hand2 = box(cl, 0.04, 0.14, 0.03, 0x1d5a14, 0, 0, 0.04); hand2.geometry.translate(0, 0.06, 0); hand2.rotation.z = 2;
    const ar = M(g, new THREE.TorusGeometry(0.4, 0.04, 6, 14, 4.5), C.storage, 0, 0.8, 0.5, { em: 0.9, rot: [0, 0, 0.8] });
    cone(g, 0.1, 0.2, C.storage, -0.2, 1.1, 0.5, { em: 0.9, rot: [0, 0, 1.2] }, 4);
    [-0.4, 0.4].forEach(x => box(g, 0.1, 0.12, 0.1, DARK, x, 0.06, 0.3));
    A.push(t => { hand.rotation.z = t * 2; ar.rotation.z = 0.8 - Math.sin(t) * 0.2; });
  },
  dms(g, A) {
    pad(g, 0, 0.7);
    box(g, 1.4, 0.1, 0.1, DARK, 0, 0.12, 0.35); box(g, 1.4, 0.1, 0.1, DARK, 0, 0.12, -0.35);
    const truck = new THREE.Group(); g.add(truck);
    box(truck, 0.65, 0.1, 0.5, MID, 0, 0.3, 0, { met: 0.5 });
    [[-0.25, 0.28], [0.25, 0.28], [-0.25, -0.28], [0.25, -0.28]].forEach(([x, z]) => cyl(truck, 0.08, 0.08, 0.06, 0x111111, x, 0.2, z, { rot: [HP, 0, 0] }));
    dbStack(truck, C.database, 0, 0, 0.2, 2, 0.22).forEach(m => m.position.y += 0.32);
    cyl(g, 0.25, 0.25, 0.1, C.database, 0.55, 0.25, 0, { em: 0.4, op: 0.5 }, 16);
    cyl(g, 0.25, 0.25, 0.1, C.database, -0.55, 0.25, 0, { em: 0.4 }, 16);
    cone(g, 0.12, 0.2, 0x9db8ff, 0, 1.1, 0, { em: 0.8, rot: [0, 0, -HP] }, 4);
    A.push(t => { truck.position.x = -0.5 + ((t * 0.3) % 1) * 1.0; });
  },
  stepfunctions(g, A) {
    pad(g);
    const ns = [];
    [[-0.4, 0.25, -0.2], [-0.1, 0.55, 0], [0.2, 0.85, 0.2], [0.45, 1.2, 0.4]].forEach(([x, y, z], i) => {
      ns.push(box(g, 0.28, 0.2, 0.28, i === 3 ? 0xff6fb5 : C.integ, x, y, z, { em: 0.5 }));
      box(g, 0.34, 0.06, 0.34, DARK, x, y - 0.14 - 0.0, z);
      if (i < 3) { const n = [[-0.4, 0.25, -0.2], [-0.1, 0.55, 0], [0.2, 0.85, 0.2], [0.45, 1.2, 0.4]][i + 1]; cyl(g, 0.025, 0.025, 0.45, 0xffffff, (x + n[0]) / 2, (y + n[1]) / 2, (z + n[2]) / 2, { rot: [0, 0, -1.0], em: 0.3 }, 6); }
    });
    A.push(t => ns.forEach((n, i) => n.material.emissiveIntensity = Math.floor(t * 1.5) % 4 === i ? 1.3 : 0.2));
  },
  amazonmq(g, A) {
    pad(g, 0, 0.62);
    box(g, 0.2, 0.9, 0.2, MID, 0, 0.5, 0); const b = box(g, 0.75, 0.5, 0.45, C.integ, 0, 1.15, 0, { em: 0.2 });
    cyl(g, 0.225, 0.225, 0.45, C.integ, 0, 1.4, 0, { rot: [HP, 0, 0], em: 0.2 }, 14).scale.set(1, 1, 1); b.position.y = 1.05;
    box(g, 0.4, 0.04, 0.03, 0x111111, 0, 1.0, 0.23); box(g, 0.04, 0.5, 0.2, 0xffffff, 0.35, 0.95, 0.0, { em: 0.2 }).visible = false;
    const flag = new THREE.Group(); flag.position.set(0.37, 1.15, 0); g.add(flag); box(flag, 0.04, 0.3, 0.04, MID, 0, 0.1, 0); box(flag, 0.2, 0.12, 0.03, C.sec, 0.1, 0.2, 0, { em: 0.5 });
    const env = new THREE.Group(); env.position.set(-0.1, 1.2, 0.5); g.add(env);
    box(env, 0.35, 0.22, 0.04, 0xfff0f6, 0, 0, 0, { em: 0.3 }); cone(env, 0.2, 0.12, 0xffc4dc, 0, 0.05, 0.03, { rot: [0, 0, PI], em: 0.2 }, 4).scale.set(1.2, 1, 0.3);
    A.push(t => { flag.rotation.z = -Math.abs(Math.sin(t * 1.5)) * 0.5; env.position.y = 1.2 + Math.sin(t * 2) * 0.07; env.rotation.y = Math.sin(t) * 0.4; });
  },
  guardduty(g, A) {
    pad(g, 0, 0.6); cyl(g, 0.12, 0.2, 0.7, MID, 0, 0.45, 0, { met: 0.5 }, 6);
    const dish = new THREE.Group(); dish.position.y = 0.95; g.add(dish);
    const d = sph(dish, 0.5, C.sec, 0, 0.25, 0, { em: 0.3, met: 0.6 }); d.scale.set(1, 0.3, 1); d.rotation.x = 0.0;
    cyl(dish, 0.03, 0.03, 0.5, MID, 0.25, 0.45, 0, { rot: [0, 0, 0.5] }); sph(dish, 0.07, 0xffd24a, 0.4, 0.75, 0, { em: 1 });
    const ring = tor(g, 0.65, 0.015, 0xff7080, 0, 0.12, 0, { em: 1, rot: [HP, 0, 0] });
    const beam = cone(g, 0.3, 0.9, 0xff4a60, 0, 0, 0, { op: 0.25, em: 0.9, rot: [0, 0, HP] }, 4); beam.geometry.translate(0, 0.45, 0); beam.position.y = 0.2; beam.geometry.translate(0, 0, 0);
    A.push(t => { dish.rotation.y = t * 1.5; beam.rotation.y = -t * 2; ring.scale.setScalar(0.5 + ((t * 0.5) % 1) * 0.7); });
  },
  inspector(g, A) {
    pad(g); srv(g, 0, 0.08, -0.1, C.sec, 1.4);
    const bug = new THREE.Group(); bug.position.set(0.3, 0.8, 0.3); g.add(bug);
    sph(bug, 0.1, 0x222222, 0, 0, 0, { em: 0.1 }).scale.set(1, 0.7, 1.4); sph(bug, 0.06, C.sec, 0, 0.0, 0.14, { em: 1 });
    for (let i = 0; i < 3; i++) [-1, 1].forEach(s => box(bug, 0.2, 0.02, 0.02, 0x222222, s * 0.12, -0.02, -0.06 + i * 0.07, { rot: [0, 0, s * 0.4] }));
    const l = lens(g, C.sec, -0.1, 1.2, 0.5, 0.38, 0.5);
    A.push(t => { l.position.x = -0.1 + Math.sin(t) * 0.3; bug.rotation.y = t * 3; });
  },
  macie(g, A) {
    pad(g);
    [-0.3, 0, 0.3].forEach((x, i) => box(g, 0.5, 0.65, 0.04, 0xf4efe0, x * 0.8, 0.45 + i * 0.05, -0.2 + i * 0.15, { rot: [0, -0.3 + i * 0.3, 0] }));
    for (let i = 0; i < 3; i++) box(g, 0.3, 0.04, 0.03, MID, 0, 0.5 + i * 0.1, 0.12, { em: 0.0 });
    const l = lens(g, C.sec, 0.05, 1.05, 0.45, 0.35, 0.4);
    box(g, 0.22, 0.17, 0.1, 0xe0b040, 0.05, 1.05, 0.5, { met: 0.8, em: 0.3 });
    M(g, new THREE.TorusGeometry(0.07, 0.025, 6, 10, PI), 0xcccccc, 0.05, 1.15, 0.5, { met: 0.8 });
    A.push(t => { l.position.set(0.05 + Math.sin(t * 0.8) * 0.15, 1.05 + Math.sin(t * 1.6) * 0.05, 0.45); });
  },
  acm(g, A) {
    pad(g, 0, 0.62);
    const sc = new THREE.Group(); sc.position.y = 0.85; g.add(sc);
    box(sc, 0.9, 0.65, 0.04, 0xf4efe0, 0, 0, 0); cyl(sc, 0.06, 0.06, 0.95, 0xcaa35a, 0, 0.34, 0, { rot: [0, 0, HP] }, 8); cyl(sc, 0.06, 0.06, 0.95, 0xcaa35a, 0, -0.34, 0, { rot: [0, 0, HP] }, 8);
    for (let i = 0; i < 3; i++) box(sc, 0.5, 0.04, 0.03, MID, -0.12, 0.17 - i * 0.12, 0.03);
    sph(sc, 0.12, C.sec, 0.28, -0.15, 0.05, { em: 0.6 }).scale.z = 0.4;
    box(sc, 0.08, 0.2, 0.02, C.sec, 0.24, -0.33, 0.04); box(sc, 0.08, 0.2, 0.02, C.sec, 0.33, -0.33, 0.04);
    box(g, 0.3, 0.22, 0.12, 0xe0b040, 0.0, 0.35, 0.3, { met: 0.8, em: 0.2 }); M(g, new THREE.TorusGeometry(0.09, 0.03, 6, 10, PI), 0xcccccc, 0, 0.47, 0.3, { met: 0.8 });
    A.push(t => sc.rotation.y = Math.sin(t) * 0.35);
  },
  identitycenter(g, A) {
    pad(g);
    const ring = tor(g, 0.28, 0.05, 0xffd24a, 0, 1.2, 0, { em: 0.6, met: 0.8 });
    const ks = [];
    for (let i = 0; i < 3; i++) { const a = i * 2 * PI / 3 + 0.5; const k = new THREE.Group(); k.position.set(Math.cos(a) * 0.28, 1.2 + Math.sin(a) * 0.28, 0); k.rotation.z = a - HP; g.add(k); box(k, 0.04, 0.25, 0.04, 0xffd24a, 0, -0.1, 0, { em: 0.4, met: 0.8 }); box(k, 0.09, 0.04, 0.04, 0xffd24a, 0.04, -0.2, 0, { em: 0.4, met: 0.8 }); ks.push(k); }
    [[-0.5, 0.0], [0, 0.0], [0.5, 0.0]].forEach(([x], i) => { const dz = 0.45; box(g, 0.32, 0.55, 0.08, [C.sec, 0x8f1f32, 0xff6a7a][i], x, 0.38, dz, { em: 0.3 }); box(g, 0.2, 0.4, 0.09, 0x1a1030, x, 0.35, dz, { em: 0.5, emc: C.sec }); cyl(g, 0.02, 0.02, 0.6, 0xffd24a, x * 0.55, 0.85, dz * 0.5 - 0.0, { rot: [0.9 * (dz > 0 ? 1 : -1), 0, -x * 1.0], em: 0.5 }).visible = true; });
    A.push(t => { ring.rotation.y = t; ks.forEach((k, i) => k.rotation.y = t * 1.2); });
  },
  cloudformation(g, A) {
    pad(g);
    box(g, 0.6, 0.04, 0.5, 0x2b5aa8, -0.3, 0.1, 0.25, { em: 0.2 }); for (let i = 0; i < 3; i++) box(g, 0.45, 0.01, 0.025, 0xbfe0ff, -0.3, 0.13, 0.12 + i * 0.12, { em: 0.5 });
    const L = [];
    for (let i = 0; i < 4; i++) L.push(box(g, 0.5, 0.18, 0.5, i % 2 ? C.mgmt : 0xe36bf0, 0.2, 0.2 + i * 0.2, -0.15, { em: 0.35 }));
    cyl(g, 0.05, 0.08, 1.6, 0xffcc33, -0.45, 0.88, -0.35, { met: 0.4 }, 4);
    const arm = new THREE.Group(); arm.position.set(-0.45, 1.65, -0.35); g.add(arm);
    box(arm, 1.0, 0.07, 0.07, 0xffcc33, 0.4, 0, 0); cyl(arm, 0.015, 0.015, 0.5, 0xdddddd, 0.7, -0.25, 0); const blk = box(arm, 0.2, 0.12, 0.2, 0xe36bf0, 0.7, -0.55, 0, { em: 0.6 });
    A.push(t => { arm.rotation.y = Math.sin(t * 0.7) * 0.3 - 0.2; blk.position.y = -0.55 + Math.sin(t * 2) * 0.1; L.forEach((l, i) => l.scale.y = 1 + 0.05 * Math.sin(t * 3 + i)); });
  },
  ssm(g, A) {
    pad(g);
    box(g, 1.0, 0.4, 0.55, C.mgmt, 0, 0.3, 0, { met: 0.4 }); box(g, 1.04, 0.06, 0.58, 0x8f1a9a, 0, 0.5, 0);
    M(g, new THREE.TorusGeometry(0.2, 0.04, 6, 12, PI), 0xcccccc, 0, 0.55, 0, { met: 0.8 });
    const w = new THREE.Group(); w.position.set(0, 0.95, 0.1); w.rotation.z = -0.7; g.add(w);
    box(w, 0.1, 0.85, 0.06, 0xd0d6de, 0, 0, 0, { met: 0.9, rough: 0.3 });
    tor(w, 0.14, 0.05, 0xd0d6de, 0, 0.45, 0, { met: 0.9 }); box(w, 0.1, 0.1, 0.07, 0x111111, 0, 0.56, 0);
    box(w, 0.14, 0.2, 0.08, 0xff7aff, 0, -0.3, 0, { em: 0.5 });
    const cog = cyl(g, 0.15, 0.15, 0.06, 0xff7aff, 0.4, 0.85, 0.15, { rot: [HP, 0, 0], em: 0.6 }, 8);
    A.push(t => { w.rotation.z = -0.7 + Math.sin(t * 2) * 0.15; cog.rotation.y = t; });
  },
  config(g, A) {
    pad(g);
    box(g, 0.85, 1.2, 0.08, 0x8a6a3a, 0, 0.8, 0, { rough: 0.9, rot: [-0.1, 0, 0] }); box(g, 0.7, 1.05, 0.04, 0xf4efe0, 0, 0.8, 0.05, { rot: [-0.1, 0, 0] });
    box(g, 0.3, 0.12, 0.1, 0xcccccc, 0, 1.4, 0, { met: 0.8 });
    const ticks = [];
    for (let i = 0; i < 4; i++) { box(g, 0.12, 0.12, 0.03, MID, -0.22, 1.12 - i * 0.22, 0.12, { rot: [-0.1, 0, 0] }); ticks.push(box(g, 0.08, 0.04, 0.03, C.mgmt, -0.22, 1.12 - i * 0.22, 0.14, { em: 0.9, rot: [-0.1, 0, i % 2 ? 0.8 : -0.8] })); box(g, 0.32, 0.05, 0.03, MID, 0.12, 1.12 - i * 0.22, 0.12, { rot: [-0.1, 0, 0] }); }
    const cog = cyl(g, 0.22, 0.22, 0.08, C.mgmt, 0.45, 0.45, 0.35, { rot: [HP, 0, 0], em: 0.7 }, 8); cyl(g, 0.08, 0.08, 0.1, DARK, 0.45, 0.45, 0.35, { rot: [HP, 0, 0] });
    A.push(t => { cog.rotation.y = t; ticks.forEach((k, i) => pulse(k, t + i)); });
  },
  organizations(g, A) {
    pad(g, 0, 0.7);
    box(g, 0.4, 0.3, 0.3, C.mgmt, 0, 1.5, 0, { em: 0.6 }); cone(g, 0.12, 0.15, 0xffd24a, 0, 1.73, 0, { em: 0.8 }, 4);
    box(g, 0.05, 0.3, 0.05, MID, 0, 1.2, 0); box(g, 1.1, 0.05, 0.05, MID, 0, 1.05, 0);
    const ch = [];
    [-0.55, 0, 0.55].forEach((x, i) => { box(g, 0.05, 0.25, 0.05, MID, x, 0.92, 0); ch.push(box(g, 0.34, 0.3, 0.3, [0xe36bf0, C.mgmt, 0xa01cac][i], x, 0.65, 0, { em: 0.4 })); [-0.12, 0.12].forEach(dx => box(g, 0.04, 0.2, 0.04, MID, x + dx * 0.5, 0.35, 0).position.y = 0.25 + 0.0); box(g, 0.2, 0.12, 0.2, 0xff7aff, x, 0.15, 0.0, { em: 0.3 }); });
    A.push(t => ch.forEach((c, i) => c.position.y = 0.65 + Math.sin(t * 2 + i * 1.5) * 0.04));
  },
  trustedadvisor(g, A) {
    pad(g, 0, 0.6);
    cyl(g, 0.15, 0.2, 0.2, MID, 0, 0.2, 0, { met: 0.6 }); cyl(g, 0.1, 0.1, 0.12, MID, 0, 0.36, 0, { met: 0.6 });
    const b = sph(g, 0.4, 0xfff0a0, 0, 0.95, 0, { em: 0.9, emc: 0xffd24a, op: 0.9 });
    cone(g, 0.2, 0.3, 0xfff0a0, 0, 0.58, 0, { em: 0.9, emc: 0xffd24a, rot: [0, 0, PI] }, 8);
    for (let i = 0; i < 4; i++) { const a = i * 0.7 - 1.05; box(g, 0.04, 0.2, 0.04, 0xffd24a, Math.sin(a) * 0.62, 1.2 + Math.cos(a) * 0.3 - 0.0, 0, { rot: [0, 0, -a], em: 0.9 }); }
    const ck = new THREE.Group(); ck.position.set(0.45, 0.4, 0.4); g.add(ck);
    cyl(ck, 0.2, 0.2, 0.05, C.mgmt, 0, 0, 0, { rot: [HP, 0, 0], em: 0.6 }, 16);
    box(ck, 0.08, 0.2, 0.04, 0xffffff, -0.05, -0.02, 0.04, { rot: [0, 0, 0.8], em: 0.6 }); box(ck, 0.08, 0.32, 0.04, 0xffffff, 0.06, 0.02, 0.04, { rot: [0, 0, -0.7], em: 0.6 });
    A.push(t => { pulse(b, t, 1, 0.5); ck.rotation.y = Math.sin(t * 1.5) * 0.5; });
  },
  athena(g, A) {
    pad(g);
    for (let i = 0; i < 4; i++) cyl(g, 0.08, 0.09, 0.7, 0xeaf6f2, -0.45 + i * 0.3, 0.5, -0.1, { met: 0.1 }, 8);
    box(g, 1.2, 0.08, 0.4, 0xdfeee9, 0, 0.12 + 0.0, -0.1); box(g, 1.2, 0.1, 0.4, 0xdfeee9, 0, 0.9, -0.1); cone(g, 0.7, 0.3, 0xdfeee9, 0, 1.1, -0.1, {}, 4).rotation.y = PI / 4;
    bucket(g, C.analytics, 0.0, 0.08, 0.5, 0.3, 0.3);
    const q = new THREE.Group(); q.position.set(0, 1.55, 0.2); g.add(q);
    M(q, new THREE.TorusGeometry(0.14, 0.05, 6, 12, 4.2), C.analytics, 0, 0.1, 0, { em: 0.9, rot: [0, 0, -0.5] }); box(q, 0.06, 0.12, 0.06, C.analytics, 0.0, -0.1, 0, { em: 0.9 }); sph(q, 0.05, C.analytics, 0, -0.27, 0, { em: 0.9 });
    A.push(t => { q.rotation.y = t; q.position.y = 1.55 + Math.sin(t * 2) * 0.05; });
  },
  glue(g, A) {
    pad(g, 0, 0.65);
    box(g, 0.4, 0.4, 0.4, C.analytics, -0.55, 0.3, 0, { em: 0.2 }); cone(g, 0.28, 0.4, 0x0fd1b0, 0.55, 0.3, 0, { em: 0.2 }, 3);
    cyl(g, 0.07, 0.07, 0.4, MID, -0.3, 0.3, 0, { rot: [0, 0, HP], met: 0.6 }); cyl(g, 0.07, 0.07, 0.4, MID, 0.3, 0.3, 0, { rot: [0, 0, HP], met: 0.6 });
    cyl(g, 0.17, 0.2, 0.4, 0xffe14a, 0, 0.35, 0, { em: 0.3, met: 0.1 }, 8); cyl(g, 0.17, 0.17, 0.1, 0xffe14a, 0, 0.6, 0, { em: 0.3 }, 8);
    cyl(g, 0.07, 0.1, 0.12, 0xffffff, 0, 0.72, 0, { em: 0.3 }, 6);
    const dr = sph(g, 0.06, 0xffe14a, 0, 0.45, 0.0, { em: 0.9 });
    const bits = [0, 1].map(i => box(g, 0.08, 0.08, 0.08, 0xffffff, 0, 0.3, 0.0, { em: 1, emc: C.analytics }));
    A.push(t => { dr.position.set(0, 0.95 - ((t * 0.8) % 1) * 0.4, 0.0); bits.forEach((b, i) => { const p = (t * 0.5 + i * 0.5) % 1; b.position.x = -0.6 + p * 1.2; b.rotation.y = t * 3; }); });
  },
  emr(g, A) {
    pad(g);
    const cl = new THREE.Group(); g.add(cl);
    sph(cl, 0.3, C.analytics, 0, 0.7, 0, { em: 0.4 }).scale.set(1.2, 1, 1);
    cyl(cl, 0.05, 0.08, 0.35, 0x0fd1b0, 0.0, 0.62, 0.38, { rot: [HP, 0, 0] }); sph(cl, 0.04, 0xffffff, 0.12, 0.8, 0.28, { em: 1 }); sph(cl, 0.04, 0xffffff, -0.12, 0.8, 0.28, { em: 1 });
    const w = [];
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; cyl(g, 0.015, 0.015, 0.6, 0xffffff, Math.cos(a) * 0.35, 0.3, Math.sin(a) * 0.35, { rot: [0, -a, HP], em: 0.4 }).position.y = 0.45; w.push(box(g, 0.2, 0.2, 0.2, 0x0fd1b0, Math.cos(a) * 0.68, 0.2, Math.sin(a) * 0.68, { em: 0.5 })); }
    A.push(t => { cl.rotation.y = Math.sin(t) * 0.3; w.forEach((m, i) => { m.position.y = 0.2 + 0.06 * Math.max(0, Math.sin(t * 4 - i)); }); });
  },
  opensearch(g, A) {
    pad(g);
    const bars = [0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => box(g, 0.15, h, 0.4, i % 2 ? C.analytics : 0x0fd1b0, -0.4 + i * 0.2, 0.08 + h / 2, -0.1, { em: 0.35 }));
    const l = lens(g, 0x36e0c4, 0, 1.0, 0.4, 0.5, 0.5);
    A.push(t => { l.position.x = Math.sin(t * 0.8) * 0.3; bars.forEach((b, i) => pulse(b, t + i, 1, 0.3)); });
  },
  firehose(g, A) {
    pad(g, 0, 0.65);
    bucket(g, C.analytics, 0.3, 0.08, 0, 0.4, 0.5);
    cyl(g, 0.08, 0.08, 0.9, 0xdd6a2a, -0.35, 0.9, 0, { rot: [0, 0, 0.9], met: 0.4 }, 8);
    cyl(g, 0.12, 0.08, 0.18, 0xffcc33, -0.02, 1.2, 0, { rot: [0, 0, 0.9 + PI], met: 0.6 }, 8).position.set(0.02, 1.32, 0);
    box(g, 0.06, 0.06, 0.06, 0, 0, 0, 0, { visible: false }).visible = false;
    cyl(g, 0.06, 0.06, 0.1, MID, -0.7, 0.5, 0, {});
    const dr = []; for (let i = 0; i < 6; i++) dr.push(sph(g, 0.05, 0x7ff3dc, 0, 0, 0, { em: 1, emc: C.analytics }));
    A.push(t => dr.forEach((d, i) => { const p = (t * 0.9 + i / 6) % 1; d.position.set(0.1 + p * 0.3, 1.3 - 0.0 * p - p * p * 0.9 + p * 0.1, 0); }));
  },
});
Object.assign(CAT, {
  compute: [...CAT.compute, 'eks', 'fargate', 'beanstalk'], net: [...CAT.net, 'vpc', 'igw', 'transitgateway', 'vpcendpoint', 'securitygroup', 'nacl'],
  storage: [...CAT.storage, 'fsx', 'storagegateway', 'snowball', 'datasync', 'backup'], database: [...CAT.database, 'dms'],
  integ: [...CAT.integ, 'stepfunctions', 'amazonmq'], sec: [...CAT.sec, 'guardduty', 'inspector', 'macie', 'acm', 'identitycenter'],
  mgmt: [...CAT.mgmt, 'cloudformation', 'ssm', 'config', 'organizations', 'trustedadvisor'], analytics: ['athena', 'glue', 'emr', 'opensearch', 'firehose'],
});
