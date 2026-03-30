const API_URL='https://script.google.com/macros/s/AKfycbxnJs8KkBZ8XRTFOVTM0-vdg01qh8tSyjhI5Z2LMoNKIV-8SOeUWOBbZ10bUjGx6p6V/exec';
// const ROLE='admin'; const MY_JUDGE_ID='U001';
// const API_URL = '你的 Apps Script Web App URL';

// 登入後由 login.html 設定
const USER_ROLE = localStorage.getItem('role'); // admin | judge
const USER_JUDGE_ID = localStorage.getItem('judge_id') || '';
