import React, { useRef, useEffect, useMemo } from "react";

/**
 * 3D Packing Viewer using Three.js directly (no R3F needed).
 * Renders placed items as coloured boxes inside a wireframe container.
 */
let THREE;

function loadThree() {
  return import("three").then((mod) => { THREE = mod; return mod; });
}

export default function PackingViewer3D({ placed = [], container, label, showEmpty = false }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const animRef = useRef(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: -0.5 });

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth || 400;
    const H = el.clientHeight || 300;

    loadThree().then((THREE) => {
      // Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color(0x07090f);

      // Camera
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 5000);
      cameraRef.current = camera;
      const cx = container ? container.width / 2  : 100;
      const cy = container ? container.height / 2 : 100;
      const cz = container ? container.depth / 2  : 100;
      const dist = Math.max(cx, cy, cz) * 3.2;
      camera.position.set(cx + dist, cy + dist * 0.7, cz + dist);
      camera.lookAt(cx, cy, cz);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      rendererRef.current = renderer;
      el.appendChild(renderer.domElement);

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(500, 800, 400);
      scene.add(dir);

      // Container wireframe
      if (container) {
        const geo = new THREE.BoxGeometry(container.width, container.height, container.depth);
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({ color: 0x00e5ff, opacity: 0.25, transparent: true });
        const wire = new THREE.LineSegments(edges, mat);
        wire.position.set(cx, cy, cz);
        scene.add(wire);

        // Floor grid
        const gridHelper = new THREE.GridHelper(
          Math.max(container.width, container.depth), 10,
          0x1a2040, 0x1a2040
        );
        gridHelper.position.set(cx, 0, cz);
        scene.add(gridHelper);
      }

      // Place items
      for (const item of placed) {
        const geo = new THREE.BoxGeometry(item.width, item.height, item.depth);
        const color = new THREE.Color(item.color || "#00e5ff");
        const mat = new THREE.MeshPhongMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          shininess: 40,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          item.x + item.width / 2,
          item.y + item.height / 2,
          item.z + item.depth / 2
        );
        scene.add(mesh);

        // Edges
        const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
        const edgesGeo = new THREE.EdgesGeometry(geo);
        const edgeMesh = new THREE.LineSegments(edgesGeo, edgeMat);
        edgeMesh.position.copy(mesh.position);
        scene.add(edgeMesh);
      }

      // Animate / orbit
      const pivot = new THREE.Object3D();
      pivot.position.set(cx, cy, cz);
      scene.add(pivot);

      const animate = () => {
        animRef.current = requestAnimationFrame(animate);
        // Slow auto-rotate when not dragging
        if (!isDragging.current) rotation.current.y += 0.003;

        const r = rotation.current;
        const d = dist * 1.4;
        camera.position.set(
          cx + d * Math.cos(r.x) * Math.sin(r.y),
          cy + d * Math.sin(r.x),
          cz + d * Math.cos(r.x) * Math.cos(r.y)
        );
        camera.lookAt(cx, cy, cz);
        renderer.render(scene, camera);
      };
      animate();

      // Mouse drag to orbit
      const onMouseDown = (e) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
      const onMouseMove = (e) => {
        if (!isDragging.current) return;
        rotation.current.y += (e.clientX - lastMouse.current.x) * 0.007;
        rotation.current.x -= (e.clientY - lastMouse.current.y) * 0.005;
        rotation.current.x = Math.max(-1.2, Math.min(1.2, rotation.current.x));
        lastMouse.current = { x: e.clientX, y: e.clientY };
      };
      const onMouseUp = () => { isDragging.current = false; };
      renderer.domElement.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      return () => {
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    });

    return () => {
      cancelAnimationFrame(animRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode === el)
          el.removeChild(rendererRef.current.domElement);
      }
    };
  }, [placed, container]);

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: "#07090f", border: "1px solid rgba(255,255,255,0.07)" }}>
      {label && (
        <div className="absolute top-3 left-3 z-10 font-mono text-xs px-2.5 py-1 rounded-full"
          style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(238,242,255,0.5)" }}>
          {label}
        </div>
      )}
      <div className="absolute bottom-3 right-3 z-10 font-mono text-xs"
        style={{ color: "rgba(238,242,255,0.2)" }}>
        drag to rotate
      </div>
      <div ref={mountRef} style={{ width: "100%", height: 280 }} />
    </div>
  );
}
