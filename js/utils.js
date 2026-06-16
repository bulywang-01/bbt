// 賽事名稱
function getTournamentTypeInfo(t){

  const key = String(t || '').toLowerCase().trim();

  const map = {
    warmup:{ text:'熱身賽', color:'#9ca3af' },
    friendly:{ text:'友誼賽', color:'#60a5fa' },
    regular:{ text:'例行賽', color:'#16a34a' },
    knockout:{ text:'淘汰賽', color:'#f59e0b' },
    quarterfinal:{ text:'八強', color:'#f97316' },
    semifinal:{ text:'四強', color:'#ef4444' },
    final:{ text:'冠軍賽', color:'#dc2626' },
    third_place:{ text:'季軍賽', color:'#a855f7' },
    exhibition:{ text:'表演賽', color:'#6b7280' }
  };

  return map[key] || { text:`未定義(${key})`, color:'#999' };
}

// 賽事權重
function getTournamentWeight(type){

  const map = {
    warmup: 0.5,        // 熱身賽（低）
    friendly: 0.8,      // 友誼賽
    regular: 1.0,       // ✅ 基準（例行賽）
    knockout: 1.2,      // 淘汰賽
    quarterfinal: 1.3,  // 八強
    semifinal: 1.5,     // 四強
    final: 2.0,         // ✅ 冠軍賽（最高）
    third_place: 1.2,   // 季軍賽
    exhibition: 0.6     // 表演賽
  };

  return map[type] || 1;  // ✅ 預設1（避免炸）
}

// 判斷是否完成（統一入口）
function isGameCompleted(g){
  return Number(g.status) === 4;
}
