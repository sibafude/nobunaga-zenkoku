// 国データの整合性検査（仕様書 3-4）。問題の説明文の配列を返す（空配列＝正常）。
(function (NB) {
  NB.validateProvinceGraph = function (provinces) {
    const errors = [];
    const byId = new Map(provinces.map((p) => [p.id, p]));
    for (let id = 1; id <= 50; id++) if (!byId.has(id)) errors.push(`ID ${id} がありません`);
    if (byId.size !== provinces.length) errors.push("国IDが重複しています");
    for (const p of provinces) {
      if (p.neighbors.length === 0) errors.push(`${p.name} が孤立しています`);
      for (const n of p.neighbors) {
        const q = byId.get(n);
        if (n === p.id) errors.push(`${p.name} が自分自身に隣接しています`);
        else if (!q) errors.push(`${p.name} に存在しない国ID ${n} があります`);
        else if (!q.neighbors.includes(p.id)) errors.push(`${p.name} と ${q.name} の隣接が片方向です`);
      }
    }
    return errors;
  };

  // 初期配置の検査（仕様書 16-2）：国名・支配者ID・国力の値
  NB.validateScenario = function (provinces, scenario, daimyoById) {
    const errors = [];
    for (const p of provinces) {
      const s = scenario.provinces[p.id];
      if (!p.name) errors.push(`国ID ${p.id} の国名が空です`);
      if (!s) { errors.push(`${p.name} の初期データがありません`); continue; }
      if (!daimyoById.has(s.ownerDaimyoId)) errors.push(`${p.name} の支配者IDが見つかりません`);
      for (const [k, x] of Object.entries(s.stats)) {
        if (!Number.isFinite(x) || x < 0) errors.push(`${p.name} の ${k} の値が不正です`);
      }
    }
    const kana = /^[ぁ-ゖー]+$/;
    for (const p of provinces) if (!kana.test(p.yomi || "")) errors.push(`${p.name} の読みがひらがなではありません`);
    for (const d of daimyoById.values()) {
      if (!kana.test(d.familyYomi || "") || !kana.test(d.givenYomi || "")) errors.push(`${d.name} の読みがひらがなではありません`);
    }
    return errors;
  };
})(window.NB = window.NB || {});
