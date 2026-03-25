async function apiGet(a){return (await fetch(`${API_URL}?action=${a}`)).json();}
async function apiPost(d){return (await fetch(API_URL,{method:"POST",body:JSON.stringify(d)})).json();}