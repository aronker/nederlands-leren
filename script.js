let currentLang = localStorage.getItem("trainerLang") || "nl";
function t(key){ return (typeof UI !== "undefined" && UI[currentLang]) ? (UI[currentLang][key] || UI.nl[key] || key) : key; }

/* ═══════════════════════════════════════════════════
   CONFIG — example file URLs (GitHub Pages)
   Replace with your own repo path!
═══════════════════════════════════════════════════ */
const EXAMPLE_URLS = {
  werkwoorden: "examples/werkwoorden.csv",
  zinnen:      "examples/zinnen.csv",
  qa:          "examples/va.csv"
};

/* ═══════════════════════════════════════════════════
   SHARED: remote example file loader
═══════════════════════════════════════════════════ */
async function loadExampleXlsx(url, onRows, btnEl){
  const orig = btnEl.textContent;
  btnEl.textContent = t("loading");
  btnEl.disabled = true;
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const wb  = XLSX.read(new Uint8Array(buf), {type:"array"});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1});
    onRows(rows.slice(1));          // skip header row
    btnEl.textContent = t("loaded");
    setTimeout(()=>{ btnEl.textContent = orig; btnEl.disabled = false; }, 1800);
  } catch(err){
    console.error(err);
    btnEl.textContent = t("error");
    setTimeout(()=>{ btnEl.textContent = orig; btnEl.disabled = false; }, 2500);
  }
}

/* ═══════════════════════════════════════════════════
   SHARED: file parser — supports XLSX and CSV
═══════════════════════════════════════════════════ */
function parseFile(file, onRows){
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const reader = new FileReader();
  reader.onload = ev => {
    let rows;
    if(isCsv){
      const wb = XLSX.read(ev.target.result, {type:"string"});
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1});
    } else {
      const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1});
    }
    onRows(rows.slice(1));
  };
  if(isCsv) reader.readAsText(file, "UTF-8");
  else reader.readAsArrayBuffer(file);
}

/* ═══════════════════════════════════════════════════
   SHARED: TTS
═══════════════════════════════════════════════════ */
let _voice = null;
const synth = window.speechSynthesis;
function _detectVoice(){
  const v = synth.getVoices();
  _voice = v.find(x=>x.lang==="nl-BE") || v.find(x=>x.lang==="nl-NL") || v.find(x=>x.lang.startsWith("nl"));
}
speechSynthesis.onvoiceschanged = _detectVoice;
_detectVoice();

function speak(text){
  if(!text) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = _voice?.lang || "nl-NL";
  if(_voice) u.voice = _voice;
  u.rate = 0.85;
  synth.speak(u);
}

/* ═══════════════════════════════════════════════════
   SHARED: UTILS
═══════════════════════════════════════════════════ */
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}
function save(key,data){ localStorage.setItem(key, JSON.stringify(data)); }
function load(key){ return JSON.parse(localStorage.getItem(key)||"[]"); }

function emptyRow(colspan, msg){
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = colspan;
  td.innerHTML = `<div class="empty"><div class="e-icon">📭</div><p>${msg}</p></div>`;
  tr.appendChild(td);
  return tr;
}

/* ═══════════════════════════════════════════════════
   TAB NAVIGATION
═══════════════════════════════════════════════════ */
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* ═══════════════════════════════════════════════════
   TAB 1 — WERKWOORDEN
═══════════════════════════════════════════════════ */
let wList = load("verbData");
wList.forEach((v,i)=>{ if(v.originalIndex===undefined) v.originalIndex=i; });

function wSort(arr){
  const m = document.getElementById("wSort").value;
  if(m==="original") arr.sort((a,b)=>a.originalIndex-b.originalIndex);
  else if(m==="abc") arr.sort((a,b)=>a.word.localeCompare(b.word,"nl"));
  else if(m==="abc_irreg") arr.sort((a,b)=>{
    const ai=a.type==="irregulier", bi=b.type==="irregulier";
    if(ai&&!bi) return -1; if(!ai&&bi) return 1;
    return a.word.localeCompare(b.word,"nl");
  });
  else shuffle(arr);
}

function wRender(){
  const tbody = document.getElementById("wBody");
  tbody.innerHTML = "";
  let list = [...wList];
  wSort(list);
  const q = document.getElementById("wSearch").value.toLowerCase();
  if(q) list = list.filter(v=>String(v.word).toLowerCase().includes(q)||
    (v.betekenis||"").toLowerCase().includes(q)||
    [v.ik,v.jij,v.hij,v.wij,v.jullie,v.zij].some(x=>(x||"").toLowerCase().includes(q)));

  if(!list.length){ tbody.appendChild(emptyRow(11,t("empty-verbs"))); return; }

  list.forEach(v=>{
    const tr = document.createElement("tr");

    // Type
    const tdT = document.createElement("td");
    tdT.dataset.label = "Type";
    const badge = document.createElement("span");
    badge.className = "badge " + (v.type==="irregulier"?"badge-irreg":"badge-reg");
    badge.textContent = v.type === "irregulier" ? "onregelmatig" : "regulier";
    tdT.appendChild(badge);
    tr.appendChild(tdT);

    // Betekenis
    const tdB = document.createElement("td");
    tdB.dataset.label = t("th-meaning");
    tdB.textContent = v.betekenis||"";
    tdB.style.color = "var(--muted)";
    tdB.style.fontSize = "13px";
    tr.appendChild(tdB);

    // Werkwoord
    const tdW = document.createElement("td");
    tdW.dataset.label = "Werkwoord";
    tdW.dataset.clickable = "";
    tdW.textContent = v.word;
    tdW.onclick = ()=>speak(v.word);
    tr.appendChild(tdW);

    // Conjugations
    [["ik","Ik"],["jij","Jij/Je"],["hij","Hij/Zij/Ze"],["wij","Wij/We"],["jullie","Jullie"],["zij","Zij/Ze"]].forEach(([key,lbl])=>{
      const td = document.createElement("td");
      td.dataset.label = lbl;
      td.textContent = v[key]||"";
      if(v.type==="irregulier") td.classList.add("irreg-cell");
      if(v[key]) {
        td.dataset.clickable = "";
        td.onclick = ()=> speak(key==="hij" ? "hij, zij "+v[key] : lbl+" "+v[key]);
      }
      tr.appendChild(td);
    });

    // Prepositie
    const tdP = document.createElement("td");
    tdP.dataset.label = t("th-prep");
    tdP.textContent = v.prep||"";
    tdP.style.color = "var(--muted)";
    tdP.style.fontSize = "13px";
    tr.appendChild(tdP);

    // Delete
    const tdD = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "del-btn"; btn.textContent = "❌";
    btn.onclick = ()=>{ if(confirm(t("confirm-delete"))){ wList=wList.filter(x=>x!==v); wSave(); } };
    tdD.appendChild(btn); tr.appendChild(tdD);
    tbody.appendChild(tr);
  });
}
function wSave(){ save("verbData",wList); wRender(); }

document.getElementById("wAdd").onclick = ()=>{
  const word = document.getElementById("wWord").value.trim();
  if(!word) return;
  wList.push({
    word,
    type: document.getElementById("wType").value,
    betekenis: document.getElementById("wBetekenis").value.trim(),
    ik:   document.getElementById("wIk").value.trim(),
    jij:  document.getElementById("wJij").value.trim(),
    hij:  document.getElementById("wHij").value.trim(),
    wij:  document.getElementById("wWij").value.trim(),
    jullie:document.getElementById("wJullie").value.trim(),
    zij:  document.getElementById("wZij").value.trim(),
    prep: document.getElementById("wPrep").value.trim(),
    originalIndex: wList.length
  });
  ["wWord","wBetekenis","wIk","wJij","wHij","wWij","wJullie","wZij","wPrep"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("wType").value="regulier";
  wSave();
};

["wWord","wBetekenis","wIk","wJij","wHij","wWij","wJullie","wZij","wPrep"].forEach(id=>{
  document.getElementById(id).addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("wAdd").click(); });
});

["input","keyup","search"].forEach(ev=>document.getElementById("wSearch").addEventListener(ev, wRender));
document.getElementById("wSort").onchange = wRender;

document.getElementById("wClear").onclick = ()=>{
  if(confirm(t("confirm-clear-verbs"))){ wList=[]; wSave(); }
};

document.getElementById("wDownload").onclick = ()=>{
  if(!wList.length) return;
  const ws = XLSX.utils.aoa_to_sheet([
    ["Werkwoord","Type","Betekenis","Ik","Jij","Hij","Wij","Jullie","Zij","Prepositie"],
    ...wList.map(v=>[v.word,v.type,v.betekenis||"",v.ik,v.jij,v.hij,v.wij,v.jullie,v.zij,v.prep||""])
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Werkwoorden");
  XLSX.writeFile(wb,"werkwoorden.xlsx");
};

document.getElementById("wExample").onclick = e=>{
  if(!confirm(t("confirm-example"))) return;
  wList = [];
  let _wi = 0;
  loadExampleXlsx(EXAMPLE_URLS.werkwoorden, rows=>{
    rows.forEach((r,i)=>{ if(r[0]) wList.push({word:r[0]||"",type:r[1]||"regulier",betekenis:r[2]||"",ik:r[3]||"",jij:r[4]||"",hij:r[5]||"",wij:r[6]||"",jullie:r[7]||"",zij:r[8]||"",prep:r[9]||"",originalIndex:i}); });
    wSave();
  }, e.currentTarget);
};

document.getElementById("wFile").onchange = e=>{
  const f=e.target.files[0]; if(!f) return;
  wList = [];
  parseFile(f, rows=>{
    rows.forEach((r,i)=>{ if(r[0]) wList.push({word:r[0]||"",type:r[1]||"regulier",betekenis:r[2]||"",ik:r[3]||"",jij:r[4]||"",hij:r[5]||"",wij:r[6]||"",jullie:r[7]||"",zij:r[8]||"",prep:r[9]||"",originalIndex:i}); });
    wSave();
  });
  e.target.value="";
};

/* ═══════════════════════════════════════════════════
   TAB 2 — ZINNEN
═══════════════════════════════════════════════════ */
let zList = load("zinnenData");
zList.forEach((s,i)=>{ if(!s.order) s.order=i; });
let _zCounter = zList.length;

function zSort(arr){
  const m=document.getElementById("zSort").value;
  if(m==="abc") arr.sort((a,b)=>a.dutch.localeCompare(b.dutch,"nl"));
  else if(m==="random") shuffle(arr);
  else arr.sort((a,b)=>a.order-b.order);
}
var counterz = 0;
function zRender(){
  const tbody=document.getElementById("zBody");
  tbody.innerHTML="";
  let list=[...zList]; zSort(list);
  const q=document.getElementById("zSearch").value.toLowerCase();
  if(q) list=list.filter(s=>String(s.translation||" ").toLowerCase().includes(q)||String(s.dutch||" ").toLowerCase().includes(q));
  if(!list.length){ tbody.appendChild(emptyRow(3,t("empty-sentences"))); return; }
  list.forEach(s=>{
    const tr=document.createElement("tr");
    const tdH=document.createElement("td"); tdH.dataset.label="Hulp"; tdH.textContent=s.translation||""; tr.appendChild(tdH);
    const tdD=document.createElement("td"); tdD.dataset.label="Zin"; tdD.dataset.clickable="";
    tdD.textContent=s.dutch||""; tdD.onclick=()=>speak(s.dutch); tr.appendChild(tdD);
    const tdDel=document.createElement("td");
    const btn=document.createElement("button"); btn.className="del-btn"; btn.textContent="❌";
    btn.onclick=()=>{ if(confirm(t("confirm-delete"))){ const i=zList.indexOf(s); zList.splice(i,1); zSave(); } };
    tdDel.appendChild(btn); tr.appendChild(tdDel);
    tbody.appendChild(tr);
  });
}
function zSave(){ save("zinnenData",zList); zRender(); }

document.getElementById("zAdd").onclick=()=>{
  const h=document.getElementById("zHulp").value.trim();
  const d=document.getElementById("zNl").value.trim();
  if(!h&&!d) return;
  zList.push({translation:h,dutch:d,order:_zCounter++});
  document.getElementById("zHulp").value="";
  document.getElementById("zNl").value="";
  zSave();
};

["zHulp","zNl"].forEach(id=>{
  document.getElementById(id).addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("zAdd").click(); });
});

document.getElementById("zSort").onchange=zRender;
["input","keyup","search"].forEach(ev=>document.getElementById("zSearch").addEventListener(ev, zRender));
document.getElementById("zClear").onclick=()=>{ if(confirm(t("confirm-clear"))){ zList=[]; save("zinnenData",[]); zRender(); } };

document.getElementById("zDownload").onclick=()=>{
  if(!zList.length) return;
  const ws=XLSX.utils.aoa_to_sheet([["Hulp","Nederland"],...zList.map(s=>[s.translation,s.dutch])]);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Zinnen"); XLSX.writeFile(wb,"zinnen.xlsx");
};

document.getElementById("zExample").onclick = e=>{
  if(!confirm(t("confirm-example"))) return;
  zList = []; _zCounter = 0;
  loadExampleXlsx(EXAMPLE_URLS.zinnen, rows=>{
    rows.forEach(r=>{ zList.push({translation:r[0]||"",dutch:r[1]||"",order:_zCounter++}); });
    zSave();
  }, e.currentTarget);
};

document.getElementById("zFile").onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  zList = []; _zCounter = 0;
  parseFile(f, rows=>{
    rows.forEach(r=>{ zList.push({translation:r[0]||"",dutch:r[1]||"",order:_zCounter++}); });
    zSave();
  });
  e.target.value="";
};

/* ═══════════════════════════════════════════════════
   TAB 3 — VRAAG & ANTWOORD
═══════════════════════════════════════════════════ */
let qList = load("qaData");
qList.forEach((s,i)=>{ if(s.originalIndex===undefined) s.originalIndex=i; });

function qSort(arr){
  const m=document.getElementById("qSort").value;
  if(m==="abc") arr.sort((a,b)=>a.question.localeCompare(b.question,"nl"));
  else if(m==="random") shuffle(arr);
  else arr.sort((a,b)=>a.originalIndex-b.originalIndex);
}

function qRender(){
  const tbody=document.getElementById("qBody");
  tbody.innerHTML="";
  let list=[...qList]; qSort(list);
  const q=document.getElementById("qSearch").value.toLowerCase();
  if(q) list=list.filter(s=>String(s.question||"").toLowerCase().includes(q)||(s.hulp||"").toLowerCase().includes(q)||(s.answer||"").toLowerCase().includes(q));
  if(!list.length){ tbody.appendChild(emptyRow(4,t("empty-qa"))); return; }
  list.forEach(s=>{
    const tr=document.createElement("tr");
    // Question
    const tdQ=document.createElement("td"); tdQ.dataset.label="Vraag"; tdQ.dataset.clickable="";
    tdQ.textContent=s.question||""; tdQ.onclick=()=>speak(s.question); tr.appendChild(tdQ);
    // Hulp
    const tdH=document.createElement("td"); tdH.dataset.label="Hulp";
    tdH.textContent=s.hulp||""; tdH.style.color="var(--muted)"; tdH.style.fontSize="13px"; tr.appendChild(tdH);
    // Answer (hidden)
    const tdA=document.createElement("td"); tdA.dataset.label="Antwoord";
    const wrap=document.createElement("div"); wrap.className="answer-wrap";
    const tog=document.createElement("button"); tog.className="toggle-btn"; tog.textContent=t("toggle-show");
    const ans=document.createElement("span"); ans.className="answer"; ans.textContent=s.answer||"";
    ans.onclick=()=>speak(s.answer);
    tog.onclick=()=>{
      const v=ans.classList.toggle("visible");
      tog.textContent=v?t("toggle-hide"):t("toggle-show");
    };
    wrap.appendChild(tog); wrap.appendChild(ans); tdA.appendChild(wrap); tr.appendChild(tdA);
    // Delete
    const tdD=document.createElement("td");
    const btn=document.createElement("button"); btn.className="del-btn"; btn.textContent="❌";
    btn.onclick=()=>{ if(confirm(t("confirm-delete"))){ const i=qList.indexOf(s); qList.splice(i,1); qSave(); } };
    tdD.appendChild(btn); tr.appendChild(tdD);
    tbody.appendChild(tr);
  });
}
function qSave(){ save("qaData",qList); qRender(); }

document.getElementById("qAdd").onclick=()=>{
  const q=document.getElementById("qQ").value.trim();
  const h=document.getElementById("qHulp").value.trim();
  const a=document.getElementById("qA").value.trim();
  if(!q&&!a) return;
  qList.push({question:q,hulp:h,answer:a,originalIndex:qList.length});
  ["qQ","qHulp","qA"].forEach(id=>document.getElementById(id).value="");
  qSave();
};

["qQ","qHulp","qA"].forEach(id=>{
  document.getElementById(id).addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("qAdd").click(); });
});

document.getElementById("qSort").onchange=qRender;
["input","keyup","search"].forEach(ev=>document.getElementById("qSearch").addEventListener(ev, qRender));
document.getElementById("qClear").onclick=()=>{ if(confirm(t("confirm-clear"))){ qList=[]; save("qaData",[]); qRender(); } };

document.getElementById("qDownload").onclick=()=>{
  if(!qList.length) return;
  const ws=XLSX.utils.aoa_to_sheet([["Vraag","Hulp","Antwoord"],...qList.map(s=>[s.question,s.hulp,s.answer])]);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"QA"); XLSX.writeFile(wb,"qa.xlsx");
};

document.getElementById("qExample").onclick = e=>{
  if(!confirm(t("confirm-example"))) return;
  qList = [];
  loadExampleXlsx(EXAMPLE_URLS.qa, rows=>{
    rows.forEach((r,i)=>{ qList.push({question:r[0]||"",hulp:r[1]||"",answer:r[2]||"",originalIndex:i}); });
    qSave();
  }, e.currentTarget);
};

document.getElementById("qFile").onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  qList = [];
  parseFile(f, rows=>{
    rows.forEach((r,i)=>{ qList.push({question:r[0]||"",hulp:r[1]||"",answer:r[2]||"",originalIndex:i}); });
    qSave();
  });
  e.target.value="";
};


/* ═══════════════════════════════════════════════════
   I18N — full UI translations
═══════════════════════════════════════════════════ */
const UI = {
  nl: {
    "tab-verbs":"Werkwoorden","tab-sentences":"Zinnen","tab-qa":"Vraag & Antwoord","lbl-add":"Toevoegen","lbl-sort":"Sorteren","lbl-file":"Bestand","lbl-search":"Zoeken",
    "btn-add":"+ Toevoegen","btn-download":"⬇ Downloaden","btn-import":"⬆ Importeren",
    "btn-example":"📋 Voorbeeld","btn-clear":"🗑 Alles wissen",
    "ph-verb":"Werkwoord","ph-meaning":"Betekenis","ph-prep":"Prepositie","ph-search":"🔍 Zoeken…","ph-help-transl":"Hulp (vertaling…)",
    "ph-dutch-sentence":"Nederlandse zin","ph-question":"Vraag 🔊","ph-help":"Hulp","ph-answer":"Antwoord 🔊",
    "opt-regular":"regulier","opt-irregular":"onregelmatig","opt-original":"Origineel",
    "opt-random":"Willekeurig","opt-abc-irreg":"ABC (onregelmatig eerst)",
    "th-type":"Type","th-meaning":"Betekenis","th-verb":"Werkwoord","th-prep":"Prepositie","th-help":"Hulp",
    "th-dutch-sentence":"Nederlandse zin 🔊","th-question":"Vraag 🔊","th-answer":"Antwoord 🔊",
    "toggle-show":"toon","toggle-hide":"verberg",
    "empty-verbs":"Geen werkwoorden gevonden","empty-sentences":"Geen zinnen gevonden","empty-qa":"Geen vragen gevonden",
    "confirm-delete":"Verwijderen?","confirm-clear":"Weet je zeker dat je alles wilt wissen?",
    "confirm-clear-verbs":"Alle werkwoorden verwijderen?",
    "loading":"⏳ Laden…","loaded":"✅ Klaar!","error":"❌ Fout!","confirm-example":"De huidige gegevens worden verwijderd en de voorbeeldgegevens worden geladen. Weet je zeker dat je wilt doorgaan?","confirm-import":"De huidige gegevens worden verwijderd en het bestand wordt ingeladen. Weet je zeker dat je wilt doorgaan?",
  },
  en: {
    "tab-verbs":"Verbs","tab-sentences":"Sentences","tab-qa":"Q & A","lbl-add":"Add","lbl-sort":"Sort","lbl-file":"File","lbl-search":"Search",
    "btn-add":"+ Add","btn-download":"⬇ Download","btn-import":"⬆ Import",
    "btn-example":"📋 Example","btn-clear":"🗑 Clear all",
    "ph-verb":"Verb","ph-meaning":"Meaning","ph-prep":"Preposition","ph-search":"🔍 Search…","ph-help-transl":"Help (translation…)",
    "ph-dutch-sentence":"Dutch sentence","ph-question":"Question 🔊","ph-help":"Help","ph-answer":"Answer 🔊",
    "opt-regular":"regular","opt-irregular":"irregular","opt-original":"Original",
    "opt-random":"Random","opt-abc-irreg":"ABC (irregular first)",
    "th-type":"Type","th-meaning":"Meaning","th-verb":"Verb","th-prep":"Preposition","th-help":"Help",
    "th-dutch-sentence":"Dutch sentence 🔊","th-question":"Question 🔊","th-answer":"Answer 🔊",
    "toggle-show":"show","toggle-hide":"hide",
    "empty-verbs":"No verbs found","empty-sentences":"No sentences found","empty-qa":"No questions found",
    "confirm-delete":"Delete?","confirm-clear":"Are you sure you want to clear everything?",
    "confirm-clear-verbs":"Delete all verbs?",
    "loading":"⏳ Loading…","loaded":"✅ Done!","error":"❌ Error!","confirm-example":"The current data will be deleted and the example data will be loaded. Are you sure you want to continue?","confirm-import":"The current data will be deleted and the file will be imported. Are you sure you want to continue?",
  },
  fr: {
    "tab-verbs":"Verbes","tab-sentences":"Phrases","tab-qa":"Q & R","lbl-add":"Ajouter","lbl-sort":"Trier","lbl-file":"Fichier","lbl-search":"Rechercher",
    "btn-add":"+ Ajouter","btn-download":"⬇ Télécharger","btn-import":"⬆ Importer",
    "btn-example":"📋 Exemple","btn-clear":"🗑 Tout effacer",
    "ph-verb":"Verbe","ph-meaning":"Signification","ph-prep":"Préposition","ph-search":"🔍 Rechercher…","ph-help-transl":"Aide (traduction…)",
    "ph-dutch-sentence":"Phrase néerlandaise","ph-question":"Question 🔊","ph-help":"Aide","ph-answer":"Réponse 🔊",
    "opt-regular":"régulier","opt-irregular":"irrégulier","opt-original":"Original",
    "opt-random":"Aléatoire","opt-abc-irreg":"ABC (irréguliers d'abord)",
    "th-type":"Type","th-meaning":"Signification","th-verb":"Verbe","th-prep":"Préposition","th-help":"Aide",
    "th-dutch-sentence":"Phrase néerlandaise 🔊","th-question":"Question 🔊","th-answer":"Réponse 🔊",
    "toggle-show":"afficher","toggle-hide":"masquer",
    "empty-verbs":"Aucun verbe trouvé","empty-sentences":"Aucune phrase trouvée","empty-qa":"Aucune question trouvée",
    "confirm-delete":"Supprimer ?","confirm-clear":"Voulez-vous vraiment tout effacer ?",
    "confirm-clear-verbs":"Supprimer tous les verbes ?",
    "loading":"⏳ Chargement…","loaded":"✅ Terminé !","error":"❌ Erreur !","confirm-example":"Les données actuelles seront supprimées et les données d'exemple seront chargées. Voulez-vous vraiment continuer ?","confirm-import":"Les données actuelles seront supprimées et le fichier sera importé. Voulez-vous vraiment continuer ?",
  }
};

/* ── Help tooltips ── */
const HELP = {
  nl: {
    "w-add":   "<strong>Werkwoord toevoegen</strong><br>Vul het werkwoord in, kies het type en voer optioneel de betekenis in. Voer daarna de vervoegingen in voor elk persoonlijk voornaamwoord. Druk op <em>Toevoegen</em> of gebruik Enter om op te slaan.",
    "w-sort":  "<strong>Sorteren &amp; beheren</strong><br>Kies hoe je de lijst wilt sorteren: alfabetisch, onregelmatige werkwoorden eerst, of willekeurig. Gebruik <em>Downloaden</em> om de lijst op te slaan als XLSX-bestand, of <em>Importeren</em> om een bestaand XLSX- of CSV-bestand te laden. <em>Voorbeeld</em> laadt een voorbeeldlijst.",
    "w-search":"<strong>Zoeken</strong><br>Typ een of meer letters om te filteren. De zoekfunctie doorzoekt zowel het werkwoord als alle vervoegingen.",
    "z-add":   "<strong>Zin toevoegen</strong><br>Typ in het veld <em>Hulp</em> een vertaling of aanwijzing, en in het tweede veld de Nederlandse zin. Druk op <em>Toevoegen</em> of gebruik Enter om op te slaan.",
    "z-sort":  "<strong>Sorteren &amp; beheren</strong><br>Kies de gewenste volgorde: origineel (invoervolgorde), alfabetisch of willekeurig. Gebruik <em>Downloaden</em> om de lijst te exporteren, of <em>Importeren</em> om een XLSX- of CSV-bestand te laden. <em>Voorbeeld</em> laadt een voorbeeldlijst.",
    "z-search":"<strong>Zoeken</strong><br>Typ om te filteren. De zoekfunctie doorzoekt zowel de Hulp-kolom als de Nederlandse zin.",
    "q-add":   "<strong>Vraag toevoegen</strong><br>Vul de vraag in, optioneel een hint in het veld <em>Hulp</em>, en het antwoord. Druk op <em>Toevoegen</em> of gebruik Enter.",
    "q-sort":  "<strong>Sorteren &amp; beheren</strong><br>Kies de gewenste volgorde: origineel, alfabetisch op vraag of willekeurig. Gebruik <em>Downloaden</em> of <em>Importeren</em> om de gegevens te exporteren of laden. <em>Voorbeeld</em> laadt een voorbeeldlijst.",
    "q-search":"<strong>Zoeken</strong><br>Typ om te filteren. De zoekfunctie doorzoekt de vraag, de hint en het antwoord.",
    "w-table": "💡 Klik op een werkwoord of vervoeging in de tabel om het te laten voorlezen.",
    "z-table": "💡 Klik op een zin in de tabel om hem te laten voorlezen. Klik op ❌ om een rij te verwijderen.",
    "q-table": "💡 Klik op een vraag of antwoord in de tabel om het te laten voorlezen. Het antwoord is verborgen — druk op <em>toon</em> om het zichtbaar te maken.",
  },
  en: {
    "w-add":   "<strong>Add a verb</strong><br>Enter the verb, choose its type and optionally fill in the meaning. Then fill in the conjugations for each pronoun. Press <em>Add</em> or hit Enter to save.",
    "w-sort":  "<strong>Sort &amp; manage</strong><br>Choose how to sort the list: alphabetically, irregular verbs first, or randomly. Use <em>Download</em> to save as XLSX, or <em>Import</em> to load an existing XLSX or CSV file. <em>Example</em> loads a sample list.",
    "w-search":"<strong>Search</strong><br>Type one or more letters to filter. The search covers both the verb and all its conjugations.",
    "z-add":   "<strong>Add a sentence</strong><br>Type a translation or hint in the <em>Help</em> field, and the Dutch sentence in the second field. Press <em>Add</em> or hit Enter to save.",
    "z-sort":  "<strong>Sort &amp; manage</strong><br>Choose the desired order: original (entry order), alphabetical or random. Use <em>Download</em> to export, or <em>Import</em> to load an XLSX or CSV file. <em>Example</em> loads a sample list.",
    "z-search":"<strong>Search</strong><br>Type to filter. The search covers both the Help column and the Dutch sentence.",
    "q-add":   "<strong>Add a question</strong><br>Fill in the question, optionally a hint in the <em>Help</em> field, and the answer. Press <em>Add</em> or hit Enter.",
    "q-sort":  "<strong>Sort &amp; manage</strong><br>Choose the desired order: original, alphabetical by question, or random. Use <em>Download</em> or <em>Import</em> to export or load data. <em>Example</em> loads a sample list.",
    "q-search":"<strong>Search</strong><br>Type to filter. The search covers the question, the hint and the answer.",
    "w-table": "💡 Click any verb or conjugation in the table to hear it read aloud.",
    "z-table": "💡 Click any sentence in the table to hear it read aloud. Click ❌ to delete a row.",
    "q-table": "💡 Click any question or answer in the table to hear it read aloud. The answer is hidden — press <em>show</em> to reveal it.",
  },
  fr: {
    "w-add":   "<strong>Ajouter un verbe</strong><br>Saisissez le verbe, choisissez son type et saisissez éventuellement la signification. Remplissez ensuite les conjugaisons pour chaque pronom. Appuyez sur <em>Ajouter</em> ou sur Entrée pour enregistrer.",
    "w-sort":  "<strong>Trier &amp; gérer</strong><br>Choisissez comment trier la liste : alphabétiquement, les verbes irréguliers en premier, ou aléatoirement. Utilisez <em>Télécharger</em> pour sauvegarder en XLSX, ou <em>Importer</em> pour charger un fichier XLSX ou CSV. <em>Exemple</em> charge une liste d'exemple.",
    "w-search":"<strong>Rechercher</strong><br>Tapez une ou plusieurs lettres pour filtrer. La recherche porte sur le verbe et toutes ses conjugaisons.",
    "z-add":   "<strong>Ajouter une phrase</strong><br>Tapez une traduction ou une indication dans le champ <em>Aide</em>, et la phrase néerlandaise dans le second champ. Appuyez sur <em>Ajouter</em> ou sur Entrée pour enregistrer.",
    "z-sort":  "<strong>Trier &amp; gérer</strong><br>Choisissez l'ordre souhaité : original (ordre de saisie), alphabétique ou aléatoire. Utilisez <em>Télécharger</em> pour exporter, ou <em>Importer</em> pour charger un fichier XLSX ou CSV. <em>Exemple</em> charge une liste d'exemple.",
    "z-search":"<strong>Rechercher</strong><br>Tapez pour filtrer. La recherche porte sur la colonne Aide et sur la phrase néerlandaise.",
    "q-add":   "<strong>Ajouter une question</strong><br>Saisissez la question, éventuellement une indication dans le champ <em>Aide</em>, et la réponse. Appuyez sur <em>Ajouter</em> ou sur Entrée.",
    "q-sort":  "<strong>Trier &amp; gérer</strong><br>Choisissez l'ordre souhaité : original, alphabétique par question, ou aléatoire. Utilisez <em>Télécharger</em> ou <em>Importer</em> pour exporter ou charger des données. <em>Exemple</em> charge une liste d'exemple.",
    "q-search":"<strong>Rechercher</strong><br>Tapez pour filtrer. La recherche porte sur la question, l'indication et la réponse.",
    "w-table": "💡 Cliquez sur un verbe ou une conjugaison dans le tableau pour l'entendre à voix haute.",
    "z-table": "💡 Cliquez sur une phrase dans le tableau pour l'entendre à voix haute. Cliquez sur ❌ pour supprimer une ligne.",
    "q-table": "💡 Cliquez sur une question ou une réponse dans le tableau pour l'entendre à voix haute. La réponse est masquée — appuyez sur <em>masquer</em> pour la révéler.",
  }
};

/* ── Language state ── */



function applyI18n(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.dataset.i18n;
    if(el.tagName === "OPTION") el.textContent = t(key);
    else if(el.classList.contains("tab-label")) el.textContent = " " + t(key);
    else el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.querySelectorAll(".tooltip-box.visible").forEach(box=>{
    box.innerHTML = HELP[currentLang][box.dataset.tooltip] || "";
  });
}

function setLang(lang){
  currentLang = lang;
  localStorage.setItem("trainerLang", lang);
  document.querySelectorAll(".lang-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.lang === lang);
  });
  applyI18n();
  wRender(); zRender(); qRender();
}

document.querySelectorAll(".lang-btn").forEach(btn=>{
  btn.addEventListener("click", ()=> setLang(btn.dataset.lang));
});


/* ── Help button click handler ── */
document.addEventListener("click", e => {
  const btn = e.target.closest(".help-btn");
  if(btn){
    e.stopPropagation();
    const key = btn.dataset.help;
    const box = document.querySelector(`.tooltip-box[data-tooltip="${key}"]`);
    const isOpen = box.classList.contains("visible");
    // Close all open tooltips first
    document.querySelectorAll(".tooltip-box.visible").forEach(b=>b.classList.remove("visible"));
    document.querySelectorAll(".help-btn.active").forEach(b=>b.classList.remove("active"));
    if(!isOpen){
      box.innerHTML = HELP[currentLang][key] || "";
      box.classList.add("visible");
      btn.classList.add("active");
    }
    return;
  }
  // Click outside closes all tooltips
  if(!e.target.closest(".tooltip-box")){
    document.querySelectorAll(".tooltip-box.visible").forEach(b=>b.classList.remove("visible"));
    document.querySelectorAll(".help-btn.active").forEach(b=>b.classList.remove("active"));
  }
});

const backBtn = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backBtn.classList.add("show");
  } else {
    backBtn.classList.remove("show");
  }
});

backBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

/* ── Import label click interceptors — confirm before opening file picker ── */
["w","z","q"].forEach(prefix=>{
  let _importConfirmed = false;
  document.getElementById(prefix+"FileLabel").addEventListener("click", e=>{
    if(_importConfirmed){ _importConfirmed = false; return; }
    e.preventDefault();
    if(!confirm(t("confirm-import"))) return;
    _importConfirmed = true;
    document.getElementById(prefix+"File").click();
  });
});

/* INIT */
setLang(currentLang);