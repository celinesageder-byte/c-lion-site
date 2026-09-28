/* C-Lion, c-lion.ai v5. Progressive enhancement engine.
   Baseline rule (MOTION_CONTRACT.md section 4, kept): the page is complete and
   fully visible with zero JS and zero CDN scripts. Everything below only ever
   adds motion on top of that baseline, never creates the content or hides it. */
(function () {
  "use strict";

  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE_HOVER = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var html = document.documentElement;

  /* ---------------------------------------------------------------------
     0. Theme toggle. Defaults to prefers-color-scheme (CSS handles that
     alone); a manual choice is remembered as a per-viewer convenience only.
     --------------------------------------------------------------------- */
  function isDarkNow() {
    var current = html.getAttribute("data-theme");
    if (current === "dark") return true;
    if (current === "light") return false;
    var prefersLight = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches;
    return !prefersLight;
  }

  /* Every dashboard screenshot on the page ships as a matched pair, the
     28 Sep refresh's own light and dark rooms, never the old near black
     palette. [data-dash-shot="content_1440"] names the pair; the dark
     file is the same name with a _dark suffix. Swapping the src (not two
     stacked <img> elements) keeps the marquee's 16 tags from doubling to
     32, and it still degrades safely: the src already in the markup is
     the light room, so a page with this script blocked just shows that. */
  function applyDashShots() {
    var dark = isDarkNow();
    document.querySelectorAll("[data-dash-shot]").forEach(function (el) {
      var base = el.getAttribute("data-dash-shot");
      el.src = "assets/img/dash/" + base + (dark ? "_dark" : "") + ".webp";
    });
  }

  (function theme() {
    var btn = document.querySelector("[data-theme-toggle]");
    var stored = null;
    try { stored = localStorage.getItem("clion-theme"); } catch (e) {}
    if (stored === "light" || stored === "dark") html.setAttribute("data-theme", stored);
    applyDashShots();
    if (window.matchMedia) {
      var mq = matchMedia("(prefers-color-scheme: light)");
      var onSystemChange = function () { if (!html.getAttribute("data-theme")) applyDashShots(); };
      if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
      else if (mq.addListener) mq.addListener(onSystemChange);
    }
    if (!btn) return;
    btn.addEventListener("click", function () {
      var current = html.getAttribute("data-theme");
      var prefersLight = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches;
      var effectiveDark = current ? current === "dark" : !prefersLight;
      var next = effectiveDark ? "light" : "dark";
      html.setAttribute("data-theme", next);
      try { localStorage.setItem("clion-theme", next); } catch (e) {}
      applyDashShots();
    });
  })();

  /* ---------------------------------------------------------------------
     1. Reveal system. Vanilla, CDN independent, exact safety contract from
     MOTION_CONTRACT.md section 4: base state is always fully visible;
     [data-reveal-armed] is added to <body> only once the observer actually
     constructs; anything already on screen reveals at once, no scroll
     dependency; groups stagger via [data-reveal-group]; plays once.
     --------------------------------------------------------------------- */
  (function reveal() {
    if (REDUCE || !("IntersectionObserver" in window)) return;
    try {
      var groups = document.querySelectorAll("[data-reveal-group]");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var items = entry.target.querySelectorAll("[data-reveal]");
          items.forEach(function (el, i) {
            setTimeout(function () { el.classList.add("is-revealed"); }, i * 50);
          });
          io.unobserve(entry.target);
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

      document.body.setAttribute("data-reveal-armed", "");
      groups.forEach(function (g) { io.observe(g); });

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          groups.forEach(function (g) {
            var r = g.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) {
              g.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-revealed"); });
              io.unobserve(g);
            }
          });
        });
      });
    } catch (e) { /* observer failed to construct: body never gets the armed
        attribute, so CSS keeps every [data-reveal] element at full opacity. */ }
  })();

  /* ---------------------------------------------------------------------
     2. Lenis smooth scroll + GSAP ScrollTrigger, optional enhancement.
     --------------------------------------------------------------------- */
  var lenis = null;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); }

  // Verification hook only: ?nolenis skips the smoothing layer so a
  // screenshot or video tool can drive window.scrollTo directly and have
  // it stick. Lenis owns native scroll position each rAF once it exists,
  // which is correct for a real visitor's wheel and touch input, and is
  // exactly why an external hard jump fights it during automated capture.
  var skipLenis = /[?&]nolenis(=|&|$)/.test(location.search);

  if (!REDUCE && !skipLenis && window.Lenis) {
    try {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
      lenis.on("scroll", function () { if (hasGSAP) ScrollTrigger.update(); });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      if (hasGSAP) {
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      }
    } catch (e) { lenis = null; }
  }

  /* ---------------------------------------------------------------------
     3. Scroll progress bar. Vanilla, rAF throttled.
     --------------------------------------------------------------------- */
  (function progress() {
    var fill = document.querySelector(".progress-fill");
    if (!fill) return;
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      fill.style.width = Math.min(100, Math.max(0, pct * 100)) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  /* ---------------------------------------------------------------------
     4. Cursor spotlight. Pointer devices only, dark ground only (CSS gates
     the second condition; JS just supplies the coordinates).
     --------------------------------------------------------------------- */
  if (FINE_HOVER) {
    var spot = document.querySelector(".cursor-spot");
    if (spot) {
      window.addEventListener("pointermove", function (e) {
        spot.style.setProperty("--mx", e.clientX + "px");
        spot.style.setProperty("--my", e.clientY + "px");
      }, { passive: true });
    }
  }

  /* ---------------------------------------------------------------------
     5. Kinetic hero headline: word by word rise on first paint only.
     Splits at runtime; if this never runs, the plain text node it started
     from is still there and still fully visible (nothing was hidden first).
     --------------------------------------------------------------------- */
  (function kinetic() {
    var lines = document.querySelectorAll(".hero-headline .split-line");
    if (!lines.length) return;
    var i = 0;
    lines.forEach(function (line) {
      var words = line.textContent.split(" ");
      line.innerHTML = "";
      words.forEach(function (w, wi) {
        var mask = document.createElement("span");
        mask.className = "split-mask";
        mask.style.display = "inline-block";
        mask.style.overflow = "hidden";
        mask.style.verticalAlign = "top";
        var inner = document.createElement("span");
        inner.className = "split-inner";
        inner.style.display = "inline-block";
        inner.style.setProperty("--i", i++);
        inner.textContent = w;
        mask.appendChild(inner);
        line.appendChild(mask);
        if (wi < words.length - 1) line.appendChild(document.createTextNode(" "));
      });
    });
    if (!REDUCE) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { document.querySelector(".hero-headline").classList.add("kinetic-armed"); });
      });
    }
  })();

  /* ---------------------------------------------------------------------
     6. Rotating word slot in the hero.
     --------------------------------------------------------------------- */
  (function rotate() {
    var slot = document.querySelector("[data-rotate]");
    if (!slot || REDUCE) return;
    var items = slot.querySelectorAll("span");
    if (items.length < 2) return;
    var idx = 0;
    items[0].classList.add("is-active");
    setInterval(function () {
      var next = (idx + 1) % items.length;
      var prev = items[idx];
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      items[next].classList.remove("is-leaving");
      items[next].classList.add("is-active");
      /* Fixed 28 Sep 2026: this used to clear is-leaving on items[idx] AFTER idx had moved on,
         so the word that left kept is-leaving and was invisible on its next turn, leaving the
         slot blank. It now clears the word that actually left. */
      setTimeout(function () { prev.classList.remove("is-leaving"); }, 600);
      idx = next;
    }, 2200);
  })();

  /* ---------------------------------------------------------------------
     7. Magnetic buttons. CSS var driven so the base state (0,0) needs no JS.
     --------------------------------------------------------------------- */
  if (FINE_HOVER) {
    document.querySelectorAll(".magnetic").forEach(function (btn) {
      var quickX, quickY;
      if (hasGSAP) { quickX = gsap.quickTo(btn, "--mgx-num", { duration: .4, ease: "power3" }); }
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.28;
        var y = (e.clientY - r.top - r.height / 2) * 0.4;
        btn.style.setProperty("--mgx", x + "px");
        btn.style.setProperty("--mgy", y + "px");
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.setProperty("--mgx", "0px");
        btn.style.setProperty("--mgy", "0px");
      });
    });
  }

  /* ---------------------------------------------------------------------
     8. Hover tilt on cards.
     --------------------------------------------------------------------- */
  if (FINE_HOVER && !REDUCE) {
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      card.style.transformStyle = "preserve-3d";
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        var rx = (py * -6).toFixed(2), ry = (px * 8).toFixed(2);
        var t = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-4px)";
        if (hasGSAP) gsap.to(card, { duration: .4, ease: "power2.out", transform: t });
        else card.style.transform = t;
      });
      card.addEventListener("mouseleave", function () {
        var t = "perspective(900px) rotateX(0) rotateY(0) translateY(0)";
        if (hasGSAP) gsap.to(card, { duration: .5, ease: "power3.out", transform: t });
        else card.style.transform = t;
      });
    });
  }

  /* ---------------------------------------------------------------------
     9. Marquee: the loop itself is a pure CSS animation (works with zero
     JS). This only reads the browser's native Animation object and nudges
     its playbackRate up while the visitor scrolls, decaying back to 1.
     --------------------------------------------------------------------- */
  (function marquee() {
    var track = document.querySelector(".marquee-track");
    if (!track || REDUCE || !track.getAnimations) return;
    var lastY = window.scrollY, target = 1, current = 1;
    window.addEventListener("scroll", function () {
      var dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      target = Math.min(4.5, 1 + dy * 0.09);
    }, { passive: true });
    function tick() {
      current += (target - current) * 0.08;
      target += (1 - target) * 0.02;
      var anims = track.getAnimations();
      anims.forEach(function (a) { a.playbackRate = current; });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ---------------------------------------------------------------------
     10. Bento micro animations: typing caption, cycling hooks, filling
     calendar. Every loop below is gated on REDUCE at the top, so a reduced
     motion visitor gets the static end state the base HTML already shows.
     --------------------------------------------------------------------- */
  (function bento() {
    if (REDUCE) return;

    // 10a. typing caption
    var typeEl = document.querySelector("[data-typing]");
    if (typeEl) {
      var full = typeEl.getAttribute("data-typing") || typeEl.textContent.trim();
      var caret = document.createElement("span");
      caret.className = "caret";
      function loop() {
        var i = 0;
        typeEl.textContent = "";
        typeEl.appendChild(caret);
        var typer = setInterval(function () {
          if (i <= full.length) {
            typeEl.textContent = full.slice(0, i);
            typeEl.appendChild(caret);
            i++;
          } else {
            clearInterval(typer);
            setTimeout(function () {
              var eraser = setInterval(function () {
                if (i > 0) { i--; typeEl.textContent = full.slice(0, i); typeEl.appendChild(caret); }
                else { clearInterval(eraser); setTimeout(loop, 500); }
              }, 28);
            }, 1600);
          }
        }, 42);
      }
      loop();
    }

    // 10b. cycling chips (the four rotating words, reused from the hero)
    var chips = document.querySelectorAll(".chip-row .chip-word");
    if (chips.length) {
      var hi = 0;
      chips[0].classList.add("is-active");
      setInterval(function () {
        chips[hi].classList.remove("is-active");
        hi = (hi + 1) % chips.length;
        chips[hi].classList.add("is-active");
      }, 1300);
    }

    // 10c. calendar filling
    var cells = document.querySelectorAll(".cal-grid .cell");
    if (cells.length) {
      var ci = 0;
      setInterval(function () {
        cells.forEach(function (c) { c.classList.remove("is-filled"); });
        ci = (ci + 1) % (cells.length + 6);
        for (var k = 0; k < ci && k < cells.length; k++) cells[k].classList.add("is-filled");
      }, 260);
    }
  })();

  /* ---------------------------------------------------------------------
     11. Pinned scroll story: CSS position:sticky already parks the device
     (zero JS required for the pin itself). This layer only toggles which
     step and which screen image is active as the reader passes each one.
     --------------------------------------------------------------------- */
  (function story() {
    var steps = document.querySelectorAll(".story-step");
    if (!steps.length || !("IntersectionObserver" in window)) return;
    var shots = document.querySelectorAll(".screen-shot");
    var chips = document.querySelectorAll(".device-overlay .chip");
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var idx = entry.target.getAttribute("data-step-index");
          if (entry.isIntersecting) {
            steps.forEach(function (s) { s.classList.remove("is-active"); });
            entry.target.classList.add("is-active");
            shots.forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-step") === idx); });
            chips.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-step") === idx); });
          }
        });
      }, { threshold: 0.5, rootMargin: "-30% 0px -30% 0px" });
      steps.forEach(function (s) { io.observe(s); });
    } catch (e) {}
  })();

  /* ---------------------------------------------------------------------
     12. Capability list active state, same pattern as the story.
     --------------------------------------------------------------------- */
  (function capability() {
    var items = document.querySelectorAll(".capability-list li");
    var cards = document.querySelectorAll(".cap-card");
    if (!items.length || !cards.length || !("IntersectionObserver" in window)) return;
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var idx = entry.target.getAttribute("data-cap-index");
          items.forEach(function (li) { li.classList.toggle("is-current", li.getAttribute("data-cap-index") === idx); });
        });
      }, { threshold: 0.5, rootMargin: "-35% 0px -35% 0px" });
      cards.forEach(function (c) { io.observe(c); });
    } catch (e) {}
  })();

  /* ---------------------------------------------------------------------
     14. GSAP driven parallax and pin scrub, only where GSAP actually
     loaded. Everything above already works without this block.
     --------------------------------------------------------------------- */
  if (hasGSAP && !REDUCE) {
    // hero phone stack parallax on scroll
    var stack = document.querySelector(".phone-stack");
    if (stack) {
      gsap.to(stack, {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      });
    }
    // statement panel lede rises slightly as it settles
    gsap.utils.toArray(".statement-inner").forEach(function (el) {
      gsap.fromTo(el, { y: 24 }, {
        y: 0, ease: "none",
        scrollTrigger: { trigger: el, start: "top 85%", end: "top 40%", scrub: 0.5 }
      });
    });
    // footer wordmark: gentle rise + scale as it enters. It is the very
    // last element on the page, so the end point has to resolve well
    // before the natural scroll limit, never past it: there is no more
    // page beyond it to scroll through, and an end trigger that needs
    // room which does not exist would leave it permanently unsettled.
    var word = document.querySelector(".footer-word");
    if (word) {
      gsap.fromTo(word, { y: 60, opacity: 0.4 }, {
        y: 0, opacity: 1, ease: "power2.out",
        scrollTrigger: { trigger: word, start: "top 98%", end: "top 85%", scrub: 0.6 }
      });
    }
    // hero mouse parallax on the phone stack (subtle, desktop only)
    if (FINE_HOVER && stack) {
      var qx = gsap.quickTo(stack, "rotationY", { duration: .6, ease: "power3" });
      var qy = gsap.quickTo(stack, "rotationX", { duration: .6, ease: "power3" });
      document.querySelector(".hero").addEventListener("mousemove", function (e) {
        var r = this.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        qx(px * 10);
        qy(py * -8);
      });
    }
  }

  /* ---------------------------------------------------------------------
     15. Hero WebGL moment. Hand rolled, no library: a slow animated field
     behind the mark. Wrapped entirely in try/catch; on any failure the
     canvas is simply removed and the CSS gradient/glow already under it
     (.hero background, .hero-mark-glow) carries the same beat statically.
     --------------------------------------------------------------------- */
  (function heroGL() {
    var canvas = document.getElementById("heroGL");
    if (!canvas) return;
    if (REDUCE) { canvas.remove(); return; }
    try {
      var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) throw new Error("no webgl");
      var vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
      var fs = "precision mediump float;uniform float t;uniform vec2 r;" +
        "float n(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5);}" +
        "void main(){vec2 uv=(gl_FragCoord.xy-0.5*r)/min(r.x,r.y);" +
        "float d=length(uv-vec2(0.32,0.12));" +
        "float a=0.10+0.05*sin(t*0.25);" +
        "float glow=smoothstep(0.75,0.0,d)*a;" +
        "float g=n(floor(gl_FragCoord.xy*0.6)+t*4.0)*0.025;" +
        "vec3 col=mix(vec3(0.0),vec3(0.32,0.72,0.55),glow+g);" +
        "gl_FragColor=vec4(col,glow+g);}";
      function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      }
      var prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var tLoc = gl.getUniformLocation(prog, "t");
      var rLoc = gl.getUniformLocation(prog, "r");
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      function resize() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = w * dpr; canvas.height = h * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      window.addEventListener("resize", resize);
      resize();

      var start = performance.now(), paused = false;
      document.addEventListener("visibilitychange", function () { paused = document.hidden; });
      function frame(now) {
        if (!paused) {
          gl.uniform1f(tLoc, (now - start) / 1000);
          gl.uniform2f(rLoc, canvas.width, canvas.height);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    } catch (e) {
      canvas.remove();
    }
  })();
})();
