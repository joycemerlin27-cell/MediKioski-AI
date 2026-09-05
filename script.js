const $=s=>document.querySelector(s);
const app=$('#app');
let token=localStorage.getItem('mk_token'),me=JSON.parse(localStorage.getItem('mk_user')||'null');
const t={
 en:{reg:'Register for OPD',queue:'Check My Queue',regdesk:'Registration Desk',doctor:'Doctor Login',about:'About MediKiosk',help:'Help'},
 hi:{reg:'OPD के लिए पंजीकरण',queue:'मेरी कतार देखें',regdesk:'पंजीकरण डेस्क',doctor:'डॉक्टर लॉगिन',about:'MediKiosk के बारे में',help:'मदद'},
 mr:{reg:'OPD नोंदणी',queue:'माझी रांग पहा',regdesk:'नोंदणी डेस्क',doctor:'डॉक्टर लॉगिन',about:'MediKiosk बद्दल',help:'मदत'}
};
function toast(x){const e=$('#toast');e.textContent=x;e.className='show';setTimeout(()=>e.className='',2500)}
async function api(url,opt={}){opt.headers=opt.headers||{};if(token)opt.headers.Authorization='Bearer '+token;const r=await fetch('/api'+url,opt);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escAttr(x){return esc(x)}
function formatAISummary(text){
  return esc(text)
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\s*[-•]\s*/gm, '<br>• ')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>');
}
function home(){
 const l=$('#lang').value;
 app.innerHTML=`<div class="wrap">
 <section class="hero"><h1>MediKiosk</h1><p>Simple OPD registration and queue tracking for patients, registration staff and doctors.</p><div class="actions"><button onclick="registerPage()">${t[l].reg}</button><button class="secondary" onclick="queuePage()">${t[l].queue}</button></div></section>
 <div class="grid"><div class="card imagecard" style="background-image:url('registration.jpg')"><h3>${t[l].regdesk}</h3></div><div class="card imagecard" style="background-image:url('queue.jpg')"><h3>${t[l].queue}</h3></div><div class="card imagecard" style="background-image:url('doctor.jpg')"><h3>${t[l].doctor}</h3></div></div>
 <section class="card emergency-card"><h2>Emergency Contacts</h2><p class="muted">For immediate emergencies, contact the appropriate emergency service.</p><div class="emergency-grid"><a href="tel:108"><b>Ambulance</b><span>108</span></a><a href="tel:101"><b>Fire</b><span>101</span></a><a href="tel:112"><b>Police</b><span>112</span></a><a href="tel:112"><b>Emergency Helpline</b><span>112</span></a></div></section>
 <div class="credit">Group — Just vibing</div></div><button class="help" onclick="help()">?</button>`;
}
async function registerPage(){
 let ds;try{ds=await api('/departments')}catch(e){toast(e.message);return}
 app.innerHTML=`<div class="wrap"><div class="card form"><h2>${t[$('#lang').value].reg}</h2>
 <div class="notice">Contact number must be exactly 10 digits. Email is optional.</div>
 <div class="field"><label>Name *</label><input id="name" required></div>
 <div class="field"><label>Contact *</label><input id="contact" type="tel" inputmode="numeric" maxlength="10"></div>
 <div class="field"><label>Email ID (Optional)</label><input id="email" type="email" placeholder="example@email.com"></div>
 <div class="field"><label>Preferred time</label><input id="time" type="time"></div>
 <div class="field"><label>Department *</label><select id="dept"><option value="">Select department</option>${ds.map(x=>`<option value="${escAttr(x.name)}">${esc(x.name)}</option>`).join('')}</select></div>
 <div class="field"><label>Medical history (Optional)</label><textarea id="history"></textarea></div>
 <div class="field"><label>Prescription / medicine images or PDF (Optional)</label><input id="files" type="file" accept="image/*,.pdf" multiple></div>
 <h3>Patient Verification *</h3>
 <div class="notice">Provide any ONE: a valid Aadhaar number, a Health Card number, or an image of your Birth Certificate.</div>
 <div class="verify-options">
   <label class="verify-choice"><input type="radio" name="verificationType" value="aadhaar" checked onchange="verificationUI()"> Aadhaar number</label>
   <label class="verify-choice"><input type="radio" name="verificationType" value="healthcard" onchange="verificationUI()"> Health Card number</label>
   <label class="verify-choice"><input type="radio" name="verificationType" value="birthcertificate" onchange="verificationUI()"> Birth Certificate image</label>
 </div>
 <div id="verifyNumberBox" class="field"><label id="verifyNumberLabel">Aadhaar number *</label><input id="verificationNumber" inputmode="numeric" maxlength="14" placeholder="12-digit Aadhaar number"></div>
 <div id="verifyBirthBox" class="field hidden"><label>Birth Certificate image *</label><input id="birthCertificate" type="file" accept="image/jpeg,image/png,image/webp"></div>
 <div class="notice small">Aadhaar is checked for 12-digit format and checksum only. The demo does not connect to UIDAI or any government database.</div>
 <div class="actions"><button onclick="submitPatient()">Get Queue Number</button><button class="secondary" onclick="home()">Home</button></div></div></div>`;
 $('#contact').oninput=()=>$('#contact').value=$('#contact').value.replace(/\D/g,'').slice(0,10);
 $('#verificationNumber').oninput=()=>{const type=document.querySelector('input[name="verificationType"]:checked').value;$('#verificationNumber').value=type==='aadhaar'?$('#verificationNumber').value.replace(/\D/g,'').slice(0,12):$('#verificationNumber').value.replace(/[^a-zA-Z0-9 .\/-]/g,'').slice(0,30)};
 verificationUI();
}
function verificationUI(){
 const type=document.querySelector('input[name="verificationType"]:checked')?.value||'aadhaar';
 $('#verifyNumberBox').classList.toggle('hidden',type==='birthcertificate');
 $('#verifyBirthBox').classList.toggle('hidden',type!=='birthcertificate');
 if(type!=='birthcertificate'){$('#verifyNumberLabel').textContent=type==='aadhaar'?'Aadhaar number *':'Health Card number *';$('#verificationNumber').placeholder=type==='aadhaar'?'12-digit Aadhaar number':'Enter Health Card number';$('#verificationNumber').value='';}
}
async function submitPatient(){
 const fd=new FormData();
 ['name','contact','email','time','history'].forEach(id=>fd.append(id==='time'?'preferredTime':id,$('#'+id).value));
 fd.append('department',$('#dept').value);
 [...$('#files').files].forEach(f=>fd.append('documents',f));
 const type=document.querySelector('input[name="verificationType"]:checked').value;fd.append('verificationType',type);
 if(type==='birthcertificate'){if(!$('#birthCertificate').files.length){toast('Birth Certificate image is required.');return;}fd.append('birthCertificate',$('#birthCertificate').files[0]);}
 else {const n=$('#verificationNumber').value.trim();if(!n){toast('Verification number is required.');return;}fd.append('verificationNumber',n);}
 try{const r=await api('/patients',{method:'POST',body:fd});localStorage.setItem('mk_last_queue',r.queueNo);queueResult(r.queueNo)}catch(e){toast(e.message)}
}
function queuePage(){app.innerHTML=`<div class="wrap"><div class="card form"><h2>${t[$('#lang').value].queue}</h2><div class="field"><label>Queue number</label><input id="q" placeholder="OPD-001"></div><div class="actions"><button onclick="queueResult($('#q').value.trim())">Check</button><button class="secondary" onclick="home()">Home</button></div></div></div>`}
async function queueResult(q){if(!q)return;try{const d=await api('/queue/'+encodeURIComponent(q));app.innerHTML=`<div class="wrap"><div class="card form"><p class="muted">${esc(d.department)}</p><div class="queueNo">${esc(d.queueNo)}</div><h2>${esc(d.name)}</h2><p>Status: <span class="pill">${esc(d.status)}</span></p><p><b>${d.ahead}</b> patient(s) ahead</p><p>Estimated wait: about <b>${d.estimatedMinutes} minutes</b></p><button onclick="queueResult('${escAttr(d.queueNo)}')">Refresh</button> <button class="secondary" onclick="home()">Home</button></div></div>`}catch(e){toast(e.message)}}
function login(kind){const bg=kind==='registration'?'regbg':'docbg';app.innerHTML=`<div class="wrap"><div class="loginbg ${bg}"><div class="card loginbox"><h2>${kind==='registration'?'Registration Desk Login':'Doctor Login'}</h2><div class="field"><label>Username</label><input id="u"></div><div class="field"><label>Password</label><input id="p" type="password"></div><div class="actions"><button onclick="doLogin('${kind}')">Login</button><button class="secondary" onclick="home()">Home</button></div><p class="small muted">Demo accounts: registration: regdesk / reg123. Doctors: bones, brain, opd, emergency, pediatrics / doc123</p></div></div></div>`}
async function doLogin(kind){try{const d=await api('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('#u').value,password:$('#p').value})});if((kind==='registration'&&d.user.role!=='registration')||(kind==='doctor'&&d.user.role!=='doctor'))throw Error('Wrong dashboard for this account');token=d.token;me=d.user;localStorage.setItem('mk_token',token);localStorage.setItem('mk_user',JSON.stringify(me));kind==='registration'?regDash():docDash()}catch(e){toast(e.message)}}
async function regDash(){try{const rows=await api('/registration/queue');app.innerHTML=`<div class="wrap"><div class="card"><h2>Registration Desk</h2><p class="muted">Registration staff can enqueue patients and see only basic queue details.</p><div class="tablewrap"><table><tr><th>Queue</th><th>Name</th><th>Contact</th><th>Department</th><th>Status</th></tr>${rows.map(r=>`<tr><td>${esc(r.queue_no)}</td><td>${esc(r.name)}</td><td>${esc(r.contact)}</td><td>${esc(r.department)}</td><td>${esc(r.status)}</td></tr>`).join('')}</table></div><div class="actions"><button onclick="regDash()">Refresh</button><button class="secondary" onclick="logout()">Logout</button></div></div></div>`}catch(e){logout();toast(e.message)}}
async function docDash(){try{const rows=await api('/doctors/me/patients');const fs=await api('/doctors/me/followups');app.innerHTML=`<div class="wrap"><div class="card"><h2>${esc(me.name)}</h2><p class="muted">${esc(me.department)}</p><h3>Assigned Patients</h3><div class="tablewrap"><table><tr><th>Queue</th><th>Patient</th><th>Status</th><th>Action</th></tr>${rows.map(r=>`<tr><td>${esc(r.queue_no)}</td><td>${esc(r.name)}</td><td>${esc(r.status)}</td><td><button onclick="patient(${Number(r.patient_id)})">Open File</button> <button onclick="callP(${Number(r.id)})">Call</button> <button onclick="completeP(${Number(r.id)})">Complete</button></td></tr>`).join('')}</table></div><h3>Upcoming Follow-ups</h3>${fs.map(f=>`<div class="notice"><b>${esc(f.patient_name)}</b> — ${esc(new Date(f.followup_at).toLocaleString())} — ${esc(f.mode)}${f.meeting_link?`<br><a href="${escAttr(f.meeting_link)}" target="_blank" rel="noopener">Open online meeting</a>`:''}</div>`).join('')||'<p class="muted">No scheduled follow-ups.</p>'}<div class="actions"><button onclick="docDash()">Refresh</button><button class="secondary" onclick="logout()">Logout</button></div></div></div>`}catch(e){logout();toast(e.message)}}
async function patient(id){try{const p=await api('/doctors/me/patient/'+id);app.innerHTML=`<div class="wrap"><div class="card"><button class="secondary" onclick="docDash()">← Back</button><h2>${esc(p.name)}</h2><p><b>Contact:</b> ${esc(p.contact)}<br><b>Email:</b> ${esc(p.email||'Not provided')}<br><b>Department:</b> ${esc(p.department)}<br><b>Verification:</b> ${esc(p.verification_method||'Not provided')}${p.verification_last4?` (ending ${esc(p.verification_last4)})`:''}</p><h3>Medical History</h3>
<p>${esc(p.history||'Not provided')}</p>

<h3>AI Medical History Summary</h3>

<div class="notice ai-summary">

  ${
    p.ai_summary?.status === 'completed'
      ? `
        <div>${formatAISummary(p.ai_summary.summary)}</div>
      `
      : p.ai_summary?.status === 'processing'
        ? '<p>AI summary is being generated...</p>'
        : '<p class="muted">AI summary not available.</p>'
  }

</div>
<h3>Documents</h3>${p.documents.map(d=>`<div class="notice"><b>${esc(d.original_name)}</b><br><span class="small muted">${d.document_type==='birth_certificate'?'Birth Certificate':'Medical document'}</span><div class="actions"><a class="docbtn" href="${escAttr(d.url)}" target="_blank" rel="noopener">Open / View</a><a class="docbtn secondary" href="${escAttr(d.url)}" download>Download</a></div></div>`).join('')||'<p class="muted">No documents uploaded.</p>'}<h3>Follow-up</h3><div class="grid"><div class="field"><label>Date & time</label><input id="fu" type="datetime-local"></div><div class="field"><label>Mode</label><select id="mode"><option>In-person</option><option>Online</option></select></div><div class="field"><label>Reminder</label><select id="rem"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="60">60 min</option></select></div></div><button onclick="follow(${Number(p.id)})">Schedule Follow-up</button></div></div>`}catch(e){toast(e.message)}}
async function follow(id){try{const d=await api('/doctors/followups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientId:id,followupAt:$('#fu').value,mode:$('#mode').value,reminderMinutes:$('#rem').value})});toast(d.meetingLink?'Online follow-up scheduled':'Follow-up scheduled');docDash()}catch(e){toast(e.message)}}
async function callP(id){try{await api('/doctors/queue/'+id+'/call',{method:'POST'});docDash()}catch(e){toast(e.message)}}
async function completeP(id){try{await api('/doctors/queue/'+id+'/complete',{method:'POST'});docDash()}catch(e){toast(e.message)}}
function logout(){token=null;me=null;localStorage.removeItem('mk_token');localStorage.removeItem('mk_user');home()}
function help(){app.insertAdjacentHTML('beforeend',`<div class="modal" onclick="this.remove()"><div class="card" onclick="event.stopPropagation()"><button class="close" onclick="this.parentElement.parentElement.remove()">Close</button><h2>How to Register</h2><ol><li>Enter your name and 10-digit contact number.</li><li>Email is optional; if entered, use a valid email.</li><li>Select your OPD department.</li><li>Provide any ONE verification: Aadhaar number, Health Card number, or Birth Certificate image.</li><li>Add medical history or prescription images only if you want to.</li><li>Submit and keep your queue number.</li><li>Use Check My Queue to see patients ahead of you.</li></ol></div></div>`)}
function about(){app.insertAdjacentHTML('beforeend',`<div class="modal" onclick="this.remove()"><div class="card" onclick="event.stopPropagation()"><button class="close" onclick="this.parentElement.parentElement.remove()">Close</button><h2>About MediKiosk</h2><p>Hospital OPD queue and patient information management prototype.</p><h3>Group</h3><p><b>Just vibing</b></p></div></div>`)}
$('#lang').onchange=home;
$('#menuBtn').onclick=()=>{app.insertAdjacentHTML('beforeend',`<div class="modal" onclick="this.remove()"><div class="card" onclick="event.stopPropagation()"><button class="close" onclick="this.parentElement.parentElement.remove()">Close</button><h2>Menu</h2><div class="actions"><button onclick="login('registration');this.parentElement.parentElement.parentElement.remove()">Registration Desk</button><button onclick="login('doctor');this.parentElement.parentElement.parentElement.remove()">Doctor Login</button><button class="secondary" onclick="about();this.parentElement.parentElement.parentElement.remove()">About</button></div></div></div>`) };
home();

