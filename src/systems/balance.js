// 本作独自の調整値（原作の数値ではない）。原作で確定できない係数はここに集約する。
(function (NB) {
  NB.BALANCE = {
    // 国力の仮ランク1（蝦夷の例）と7（尾張の例）の値。間と外側のランクは直線で補間・延長する。
    initialStats: {
      low:  { gold: 30, town: 30, rice: 40, kokudaka: 35, floodControl: 40, peasantLoyalty: 55, peasantWealth: 40, troops: 20, soldierLoyalty: 55, training: 35, arms: 30 },
      high: { gold: 100, town: 60, rice: 80, kokudaka: 80, floodControl: 70, peasantLoyalty: 70, peasantWealth: 70, troops: 80, soldierLoyalty: 75, training: 70, arms: 75 },
      lowRank: 1,
      highRank: 7,
    },
    taxRate: 20,
    unitMix: { ashigaru: 60, cavalry: 25, firearms: 15 },
  };
})((window.NB = window.NB || {}));

