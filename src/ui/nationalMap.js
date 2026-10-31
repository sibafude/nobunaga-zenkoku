// 全国概略図：50国のノード地図（Phase 1の仮地図）。タップだけで操作できる。
import { PROVINCES, PROVINCE_BY_ID, REGIONS } from "../data/provinces.js";

const COLORS = ["#7fd6ff", "#6ee7a0", "#ffd24a", "#ff9d5c", "#ff7ab8", "#b79bff", "#5fe0d6", "#e6e6e6"];
const FONT = '"Hiragino Kaku Gothic ProN","Hiragino Sans",sans-serif';
const PAD = 30;      // 地図の余白(px)
const MIN_SPAN = 30; // 地方図で最低限表示する範囲（地図単位）

export class NationalMap {
  constructor(root, errors) {
    this.cv = root.querySelector("canvas");
    this.tabs = root.querySelector("#tabs");
    this.info = root.querySelector("#info");
    this.errors = errors;
    this.region = -1; // -1 = 全国
    this.selected = null;
    this.w = this.h = 0;
    this.tabBtns = ["全国", ...REGIONS].map((name, i) => {
      const b = document.createElement("button");
      b.textContent = name;
      b.onclick = () => this.setRegion(i - 1);
      this.tabs.append(b);
      return b;
    });
    new ResizeObserver(() => this.resize()).observe(this.cv.parentElement);
    this.cv.addEventListener("pointerup", (e) => this.tap(e));
    this.ui();
  }

  inRegion(p) { return this.region < 0 || p.region === this.region; }

  // 表示範囲を画面いっぱいに拡大する変換（ノード地図なので縦横の倍率は別々）
  view() {
    const L = PROVINCES.filter((p) => this.inRegion(p));
    const span = (vals) => {
      let lo = Math.min(...vals), hi = Math.max(...vals);
      if (hi - lo < MIN_SPAN) { const c = (lo + hi) / 2; lo = c - MIN_SPAN / 2; hi = c + MIN_SPAN / 2; }
      return [lo, hi];
    };
    const [x0, x1] = span(L.map((p) => p.x)), [y0, y1] = span(L.map((p) => p.y));
    const sx = (this.w - PAD * 2) / (x1 - x0), sy = (this.h - PAD * 2) / (y1 - y0);
    this.r = Math.max(6, Math.min(12, Math.min(sx, sy) * 1.5)); // ノード半径
    return { sx, sy, ox: PAD - x0 * sx, oy: PAD - y0 * sy };
  }

  resize() {
    const b = this.cv.getBoundingClientRect();
    this.w = Math.round(b.width);
    this.h = Math.round(b.height);
    this.dpr = window.devicePixelRatio || 1;
    this.cv.width = this.w * this.dpr;
    this.cv.height = this.h * this.dpr;
    this.draw();
    this.status();
  }

  draw() {
    const { w, h } = this;
    if (!w || !h) return;
    const g = this.cv.getContext("2d");
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const { sx, sy, ox, oy } = this.view(), r = this.r;
    const X = (p) => p.x * sx + ox, Y = (p) => p.y * sy + oy;
    const sel = PROVINCE_BY_ID.get(this.selected);

    // 隣接線（選択中の国につながる線は金色で太く）
    for (const p of PROVINCES) for (const n of p.neighbors) {
      if (n < p.id) continue;
      const q = PROVINCE_BY_ID.get(n), hot = sel === p || sel === q;
      g.globalAlpha = this.inRegion(p) || this.inRegion(q) ? 1 : 0.25;
      g.strokeStyle = hot ? "#ffd24a" : "#34457f";
      g.lineWidth = hot ? 3 : 1.5;
      g.beginPath(); g.moveTo(X(p), Y(p)); g.lineTo(X(q), Y(q)); g.stroke();
    }

    // ノードと国名（全国図は2文字、地方図は全文）
    g.textAlign = "center";
    g.lineJoin = "round";
    for (const p of PROVINCES) {
      const on = this.inRegion(p);
      g.globalAlpha = on ? 1 : 0.25;
      g.fillStyle = COLORS[p.region];
      g.strokeStyle = "#050816";
      g.lineWidth = 2;
      g.beginPath(); g.arc(X(p), Y(p), r, 0, Math.PI * 2); g.fill(); g.stroke();
      if (!on || p === sel) continue;
      const t = this.region < 0 ? p.name.slice(0, 2) : p.name;
      g.font = `${this.region < 0 ? 11 : 13}px ${FONT}`;
      g.lineWidth = 3;
      g.strokeStyle = "#050816"; g.strokeText(t, X(p), Y(p) + r + 12);
      g.fillStyle = "#f2ecd8"; g.fillText(t, X(p), Y(p) + r + 12);
    }
    g.globalAlpha = 1;

    // 選択中の国：金の輪と、国名の札（他のラベルより手前に描く）
    if (sel && this.inRegion(sel)) {
      const x = X(sel), y = Y(sel);
      g.strokeStyle = "#ffd24a"; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.stroke();
      g.font = `bold 14px ${FONT}`;
      const tw = g.measureText(sel.name).width + 14;
      const cx = Math.min(Math.max(x, tw / 2 + 2), w - tw / 2 - 2);
      const top = y - r - 32 < 2 ? y + r + 8 : y - r - 32;
      g.fillStyle = "#0d1636"; g.fillRect(cx - tw / 2, top, tw, 24);
      g.strokeStyle = "#ffd24a"; g.lineWidth = 2; g.strokeRect(cx - tw / 2, top, tw, 24);
      g.fillStyle = "#ffd24a"; g.fillText(sel.name, cx, top + 17);
    }
  }

  // タップ位置に一番近いノードを選ぶ（ノードが重なっていても選びやすい）
  tap(e) {
    const b = this.cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const { sx, sy, ox, oy } = this.view();
    let best = null, bd = Math.max(this.r * 2, 26) ** 2;
    for (const p of PROVINCES) {
      if (!this.inRegion(p)) continue;
      const d = (p.x * sx + ox - x) ** 2 + (p.y * sy + oy - y) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    if (best) this.select(best.id);
  }

  setRegion(i) { this.region = i; this.draw(); this.ui(); }

  select(id) {
    const p = PROVINCE_BY_ID.get(id);
    this.selected = id;
    if (this.region >= 0 && p.region !== this.region) this.region = p.region; // 別の地方の隣国なら地方も切り替える
    this.draw();
    this.ui();
  }

  ui() {
    this.tabBtns.forEach((b, i) => b.classList.toggle("on", i - 1 === this.region));
    const p = PROVINCE_BY_ID.get(this.selected), el = this.info;
    el.replaceChildren();
    const add = (tag, text, cls) => {
      const e = document.createElement(tag);
      e.textContent = text;
      if (cls) e.className = cls;
      el.append(e);
      return e;
    };
    if (!p) {
      add("h2", "50か国 仮地図");
      add("p", "丸をタップすると、国名と隣接国が表示されます。");
    } else {
      add("h2", `${String(p.id).padStart(2, "0")} ${p.name}`);
      add("p", `${REGIONS[p.region]}　隣接 ${p.neighbors.length}国`);
      const row = add("div", "", "nb");
      for (const n of p.neighbors) {
        const b = document.createElement("button");
        b.textContent = PROVINCE_BY_ID.get(n).name;
        b.onclick = () => this.select(n);
        row.append(b);
      }
    }
    add("p", "※仮地図です。大名・国力・支配色はPhase 2以降で実装します。", "note");
    this.stat = add("p", "", "note");
    this.status();
  }

  status() {
    if (!this.stat) return;
    const e = this.errors, portrait = window.innerHeight >= window.innerWidth;
    const check = e.length ? `エラー ${e.length}件（${e[0]}）` : "OK（50国・隣接は双方向）";
    this.stat.textContent = `データ検査：${check}／画面 ${window.innerWidth}×${window.innerHeight}（${portrait ? "縦" : "横"}）`;
  }
}
