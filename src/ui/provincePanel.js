// 国情報パネル（仕様書 11-3 のうち Phase 2 で出せる項目）
(function (NB) {
  const STATS = [
    ["金", "gold"], ["借金", "debt"], ["町", "town"], ["兵糧", "rice"], ["石高", "kokudaka"], ["治水", "floodControl"],
    ["民忠", "peasantLoyalty"], ["民財", "peasantWealth"], ["兵力", "troops"], ["兵忠", "soldierLoyalty"],
    ["訓練", "training"], ["武装", "arms"], ["年貢率", "taxRate"], ["忍者", "ninjas"],
  ];

  // el に国情報を描く。p が無いときは案内を出す。onPick(id)：隣接国ボタンが押されたとき
  NB.renderProvincePanel = function (el, p, onPick) {
    el.textContent = "";
    const add = (parent, tag, text, cls) => {
      const e = document.createElement(tag);
      e.textContent = text;
      if (cls) e.className = cls;
      parent.append(e);
      return e;
    };
    if (!p) {
      add(el, "h2", "50か国 仮地図");
      add(el, "p", "丸をタップすると、支配大名と国力が表示されます。丸の色は支配大名の色です。");
      return;
    }
    const s = NB.SCENARIO.provinces[p.id], d = NB.ownerOf(p.id);
    add(add(el, "h2", `${String(p.id).padStart(2, "0")} ${p.name}`), "small", p.yomi, "yomi");
    add(el, "p", `${NB.REGIONS[p.region]}　隣接 ${p.neighbors.length}国`);
    const own = add(el, "p", "");
    add(own, "span", "", "chip").style.background = d.color;
    own.append(d.name);
    add(own, "small", `${d.yomi}　年齢${d.age}（仮）`, "yomi");
    const row = add(el, "div", "", "nb");
    for (const n of p.neighbors) {
      const q = NB.PROVINCE_BY_ID.get(n), b = add(row, "button", "");
      add(b, "span", q.name);
      add(b, "small", q.yomi, "yomi");
      b.onclick = () => onPick(n);
    }
    const dl = add(el, "dl", "", "st");
    for (const [label, key] of STATS) {
      add(dl, "dt", label);
      add(dl, "dd", String(key === "ninjas" ? s.ninjas : s.stats[key]));
    }
    const m = s.unitMix;
    add(el, "p", `兵種　足軽${m.ashigaru}％　騎馬${m.cavalry}％　鉄砲${m.firearms}％`);
    add(el, "p", "※国力・年齢は仮データです（原作の値ではありません）。", "note");
  };
})(window.NB);
