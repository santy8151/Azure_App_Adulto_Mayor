import { useState, useEffect, useRef, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Medication {
  id: string;
  name: string;
  dose: string;
  time: string;
  taken: boolean;
  icon: string;
  color: string;
}

interface Vital {
  label: string;
  value: string;
  unit: string;
  icon: string;
  status: "normal" | "warning" | "danger";
  trend: "up" | "down" | "stable";
}

interface Activity {
  id: string;
  name: string;
  time: string;
  day: string;
  type: "medical" | "social" | "exercise" | "leisure";
  done: boolean;
}

interface Contact {
  name: string;
  relation: string;
  phone: string;
  initials: string;
  color: string;
}

interface Note {
  id: string;
  text: string;
  date: Date;
  category: "salud" | "familia" | "general";
}

type Tab = "chat" | "medicamentos" | "signos" | "agenda" | "contactos" | "notas";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BACKEND_URL_DEFAULT = "https://vidaplena-backend.azurewebsites.net";

const SYSTEM_PROMPT = `Eres "VidaPlena", asistente de salud y bienestar para adultos mayores en Colombia.
Habla con calidez, paciencia y lenguaje sencillo. Usa emojis con moderación.
Ayudas con: medicamentos, ejercicios suaves, nutrición, compañía emocional, consejos de salud.
Si reportan síntomas graves (dolor pecho, dificultad respirar), indica llamar al 123 inmediatamente.
NUNCA reemplaces al médico. Máximo 120 palabras por respuesta. Contexto: Colombia, sistema EPS.`;

const QUICK_ACTIONS = [
  { label: "💊 Mis medicamentos", prompt: "¿Cuáles son mis medicamentos de hoy y para qué sirven?" },
  { label: "🏃 Ejercicios suaves", prompt: "¿Qué ejercicios suaves puedo hacer hoy en casa?" },
  { label: "🥗 Qué comer hoy", prompt: "¿Qué debo comer hoy para cuidar mi salud?" },
  { label: "😴 Dormir mejor", prompt: "¿Cómo puedo dormir mejor esta noche?" },
  { label: "💬 Estoy solo/a", prompt: "Me siento un poco solo/a hoy, ¿podemos conversar un rato?" },
  { label: "🌡️ Mis signos", prompt: "¿Mis signos vitales de hoy están en buen estado?" },
];

const INITIAL_MEDS: Medication[] = [
  { id: "1", name: "Metformina", dose: "1 tableta 500mg con desayuno", time: "8:00 AM", taken: false, icon: "💊", color: "#E8752A" },
  { id: "2", name: "Losartán", dose: "1 tableta 50mg", time: "12:00 PM", taken: false, icon: "💉", color: "#2A7F7F" },
  { id: "3", name: "Atorvastatina", dose: "1 tableta 20mg con cena", time: "8:00 PM", taken: false, icon: "🩺", color: "#7F2A2A" },
  { id: "4", name: "Vitamina D3", dose: "1 cápsula 1000UI", time: "8:00 AM", taken: true, icon: "☀️", color: "#7F6F2A" },
];

const VITALS: Vital[] = [
  { label: "Pulso", value: "72", unit: "/min", icon: "❤️", status: "normal", trend: "stable" },
  { label: "Presión", value: "122/80", unit: "mmHg", icon: "🩸", status: "normal", trend: "down" },
  { label: "Temperatura", value: "36.6", unit: "°C", icon: "🌡️", status: "normal", trend: "stable" },
  { label: "O₂ Saturación", value: "98", unit: "%", icon: "🫁", status: "normal", trend: "stable" },
  { label: "Glucosa", value: "105", unit: "mg/dL", icon: "🍬", status: "normal", trend: "up" },
  { label: "Peso", value: "68.5", unit: "kg", icon: "⚖️", status: "normal", trend: "stable" },
];

const ACTIVITIES: Activity[] = [
  { id: "1", name: "Yoga suave", time: "9:00 AM", day: "Hoy", type: "exercise", done: false },
  { id: "2", name: "Cita Cardiólogo – Dr. Restrepo", time: "2:30 PM", day: "Hoy", type: "medical", done: false },
  { id: "3", name: "Videollamada con familia", time: "4:00 PM", day: "Mañana", type: "social", done: false },
  { id: "4", name: "Taller de lectura – Biblioteca", time: "10:00 AM", day: "Miércoles", type: "leisure", done: false },
  { id: "5", name: "Control de glucosa – EPS", time: "8:30 AM", day: "Jueves", type: "medical", done: false },
  { id: "6", name: "Caminata con vecinos", time: "7:00 AM", day: "Viernes", type: "exercise", done: false },
];

const CONTACTS: Contact[] = [
  { name: "María González", relation: "Hija", phone: "+57 310 456 7890", initials: "MG", color: "#E8752A" },
  { name: "Carlos Rodríguez", relation: "Hijo", phone: "+57 320 123 4567", initials: "CR", color: "#2A7F7F" },
  { name: "Dr. Alejandro Restrepo", relation: "Cardiólogo – EPS Sura", phone: "+57 604 444 1234", initials: "AR", color: "#7F2A7F" },
  { name: "Enfermera Paula", relation: "Cuidadora", phone: "+57 300 987 6543", initials: "EP", color: "#7F6F2A" },
  { name: "Centro Día Bienestar", relation: "Centro geriátrico", phone: "+57 604 555 9876", initials: "CB", color: "#2A4A7F" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2);

const formatTime = (d: Date) =>
  d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const activityColor = (type: Activity["type"]) => ({
  medical: "#C0392B",
  social: "#2A7F7F",
  exercise: "#27AE60",
  leisure: "#E8752A",
}[type]);

const activityIcon = (type: Activity["type"]) => ({
  medical: "🩺",
  social: "👨‍👩‍👦",
  exercise: "🏃",
  leisure: "📚",
}[type]);

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:wght@500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #FFF8F0; --warm: #FFF0DC; --white: #FFFFFF;
    --orange: #E8752A; --orange-l: #F4A261; --orange-p: #FDEBD0;
    --teal: #2A7F7F;   --teal-l: #4AADAD;   --teal-p: #D0EFEF;
    --red: #C0392B;    --red-p: #FADBD8;
    --green: #27AE60;  --green-p: #D5F5E3;
    --text: #2C1810; --text-m: #5D3D2E; --text-s: #9B7B6B;
    --border: #E8D5C4;
    --sh: 0 2px 16px rgba(44,24,16,.09);
    --sh-lg: 0 8px 40px rgba(44,24,16,.15);
    font-family: 'Nunito', sans-serif;
    font-size: 16px;
    color: var(--text);
    background: var(--cream);
  }

  body { min-height: 100vh; display: flex; flex-direction: column; background: var(--cream); }

  /* ── HEADER ── */
  .hdr {
    background: linear-gradient(135deg,#1a5f5f,var(--teal));
    padding: 14px 24px; display: flex; align-items: center;
    justify-content: space-between; gap: 16px; flex-shrink: 0;
    box-shadow: 0 3px 16px rgba(0,0,0,.2);
  }
  .hdr-logo { display: flex; align-items: center; gap: 12px; }
  .hdr-icon { width: 48px; height: 48px; background: var(--orange); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink:0; }
  .hdr-title { font-family: 'Lora',serif; font-size: 22px; font-weight: 700; color: #fff; line-height:1.1; }
  .hdr-sub { font-size: 12px; color: rgba(255,255,255,.7); font-weight: 600; }
  .btn-sos {
    background: var(--red); color: #fff; border: none;
    border-radius: 50px; padding: 12px 22px;
    font-family: 'Nunito',sans-serif; font-size: 16px; font-weight: 800;
    cursor: pointer; display: flex; align-items: center; gap: 8px;
    animation: pulse-sos 2.5s infinite; flex-shrink:0;
    transition: transform .15s;
  }
  .btn-sos:hover { transform: scale(1.05); }
  @keyframes pulse-sos { 0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,.5)} 50%{box-shadow:0 0 0 8px rgba(192,57,43,0)} }

  /* ── CONFIG BAR ── */
  .cfg { background: #0f3a3a; padding: 8px 24px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: rgba(255,255,255,.8); font-weight:700; flex-shrink:0; }
  .cfg-badge { background: #0078d4; color:#fff; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:800; }
  .cfg input { border:1.5px solid rgba(255,255,255,.2); border-radius:8px; padding:5px 12px; font-family:'Nunito',sans-serif; font-size:13px; background:rgba(255,255,255,.1); color:#fff; outline:none; width:300px; }
  .cfg input::placeholder { color:rgba(255,255,255,.4); }
  .cfg input:focus { border-color:var(--teal-l); }
  .cfg-status { margin-left:auto; font-size:12px; font-weight:700; padding:4px 12px; border-radius:20px; }
  .cfg-status.ok  { background:var(--green-p); color:var(--green); }
  .cfg-status.err { background:var(--red-p); color:var(--red); }
  .cfg-status.idle{ background:var(--orange-p); color:var(--orange); }
  .cfg-btn { background:var(--teal-l); color:#fff; border:none; border-radius:16px; padding:5px 14px; font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; cursor:pointer; }

  /* ── LAYOUT ── */
  .layout { display:flex; flex:1; overflow:hidden; height:calc(100vh - 104px); }

  /* ── NAV ── */
  .nav {
    width:72px; flex-shrink:0; background:var(--white);
    border-right: 2px solid var(--border);
    display:flex; flex-direction:column; align-items:center;
    padding:12px 0; gap:4px;
  }
  .nav-btn {
    width:56px; height:56px; border:none; border-radius:14px;
    background:transparent; cursor:pointer; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:3px;
    font-size:22px; transition:all .18s; position:relative;
  }
  .nav-btn span { font-size:9px; font-weight:800; color:var(--text-s); }
  .nav-btn:hover { background:var(--orange-p); }
  .nav-btn.active { background:var(--orange); }
  .nav-btn.active span { color:#fff; }

  /* ── MAIN PANEL ── */
  .panel { flex:1; display:flex; flex-direction:column; overflow:hidden; }

  /* ── CHAT ── */
  .chat-hdr { background:var(--white); border-bottom:2px solid var(--border); padding:16px 24px; display:flex; align-items:center; gap:14px; flex-shrink:0; }
  .chat-avatar { width:50px; height:50px; background:linear-gradient(135deg,var(--teal),var(--teal-l)); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0; }
  .chat-avatar-name { font-size:18px; font-weight:800; color:var(--text); }
  .chat-avatar-sub { font-size:12px; color:var(--text-s); font-weight:600; display:flex; align-items:center; gap:6px; }
  .dot-live { width:8px; height:8px; border-radius:50%; background:var(--green); animation:blink 2s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }

  .messages { flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px; }
  .messages::-webkit-scrollbar { width:5px; }
  .messages::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  .msg { display:flex; gap:10px; align-items:flex-end; max-width:75%; animation:msg-in .3s cubic-bezier(.34,1.56,.64,1); }
  @keyframes msg-in { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }
  .msg.user { align-self:flex-end; flex-direction:row-reverse; }
  .msg-av { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  .msg.bot  .msg-av { background:linear-gradient(135deg,var(--teal),var(--teal-l)); }
  .msg.user .msg-av { background:linear-gradient(135deg,var(--orange),var(--orange-l)); }
  .msg-bubble { padding:14px 18px; border-radius:20px; font-size:16px; line-height:1.6; font-weight:600; box-shadow:var(--sh); }
  .msg.bot  .msg-bubble { background:var(--white); border-bottom-left-radius:5px; }
  .msg.user .msg-bubble { background:linear-gradient(135deg,var(--teal),var(--teal-l)); border-bottom-right-radius:5px; color:#fff; }
  .msg-time { font-size:10px; color:var(--text-s); margin-top:4px; text-align:right; }

  .typing { display:flex; gap:6px; align-items:center; padding:14px 18px; background:var(--white); border-radius:20px; border-bottom-left-radius:5px; box-shadow:var(--sh); }
  .typing span { width:8px; height:8px; border-radius:50%; background:var(--teal-l); animation:bounce 1.2s infinite; }
  .typing span:nth-child(2){animation-delay:.2s} .typing span:nth-child(3){animation-delay:.4s}
  @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}

  .input-area { background:var(--white); border-top:2px solid var(--border); padding:14px 24px; flex-shrink:0; }
  .quick-btns { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
  .quick-btn { background:var(--orange-p); border:1.5px solid var(--orange-l); border-radius:50px; padding:7px 14px; font-family:'Nunito',sans-serif; font-size:13px; font-weight:700; color:var(--orange); cursor:pointer; transition:all .15s; white-space:nowrap; }
  .quick-btn:hover { background:var(--orange); color:#fff; border-color:var(--orange); transform:translateY(-2px); }
  .input-row { display:flex; gap:10px; align-items:center; }
  .msg-input { flex:1; border:2px solid var(--border); border-radius:50px; padding:14px 22px; font-family:'Nunito',sans-serif; font-size:17px; color:var(--text); background:var(--cream); outline:none; transition:.2s; }
  .msg-input:focus { border-color:var(--teal); box-shadow:0 0 0 4px rgba(42,127,127,.12); }
  .msg-input::placeholder { color:var(--text-s); }
  .send-btn { width:54px; height:54px; background:linear-gradient(135deg,var(--teal),var(--teal-l)); border:none; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; color:#fff; box-shadow:0 4px 16px rgba(42,127,127,.4); transition:.15s; flex-shrink:0; }
  .send-btn:hover { transform:scale(1.1); }
  .send-btn:active { transform:scale(.95); }

  /* ── CONTENT PANELS ── */
  .content { flex:1; overflow-y:auto; padding:24px; }
  .content::-webkit-scrollbar { width:5px; }
  .content::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .panel-title { font-family:'Lora',serif; font-size:22px; font-weight:700; color:var(--text); margin-bottom:20px; display:flex; align-items:center; gap:10px; }

  /* ── CARDS ── */
  .card { background:var(--white); border-radius:18px; padding:18px; box-shadow:var(--sh); margin-bottom:16px; }
  .card-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .card-grid.three { grid-template-columns:1fr 1fr 1fr; }

  /* ── MEDS ── */
  .med-item { display:flex; align-items:center; gap:14px; padding:14px 18px; background:var(--orange-p); border:1.5px solid; border-radius:16px; margin-bottom:10px; cursor:pointer; transition:all .18s; position:relative; }
  .med-item:hover { transform:translateX(4px); }
  .med-item.taken { opacity:.55; background:var(--warm); }
  .med-icon { width:44px; height:44px; border-radius:50%; background:var(--white); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; box-shadow:var(--sh); }
  .med-name { font-size:17px; font-weight:800; }
  .med-dose { font-size:13px; color:var(--text-m); }
  .med-time-badge { margin-left:auto; font-size:12px; font-weight:800; background:var(--white); padding:4px 10px; border-radius:20px; flex-shrink:0; }
  .check-circle { width:28px; height:28px; border-radius:50%; border:2.5px solid; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; transition:.2s; }
  .check-circle.done { background:var(--green); border-color:var(--green); color:#fff; }

  /* ── VITALS ── */
  .vital-card { background:var(--teal-p); border:1.5px solid var(--teal-l); border-radius:16px; padding:16px; text-align:center; }
  .vital-card.warn { background:#FFF3CD; border-color:#FFC107; }
  .vital-icon { font-size:26px; }
  .vital-val { font-size:22px; font-weight:900; color:var(--teal); margin:4px 0 2px; }
  .vital-val.warn { color:#856404; }
  .vital-lbl { font-size:11px; font-weight:800; color:var(--text-s); text-transform:uppercase; letter-spacing:.8px; }
  .vital-unit { font-size:11px; color:var(--text-s); }
  .vital-trend { font-size:12px; margin-top:4px; }

  /* ── ACTIVITIES ── */
  .act-item { display:flex; align-items:center; gap:14px; padding:14px 18px; background:var(--warm); border-radius:16px; margin-bottom:10px; cursor:pointer; transition:all .18s; }
  .act-item:hover { transform:translateX(4px); }
  .act-item.done-act { opacity:.5; text-decoration:line-through; }
  .act-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
  .act-name { font-size:16px; font-weight:800; }
  .act-sub { font-size:12px; color:var(--text-s); }
  .act-day { margin-left:auto; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; background:var(--white); color:var(--text-m); white-space:nowrap; }

  /* ── CONTACTS ── */
  .contact-card { display:flex; align-items:center; gap:14px; padding:16px 18px; background:var(--white); border:1.5px solid var(--border); border-radius:16px; margin-bottom:10px; }
  .contact-av { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#fff; flex-shrink:0; }
  .contact-name { font-size:16px; font-weight:800; }
  .contact-rel { font-size:13px; color:var(--text-s); }
  .contact-phone { margin-left:auto; font-size:14px; font-weight:700; color:var(--teal); flex-shrink:0; }
  .call-btn { background:var(--teal); color:#fff; border:none; border-radius:50px; padding:8px 16px; font-family:'Nunito',sans-serif; font-size:13px; font-weight:800; cursor:pointer; margin-left:10px; transition:.15s; }
  .call-btn:hover { background:var(--teal-l); }

  /* ── NOTES ── */
  .note-add { display:flex; gap:10px; margin-bottom:20px; }
  .note-input { flex:1; border:2px solid var(--border); border-radius:12px; padding:12px 18px; font-family:'Nunito',sans-serif; font-size:15px; color:var(--text); background:var(--white); outline:none; transition:.2s; resize:none; height:80px; }
  .note-input:focus { border-color:var(--teal); }
  .note-cat { border:2px solid var(--border); border-radius:12px; padding:10px 14px; font-family:'Nunito',sans-serif; font-size:14px; font-weight:700; background:var(--white); color:var(--text); outline:none; cursor:pointer; }
  .add-btn { background:var(--teal); color:#fff; border:none; border-radius:12px; padding:10px 18px; font-family:'Nunito',sans-serif; font-size:15px; font-weight:800; cursor:pointer; align-self:flex-end; transition:.15s; }
  .add-btn:hover { background:var(--teal-l); }
  .note-item { background:var(--white); border-radius:14px; padding:14px 18px; margin-bottom:10px; border-left:4px solid; display:flex; justify-content:space-between; align-items:flex-start; gap:10px; box-shadow:var(--sh); }
  .note-text { font-size:15px; font-weight:600; color:var(--text); line-height:1.5; flex:1; }
  .note-meta { font-size:11px; color:var(--text-s); margin-top:4px; }
  .note-badge { font-size:10px; font-weight:800; padding:3px 8px; border-radius:20px; }
  .note-del { background:none; border:none; color:var(--text-s); cursor:pointer; font-size:16px; padding:0; transition:.15s; }
  .note-del:hover { color:var(--red); }

  /* ── SUMMARY STATS ── */
  .stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
  .stat-box { background:var(--white); border-radius:16px; padding:16px; text-align:center; box-shadow:var(--sh); }
  .stat-num { font-size:28px; font-weight:900; color:var(--orange); }
  .stat-lbl { font-size:12px; font-weight:700; color:var(--text-s); margin-top:4px; }

  /* ── SOS MODAL ── */
  .sos-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:1000; display:flex; align-items:center; justify-content:center; }
  .sos-modal { background:var(--white); border-radius:28px; padding:36px; max-width:420px; width:90%; text-align:center; box-shadow:var(--sh-lg); animation:pop .4s cubic-bezier(.34,1.56,.64,1); }
  @keyframes pop { from{transform:scale(.7);opacity:0} to{transform:scale(1);opacity:1} }
  .sos-emoji { font-size:56px; }
  .sos-title { font-size:24px; font-weight:900; color:var(--red); margin:12px 0 8px; }
  .sos-text { font-size:16px; color:var(--text-m); line-height:1.7; font-weight:600; }
  .sos-close { margin-top:20px; background:var(--teal); color:#fff; border:none; border-radius:50px; padding:13px 32px; font-family:'Nunito',sans-serif; font-size:17px; font-weight:800; cursor:pointer; transition:opacity .15s; }
  .sos-close:hover { opacity:.85; }

  /* ── PROGRESS BAR ── */
  .prog-bar { background:var(--border); border-radius:20px; height:10px; overflow:hidden; margin-top:8px; }
  .prog-fill { height:100%; border-radius:20px; transition:width .4s ease; }

  @media (max-width: 640px) {
    .card-grid { grid-template-columns:1fr; }
    .card-grid.three { grid-template-columns:1fr 1fr; }
    .stat-row { grid-template-columns:1fr 1fr; }
    .cfg input { width: 180px; }
  }
`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function VidaPlena() {
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: genId(), role: "assistant",
      content: "¡Hola! 😊 Soy VidaPlena, tu asistente de salud. Estoy aquí para ayudarte con tus medicamentos, ejercicios, nutrición y mucho más. ¿Cómo te sientes hoy?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [backendUrl, setBackendUrl] = useState(BACKEND_URL_DEFAULT);
  const [connStatus, setConnStatus] = useState<"idle" | "ok" | "err">("idle");
  const [showSos, setShowSos] = useState(false);
  const [meds, setMeds] = useState<Medication[]>(INITIAL_MEDS);
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [notes, setNotes] = useState<Note[]>([
    { id: genId(), text: "Recordar llevar carnet de la EPS a la cita del martes.", date: new Date(Date.now()-86400000), category: "salud" },
    { id: genId(), text: "María trae los nietos el domingo 🎉", date: new Date(Date.now()-172800000), category: "familia" },
  ]);
  const [noteText, setNoteText] = useState("");
  const [noteCat, setNoteCat] = useState<Note["category"]>("general");
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const testConn = useCallback(async () => {
    setConnStatus("idle");
    try {
      const r = await fetch(`${backendUrl.replace(/\/$/, "")}/api/chat/health`);
      setConnStatus(r.ok ? "ok" : "err");
    } catch { setConnStatus("err"); }
  }, [backendUrl]);

  const sendMsg = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    setInput("");
    const userMsg: Message = { id: genId(), role: "user", content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const newHist = [...history, { role: "user", content }];
    setHistory(newHist);
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHist, system: SYSTEM_PROMPT }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.reply ?? "Lo siento, no pude procesar tu mensaje.";
      setMessages(prev => [...prev, { id: genId(), role: "assistant", content: reply, timestamp: new Date() }]);
      setHistory(prev => [...prev, { role: "assistant", content: reply }]);
      setConnStatus("ok");
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: genId(), role: "assistant",
        content: `⚠️ No pude conectarme al servidor Azure. Verifica la URL del backend.\n\nError: ${e.message}`,
        timestamp: new Date(),
      }]);
      setConnStatus("err");
    }
    setIsLoading(false);
  }, [input, isLoading, history, backendUrl]);

  const toggleMed = (id: string) =>
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));

  const toggleActivity = (id: string) =>
    setActivities(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [{ id: genId(), text: noteText.trim(), date: new Date(), category: noteCat }, ...prev]);
    setNoteText("");
  };

  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const takenCount = meds.filter(m => m.taken).length;
  const doneAct = activities.filter(a => a.done).length;

  const noteColor = (cat: Note["category"]) =>
    cat === "salud" ? "#E8752A" : cat === "familia" ? "#2A7F7F" : "#7F6F2A";

  const TAB_ICONS: { key: Tab; icon: string; label: string }[] = [
    { key: "chat", icon: "💬", label: "Chat" },
    { key: "medicamentos", icon: "💊", label: "Meds" },
    { key: "signos", icon: "📊", label: "Signos" },
    { key: "agenda", icon: "📅", label: "Agenda" },
    { key: "contactos", icon: "📞", label: "Contactos" },
    { key: "notas", icon: "📝", label: "Notas" },
  ];

  return (
    <>
      <style>{css}</style>

      {/* SOS MODAL */}
      {showSos && (
        <div className="sos-overlay" onClick={() => setShowSos(false)}>
          <div className="sos-modal" onClick={e => e.stopPropagation()}>
            <div className="sos-emoji">🆘</div>
            <div className="sos-title">¡Alerta de Emergencia!</div>
            <div className="sos-text">
              Se ha notificado a tus cuidadores y familiares.<br /><br />
              <strong>📞 Emergencias:</strong> 123<br />
              <strong>📞 Hija María:</strong> +57 310 456 7890<br />
              <strong>📞 Hijo Carlos:</strong> +57 320 123 4567<br /><br />
              ¡Mantén la calma, ayuda está en camino! 💙
            </div>
            <button className="sos-close" onClick={() => setShowSos(false)}>
              Estoy bien, cancelar alerta
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-logo">
          <div className="hdr-icon">🌿</div>
          <div>
            <div className="hdr-title">VidaPlena</div>
            <div className="hdr-sub">Tu compañero de salud inteligente</div>
          </div>
        </div>
        <button className="btn-sos" onClick={() => setShowSos(true)}>🆘 Emergencia</button>
      </header>

      {/* CONFIG */}
      <div className="cfg">
        <span className="cfg-badge">☁️ AZURE</span>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          🔗 Backend URL:
          <input value={backendUrl} onChange={e => setBackendUrl(e.target.value)}
            placeholder="https://tu-app.azurewebsites.net" />
        </label>
        <button className="cfg-btn" onClick={testConn}>Probar</button>
        <span className={`cfg-status ${connStatus}`}>
          {connStatus === "ok" ? "✅ Conectado" : connStatus === "err" ? "❌ Error" : "⏳ Sin verificar"}
        </span>
      </div>

      {/* LAYOUT */}
      <div className="layout">

        {/* NAV */}
        <nav className="nav">
          {TAB_ICONS.map(t => (
            <button key={t.key} className={`nav-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}>
              {t.icon}
              <span style={{ color: tab === t.key ? "#fff" : undefined }}>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* PANEL */}
        <div className="panel">

          {/* ── CHAT ── */}
          {tab === "chat" && (
            <>
              <div className="chat-hdr">
                <div className="chat-avatar">🤖</div>
                <div>
                  <div className="chat-avatar-name">Asistente IA VidaPlena</div>
                  <div className="chat-avatar-sub">
                    <span className="dot-live" />
                    Activo · Azure App Service · Claude por Anthropic
                  </div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-s)" }}>
                    {messages.filter(m => m.role === "user").length} mensajes hoy
                  </div>
                </div>
              </div>
              <div className="messages">
                {messages.map(m => (
                  <div key={m.id} className={`msg ${m.role === "user" ? "user" : "bot"}`}>
                    <div className="msg-av">{m.role === "user" ? "👴" : "🤖"}</div>
                    <div>
                      <div className="msg-bubble"
                        dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br />") }} />
                      <div className="msg-time">{formatTime(m.timestamp)}</div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="msg bot">
                    <div className="msg-av">🤖</div>
                    <div className="typing"><span /><span /><span /></div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>
              <div className="input-area">
                <div className="quick-btns">
                  {QUICK_ACTIONS.map(a => (
                    <button key={a.prompt} className="quick-btn" onClick={() => sendMsg(a.prompt)}>
                      {a.label}
                    </button>
                  ))}
                </div>
                <div className="input-row">
                  <input className="msg-input" value={input} placeholder="Escribe tu mensaje aquí..."
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMsg()} />
                  <button className="send-btn" onClick={() => sendMsg()}>➤</button>
                </div>
              </div>
            </>
          )}

          {/* ── MEDICAMENTOS ── */}
          {tab === "medicamentos" && (
            <div className="content">
              <div className="panel-title">💊 Medicamentos de hoy</div>

              {/* Progreso */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>Progreso del día</span>
                  <span style={{ fontWeight: 900, color: "var(--teal)", fontSize: 18 }}>{takenCount} / {meds.length}</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill"
                    style={{ width: `${(takenCount / meds.length) * 100}%`, background: "var(--teal)" }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-s)", marginTop: 6, fontWeight: 600 }}>
                  {takenCount === meds.length ? "✅ ¡Excelente! Tomaste todos tus medicamentos hoy." : `Faltan ${meds.length - takenCount} medicamento(s).`}
                </div>
              </div>

              {meds.map(m => (
                <div key={m.id} className={`med-item ${m.taken ? "taken" : ""}`}
                  style={{ borderColor: m.color }}
                  onClick={() => toggleMed(m.id)}>
                  <div className="med-icon">{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="med-name" style={{ color: m.taken ? "var(--text-s)" : m.color }}>{m.name}</div>
                    <div className="med-dose">{m.dose}</div>
                  </div>
                  <div className="med-time-badge" style={{ color: m.color }}>{m.time}</div>
                  <div className={`check-circle ${m.taken ? "done" : ""}`}
                    style={{ borderColor: m.taken ? "var(--green)" : m.color }}>
                    {m.taken ? "✓" : ""}
                  </div>
                </div>
              ))}

              <div className="card" style={{ background: "var(--teal-p)", border: "1.5px solid var(--teal-l)", marginTop: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--teal)", marginBottom: 6 }}>💡 Recordatorio</div>
                <div style={{ fontSize: 14, color: "var(--text-m)", lineHeight: 1.6 }}>
                  Toca cada medicamento para marcarlo como tomado. Si tienes dudas sobre tus medicamentos, consulta a tu médico o pregúntale al asistente.
                </div>
              </div>
            </div>
          )}

          {/* ── SIGNOS VITALES ── */}
          {tab === "signos" && (
            <div className="content">
              <div className="panel-title">📊 Signos Vitales</div>

              <div className="stat-row">
                <div className="stat-box">
                  <div className="stat-num">{takenCount}/{meds.length}</div>
                  <div className="stat-lbl">Meds tomados</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "var(--teal)" }}>Normal</div>
                  <div className="stat-lbl">Estado general</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "var(--green)", fontSize: 22 }}>Hoy</div>
                  <div className="stat-lbl">Última medición</div>
                </div>
              </div>

              <div className="card-grid" style={{ marginBottom: 16 }}>
                {VITALS.map(v => (
                  <div key={v.label} className={`vital-card ${v.status === "warning" ? "warn" : ""}`}>
                    <div className="vital-icon">{v.icon}</div>
                    <div className={`vital-val ${v.status === "warning" ? "warn" : ""}`}>{v.value}</div>
                    <div className="vital-unit">{v.unit}</div>
                    <div className="vital-lbl">{v.label}</div>
                    <div className="vital-trend">
                      {v.trend === "up" ? "↑ Subiendo" : v.trend === "down" ? "↓ Bajando" : "→ Estable"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", marginBottom: 12 }}>
                  📈 Historial de la semana
                </div>
                {["Lun","Mar","Mié","Jue","Vie","Sáb","Hoy"].map((d, i) => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 32, fontSize: 12, fontWeight: 700, color: "var(--text-s)" }}>{d}</span>
                    <div className="prog-bar" style={{ flex: 1 }}>
                      <div className="prog-fill" style={{
                        width: `${70 + Math.sin(i) * 15}%`,
                        background: i === 6 ? "var(--teal)" : "var(--teal-l)"
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)", width: 50, textAlign: "right" }}>
                      {(115 + Math.floor(Math.sin(i) * 8))}/80
                    </span>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: "var(--text-s)", marginTop: 8, fontWeight: 600 }}>Presión arterial (mmHg)</div>
              </div>
            </div>
          )}

          {/* ── AGENDA ── */}
          {tab === "agenda" && (
            <div className="content">
              <div className="panel-title">📅 Agenda de actividades</div>

              <div className="stat-row">
                <div className="stat-box">
                  <div className="stat-num">{activities.length}</div>
                  <div className="stat-lbl">Total actividades</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "var(--green)" }}>{doneAct}</div>
                  <div className="stat-lbl">Completadas</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "var(--red)" }}>
                    {activities.filter(a => a.type === "medical" && !a.done).length}
                  </div>
                  <div className="stat-lbl">Citas médicas</div>
                </div>
              </div>

              {["Hoy", "Mañana", "Miércoles", "Jueves", "Viernes"].map(day => {
                const dayActs = activities.filter(a => a.day === day);
                if (!dayActs.length) return null;
                return (
                  <div key={day} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-s)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
                      {day}
                    </div>
                    {dayActs.map(a => (
                      <div key={a.id} className={`act-item ${a.done ? "done-act" : ""}`}
                        onClick={() => toggleActivity(a.id)}>
                        <div className="act-dot" style={{ background: activityColor(a.type) }} />
                        <div style={{ fontSize: 20 }}>{activityIcon(a.type)}</div>
                        <div style={{ flex: 1 }}>
                          <div className="act-name">{a.name}</div>
                          <div className="act-sub">{a.time}</div>
                        </div>
                        <div className="act-day" style={{ color: activityColor(a.type) }}>
                          {a.type === "medical" ? "🩺 Médica" : a.type === "exercise" ? "🏃 Ejercicio" : a.type === "social" ? "👨‍👩‍👦 Social" : "📚 Ocio"}
                        </div>
                        <div style={{ fontSize: 18, marginLeft: 8, color: a.done ? "var(--green)" : "var(--border)" }}>
                          {a.done ? "✓" : "○"}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CONTACTOS ── */}
          {tab === "contactos" && (
            <div className="content">
              <div className="panel-title">📞 Mis contactos de confianza</div>

              <div className="card" style={{ background: "var(--red-p)", border: "1.5px solid var(--red)", marginBottom: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: "var(--red)", marginBottom: 6 }}>🆘 Emergencia</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "var(--red)" }}>📞 123</div>
                <div style={{ fontSize: 13, color: "var(--text-m)", marginTop: 4, fontWeight: 600 }}>Línea nacional de emergencias Colombia</div>
              </div>

              {CONTACTS.map(c => (
                <div key={c.name} className="contact-card">
                  <div className="contact-av" style={{ background: c.color }}>{c.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div className="contact-name">{c.name}</div>
                    <div className="contact-rel">{c.relation}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="contact-phone">{c.phone}</div>
                    <button className="call-btn" onClick={() => window.open(`tel:${c.phone}`)}>
                      📞 Llamar
                    </button>
                  </div>
                </div>
              ))}

              <div className="card" style={{ background: "var(--teal-p)", border: "1.5px solid var(--teal-l)", marginTop: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--teal)", marginBottom: 4 }}>💡 Tip</div>
                <div style={{ fontSize: 14, color: "var(--text-m)", lineHeight: 1.6 }}>
                  Comparte esta lista con tus familiares para que también tengan los contactos de emergencia.
                </div>
              </div>
            </div>
          )}

          {/* ── NOTAS ── */}
          {tab === "notas" && (
            <div className="content">
              <div className="panel-title">📝 Mis notas personales</div>

              <div className="note-add">
                <textarea className="note-input" value={noteText} placeholder="Escribe una nota aquí..."
                  onChange={e => setNoteText(e.target.value)} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <select className="note-cat" value={noteCat}
                    onChange={e => setNoteCat(e.target.value as Note["category"])}>
                    <option value="salud">🩺 Salud</option>
                    <option value="familia">👨‍👩‍👦 Familia</option>
                    <option value="general">📌 General</option>
                  </select>
                  <button className="add-btn" onClick={addNote}>+ Guardar</button>
                </div>
              </div>

              {notes.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-s)", fontWeight: 600 }}>
                  📝 No hay notas aún. ¡Agrega tu primera nota!
                </div>
              )}

              {notes.map(n => (
                <div key={n.id} className="note-item" style={{ borderLeftColor: noteColor(n.category) }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="note-badge" style={{
                        background: noteColor(n.category) + "20",
                        color: noteColor(n.category),
                        border: `1px solid ${noteColor(n.category)}40`
                      }}>
                        {n.category === "salud" ? "🩺 Salud" : n.category === "familia" ? "👨‍👩‍👦 Familia" : "📌 General"}
                      </span>
                    </div>
                    <div className="note-text">{n.text}</div>
                    <div className="note-meta">{n.date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</div>
                  </div>
                  <button className="note-del" onClick={() => deleteNote(n.id)}>🗑️</button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
