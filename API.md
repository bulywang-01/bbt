# API 合約

## 共通規則
- 所有 API 都用 JSONP
- Date 一律是 yyyy-MM-dd 字串
- user_id / game_id 永遠是字串或數字，不混用

## getGames
回傳：
{
  game_id,
  game_code,
  date, // yyyy-MM-dd
  time,
  ...
}

## getSignableGames
回傳：
{
  game_id,
  date, // yyyy-MM-dd
  occupied_positions: {},
  my_position
}
