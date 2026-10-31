// 国データの整合性検査（仕様書 3-4）。問題の説明文の配列を返す（空配列＝正常）。
export function validateProvinceGraph(provinces) {
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
}
