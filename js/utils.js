const TOURNAMENT_MAP = {
  warmup:        { text:'熱身賽',       weight:0.5, color:'#9ca3af' },
  friendly:      { text:'友誼賽',       weight:0.8, color:'#60a5fa' },
  regular:       { text:'例行賽',       weight:1.0, color:'#16a34a' },
  knockout:      { text:'淘汰賽',       weight:1.2, color:'#f59e0b' },
  quarterfinal:  { text:'八強',         weight:1.3, color:'#f97316' },
  semifinal:     { text:'四強',         weight:1.5, color:'#ef4444' },
  final:         { text:'冠軍賽',       weight:2.0, color:'#dc2626' },
  third_place:   { text:'季軍賽',       weight:1.2, color:'#a855f7' },
  exhibition:    { text:'表演賽',       weight:0.6, color:'#6b7280' }
};

/* ✅ 取得完整資訊 */
function getTournamentInfo(type){

  const key = String(type || '').toLowerCase().trim();

  // ✅ ✅ ✅ 核心修正（擋掉 0 / 空值）
  if (!key || key === '0'){
    return {
      text:'一般賽',
      weight:1,
      color:'#6b7280'
    };
  }

  return TOURNAMENT_MAP[key] || {
    text:'一般賽',
    weight:1,
    color:'#6b7280'
  };
}


/* ✅ 只要文字 */
function getTournamentTypeText(type){
  return getTournamentInfo(type).text;
}

/* ✅ 只要權重 */
function getTournamentWeight(type){
  return getTournamentInfo(type).weight;
}

/* ✅ 判斷是否完成（唯一標準） */
function isGameCompleted(g){
  return Number(g.status) === 4;
}

/* ✅ 判斷補賽 */
function isResumedGame(g){
  return Number(g.from_hold || 0) === 1;
}

// 
function normalizeStatus(s){

  if (!s) return 'scheduled';

  s = String(s).toLowerCase().trim();

  if (s.includes('complete')) return 'completed';
  if (s.includes('late')) return 'late';
  if (s.includes('no_show') || s.includes('noshow')) return 'no_show';

  if (s.includes('hold') || s.includes('postpone')) return 'hold';
  if (s.includes('cancel') || s.includes('ignore') || s.includes('stop')) return 'ignore';

  return 'scheduled';
}

// 共用計算引擎 - 個人紀錄用
function calcUserStats(userId, allAssignments){

  let completed = 0;
  let late = 0;
  let no_show = 0;

  const roleMap = {};

  (allAssignments || []).forEach(g => {

    (g.list || []).forEach(a => {

      if (String(a.user_id) !== String(userId)) return;

      // ✅ 完成
      if (a.status === 'completed'){
        completed++;
      }

      // ✅ 遲到
      if (a.status === 'late'){
        late++;
      }

      // ✅ 缺席（只統計，不納入有效）
      if (a.status === 'no_show'){
        no_show++;
      }

      // ✅ ✅ ✅ 角色統計（只算有效）
      if (a.status === 'completed' || a.status === 'late'){

        if (!roleMap[a.role]) roleMap[a.role] = 0;
        roleMap[a.role]++;
      }

    });

  });

  const totalValid = completed + late;

  const quality = totalValid
    ? (completed / totalValid)
    : 0;

  return {
    completed,
    late,
    no_show,
    totalValid,
    roleMap,
    quality
  };
}
