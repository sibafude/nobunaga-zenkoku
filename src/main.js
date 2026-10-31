// 入口：画面の切り替え、タイトルメニュー、モード選択（Phase 1）
import { PROVINCES } from "./data/provinces.js";
import { validateProvinceGraph } from "./core/validators.js";
import { NationalMap } from "./ui/nationalMap.js";

const $ = (s) => document.querySelector(s);
const SCREENS = ["title", "mode", "map"];
const state = { mode: null }; // Phase 1：選んだモードだけ保持
let nationalMap = null;

function show(name) {
  for (const id of SCREENS) $("#" + id).hidden = id !== name;
  if (name === "map") {
    nationalMap ??= new NationalMap($("#map"), validateProvinceGraph(PROVINCES));
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
  "2. 地図の丸をタップすると、国名と隣接国が出ます。\n" +
  "3. 上のタブで地方を拡大できます。\n" +
  "4. 画面を横向きにしても使えます。\n\n" +
  "※現在はPhase 1（画面の土台）です。ゲーム本編は今後のPhaseで追加します。";

const CREDIT =
  "本作は個人が制作した独自のゲームで、『信長の野望』シリーズの公式作品ではありません。\n" +
  "原作のプログラム・画面・ロゴ・音楽・画像は使用していません。\n" +
  "国名・隣接関係・地図の座標は本作用の仮データで、原作の数値と同一ではありません。";

// [表示名, 押したときの処理]（処理なし＝準備中）
const MENU = [
  ["はじめから", () => show("mode"), true],
  ["つづきから"],
  ["遊び方", () => modal("遊び方", HOWTO)],
  ["音設定"],
  ["画面設定"],
  ["セーブデータ管理"],
  ["クレジット・権利表記", () => modal("クレジット・権利表記", CREDIT)],
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
drawCrest();
