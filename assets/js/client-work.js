/* C-Lion, c-lion.ai v5. The one list every real Tétique image on this page
   reads from: the hero phone stack and the proof band. Swap or add an
   entry here and both update, nothing else on the page has to change.

   28 Sep 2026, Celine's own words, recorded in C-Lion_Decisions_Log.md,
   "Tétique consent for c-lion.ai": Markus agreed, and "let's take like the
   best images that we have scheduled for him so far." Two of the four
   September pulls were rejected the same day, her words: "the tins are
   visibly pasted into the scene." Neither is in this list, or anywhere on
   this page. Celine then picked the final two herself, and they are
   final: the glass by the window (September) and the bougainvillea and
   blue tiles (July). No other Tétique image ships anywhere on this page. */
(function () {
  "use strict";

  var BASE = "assets/img/tetique/";

  window.CLION_TETIQUE_WORK = [
    { id: "glass", file: "s-glass", status: "approved", alt: "Client work, Tétique, a glass of iced tea by the window" },
    { id: "tiles", file: "s-tiles", status: "approved", alt: "Client work, Tétique, bougainvillea and blue tiles" }
  ];

  function img(file, size, alt) {
    var el = document.createElement("img");
    el.src = BASE + file + (size ? "@1x" : "") + ".webp";
    el.loading = "lazy";
    el.alt = alt || "Client work, Tétique";
    return el;
  }

  var work = window.CLION_TETIQUE_WORK;

  /* ---- hero phone stack: both, in list order ---- */
  var heroHost = document.getElementById("heroPhoneStack");
  if (heroHost) {
    work.forEach(function (w) {
      var card = document.createElement("div");
      card.className = "phone-card";
      card.appendChild(img(w.file, "@1x", w.alt));
      heroHost.appendChild(card);
    });
    heroHost.classList.add("count-" + work.length);
  }

  /* ---- proof band: both, large, as a pair ---- */
  var proofHost = document.getElementById("proofGrid");
  if (proofHost) {
    work.forEach(function (w) {
      var fig = document.createElement("figure");
      fig.setAttribute("data-reveal", "");
      fig.setAttribute("data-tilt", "");
      fig.appendChild(img(w.file, "@1x", w.alt));
      proofHost.appendChild(fig);
    });
  }
})();
