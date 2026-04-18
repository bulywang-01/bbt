# 裁判報名與派遣系統（技術文件）

本文件提供系統架構、資料表設計與後端邏輯說明，
供系統維護與未來擴充使用。

---

## 一、系統架構

- 前端：HTML / JavaScript（RWD，桌機 + 手機）
- 後端：Google Apps Script（Web App + JSONP）
- 資料庫：Google Sheets
- 通知：GmailApp（Email）

---

## 二、前端結構

### 已開發頁面

- index.html  
  系統首頁（公告、近期執勤）

- judge_dashboard.html  
  裁判報名與取消主頁  
  - 桌機：表格呈現  
  - 手機：卡片呈現  
  - 站位依 need_count 動態顯示  
  - 支援取消 / 重新報名  

- login.html  
  使用者登入

- header.html  
  共用頁首（使用者名稱、登出）

---

## 三、後端 API（GAS）

### doGet(e)
API Router，依 action 分流

### getSignableGames(e)
回傳可報名賽事清單
- 合併 Games / Judge_Signup
- 計算 occupied_positions
- 回傳 my_position / my_signup_id
- time 欄位統一轉為 HH:mm 字串

### judgeSignupByGames(e)
裁判送出報名
- 防止 approved 重複報名
- cancelled 允許重新報名（新增新紀錄）
- 回傳 has_cancelled_before 旗標

### cancelJudgeSignup(e)
取消站位（封版）
- 僅本人可取消
- 過期賽事不可取消
- 比賽前一天（含）不可取消
- status → cancelled
- 觸發 Email 通知

### notifyCancelSignup_(info)
Email 通知模組
- 收件人：admin / chief_judge
- 顯示：裁判姓名、場次代碼、日期、場地、站位

---

## 四、資料表設計

### Users
- user_id（PK）
- username / password
- role（judge / admin / chief_judge）
- name / phone / email
- active / token / created_at

### Games
game_id（PK）
game_code
date
time
duration
field
tournament
category
away_team
home_team
umpire_count（0–4）
position_mode

### Judge_Signup
signup_id（PK）
user_id（FK）
game_id（FK）
preferred_position
status（approved / cancelled）
created_at

⚠️ 不刪資料，只改狀態

---

## 五、狀態流程（技術）

尚未報名
 → approved（有效）
   → cancelled（可重報）
     → approved（新一筆）
