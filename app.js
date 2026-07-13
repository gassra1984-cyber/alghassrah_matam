const $=(s)=>document.querySelector(s);
const $$=(s)=>document.querySelectorAll(s);
const state={members:[],timings:[]};

document.addEventListener('DOMContentLoaded',async()=>{
  await openDB();
  bindUI();
  await refreshAll();
  registerSW();
  handleInstall();
});

function bindUI(){
  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
  $$('[data-open-member]').forEach(b=>b.addEventListener('click',()=>openMember()));
  $$('[data-open-timing]').forEach(b=>b.addEventListener('click',()=>openTiming()));
  $$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.closeDialog).close()));
  $('#memberForm').addEventListener('submit',saveMember);
  $('#timingForm').addEventListener('submit',saveTiming);
  $('#memberSearch').addEventListener('input',renderMembers);
  $('#memberFilter').addEventListener('change',renderMembers);
  $('#timingSearch').addEventListener('input',renderTimings);
  $('#timingFilter').addEventListener('change',renderTimings);
  $('#exportBackup').addEventListener('click',exportBackup);
  $('#importBackup').addEventListener('change',importBackup);
}

function showPage(pageId){
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===pageId));
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===pageId));
  window.scrollTo({top:0,behavior:'smooth'});
}

async function refreshAll(){
  state.members=await getAll('members');
  state.timings=await getAll('timings');
  renderDashboard();renderMembers();renderTimings();
}

function renderDashboard(){
  $('#membersCount').textContent=state.members.length;
  $('#activeMembersCount').textContent=state.members.filter(m=>m.status==='active').length;
  const now=new Date();
  const upcoming=state.timings.filter(t=>new Date(t.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date));
  $('#upcomingCount').textContent=upcoming.length;
  getOne('settings','lastBackup').then(v=>$('#lastBackup').textContent=v?.value?new Date(v.value).toLocaleDateString('ar-BH'):'لا توجد');
  const box=$('#homeUpcomingList');
  if(!upcoming.length){box.className='list empty-state';box.textContent='لا توجد مواقيت قادمة.';return}
  box.className='list';
  box.innerHTML=upcoming.slice(0,4).map(t=>`<div class="timing-card"><strong>${esc(t.title)}</strong><div class="meta">${formatDate(t.date)}${t.location?' • '+esc(t.location):''}</div></div>`).join('');
}

function renderMembers(){
  const q=$('#memberSearch').value.trim().toLowerCase();
  const f=$('#memberFilter').value;
  const items=state.members.filter(m=>{
    const text=`${m.name||''} ${m.phone||''} ${m.membershipNumber||''}`.toLowerCase();
    return text.includes(q)&&(f==='all'||m.status===f);
  }).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
  const box=$('#membersList');
  if(!items.length){box.className='cards-list empty-state';box.textContent='لا توجد نتائج.';return}
  box.className='cards-list';
  box.innerHTML=items.map(m=>`<article class="member-card">
    <div class="card-head"><div><h3>${esc(m.name)}</h3><div class="meta">الهاتف: ${esc(m.phone||'—')}<br>رقم العضوية: ${esc(m.membershipNumber||'—')}</div></div>
    <span class="badge ${m.status}">${m.status==='active'?'نشط':'غير نشط'}</span></div>
    ${m.notes?`<div class="meta">${esc(m.notes)}</div>`:''}
    <div class="card-actions"><button class="outline" onclick="editMember(${m.id})">تعديل</button><button class="danger" onclick="removeMember(${m.id})">حذف</button></div>
  </article>`).join('');
}

function renderTimings(){
  const q=$('#timingSearch').value.trim().toLowerCase();
  const f=$('#timingFilter').value;
  const now=new Date();
  const items=state.timings.filter(t=>{
    const match=`${t.title||''} ${t.type||''} ${t.location||''}`.toLowerCase().includes(q);
    const d=new Date(t.date);
    const fm=f==='all'||(f==='upcoming'&&d>=now)||(f==='past'&&d<now);
    return match&&fm;
  }).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const box=$('#timingsList');
  if(!items.length){box.className='cards-list empty-state';box.textContent='لا توجد نتائج.';return}
  box.className='cards-list';
  box.innerHTML=items.map(t=>`<article class="timing-card">
    <div class="card-head"><div><h3>${esc(t.title)}</h3><div class="meta">${formatDate(t.date)}<br>${esc(t.type||'بدون تصنيف')}${t.location?' • '+esc(t.location):''}</div></div></div>
    ${t.notes?`<div class="meta">${esc(t.notes)}</div>`:''}
    <div class="card-actions"><button class="outline" onclick="editTiming(${t.id})">تعديل</button><button class="danger" onclick="removeTiming(${t.id})">حذف</button></div>
  </article>`).join('');
}

function openMember(m={}){
  $('#memberId').value=m.id||'';$('#memberName').value=m.name||'';$('#memberPhone').value=m.phone||'';
  $('#membershipNumber').value=m.membershipNumber||'';$('#memberStatus').value=m.status||'active';$('#memberNotes').value=m.notes||'';
  $('#memberDialog').showModal();
}
window.editMember=(id)=>openMember(state.members.find(m=>m.id===id));
window.removeMember=async(id)=>{if(confirm('هل تريد حذف العضو؟')){await deleteOne('members',id);await refreshAll();toast('تم حذف العضو')}}

async function saveMember(e){
  e.preventDefault();
  const id=Number($('#memberId').value)||undefined;
  const data={name:$('#memberName').value.trim(),phone:$('#memberPhone').value.trim(),membershipNumber:$('#membershipNumber').value.trim(),status:$('#memberStatus').value,notes:$('#memberNotes').value.trim(),updatedAt:new Date().toISOString()};
  if(id){data.id=id;await putOne('members',data)}else{data.createdAt=new Date().toISOString();await addOne('members',data)}
  $('#memberDialog').close();await refreshAll();toast('تم حفظ بيانات العضو');
}

function openTiming(t={}){
  $('#timingId').value=t.id||'';$('#timingTitle').value=t.title||'';$('#timingType').value=t.type||'';
  $('#timingDate').value=t.date?toLocalInput(t.date):'';$('#timingLocation').value=t.location||'';$('#timingNotes').value=t.notes||'';
  $('#timingDialog').showModal();
}
window.editTiming=(id)=>openTiming(state.timings.find(t=>t.id===id));
window.removeTiming=async(id)=>{if(confirm('هل تريد حذف الموعد؟')){await deleteOne('timings',id);await refreshAll();toast('تم حذف الموعد')}}

async function saveTiming(e){
  e.preventDefault();
  const id=Number($('#timingId').value)||undefined;
  const data={title:$('#timingTitle').value.trim(),type:$('#timingType').value.trim(),date:new Date($('#timingDate').value).toISOString(),location:$('#timingLocation').value.trim(),notes:$('#timingNotes').value.trim(),updatedAt:new Date().toISOString()};
  if(id){data.id=id;await putOne('timings',data)}else{data.createdAt=new Date().toISOString();await addOne('timings',data)}
  $('#timingDialog').close();await refreshAll();toast('تم حفظ الموعد');
}

async function exportBackup(){
  const payload={app:'نظام عضوية مأتم الغسرة',version:1,exportedAt:new Date().toISOString(),members:await getAll('members'),timings:await getAll('timings')};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`alghasra-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
  await putOne('settings',{key:'lastBackup',value:new Date().toISOString()});renderDashboard();toast('تم تنزيل النسخة الاحتياطية');
}

async function importBackup(e){
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.members)||!Array.isArray(data.timings))throw new Error('invalid');
    if(!confirm('سيتم استبدال البيانات الحالية بمحتوى النسخة الاحتياطية. متابعة؟'))return;
    await clearStore('members');await clearStore('timings');
    for(const m of data.members){delete m.id;await addOne('members',m)}
    for(const t of data.timings){delete t.id;await addOne('timings',t)}
    await refreshAll();toast('تمت استعادة النسخة بنجاح');
  }catch{alert('ملف النسخة الاحتياطية غير صالح.')}
  e.target.value='';
}

function formatDate(v){return new Intl.DateTimeFormat('ar-BH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}
function toLocalInput(v){const d=new Date(v);const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)}

function registerSW(){if('serviceWorker'in navigator){navigator.serviceWorker.register('./service-worker.js')}}
function handleInstall(){
  let deferred;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').classList.remove('hidden')});
  $('#installBtn').addEventListener('click',async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$('#installBtn').classList.add('hidden')});
}
