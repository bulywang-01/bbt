/*********************************************************
 * ✅ header 初始化
 * 👉 不再自己控制顯示，全部交給 auth.js + CSS
 *********************************************************/
window.initHeader = function(){

  if (typeof initAuth === 'function'){
    initAuth();  // ✅ 統一入口
  }
};
