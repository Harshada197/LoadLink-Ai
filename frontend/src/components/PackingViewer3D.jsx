import React, { useRef, useEffect } from "react";

let THREE;
function loadThree() {
  if (THREE) return Promise.resolve(THREE);
  return import("three").then((mod) => { THREE = mod; return mod; });
}

export default function PackingViewer3D({ placed = [], container, label }) {
  const mountRef = useRef(null);
  const coreRef = useRef(null); 
  const [ready, setReady] = React.useState(false);

  // 1. Initial Setup (Once)
  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    let cleanup = false;

    loadThree().then((T) => {
      if (cleanup) return;

      const W = el.clientWidth || 400;
      const H = el.clientHeight || 320;

      const scene = new T.Scene();
      scene.background = new T.Color(0x07090f);
      const camera = new T.PerspectiveCamera(45, W / H, 1, 20000);
      
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      el.appendChild(renderer.domElement);

      scene.add(new T.AmbientLight(0xffffff, 1.2));
      const light = new T.DirectionalLight(0xffffff, 0.8);
      light.position.set(500, 1000, 750);
      scene.add(light);

      const containerGroup = new T.Group();
      scene.add(containerGroup);

      coreRef.current = { scene, camera, renderer, containerGroup, T };
      setReady(true);

      let rotY = -0.5;
      const animate = () => {
        if (cleanup) return;
        requestAnimationFrame(animate);
        
        const size = container ? Math.max(container.width, container.height, container.depth) : 600;
        const dist = size * 1.8; 
        
        rotY += 0.004;
        camera.position.set(dist * Math.sin(rotY), dist * 0.8, dist * Math.cos(rotY));
        camera.lookAt(0, 0, 0);
        
        renderer.render(scene, camera);
      };
      animate();
      
      const handleResize = () => {
         if (!mountRef.current) return;
         const nW = mountRef.current.clientWidth;
         const nH = mountRef.current.clientHeight;
         renderer.setSize(nW, nH);
         camera.aspect = nW / nH;
         camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", handleResize);
    });

    return () => {
      cleanup = true;
      if (coreRef.current?.renderer) {
        coreRef.current.renderer.dispose();
        if (mountRef.current?.contains(coreRef.current.renderer.domElement)) {
          mountRef.current.removeChild(coreRef.current.renderer.domElement);
        }
      }
    };
  }, []);

  // 2. Data Updates (Prop changes)
  useEffect(() => {
    if (!ready || !coreRef.current || !container) return;
    const { containerGroup, T } = coreRef.current;

    containerGroup.clear();

    const geo = new T.BoxGeometry(container.width, container.height, container.depth);
    const edges = new T.EdgesGeometry(geo);
    const wire = new T.LineSegments(edges, new T.LineBasicMaterial({ color: 0x00e5ff, opacity: 0.3, transparent: true }));
    containerGroup.add(wire);

    placed.forEach((item) => {
      const iGeo = new T.BoxGeometry(Math.max(1, item.width - 0.5), Math.max(1, item.height - 0.5), Math.max(1, item.depth - 0.5));
      const iMat = new T.MeshPhongMaterial({ 
        color: item.color || 0x00e5ff, 
        transparent: true, 
        opacity: item.isContainer ? 0.3 : 0.85,
        shininess: 60
      });
      const mesh = new T.Mesh(iGeo, iMat);
      
      mesh.position.set(
        item.x + item.width / 2 - container.width / 2,
        item.y + item.height / 2 - container.height / 2,
        item.z + item.depth / 2 - container.depth / 2
      );
      containerGroup.add(mesh);

      const eWire = new T.LineSegments(new T.EdgesGeometry(iGeo), new T.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true }));
      eWire.position.copy(mesh.position);
      containerGroup.add(eWire);
    });

  }, [ready, placed, container]);

  return (
    <div className="relative w-full h-[320px] bg-[#07090f] rounded-2xl overflow-hidden">
      {label && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-mono text-white/50 uppercase tracking-widest">
          {label}
        </div>
      )}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
