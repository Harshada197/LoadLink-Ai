import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../store/useStore";
import { detectDeadspace, fetchMetrics, uploadImage } from "../services/api";

const SEVERITY_COLOR = { low:"#00e676", medium:"#ffb800", high:"#ff4d6d", critical:"#ff4d6d", success:"#00e5ff" };

export default function Scanner() {
  const { setScanResult, setLoading, isLoading, addAlert } = useStore();
  const [result, setResult] = useState(null);
  const [liveMode, setLiveMode] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [toggles, setToggles] = useState({ scan: true, grid: false, heat: false });
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const animRef = useRef(null);
  const frameRef = useRef(0);
  const busy = isLoading("scan");

  // ── Canvas simulation ──────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const f = frameRef.current;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a1020"); bg.addColorStop(1, "#050810");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Container walls
    ctx.strokeStyle = "rgba(0,229,255,0.25)"; ctx.lineWidth = 2;
    ctx.strokeRect(36, 24, W - 72, H - 48);

    // Grid overlay
    if (toggles.grid) {
      ctx.strokeStyle = "rgba(0,229,255,0.09)"; ctx.lineWidth = 0.5;
      for (let x = 36; x < W - 36; x += 56) { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, H - 24); ctx.stroke(); }
      for (let y = 24; y < H - 24; y += 40) { ctx.beginPath(); ctx.moveTo(36, y); ctx.lineTo(W - 36, y); ctx.stroke(); }
    }

    // Simulate boxes
    const boxes = [
      { x:55,  y:170, w:65, h:60, c:"rgba(255,77,109,0.65)",    lbl:"L", fragile:false },
      { x:55,  y:110, w:65, h:55, c:"rgba(255,184,0,0.55)",     lbl:"M", fragile:false },
      { x:130, y:175, w:50, h:55, c:"rgba(167,139,250,0.55)",   lbl:"M", fragile:true  },
      { x:130, y:125, w:50, h:45, c:"rgba(0,229,255,0.5)",      lbl:"S", fragile:false },
      { x:190, y:170, w:60, h:60, c:"rgba(255,112,67,0.55)",    lbl:"L", fragile:false },
      { x:260, y:180, w:55, h:50, c:"rgba(0,230,118,0.5)",      lbl:"M", fragile:false },
      { x:325, y:175, w:65, h:55, c:"rgba(255,77,109,0.5)",     lbl:"L", fragile:false },
      { x:400, y:185, w:40, h:45, c:"rgba(0,229,255,0.45)",     lbl:"S", fragile:false },
      { x:450, y:175, w:55, h:55, c:"rgba(167,139,250,0.5)",    lbl:"M", fragile:true  },
    ];

    boxes.forEach((b) => {
      const r = 5;
      ctx.beginPath();
      ctx.moveTo(b.x+r,b.y); ctx.lineTo(b.x+b.w-r,b.y);
      ctx.arcTo(b.x+b.w,b.y,b.x+b.w,b.y+r,r);
      ctx.lineTo(b.x+b.w,b.y+b.h-r);
      ctx.arcTo(b.x+b.w,b.y+b.h,b.x+b.w-r,b.y+b.h,r);
      ctx.lineTo(b.x+r,b.y+b.h);
      ctx.arcTo(b.x,b.y+b.h,b.x,b.y+b.h-r,r);
      ctx.lineTo(b.x,b.y+r);
      ctx.arcTo(b.x,b.y,b.x+r,b.y,r);
      ctx.closePath();
      ctx.fillStyle = b.c; ctx.fill();
      if (b.fragile) {
        ctx.strokeStyle = "rgba(167,139,250,0.8)"; ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(167,139,250,0.9)"; ctx.font = "9px DM Mono,monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚠", b.x + b.w/2, b.y + b.h/2 + 3);
      } else {
        ctx.strokeStyle = b.c.replace(/[\d.]+\)$/, "0.7)"); ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 11px DM Mono,monospace";
        ctx.textAlign = "center"; ctx.fillText(b.lbl, b.x+b.w/2, b.y+b.h/2+4);
      }
    });

    // Heat map
    if (toggles.heat) {
      const hm = ctx.createRadialGradient(200,200,0,200,200,160);
      hm.addColorStop(0,"rgba(255,77,109,0.2)"); hm.addColorStop(0.5,"rgba(255,184,0,0.08)"); hm.addColorStop(1,"transparent");
      ctx.fillStyle = hm; ctx.fillRect(36,24,W-72,H-48);
      const hm2 = ctx.createRadialGradient(430,190,0,430,190,90);
      hm2.addColorStop(0,"rgba(0,230,118,0.18)"); hm2.addColorStop(1,"transparent");
      ctx.fillStyle = hm2; ctx.fillRect(36,24,W-72,H-48);
    }

    // Scan line
    if (toggles.scan) {
      const scanY = 24 + ((f * 1.4) % (H - 48));
      const sg = ctx.createLinearGradient(36,scanY-18,36,scanY+18);
      sg.addColorStop(0,"transparent"); sg.addColorStop(0.5,"rgba(167,139,250,0.55)"); sg.addColorStop(1,"transparent");
      ctx.fillStyle = sg; ctx.fillRect(36,scanY-18,W-72,36);
      ctx.strokeStyle = "rgba(167,139,250,0.75)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(36,scanY); ctx.lineTo(W-36,scanY); ctx.stroke();
    }

    // Void warning box (animated)
    const pulse = 0.45 + 0.45 * Math.sin(f * 0.09);
    ctx.strokeStyle = `rgba(255,184,0,${pulse * 0.8})`;
    ctx.lineWidth = 1.5; ctx.setLineDash([5,4]);
    ctx.strokeRect(188, 55, 165, 100);
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,184,0,${pulse})`;
    ctx.font = "bold 10px DM Mono,monospace"; ctx.textAlign = "left";
    ctx.fillText("⚠ VOID DETECTED", 193, 73);

    // Corner brackets
    [[36,24],[W-36,24],[36,H-24],[W-36,H-24]].forEach(([bx,by],qi) => {
      const dx=qi%2===0?1:-1, dy=qi<2?1:-1, l=18;
      ctx.strokeStyle="rgba(0,229,255,0.5)"; ctx.lineWidth=2; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(bx+dx*l,by); ctx.lineTo(bx,by); ctx.lineTo(bx,by+dy*l); ctx.stroke();
    });

    frameRef.current++;
    animRef.current = requestAnimationFrame(drawFrame);
  }, [toggles]);

  useEffect(() => {
    if (liveMode) {
      drawFrame();
    } else {
      cancelAnimationFrame(animRef.current);
      // Draw static frame
      frameRef.current = 30;
      drawFrame();
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [liveMode, toggles, drawFrame]);

  const performYoloScan = async (isManual = false, fileObj = null) => {
      try {
         const res = fileObj ? await uploadImage(fileObj) : await fetchMetrics();
         const yoloData = res.data;
         const issues = [];
         
         const objects = yoloData.objects || [];
         const sorted = [...objects].sort((a,b) => b.y - a.y); // Bottom (higher y) is first
         
         const sizeVal = { "Small": 1, "Medium": 2, "Large": 3 };
         
         const barcodes = yoloData.barcodes || [];
         const a4_measurements = yoloData.a4_measurements || [];
         
         // A4 Hardware Calibration
         a4_measurements.forEach((cm, i) => {
             issues.push({
                 id: `a4_${i}_${Date.now()}`,
                 title: `📐 A4 CALIBRATION SCALE LOCKED`,
                 description: `Exact physical bounds detected: ${cm.width_cm}cm x ${cm.height_cm}cm. This item has been laser measured exactly.`,
                 severity: "success"
             });
         });
         
         // Object mapping and unauthorized checking
         objects.forEach((obj, i) => {
             if (obj.rawLabel && !["box", "suitcase", "refrigerator", "bottle", "keyboard", "lapop"].includes(obj.rawLabel) && obj.rawLabel !== "person") {
                 issues.push({
                     id: `auth_violation_${i}_${Date.now()}`,
                     title: `🚨 UNAUTHORIZED PACKAGE: ${obj.rawLabel.toUpperCase()}`,
                     description: `The system detected a restricted object (${obj.rawLabel}). Worker must remove it from the loading grid immediately!`,
                     severity: "critical"
                 });
             } else if (obj.rawLabel !== "person") {
                 issues.push({
                     id: `yolo_${i}`,
                     title: `Logged: ${obj.object.toUpperCase()} BOX`,
                     description: `Dimensions: ${obj.width}x${obj.height}px   Category: ${obj.size.toUpperCase()} Volume class.`,
                     severity: "low"
                 });
             }
         });
         
         // Stacking Violation logic
         for (let i = 0; i < sorted.length; i++) {
             for (let j = i + 1; j < sorted.length; j++) {
                 const lower = sorted[i]; // physically below
                 const higher = sorted[j]; // physically above
                 
                 const lowerCX = lower.x;
                 const higherCX = higher.x;
                 // Allow some pixels of leeway before considering it stacked horizontally
                 const xOverlap = Math.abs(lowerCX - higherCX) < ((lower.width/2) + (higher.width/2) - 30);
                 
                 if ("size" in lower && "size" in higher && xOverlap) {
                     if (sizeVal[higher.size] > sizeVal[lower.size]) {
                         issues.push({
                             id: `stack_violation_${i}_${j}_${Date.now()}`,
                             title: `❌ ALARM: PLACEMENT VIOLATION`,
                             description: `Worker stacked a ${higher.size.toUpperCase()} load on top of a ${lower.size.toUpperCase()} package! Critical structural hazard detected.`,
                             severity: "critical"
                         });
                         break;
                     }
                 }
             }
         }
         
         // Barcode checking
         barcodes.forEach((bc, i) => {
             issues.push({
                 id: `barcode_${i}_${Date.now()}`,
                 title: `✅ SCANNED IDENTIFIER: ${bc.data}`,
                 description: `Successfully registered package barcode (${bc.type}) into the truck manifest.`,
                 severity: "success"
             });
         });

         const yoloResult = {
             utilization: yoloData.efficiency || 0,
             issues: issues.sort((a,b) => (a.severity === "critical" ? -1 : 1)), // push criticals to top
             metrics: { improvementPotential: 5 },
             recommendations: yoloData.objects.length === 0 ? [{ text: "Position cargo clearly inside frame guidelines." }] : [{ text: `Realtime surveillance active for ${yoloData.objects.length} item(s).` }],
             emptyPct: Math.max(0, 100 - (yoloData.efficiency || 0))
         };
         
         setResult(yoloResult);
         setScanResult(yoloResult);
         
         if (isManual) {
             yoloResult.issues?.forEach((a) => addAlert(a));
         }
      } catch (e) {
         if (isManual) alert("Scan error: " + e.message);
      }
  };

  useEffect(() => {
     let interval;
     if (liveMode) {
        interval = setInterval(() => {
           performYoloScan(false);
        }, 1500); // 1.5 seconds realtime check
     }
     return () => clearInterval(interval);
  }, [liveMode]);

  const runScan = async () => {
    setLoading("scan", true);
    try {
      if (liveMode) {
         await performYoloScan(true);
      } else {
         // Simulate deadspace detection if not live nor uploaded
         const res = await detectDeadspace({ frameIndex: frameRef.current });
         setResult(res.scan);
         setScanResult(res.scan);
         res.scan.issues?.forEach((a) => addAlert(a));
      }
    } catch (e) {
      alert("Scan error: " + e.message);
    } finally {
      setLoading("scan", false);
    }
  };

  const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Kill live camera hardware explicitly if we jump to offline stream
      if (liveMode) {
          try { await fetch("http://127.0.0.1:5000/camera/stop", { method: "POST" }); } catch(err){}
          setLiveMode(false);
      }
      
      setUploadedImage(URL.createObjectURL(file));
      setLoading("scan", true);
      try {
          await performYoloScan(true, file);
      } catch (err) {
          alert("Image analysis encountered an error: " + err.message);
      } finally {
          setLoading("scan", false);
      }
  };

  const toggle = (k) => setToggles((t) => ({ ...t, [k]: !t[k] }));

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="font-mono text-xs mb-2" style={{ color: "#a78bfa", letterSpacing: "0.13em" }}>— COMPUTER VISION</div>
        <h1 className="font-syne font-extrabold text-4xl tracking-tight mb-2">SmartLoad Vision</h1>
        <p style={{ color: "rgba(238,242,255,0.45)", fontSize: "0.95rem" }}>
          Real-time container scanning with dead-space detection and packing alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Camera feed */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-xl overflow-hidden relative" style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Feed topbar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
              style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.8),transparent)" }}>
              <div className="flex items-center gap-2 font-mono text-xs" style={{ color: uploadedImage ? "#00e5ff" : liveMode ? "#ff4d6d" : "#ffb800" }}>
                <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: uploadedImage ? "#00e5ff" : liveMode ? "#ff4d6d" : "#ffb800" }} />
                {uploadedImage ? "STATIC BLOB ANALYSIS" : liveMode ? "YOLOv8 LIVE" : "PAUSED"} · {uploadedImage ? "JPEG/PNG" : "1920×1080"}
              </div>
              <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.3)" }}>
                {uploadedImage ? "OFFLINE IMAGE SCAN" : liveMode ? "AI DIMENSION CAPTURE" : `FRAME #${frameRef.current}`}
              </div>
            </div>
            
            {uploadedImage ? (
               <img src={uploadedImage} alt="Uploaded Image Offline" className="w-full object-cover relative z-0" style={{ height: 320, display: "block" }} />
            ) : liveMode ? (
               <img src="http://127.0.0.1:5000/video" alt="YOLOv8 Live Stream" className="w-full object-cover relative z-0" style={{ height: 320, display: "block" }} />
            ) : (
               <canvas ref={canvasRef} width={560} height={320} style={{ width: "100%", display: "block", filter: "opacity(0.6)" }} />
            )}

            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 z-10"
              style={{ background: "linear-gradient(to top,rgba(0,0,0,0.85),transparent)", fontFamily: "DM Mono,monospace", fontSize: "0.72rem", color: "rgba(238,242,255,0.5)" }}>
              🔍 {result ? (liveMode ? `Dimension Sweep complete — AI Detected ${result.issues?.length} object(s)` : `Scan complete — ${result.emptyPct}% empty space detected`) : "Scanning container for dead space and AI Object dimensions..."}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}>
              ⬆ Upload
            </button>
            <button onClick={async () => {
                const toggled = !liveMode;
                try {
                    if (toggled) await fetch("http://127.0.0.1:5000/camera/start", { method: "POST" });
                    else await fetch("http://127.0.0.1:5000/camera/stop", { method: "POST" });
                } catch (e) {
                    console.error("Camera hw error", e);
                }
                setLiveMode(toggled);
                if (toggled) setUploadedImage(null);
            }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ background: liveMode ? "rgba(255,77,109,0.15)" : "rgba(0,230,118,0.12)",
                border: `1px solid ${liveMode ? "rgba(255,77,109,0.3)" : "rgba(0,230,118,0.3)"}`,
                color: liveMode ? "#ff4d6d" : "#00e676" }}>
              {liveMode ? "⏹ Stop Live" : "▶ Start Live Scan"}
            </button>
            {[
              { k:"scan", label:"Depth Scan", c:"#a78bfa" },
              { k:"grid", label:"Grid Overlay", c:"#00e5ff" },
              { k:"heat", label:"Heat Map", c:"#ff7043" },
            ].map(({ k, label, c }) => (
              <button key={k} onClick={() => toggle(k)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: toggles[k] ? `${c}14` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${toggles[k] ? c + "40" : "rgba(255,255,255,0.08)"}`,
                  color: toggles[k] ? c : "rgba(238,242,255,0.5)",
                }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: toggles[k] ? c : "rgba(238,242,255,0.2)" }} />
                {label}
              </button>
            ))}
            <button onClick={runScan} disabled={busy}
              className="ml-auto px-5 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#a78bfa)", color: "#030810",
                boxShadow: "0 4px 16px rgba(167,139,250,0.25)", cursor: busy ? "wait" : "pointer" }}>
              {busy ? "⟳ Analysing..." : "⊙ Run Detection"}
            </button>
          </div>

          {/* Scan stats */}
          {result && (
            <div className="grid grid-cols-3 gap-3 fade-up">
              {[
                { label:"CURRENT FILL",  v: result.utilization + "%", color:"#00e5ff" },
                { label:"ISSUES FOUND",  v: result.issues?.length || 0, color:"#ffb800" },
                { label:"IMPROVEMENT",   v: "+" + result.metrics?.improvementPotential + "%", color:"#00e676" },
              ].map((m) => (
                <div key={m.label} className="glass rounded-xl p-4 text-center">
                  <div className="font-syne font-extrabold text-2xl" style={{ color: m.color }}>{m.v}</div>
                  <div className="font-mono text-xs mt-1" style={{ color: "rgba(238,242,255,0.3)", letterSpacing: "0.07em" }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts panel */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between">
              <div className="font-syne font-bold text-base">Live Alerts</div>
              {result && <div className="font-mono text-xs px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,77,109,0.12)", border: "1px solid rgba(255,77,109,0.25)", color: "#ff4d6d" }}>
                {result.issues?.length || 0} ACTIVE
              </div>}
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {result?.issues?.length ? result.issues.map((a) => {
              const c = SEVERITY_COLOR[a.severity] || "#ffb800";
              return (
                <div key={a.id} className="p-3 rounded-lg" style={{ background: `${c}08`, border: `1px solid ${c}20` }}>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 pulse-dot" style={{ background: c }} />
                    <div>
                      <div className="text-sm font-semibold mb-1" style={{ color: c }}>{a.title}</div>
                      <div className="text-xs" style={{ color: "rgba(238,242,255,0.45)" }}>{a.description}</div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8" style={{ color: "rgba(238,242,255,0.25)" }}>
                <div className="text-2xl mb-2">⊙</div>
                <div className="text-sm">Run detection to see alerts</div>
              </div>
            )}

            {/* Static recommendations */}
            {result?.recommendations?.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="font-mono text-xs mb-2" style={{ color: "#a78bfa", letterSpacing: "0.08em" }}>RECOMMENDATIONS</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-2 py-1.5 text-xs" style={{ color: "rgba(238,242,255,0.5)" }}>
                    <span style={{ color: "#a78bfa" }}>→</span> {r.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
