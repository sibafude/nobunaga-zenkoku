// 初期配置（仮）：国ごとの初期大名と国力。原作の初期値ではなく、後から差し替えられる。
(function (NB) {
  const B = NB.BALANCE.initialStats;
  // 国力の仮ランク(1〜10)。並びは国ID 1〜50
  const RANK = [
    1, 2, 3, 2, 3, 5, 4, 3, 4, 9,
    5, 3, 3, 9, 9, 3, 3, 2, 2, 8,
    5, 6, 6, 4, 7, 4, 6, 3, 3, 3,
    6, 4, 9, 4, 3, 4, 5, 5, 8, 3,
    4, 4, 4, 2, 2, 5, 7, 3, 4, 6,
  ];
  const lerp = (lo, hi, r) => Math.max(0, Math.round(lo + ((hi - lo) * (r - B.lowRank)) / (B.highRank - B.lowRank)));

  NB.SCENARIO = { id: "default50", name: "仮の初期配置", provinces: {} };
  NB.PROVINCES.forEach((p, i) => {
    const stats = { debt: 0, taxRate: NB.BALANCE.taxRate };
    for (const k of Object.keys(B.low)) stats[k] = lerp(B.low[k], B.high[k], RANK[i]);
    NB.SCENARIO.provinces[p.id] = {
      ownerDaimyoId: NB.DAIMYO[i].id, // 初期配置では1国に1大名
      rank: RANK[i],
      stats,
      unitMix: { ...NB.BALANCE.unitMix },
      ninjas: 0,
    };
  });

  // 国IDから、いま支配している大名を返す（支配色はここから引く）
  NB.ownerOf = (provinceId) => NB.DAIMYO_BY_ID.get(NB.SCENARIO.provinces[provinceId].ownerDaimyoId);
})(window.NB);

