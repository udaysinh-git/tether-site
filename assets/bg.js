// Page background: a slow drift of foil sparkles, after Swishy's "Foil Drift"
// (https://swishy.ai/templates/bg-foil-drift, MIT, (c) Swishy), rewritten as
// one small WebGL shader with no dependencies. Three layers of sparkles drift
// up and to the right at different depths, twinkle, and lean a little toward
// the pointer; a few bigger ones carry a soft cross flare. Tuned dim for the
// site: gold and off-white on charcoal. It pauses when the tab is hidden and
// draws a single still frame when the visitor prefers reduced motion.
// 3D simplex noise: Ian McEwan and Stefan Gustavson, MIT.
(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "foil";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) { canvas.remove(); return; }

  const VERT = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  const FRAG = `
precision highp float;
uniform vec2 res;      // pixels
uniform float tt;      // seconds
uniform vec3 foc;      // pointer x, y (0..1) and how present it is
uniform vec3 bg, warm, cool;
uniform vec3 fd;       // density, brightness, sheen
#define TAU 6.28318530718

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash22(vec2 p){ float n = hash21(p); return vec2(n, hash21(p + n + 17.17)); }

vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float simplex3(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
vec2 rot2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
float fbm(vec2 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int k = 0; k < 2; k++) {
    s += a * simplex3(vec3(p, float(k) * 1.7 + tt * 0.03));
    n += a; p = rot2(p, 0.6) * 2.03 + 1.3; a *= 0.5;
  }
  return s / n;
}

void main(){
  vec2 uv = gl_FragCoord.xy / res;
  float md = min(res.x, res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / md;
  vec2 f = (foc.xy - 0.5) * res / md;
  float pxs = 1.0 / md;
  vec3 col = bg;
  float sh = fbm(p * 0.7 + vec2(1.3, 0.2));
  col += mix(cool, warm, 0.5 + 0.5 * sh) * fd.z * 0.035 * smoothstep(-0.1, 0.7, sh);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float k = 30.0 + fi * 34.0;
    vec2 drift = vec2(0.6 + 0.5 * fi, -1.2 - 0.6 * fi) * tt * 0.06;
    vec2 par = f * foc.z * 0.03 * (fi + 1.0);
    vec2 g = (p + par) * k + drift + fi * 17.3;
    vec2 id = floor(g);
    vec2 fr = fract(g);
    vec2 h = hash22(id + fi * 31.0);
    float on = step(1.0 - fd.x * (0.5 - fi * 0.08), hash21(id * 1.31 + fi));
    vec2 sp = 0.2 + 0.6 * h;
    vec2 dv = (fr - sp) / (k * pxs);
    float dpx = length(dv);
    float tw = 0.5 + 0.5 * sin(tt * 0.6 * (1.0 + floor(h.x * 3.0)) + h.y * TAU);
    float size = mix(0.55, 1.5, h.y) * (1.25 - fi * 0.25);
    float star = exp(-dpx * dpx / (size * size)) * on;
    float big = step(0.93, h.x) * on * tw;
    float cross = big * (exp(-abs(dv.x) / 0.7) * exp(-abs(dv.y) / 7.0) + exp(-abs(dv.y) / 0.7) * exp(-abs(dv.x) / 7.0)) * 0.35;
    vec3 sc = mix(cool, warm, hash21(id + 4.0));
    col += sc * (star * (0.25 + 0.95 * tw) + cross) * fd.y * (1.0 - fi * 0.15);
  }
  col += (hash21(floor(gl_FragCoord.xy)) - 0.5) / 160.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : (console.warn(gl.getShaderInfoLog(s)), null); };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  // Charcoal ground, gold and off-white foil; dimmer than the original.
  gl.uniform3fv(U("bg"), rgb("#1a1a1a"));
  gl.uniform3fv(U("warm"), rgb("#e6c766"));
  gl.uniform3fv(U("cool"), rgb("#fffbf0"));
  gl.uniform3fv(U("fd"), [0.32, 0.62, 0.5]);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0;
  function size() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    w = Math.round(innerWidth * dpr); h = Math.round(innerHeight * dpr);
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U("res"), w, h);
    if (reduce) draw(40);
  }
  // The pointer leans the layers a little, eased.
  const P = { x: 0.5, y: 0.5, a: 0, tx: 0.5, ty: 0.5, ta: 0 };
  addEventListener("pointermove", (e) => { P.tx = e.clientX / innerWidth; P.ty = 1 - e.clientY / innerHeight; P.ta = 1; }, { passive: true });
  document.addEventListener("pointerleave", () => { P.ta = 0; });
  function draw(t) {
    P.x += (P.tx - P.x) * 0.06; P.y += (P.ty - P.y) * 0.06; P.a += (P.ta - P.a) * 0.05;
    gl.uniform1f(U("tt"), t);
    gl.uniform3f(U("foc"), P.x, P.y, P.a);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  addEventListener("resize", size);
  size();
  if (reduce) return;
  let raf = 0, t0 = performance.now(), paused = 0;
  const frame = (now) => { draw((now - t0) / 1000); raf = requestAnimationFrame(frame); };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); paused = performance.now(); }
    else { t0 += performance.now() - paused; raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);
})();
