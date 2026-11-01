// 入口：画面の切り替え、タイトルメニュー、モード選択（Phase 1）
// ES Modules は使わず、通常の <script> で読み込む（Koderなど file:// のプレビューでも動かすため）
(function (NB) {
  const $ = (s) => document.querySelector(s);
  const SCREENS = ["title", "mode", "map"];
  const state = { mode: null }; // Phase 1：選んだモードだけ保持
  let nationalMap = null;

  function show(name) {
    for (const id of SCREENS) $("#" + id).hidden = id !== name;
    if (name === "map") {
      if (!nationalMap) nationalMap = new NB.NationalMap($("#map"), NB.validateProvinceGraph(NB.PROVINCES).concat(NB.validateScenario(NB.PROVINCES, NB.SCENARIO, NB.DAIMYO_BY_ID)));
      nationalMap.resize();
    }
  }

  function modal(title, text) {
    $("#mTitle").textContent = title;
    $("#mBody").textContent = text;
    $("#modal").hidden = false;
  }

  const HOWTO =
    "1. 「はじめから」→「50か国モード」で仮地図を開きます。\n" +
    "2. 地図の丸をタップすると、支配大名と国力が出ます（丸の色は大名の色）。\n" +
    "3. 上のタブで地方を拡大でき、「表示」で国名と大名名を切り替えられます。\n" +
    "4. 画面を横向きにしても使えます。\n\n" +
    "※現在はPhase 2（50か国データと国情報）です。ゲーム本編は今後のPhaseで追加します。";

  // [表示名, 押したときの処理]（処理なし＝準備中）
  const MENU = [
    ["はじめから", () => show("mode"), true],
    ["つづきから"],
    ["遊び方", () => modal("遊び方", HOWTO)],
    ["音設定"],
    ["画面設定"],
    ["セーブデータ管理"],
  ];

  for (const [label, fn, main] of MENU) {
    const b = document.createElement("button");
    b.textContent = label;
    if (fn) b.onclick = fn;
    else {
      b.disabled = true;
      b.append(Object.assign(document.createElement("small"), { textContent: "準備中" }));
    }
    if (main) b.className = "main";
    $("#menu").append(b);
  }

  $("#m50").onclick = () => { state.mode = "national50"; show("map"); };
  $("#modeBack").onclick = () => show("title");
  $("#mapBack").onclick = () => show("mode");
  $("#mClose").onclick = () => { $("#modal").hidden = true; };

  // 独自の家紋風マーク（八つの菱形と輪）
  function drawCrest() {
    const c = $("#crest"), size = 150, d = window.devicePixelRatio || 1;
    c.width = c.height = size * d;
    const g = c.getContext("2d");
    g.scale(d, d);
    g.translate(size / 2, size / 2);
    g.fillStyle = g.strokeStyle = "#e8c872";
    g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 70, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 8; i++) {
      g.save();
      g.rotate((i * Math.PI) / 4);
      g.beginPath();
      g.moveTo(0, -60); g.lineTo(10, -40); g.lineTo(0, -20); g.lineTo(-10, -40);
      g.closePath(); g.fill();
      g.restore();
    }
    g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
  }

  // プレイの妨げになる操作（ピンチ拡大・長押しメニュー）を止める
  function guardTouch() {
    const stop = (e) => e.preventDefault();
    for (const t of ["gesturestart", "gesturechange", "gestureend", "contextmenu"]) {
      document.addEventListener(t, stop, { passive: false });
    }
    document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  }

  guardTouch();
  drawCrest();
  $("#ver").textContent = `Ver ${NB.CONFIG.version}（Phase ${NB.CONFIG.phase}）${NB.CONFIG.date}`;
})(window.NB);
