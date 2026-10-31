// 全国概略図：50国のノード地図（Phase 1の仮地図）。タップだけで操作できる。
(function (NB) {
  const { PROVINCES, PROVINCE_BY_ID, REGIONS } = NB;
  const COLORS = ["#7fd6ff", "#6ee7a0", "#ffd24a", "#ff9d5c", "#ff7ab8", "#b79bff", "#5fe0d6", "#e6e6e6"];
  const FONT = '"Hiragino Kaku Gothic ProN","Hiragino Sans",sans-serif';
  const PAD = 30;      // 地図の余白(px)
  const MIN_SPAN = 18; // 地方図で最低限表示する範囲（地図単位）

  NB.NationalMap = class NationalMap {
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
      // 地図上のダブルタップ拡大・長押しメニューを止める
      this.cv.addEventListener("touchend", (e) => e.preventDefault(), { passive: false });
      this.ui();
    }

    inRegion(p) { return this.region < 0 || p.region === this.region; }

    // 表示範囲を画面いっぱいに広げる変換（ノード地図なので縦横の倍率は別々）
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
      const list = PROVINCES.filter((p) => this.inRegion(p)); // 地方図では、その地方の国だけを描く
      const X = (p) => p.x * sx + ox, Y = (p) => p.y * sy + oy;
      const sel = PROVINCE_BY_ID.get(this.selected);
      const selOn = !!sel && this.inRegion(sel);

      // 隣接線（選択中の国につながる線は金色で太く）
      for (const p of list) for (const n of p.neighbors) {
        const q = PROVINCE_BY_ID.get(n);
        if (n < p.id || !this.inRegion(q)) continue;
        const hot = sel === p || sel === q;
        g.strokeStyle = hot ? "#ffd24a" : "#34457f";
        g.lineWidth = hot ? 3 : 1.5;
        g.beginPath(); g.moveTo(X(p), Y(p)); g.lineTo(X(q), Y(q)); g.stroke();
      }

      // ノード
      g.lineWidth = 2;
      g.strokeStyle = "#050816";
      for (const p of list) {
        g.fillStyle = COLORS[p.region];
        g.beginPath(); g.arc(X(p), Y(p), r, 0, Math.PI * 2); g.fill(); g.stroke();
      }

      // 国名：下・上・右・左の順に、他の国名や丸と重ならない位置を探す。
      // どこにも入らない国名は省略する（タップすると国名札が出る）。
      const nat = this.region < 0, fs = nat ? 11 : 14, th = fs + 4;
      const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const used = list.map((p) => {
        const m = p === sel ? 7 : 1; // 選択中は金の輪の分だけ広く空ける
        return { x: X(p) - r - m, y: Y(p) - r - m, w: (r + m) * 2, h: (r + m) * 2 };
      });
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineJoin = "round";
      let plate = null;
      if (selOn) {
        g.font = `bold 15px ${FONT}`;
        const pw = g.measureText(sel.name).width + 16, ph = 26;
        const px = Math.min(Math.max(X(sel) - pw / 2, 2), w - pw - 2);
        const py = Y(sel) - r - 8 - ph < 2 ? Y(sel) + r + 8 : Y(sel) - r - 8 - ph;
        plate = { x: px, y: py, w: pw, h: ph };
        used.push(plate);
      }
      g.font = `${fs}px ${FONT}`;
      for (const p of list) {
        if (p === sel) continue;
        const t = nat ? p.name.slice(0, 2) : p.name;
        const tw = g.measureText(t).width + 4, x = X(p), y = Y(p);
        const spots = [
          [x - tw / 2, y + r + 2], [x - tw / 2, y - r - 2 - th],
          [x + r + 3, y - th / 2], [x - r - 3 - tw, y - th / 2],
        ];
        for (const [bx, by] of spots) {
          const box = { x: bx, y: by, w: tw, h: th };
          if (bx < 2 || by < 2 || bx + tw > w - 2 || by + th > h - 2 || used.some((o) => hit(o, box))) continue;
          used.push(box);
          g.lineWidth = 3; g.strokeStyle = "#050816"; g.strokeText(t, bx + tw / 2, by + th / 2);
          g.fillStyle = "#f2ecd8"; g.fillText(t, bx + tw / 2, by + th / 2);
          break;
        }
      }

      // 選択中の国：金の輪と国名札（最前面）
      if (selOn) {
        g.strokeStyle = "#ffd24a"; g.lineWidth = 3;
        g.beginPath(); g.arc(X(sel), Y(sel), r + 5, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#0d1636"; g.fillRect(plate.x, plate.y, plate.w, plate.h);
        g.lineWidth = 2; g.strokeRect(plate.x, plate.y, plate.w, plate.h);
        g.font = `bold 15px ${FONT}`; g.fillStyle = "#ffd24a";
        g.fillText(sel.name, plate.x + plate.w / 2, plate.y + plate.h / 2);
      }
    }

    // タップ位置に一番近い国を選ぶ（丸が重なっていても選びやすい）
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
      el.textContent = "";
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
  };
})(window.NB);
