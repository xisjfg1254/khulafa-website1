// ====== إعدادات ======
const API = "/api";
let currentAdmin = null;

// ====== تنقّل SPA ======
function show(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ====== مساعدة الرد مع CORS ======
function okJson(body, status=200){
  return new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json'}});
}

// ====== تسجيل دخول الأدمن ======
async function login(){
  const u = document.getElementById('admin-user').value.trim();
  const p = document.getElementById('admin-pass').value;
  if(!u||!p){ alert("ادخل اسم مستخدم وكلمة مرور"); return; }
  const res = await fetch(`${API}/admins/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p})});
  const data = await res.json();
  if(data.success){
    currentAdmin = u;
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    loadAllAdmin();
    alert("تم تسجيل الدخول");
  } else alert("خطأ في بيانات الدخول");
}

// ====== تسجيل خروج ======
function logout(){
  currentAdmin = null;
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('login-box').classList.remove('hidden');
  alert("تم تسجيل الخروج");
  show('home');
}

// ====== تحميل بيانات عامة ======
async function loadAll(){
  await loadVideos();
  await loadActivities();
  await loadBlogs();
  await loadLogo();
}

// ====== رفع ملف إلى R2 عبر /api/upload ======
async function uploadFile(){
  const el = document.getElementById('file-input');
  const f = el.files[0];
  if(!f){ alert("اختر ملفا"); return; }
  if(!confirm(`هل تريد رفع الملف ${f.name}؟`)) return;

  const form = new FormData();
  form.append('file', f);

  const pb = document.getElementById('progress-bar');
  pb.style.width = '0%';

  return new Promise((resolve,reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/upload`);
    xhr.upload.onprogress = (e)=> { if(e.lengthComputable) pb.style.width = ((e.loaded/e.total)*100)+'%'; };
    xhr.onload = async ()=> {
      pb.style.width='0%';
      if(xhr.status===200){
        alert('تم رفع الملف');
        await loadUploads();
        resolve(JSON.parse(xhr.responseText));
      } else { alert('فشل الرفع'); reject(xhr.responseText); }
    };
    xhr.onerror = ()=> { pb.style.width='0%'; alert('فشل الرفع - خطأ شبكة'); reject(); };
    xhr.send(form);
  });
}

// ====== قائمة الملفات المرفوعة (Admin) ======
async function loadUploads(){
  const res = await fetch(`${API}/upload`);
  const files = await res.json();
  const target = document.getElementById('uploads-list');
  const selVideo = document.getElementById('video-file-select');
  const selActivity = document.getElementById('activity-file-select');
  target.innerHTML = ''; selVideo.innerHTML=''; selActivity.innerHTML='';
  files.forEach(f=>{
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `<strong>${f.name}</strong>
      ${f.key.endsWith('.mp4')?`<video src="/r2/${f.key}" controls style="max-height:180px"></video>`:`<img src="/r2/${f.key}" style="max-height:180px;width:100%;object-fit:cover" />`}
      <div class="row">
        <button class="btn" onclick="deleteUpload(${f.id},'${f.name}')">حذف</button>
      </div>`;
    target.appendChild(div);

    // إضافة للاختيارات
    const opt = document.createElement('option'); opt.value = f.url; opt.textContent = f.name;
    selVideo.appendChild(opt);
    const opt2 = opt.cloneNode(true); selActivity.appendChild(opt2);
  });
}

// ====== حذف ملف مرفوع ======
async function deleteUpload(id,name){
  if(!confirm(`هل تريد حذف الملف ${name} ؟`)) return;
  await fetch(`${API}/upload/${id}`, {method:'DELETE'});
  alert('تم حذف الملف');
  await loadUploads();
}

// ====== إدارة الفيديوهات (Visitors) ======
async function loadVideos(){
  const res = await fetch(`${API}/videos`);
  const videos = await res.json();
  const list = document.getElementById('videos-list');
  list.innerHTML = '';
  videos.forEach(v=>{
    const c = document.createElement('div'); c.className='card';
    const media = v.url && (v.url.endsWith('.mp4')? `<video src="${v.url}" controls></video>`:`<img src="${v.url}" alt="${v.title}" />`);
    c.innerHTML = `<h3>${v.title}</h3>${media}<p>${v.description}</p><p>المبلغ: ${v.amount}</p>
      <div class="row"><button class="btn" onclick="startAdopt(${v.id},'${escapeHtml(v.title)}')">تبني</button></div>`;
    list.appendChild(c);
  });
}

// ====== إضافة فيديو (Admin) ======
async function adminAddVideo(){
  const title = document.getElementById('video-title').value.trim();
  const desc = document.getElementById('video-desc').value.trim();
  const amount = document.getElementById('video-amount').value.trim();
  const url = document.getElementById('video-file-select').value || '';
  if(!title){ alert("ادخل عنواناً"); return; }
  if(!confirm("تأكيد إضافة الفيديو؟")) return;
  await fetch(`${API}/videos`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title,description:desc,amount,url})});
  alert('تمت إضافة الفيديو');
  document.getElementById('video-title').value=''; document.getElementById('video-desc').value=''; document.getElementById('video-amount').value='';
  await loadAllAdmin();
}

// ====== حذف فيديو (Admin) ======
async function adminDeleteVideo(id){
  if(!confirm('هل تريد حذف الفيديو؟')) return;
  await fetch(`${API}/videos/${id}`, {method:'DELETE'});
  alert('تم الحذف');
  await loadAllAdmin();
}

// ====== Activities ======
async function loadActivities(){
  const res = await fetch(`${API}/activities`);
  const arr = await res.json();
  const list = document.getElementById('activities-list'); list.innerHTML='';
  arr.forEach(a=>{
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<h3>${a.title}</h3>${a.url?`<img src="${a.url}" style="width:100%;max-height:220px;object-fit:cover">`:''}<p>${a.description}</p>`;
    list.appendChild(c);
  });
}

async function adminAddActivity(){
  const title = document.getElementById('activity-title').value.trim();
  const desc = document.getElementById('activity-desc').value.trim();
  const url = document.getElementById('activity-file-select').value || '';
  if(!title){ alert("ادخل عنوان النشاط"); return; }
  if(!confirm("تأكيد إضافة النشاط؟")) return;
  await fetch(`${API}/activities`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title,description:desc,url})});
  alert('تم إضافة النشاط');
  await loadAllAdmin();
}
async function adminDeleteActivity(id){ if(!confirm('حذف؟')) return; await fetch(`${API}/activities/${id}`,{method:'DELETE'}); alert('تم'); await loadAllAdmin(); }

// ====== Blogs ======
async function loadBlogs(){
  const res = await fetch(`${API}/blogs`);
  const arr = await res.json();
  const list = document.getElementById('blogs-list'); list.innerHTML='';
  arr.forEach(b=>{
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<h3>${b.title}</h3><p>${b.content}</p>`;
    list.appendChild(c);
  });
}
async function adminAddBlog(){
  const title = document.getElementById('blog-title').value.trim();
  const content = document.getElementById('blog-body').value.trim();
  if(!title || !content){ alert("الرجاء ملء الحقول"); return; }
  if(!confirm('تأكيد إضافة التدوينة؟')) return;
  await fetch(`${API}/blogs`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title,content})});
  alert('تمت إضافة التدوينة'); await loadAllAdmin();
}
async function adminDeleteBlog(id){ if(!confirm('حذف التدوينة؟')) return; await fetch(`${API}/blogs/${id}`,{method:'DELETE'}); alert('تم'); await loadAllAdmin(); }

// ====== Logo ======
async function uploadLogo(){
  const f = document.getElementById('logo-file').files[0];
  if(!f){ alert('اختر صورة'); return; }
  if(!confirm('تأكيد تحديث الشعار؟')) return;
  const fd = new FormData(); fd.append('file', f);
  const res = await fetch(`${API}/upload`, {method:'POST', body: fd});
  const data = await res.json();
  await fetch(`${API}/logo`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url: data.url})});
  alert('تم تحديث الشعار'); await loadLogo();
}
async function deleteLogo(){
  if(!confirm('حذف الشعار؟')) return;
  await fetch(`${API}/logo`, {method:'DELETE'}); alert('تم الحذف'); document.getElementById('site-logo').src='';
}
async function loadLogo(){
  const res = await fetch(`${API}/logo`);
  const lg = await res.json();
  if(lg.url) document.getElementById('site-logo').src = lg.url;
}

// ====== Admin accounts ======
async function loadAdminAccounts(){
  const res = await fetch(`${API}/admins`);
  const list = await res.json();
  const target = document.getElementById('admin-accounts-list'); target.innerHTML='';
  list.forEach(a=>{
    const div = document.createElement('div'); div.className='card';
    div.innerHTML=`<strong>${a.username}</strong> <div class="row"><button class="btn" onclick="deleteAdmin(${a.id})">حذف</button></div>`;
    target.appendChild(div);
  });
}
async function adminAddAccount(){
  const u = document.getElementById('new-admin-user').value.trim();
  const p = document.getElementById('new-admin-pass').value;
  if(!u||!p){ alert('املأ الحقول'); return; }
  if(!confirm('إضافة حساب أدمن؟')) return;
  await fetch(`${API}/admins`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p})});
  alert('تمت الإضافة'); document.getElementById('new-admin-user').value=''; document.getElementById('new-admin-pass').value=''; await loadAllAdmin();
}
async function deleteAdmin(id){ if(!confirm('هل تريد حذف الحساب؟')) return; await fetch(`${API}/admins/${id}`,{method:'DELETE'}); alert('تم الحذف'); await loadAllAdmin(); }

// ====== Admin helper: load all admin lists ======
async function loadAllAdmin(){
  await loadUploads();
  await (async ()=>{ await loadVideos(); await loadActivities(); await loadBlogs();})();
  await loadAdminAccounts();
  await loadAdminListsForManagement();
}

// load videos/activities/blogs lists for admin management view
async function loadAdminListsForManagement(){
  // fetch data to populate admin management lists with delete buttons and edit if needed
  const videos = await (await fetch(`${API}/videos`)).json();
  const target = document.getElementById('admin-videos-list'); target.innerHTML='';
  videos.forEach(v=>{ const div = document.createElement('div'); div.className='card'; div.innerHTML=`<strong>${v.title}</strong>
    <div class="row"><button class="btn" onclick="adminDeleteVideo(${v.id})">حذف</button></div>`; target.appendChild(div); });

  const acts = await (await fetch(`${API}/activities`)).json();
  const t2 = document.getElementById('admin-activities-list'); t2.innerHTML='';
  acts.forEach(a=>{ const div=document.createElement('div'); div.className='card'; div.innerHTML=`<strong>${a.title}</strong><div class="row"><button class="btn" onclick="adminDeleteActivity(${a.id})">حذف</button></div>`; t2.appendChild(div); });

  const blogs = await (await fetch(`${API}/blogs`)).json();
  const t3 = document.getElementById('admin-blogs-list'); t3.innerHTML='';
  blogs.forEach(b=>{ const div=document.createElement('div'); div.className='card'; div.innerHTML=`<strong>${b.title}</strong><div class="row"><button class="btn" onclick="adminDeleteBlog(${b.id})">حذف</button></div>`; t3.appendChild(div); });
}

// ====== التبني (Adopt) يرسل لِـ /api/adopt ======
async function startAdopt(id,title){
  const name = prompt('اسم المتبني (اتركه مجهول إذا أردت)','مجهول');
  const contact = prompt('وسيلة الاتصال:');
  const email = prompt('البريد الإلكتروني:');
  if(!confirm('تأكيد إرسال بيانات التبني؟')) return;
  await fetch(`${API}/adopt`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id,title,name,contact,email})});
  alert('تم إرسال بيانات التبني');
}

// ====== escapeHtml helper ======
function escapeHtml(s){ return (s+'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ====== Startup load ======
(async ()=>{
  await loadAll();
  await loadUploads(); // to populate selectors
})();
