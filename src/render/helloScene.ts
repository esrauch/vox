import * as THREE from 'three';
import { common, hexToNumber } from '../content/palettes';

/**
 * M1.0 placeholder scene: a jack-o'-lantern-colored cube hopping over a
 * checkerboard field, viewed from the angled ¾ camera. It proves three.js,
 * the palette and the phone layout end to end. M1.3 replaces it.
 */
export function startHelloScene(canvas: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(hexToNumber(common.sky));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(6, 14, 14);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, hexToNumber(common.grassDark), 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(5, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  scene.add(createCheckerboard(9, 9));

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: hexToNumber(common.pumpkin) }),
  );
  cube.castShadow = true;
  scene.add(cube);

  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    // A placeholder hop at 120 BPM. The real beat comes from the audio clock (M1.1).
    const phase = (t * 2) % 1;
    const hop = Math.sin(phase * Math.PI);
    cube.position.y = 0.5 + hop * 0.8;
    cube.scale.set(1 + (1 - hop) * 0.08, 1 - (1 - hop) * 0.08, 1 + (1 - hop) * 0.08);
    cube.rotation.y = t * 0.6;
    renderer.render(scene, camera);
  });
}

function createCheckerboard(cols: number, rows: number): THREE.Group {
  const group = new THREE.Group();
  const light = new THREE.MeshLambertMaterial({ color: hexToNumber(common.grass) });
  const dark = new THREE.MeshLambertMaterial({ color: hexToNumber(common.grassDark) });
  const tile = new THREE.BoxGeometry(1, 0.2, 1);
  for (let x = 0; x < cols; x++) {
    for (let z = 0; z < rows; z++) {
      const mesh = new THREE.Mesh(tile, (x + z) % 2 === 0 ? light : dark);
      mesh.position.set(x - (cols - 1) / 2, -0.1, z - (rows - 1) / 2);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  return group;
}
