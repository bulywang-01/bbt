const API_URL='https://script.google.com/macros/s/AKfycbyF9TIvyMcjDEUmQTiOyL1JPFNmzr0g4EBMjEzwIWJ8RX_wXkvIq9ahVDNr_Q26K50Y/exec';
// const ROLE='admin'; const MY_JUDGE_ID='U001';
// const API_URL = '你的 Apps Script Web App URL';

// 登入後由 login.html 設定
const USER_ROLE = localStorage.getItem('role'); // admin | judge
const USER_JUDGE_ID = localStorage.getItem('judge_id') || '';
