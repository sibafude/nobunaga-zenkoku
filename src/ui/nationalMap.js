// 全国概略図：50国のノード地図。支配大名の色で塗り、タップで国情報を出す。
(function (NB) {
  const { PROVINCES, PROVINCE_BY_ID, REGIONS } = NB;
  const FONT = '"Hiragino Kaku Gothic ProN","Hiragino Sans",sans-serif';
  const PAD = 30;      // 地図の余白(px)
  const MIN_SPAN = 18; // 地方図で最低限表示する範囲（地図単位）

  NB.NationalMap = class NationalMap {
    constructor(root, errors) {
      this.cv = root.querySelector("canvas");
      this.tabs = root.querySelector("#tabs");
      this.info = root.querySelector("#info");
      this.errors = errors;
      this.region = -1;       // -1 = 全国
      this.mode = "province"; // 地図の文字："province"（国名）／"daimyo"（大名名）
      this.selected = null;
      this.w = this.h = 0;
      this.pos = new Map();   // 国ID → 画面上の位置（重なりを避けて少しずらした後）
      this.tabBtns = ["全国", ...REGIONS].map((name, i) => {
        const b = document.createElement("button");
        b.textContent = name;
        b.onclick = () => this.setRegion(i - 1);
        this.tabs.append(b);
        return b;
      });
      this.toggle = document.createElement("button");
      this.toggle.className = "tog";
      this.toggle.onclick = () => { this.mode = this.mode === "province" ? "daimyo" : "province"; this.draw(); this.ui(); };
      this.tabs.append(this.toggle);
      new ResizeObserver(() => this.resize()).observe(this.cv.parentElement);
      this.cv.addEventListener("pointerup", (e) => this.tap(e));
      // 地図上のダブルタップ拡大・長押しメニューを止める
      this.cv.addEventListener("touchend", (e) => e.preventDefault(), { passive: false });
      this.ui();
    }

    inRegion(p) { return this.region < 0 || p.region === this.region; }

    label(p) {
      const dm = this.mode === "daimyo", d = dm ? NB.ownerOf(p.id) : null;
      const t = dm ? d.family : p.name, y = dm ? d.familyYomi : p.yomi;
      return this.region < 0 ? { t: t.slice(0, 2), y: "" } : { t, y }; // 全国図は2文字・読み仮名なし
    }

    // 表示範囲を画面いっぱいに広げる変換（ノード地図なので縦横の倍率は別々）
    view() {
      const L = PROVINCES.filter((p) => this.inRegion(p));
      const span = (vals) => {
        let lo = Math.min(...vals), hi = Math.max(...vals);
        if (hi - lo < MIN_SPAN) { const c = (lo + hi) / 2; lo = c - MIN_SPAN / 2; hi = c + MIN_SPAN / 2; }
        return [lo, hi];
      };
      const [x0, x1] = span(L.map((p) => p.x)), [y0, y1] = span(L.map((p) => p.y));
      const extra = this.region < 0 ? 0 : 20; // 地方図は国名の下に読み仮名の行がある分、下に余白を足す
      const sx = (this.w - PAD * 2) / (x1 - x0), sy = (this.h - PAD * 2 - extra) / (y1 - y0);
      this.r = Math.max(6, Math.min(12, Math.min(sx, sy) * 1.5)); // 丸の半径
      return { sx, sy, ox: PAD - x0 * sx, oy: PAD - y0 * sy };
    }

    // 丸と国名が重ならないよう、近すぎる国どうしを少しずつ押し離す（仕様書の座標は変えず、表示だけずらす）
    layout(list, v, lws, th) {
      const bh = this.r * 2 + th + 6, extra = this.region < 0 ? 0 : 20;
      const P = list.map((p, i) => ({ p, w: lws[i], x: p.x * v.sx + v.ox, y: p.y * v.sy + v.oy }));
      for (let n = 0; n < 80; n++) {
        let moved = false;
        for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
          const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y;
          const ex = (a.w + b.w) / 2 + 6 - Math.abs(dx), ey = bh - Math.abs(dy);
          if (ex <= 0 || ey <= 0) continue;
          moved = true;
          if (ex < ey) { const s = (dx < 0 ? -ex : ex) / 2; a.x -= s; b.x += s; }
          else { const s = (dy < 0 ? -ey : ey) / 2; a.y -= s; b.y += s; }
        }
        for (const q of P) {
          q.x = Math.min(Math.max(q.x, PAD), this.w - PAD);
          q.y = Math.min(Math.max(q.y, PAD), this.h - PAD - extra);
        }
        if (!moved) break;
      }
      this.pos = new Map(P.map((q) => [q.p.id, q]));
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
      const v = this.view(), r = this.r;
      const list = PROVINCES.filter((p) => this.inRegion(p)); // 地方図では、その地方の国だけを描く
      const nat = this.region < 0, fs = nat ? 11 : 14, ys = 10; // 文字の大きさ：国名／読み仮名
      const th = fs + 4 + (nat ? 0 : ys + 3);                    // 全国図は小さすぎるため読み仮名を付けない
      const wid = (t, size, bold) => { g.font = `${bold ? "bold " : ""}${size}px ${FONT}`; return t ? g.measureText(t).width : 0; };
      const boxW = (l) => Math.max(wid(l.t, fs), wid(l.y, ys)) + 4;
      this.layout(list, v, list.map((p) => boxW(this.label(p))), th);
      const X = (p) => this.pos.get(p.id).x, Y = (p) => this.pos.get(p.id).y;
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

      // 丸：支配大名の色
      g.lineWidth = 2;
      g.strokeStyle = "#050816";
      for (const p of list) {
        g.fillStyle = NB.ownerOf(p.id).color;
        g.beginPath(); g.arc(X(p), Y(p), r, 0, Math.PI * 2); g.fill(); g.stroke();
      }

      // 文字：国名（地方図では読み仮名つき）。下・上・右・左の順に、他と重ならない位置を探す。入らなければ省略（タップで札が出る）
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
        const pw = Math.max(wid(sel.name, 15, true), wid(sel.yomi, 10)) + 16, ph = 38;
        const px = Math.min(Math.max(X(sel) - pw / 2, 2), w - pw - 2);
        const py = Y(sel) - r - 8 - ph < 2 ? Y(sel) + r + 8 : Y(sel) - r - 8 - ph;
        plate = { x: px, y: py, w: pw, h: ph };
        used.push(plate);
      }
      const text = (t, cx, cy, size, color) => {
        g.font = `${size}px ${FONT}`;
        g.lineWidth = 3; g.strokeStyle = "#050816"; g.strokeText(t, cx, cy);
        g.fillStyle = color; g.fillText(t, cx, cy);
      };
      for (const p of list) {
        if (p === sel) continue;
        const full = this.label(p), x = X(p), y = Y(p);
        // 読み仮名つきが入らなければ、国名だけにして置く
        for (const l of full.y ? [full, { t: full.t, y: "" }] : [full]) {
          const tw = boxW(l), lh = l.y ? th : fs + 4, cx = Math.min(Math.max(x - tw / 2, 2), w - 2 - tw);
          const spots = [[cx, y + r + 2], [cx, y - r - 2 - lh], [x + r + 3, y - lh / 2], [x - r - 3 - tw, y - lh / 2]];
          const ok = spots.find(([bx, by]) => {
            const box = { x: bx, y: by, w: tw, h: lh };
            return !(bx < 2 || by < 2 || bx + tw > w - 2 || by + lh > h - 2 || used.some((o) => hit(o, box)));
          });
          if (!ok) continue;
          used.push({ x: ok[0], y: ok[1], w: tw, h: lh });
          text(l.t, ok[0] + tw / 2, ok[1] + (fs + 4) / 2, fs, "#f2ecd8");
          if (l.y) text(l.y, ok[0] + tw / 2, ok[1] + fs + 4 + ys / 2 + 1, ys, "#c8bf9a");
          break;
        }
      }

      // 選択中の国：金の輪と国名札（国名と読み仮名、最前面）
      if (selOn) {
        g.strokeStyle = "#ffd24a"; g.lineWidth = 3;
        g.beginPath(); g.arc(X(sel), Y(sel), r + 5, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#0d1636"; g.fillRect(plate.x, plate.y, plate.w, plate.h);
        g.lineWidth = 2; g.strokeRect(plate.x, plate.y, plate.w, plate.h);
        const cx = plate.x + plate.w / 2;
        g.font = `bold 15px ${FONT}`; g.fillStyle = "#ffd24a"; g.fillText(sel.name, cx, plate.y + 14);
        g.font = `10px ${FONT}`; g.fillStyle = "#c8bf9a"; g.fillText(sel.yomi, cx, plate.y + 29);
      }
    }

    // タップ位置に一番近い国を選ぶ（丸が重なっていても選びやすい）
    tap(e) {
      const b = this.cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      let best = null, bd = Math.max(this.r * 2, 26) ** 2;
      for (const p of PROVINCES) {
        const q = this.inRegion(p) && this.pos.get(p.id);
        if (!q) continue;
        const d = (q.x - x) ** 2 + (q.y - y) ** 2;
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
      this.toggle.textContent = this.mode === "daimyo" ? "表示：大名" : "表示：国名";
      NB.renderProvincePanel(this.info, PROVINCE_BY_ID.get(this.selected), (id) => this.select(id));
      this.stat = document.createElement("p");
      this.stat.className = "note";
      this.info.append(this.stat);
      this.status();
    }

    status() {
      if (!this.stat) return;
      const e = this.errors, C = NB.CONFIG, portrait = window.innerHeight >= window.innerWidth;
      const check = e.length ? `エラー${e.length}件（${e[0]}）` : "OK";
      this.stat.textContent = `Ver ${C.version}／データ検査：${check}／画面 ${window.innerWidth}×${window.innerHeight}（${portrait ? "縦" : "横"}）`;
    }
  };
})(window.NB);
