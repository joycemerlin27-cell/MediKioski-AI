require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
async function generateMedicalSummary(files, patientHistory = '') {
  const input = [
    {
      type: 'text',
      text: `You are an AI medical-record summarization assistant.

Create ONLY a medical summary from the uploaded medical documents.

Do NOT include:
- Patient name
- Age
- Gender
- Contact number
- Email
- Address
- Aadhaar or other ID numbers
- Any other personally identifying information

Use ONLY medical information explicitly present in the uploaded documents.

Format the response using ONLY these section headings:

PREVIOUS CONDITIONS
CURRENT SYMPTOMS
DIAGNOSES
MEDICATIONS
ALLERGIES
LABS AND TEST RESULTS
PROCEDURES AND TREATMENTS
IMPORTANT FINDINGS
RELEVANT DATES

Under each heading, use short bullet points starting with a simple hyphen (-).

Rules:
- Do not use Markdown formatting.
- Do not use emojis.
- Do not repeat information.
- Keep the summary concise and easy to scan.
- If a section has no information, write: Not mentioned.
- Do not provide diagnosis, treatment recommendations, or medical advice.
- Do not mention the patient's identity or personal details.
Patient-entered history:
${patientHistory || 'Not provided'}`

    }
  ];

  for (const file of files) {
    const data = fs.readFileSync(file.path).toString('base64');

    input.push({
      type: file.mimetype === 'application/pdf' ? 'document' : 'image',
      data,
      mime_type: file.mimetype
    });
  }

  const interaction = await ai.interactions.create({
    model: 'gemini-3.5-flash-lite',
    input
  });

  return interaction.output_text;
}
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION';
const ROOT = __dirname;
const UPLOAD_DIR = ROOT;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  res.sendFile(filePath);
});
app.use(express.static(ROOT));

const medicalStorage = multer.diskStorage({
 destination: (_, __, cb) => cb(null, UPLOAD_DIR),
 filename: (_, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
});
const allowedMedical = ['image/jpeg','image/png','image/webp','application/pdf'];
const allowedImage = ['image/jpeg','image/png','image/webp'];

const upload = multer({
 storage: medicalStorage,
 limits: { files: 6, fileSize: 5 * 1024 * 1024 },
 fileFilter: (_, file, cb) => cb(allowedMedical.includes(file.mimetype) ? null : new Error('Only JPG, PNG, WEBP or PDF files are allowed.'), allowedMedical.includes(file.mimetype))
});
const uploadRegistration = multer({
 storage: medicalStorage,
 limits: { files: 6, fileSize: 5 * 1024 * 1024 },
 fileFilter: (_, file, cb) => {
   const ok = file.fieldname === 'birthCertificate' ? allowedImage.includes(file.mimetype) : allowedMedical.includes(file.mimetype);
   cb(ok ? null : new Error(file.fieldname === 'birthCertificate' ? 'Birth certificate must be a JPG, PNG or WEBP image.' : 'Only JPG, PNG, WEBP or PDF files are allowed.'), ok);
 }
});

const today = () => new Date().toISOString().slice(0,10);
const now = () => new Date().toISOString();
const sign = u => jwt.sign({id:u.id, role:u.role, department:u.department}, JWT_SECRET, {expiresIn:'8h'});
function auth(req,res,next){
 try { const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) throw 0; req.user=jwt.verify(h.slice(7),JWT_SECRET); next(); }
 catch { res.status(401).json({error:'Authentication required'}); }
}
function role(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Not allowed'});}
function validContact(c){return /^\d{10}$/.test(String(c||''));}
function validEmail(e){return !e || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e));}
function validHealthCard(v){return /^[A-Za-z0-9][A-Za-z0-9 ./-]{5,29}$/.test(String(v||'').trim());}

// Aadhaar format + Verhoeff checksum. This checks the number format/checksum only;
// it does not contact UIDAI or prove identity.
const d=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const p=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,9,1,5,2,3,8,6]];
const inv=[0,4,3,2,1,5,6,7,8,9];
function validAadhaar(v){
 const s=String(v||'').replace(/\s/g,''); if(!/^\d{12}$/.test(s) || /^([0-9])\1{11}$/.test(s)) return false;
 let c=0, rev=s.split('').reverse().map(Number); for(let i=0;i<rev.length;i++) c=d[c][p[i%8][rev[i]]]; return c===0;
}
function verificationHash(value){return crypto.createHash('sha256').update(String(value).trim().replace(/\s+/g,'').toUpperCase()).digest('hex');}
function documentUrl(req, storedName){return `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(storedName)}`;}

app.get('/api/health',(req,res)=>res.json({ok:true,date:today()}));
app.post('/api/login',(req,res)=>{
 const {username,password}=req.body||{};
 const u=db.prepare('SELECT * FROM users WHERE username=?').get(username||'');
 if(!u || !bcrypt.compareSync(password||'',u.password_hash)) return res.status(401).json({error:'Invalid username or password'});
 res.json({token:sign(u),user:{id:u.id,username:u.username,role:u.role,name:u.name,department:u.department}});
});
app.get('/api/departments',(req,res)=>res.json(db.prepare("SELECT id,department,name FROM users WHERE role='doctor' ORDER BY department,name").all().map(x=>({id:x.id,name:x.department,doctor:x.name}))));

app.post('/api/patients', uploadRegistration.fields([{name:'documents',maxCount:5},{name:'birthCertificate',maxCount:1}]), (req,res)=>{
 try {
  const {name,contact,email,preferredTime,history,department,privacyHistory,verificationType,verificationNumber}=req.body||{};
  if(!name?.trim() || !validContact(contact) || !validEmail(email) || !department) return res.status(400).json({error:'Name, valid 10-digit contact and department are required. Email is optional but must be valid when entered.'});
  const files=req.files||{}; const birth=files.birthCertificate?.[0]; const medicalDocs=files.documents||[];
  const type=String(verificationType||'').toLowerCase();
  if(!['aadhaar','healthcard','birthcertificate'].includes(type)) return res.status(400).json({error:'Choose one verification method: Aadhaar number, Health Card number, or Birth Certificate image.'});
  if(type==='aadhaar' && !validAadhaar(verificationNumber)) return res.status(400).json({error:'Enter a valid 12-digit Aadhaar number. Format/checksum is checked; identity is not verified online.'});
  if(type==='healthcard' && !validHealthCard(verificationNumber)) return res.status(400).json({error:'Enter a valid Health Card number (6–30 letters/numbers).'});
  if(type==='birthcertificate' && !birth) return res.status(400).json({error:'Upload an image of the Birth Certificate for verification.'});
  if(type!=='birthcertificate' && birth) return res.status(400).json({error:'Birth Certificate image can only be used with the Birth Certificate verification option.'});

  const date=today(), stamp=now();
  const tx=db.transaction(()=>{
   const vhash=type==='birthcertificate'?null:verificationHash(verificationNumber);
   const vlast4=type==='birthcertificate'?null:String(verificationNumber||'').replace(/\s/g,'').slice(-4);
   const p=db.prepare(`INSERT INTO patients(name,contact,email,preferred_time,history,created_at,created_date,privacy_history,verification_method,verification_last4,verification_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(name.trim(),contact,email?.trim()||null,preferredTime||null,history?.trim()||null,stamp,date,privacyHistory==='0'?0:1,type,vlast4,vhash);
   const doc=db.prepare("SELECT id,department FROM users WHERE role='doctor' AND department=? ORDER BY id LIMIT 1").get(department);
   const count=db.prepare('SELECT COUNT(*) c FROM queue WHERE queue_date=? AND department=?').get(date,department).c+1;
   const prefix=department.split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase() || 'OPD';
   const qno=`${prefix}-${String(count).padStart(3,'0')}`;
   const q=db.prepare(`INSERT INTO queue(patient_id,queue_no,department,assigned_doctor_id,status,created_at,queue_date) VALUES(?,?,?,?,?,?,?)`).run(p.lastInsertRowid,qno,department,doc?.id||null,'Waiting',stamp,date);
   for(const f of medicalDocs) db.prepare('INSERT INTO documents(patient_id,original_name,stored_name,created_at,document_type) VALUES(?,?,?,?,?)').run(p.lastInsertRowid,f.originalname,f.filename,stamp,'medical');
   if(birth) db.prepare('INSERT INTO documents(patient_id,original_name,stored_name,created_at,document_type) VALUES(?,?,?,?,?)').run(p.lastInsertRowid,birth.originalname,birth.filename,stamp,'birth_certificate');
   return {id:p.lastInsertRowid,queueId:q.lastInsertRowid,queueNo:qno,verification:type};
  });
  const result = tx();
res.status(201).json(result);

if (medicalDocs.length) {
  const stamp = now();

  db.prepare(`
    INSERT INTO medical_summaries
    (patient_id, summary, status, created_at, updated_at)
    VALUES (?, '', 'processing', ?, ?)
    ON CONFLICT(patient_id) DO UPDATE SET
      status='processing',
      updated_at=excluded.updated_at
  `).run(result.id, stamp, stamp);

  generateMedicalSummary(medicalDocs, req.body.history || '')
    .then(summary => {
      const finished = now();

      db.prepare(`
        UPDATE medical_summaries
        SET summary=?, status='completed', updated_at=?
        WHERE patient_id=?
      `).run(summary, finished, result.id);
    })
    .catch(err => {
      console.error('AI summary generation failed:', err);

      db.prepare(`
        UPDATE medical_summaries
        SET summary=?, status='failed', updated_at=?
        WHERE patient_id=?
      `).run('AI summary could not be generated.', now(), result.id);
    });
}
 } catch(e){res.status(400).json({error:e.message||'Registration failed'});}
});

app.get('/api/queue/:queueNo',(req,res)=>{
 const q=db.prepare(`SELECT q.*,p.name,p.contact,p.email,p.preferred_time FROM queue q JOIN patients p ON p.id=q.patient_id WHERE q.queue_no=? AND q.queue_date=?`).get(req.params.queueNo,today());
 if(!q) return res.status(404).json({error:'Queue number not found for today'});
 const ahead=db.prepare(`SELECT COUNT(*) c FROM queue WHERE queue_date=? AND department=? AND status IN ('Waiting','Called') AND id<?`).get(today(),q.department,q.id).c;
 res.json({queueNo:q.queue_no,name:q.name,department:q.department,status:q.status,ahead,estimatedMinutes:ahead*5});
});
app.get('/api/registration/queue',auth,role('registration'),(req,res)=>res.json(db.prepare(`SELECT q.id,q.queue_no,q.status,q.department,q.created_at,p.name,p.contact,p.email FROM queue q JOIN patients p ON p.id=q.patient_id WHERE q.queue_date=? ORDER BY q.id`).all(today())));
app.get('/api/doctors/me/patients',auth,role('doctor'),(req,res)=>res.json(db.prepare(`SELECT q.id,q.queue_no,q.status,q.department,q.created_at,p.id patient_id,p.name,p.contact,p.email,p.preferred_time,p.history FROM queue q JOIN patients p ON p.id=q.patient_id WHERE q.queue_date=? AND q.assigned_doctor_id=? AND q.status IN ('Waiting','Called') ORDER BY q.id`).all(today(),req.user.id)));
app.get('/api/doctors/me/patient/:id',auth,role('doctor'),(req,res)=>{
 const p=db.prepare(`SELECT p.*,q.queue_no,q.department,q.status FROM patients p JOIN queue q ON q.patient_id=p.id WHERE p.id=? AND q.assigned_doctor_id=? ORDER BY q.id DESC LIMIT 1`).get(req.params.id,req.user.id);
 if(!p)return res.status(404).json({error:'Patient not assigned to you'});
 const docs=db.prepare('SELECT id,original_name,created_at,stored_name,document_type FROM documents WHERE patient_id=? ORDER BY id DESC').all(p.id).map(d=>({...d,url:documentUrl(req,d.stored_name)}));
 const follow=db.prepare('SELECT f.*,u.name doctor_name FROM followups f JOIN users u ON u.id=f.doctor_id WHERE f.patient_id=? ORDER BY f.followup_at DESC').all(p.id);
 const aiSummary = db.prepare(`
  SELECT summary, status, created_at, updated_at
  FROM medical_summaries
  WHERE patient_id=?
`).get(p.id);
 res.json({
  ...p,
  verification_number:undefined,
  documents:docs,
  followups:follow,
  ai_summary: aiSummary || null
});
});
app.post('/api/doctors/queue/:id/call',auth,role('doctor'),(req,res)=>{const r=db.prepare("UPDATE queue SET status='Called' WHERE id=? AND assigned_doctor_id=? AND status='Waiting'").run(req.params.id,req.user.id);if(!r.changes)return res.status(400).json({error:'Patient cannot be called'});res.json({ok:true});});
app.post('/api/doctors/queue/:id/complete',auth,role('doctor'),(req,res)=>{const r=db.prepare("UPDATE queue SET status='Completed' WHERE id=? AND assigned_doctor_id=? AND status IN ('Waiting','Called')").run(req.params.id,req.user.id);if(!r.changes)return res.status(400).json({error:'Patient cannot be completed'});res.json({ok:true});});
app.post('/api/doctors/followups',auth,role('doctor'),(req,res)=>{const {patientId,followupAt,mode,reminderMinutes}=req.body||{};const p=db.prepare(`SELECT p.id FROM patients p JOIN queue q ON q.patient_id=p.id WHERE p.id=? AND q.assigned_doctor_id=? LIMIT 1`).get(patientId,req.user.id);if(!p||!followupAt||!['Online','In-person'].includes(mode))return res.status(400).json({error:'Invalid follow-up'});const link=mode==='Online'?`https://meet.google.com/medikiosk-${crypto.randomBytes(4).toString('hex')}`:null;const r=db.prepare('INSERT INTO followups(patient_id,doctor_id,followup_at,mode,meeting_link,reminder_minutes) VALUES(?,?,?,?,?,?)').run(patientId,req.user.id,followupAt,mode,link,Number(reminderMinutes)||30);res.status(201).json({id:r.lastInsertRowid,meetingLink:link});});
app.get('/api/doctors/me/followups',auth,role('doctor'),(req,res)=>res.json(db.prepare(`SELECT f.*,p.name patient_name FROM followups f JOIN patients p ON p.id=f.patient_id WHERE f.doctor_id=? AND f.status='Scheduled' ORDER BY f.followup_at`).all(req.user.id)));

app.get('*',(req,res)=>res.sendFile(path.join(ROOT,'index.html')));
app.use((err,req,res,next)=>{console.error(err);res.status(400).json({error:err.message||'Request failed'});});
app.listen(PORT,()=>console.log(`MediKiosk running at http://localhost:${PORT}`));
