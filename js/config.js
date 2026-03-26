const API_URL='https://script.google.com/macros/s/AKfycbyW5w56lDin99PjzH3WvbBQAgxc1D-MvH6iIL6fchHYkCj7j_hMbqCcgm4qnEH7gRM5/exec';
// const ROLE='admin'; const MY_JUDGE_ID='U001';
// const API_URL = '你的 Apps Script Web App URL';

// 登入後由 login.html 設定
const USER_ROLE = localStorage.getItem('role'); // admin | judge
const USER_JUDGE_ID = localStorage.getItem('judge_id') || '';
