const API_URL='https://script.google.com/macros/s/AKfycbxa5fs_StPAK_40lU_3znaHf0NcdOEp4PfMcxnyVJB_1yUvA3gu1plC_31oYOhWUeoA/exec';
// const ROLE='admin'; const MY_JUDGE_ID='U001';
// const API_URL = '你的 Apps Script Web App URL';

// 登入後由 login.html 設定
const USER_ROLE = localStorage.getItem('role'); // admin | judge
const USER_JUDGE_ID = localStorage.getItem('judge_id') || '';
