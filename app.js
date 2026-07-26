
(()=>{
const D=window.GENEALOGY_DATA;
const persons=D.persons, byId=Object.fromEntries(persons.map(p=>[p.id,p]));
const parents=Object.fromEntries(persons.map(p=>[p.id,[]]));
const children=Object.fromEntries(persons.map(p=>[p.id,[]]));
D.relations.forEach(r=>{if(r.type==="Parent-enfant"){(parents[r.person2]??=[]).push(r.person1);(children[r.person1]??=[]).push(r.person2)}});
const unions=D.unions.concat(D.relations.filter(r=>r.type==="Union"&&!D.unions.some(u=>[u.person1,u.person2].sort().join("|")===[r.person1,r.person2].sort().join("|"))));
const unionFor=id=>unions.filter(u=>u.person1===id||u.person2===id);
const partner=(u,id)=>u.person1===id?u.person2:u.person1;
const pairKey=(a,b)=>[a,b].sort().join("|");
const unionMap=new Map(unions.map(u=>[pairKey(u.person1,u.person2),u]));
let currentPerson=D.defaultPerson,currentMedia=[],currentMediaIndex=0;

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const female=p=>p?.sex==="F";
const bornWord=p=>female(p)?"Née":"Né";
const diedWord=p=>female(p)?"Décédée":"Décédé";
const locationLine=p=>[
 p.birth_place&&`${bornWord(p)} à ${p.birth_place}`,
 p.death_place&&`${diedWord(p)} à ${p.death_place}`
].filter(Boolean).join(" · ");
const unionLabel=u=>{
 if(!u)return"Union";
 const parts=[];if(u.date)parts.push(formatDate(u.date));if(u.place)parts.push(u.place);
 return parts.length?`Mariage · ${parts.join(" · ")}`:"Union";
};
function formatDate(v){
 if(!v)return"";const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);if(!m)return v;
 const mo=["","janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
 return `${+m[3]} ${mo[+m[2]]} ${m[1]}`;
}
function ageBadge(p){return p.age_death!=null?`<span class="age-badge">${diedWord(p)} à ${p.age_death} ans</span>`:"";}
function card(p,opts={}){
 if(!p)return"";
 const cls=["person-card",opts.role||"",opts.compact?"compact":"",opts.selected?"selected":""].filter(Boolean).join(" ");
 return `<article class="${cls}" data-person="${p.id}" tabindex="0">
   <div class="card-heading"><h3>${esc(p.name)}</h3>${opts.selected?`<span class="selected-label">Profil central</span>`:""}</div>
   <div class="life-line">${esc(p.life_display||"")}</div>
   ${locationLine(p)?`<div class="place-line">${esc(locationLine(p))}</div>`:""}
   ${ageBadge(p)}
 </article>`;
}
function bindCards(scope=document){
 scope.querySelectorAll("[data-person]").forEach(x=>{
   const act=()=>{currentPerson=x.dataset.person;showView("family");renderFamily(currentPerson);openProfile(currentPerson)};
   x.onclick=act;x.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act()}};
 });
}
function showView(name){
 $$(".view").forEach(v=>v.classList.remove("active"));$(`#${name}View`).classList.add("active");
 $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-view]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();showView(b.dataset.view);if(b.dataset.view==="family")renderFamily(currentPerson)}));

function renderLineage(){
 const root=$("#lineageTrack");
 root.innerHTML=D.directLine.map(g=>{
   const a=byId[g.a],b=byId[g.b],u=unionMap.get(pairKey(g.a,g.b));
   return `<div class="generation">
     ${card(a,{role:"direct"})}
     <div class="union-center"><div class="union-rings" aria-hidden="true">∞</div><div class="union-label">${esc(unionLabel(u))}</div></div>
     ${card(b,{role:"spouse"})}
   </div>`;
 }).join("");
 bindCards(root);
}
function commonSiblings(id){
 const ps=parents[id]||[],set=new Set([id]);
 ps.forEach(pid=>(children[pid]||[]).forEach(c=>set.add(c)));
 return [...set].map(x=>byId[x]).filter(Boolean).sort((a,b)=>(a.birth_date||a.birth_text||"").localeCompare(b.birth_date||b.birth_text||""));
}
function unionBlockContent(a,b,u,selectedId){
 return `<div class="couple-pair">
   ${card(a,{compact:true,selected:a?.id===selectedId})}
   <div class="union-node"><span class="union-symbol" aria-hidden="true">∞</span><span>${esc(unionLabel(u))}</span></div>
   ${b?card(b,{compact:true,role:"spouse",selected:b.id===selectedId}):""}
 </div>`;
}
function descendantList(list,selectedId,label){
 if(!list.length)return"";
 return `<div class="descendant-section">
   <div class="family-label">${esc(label)}</div>
   <div class="descendant-list">${list.map(p=>`<div class="descendant-item">${card(p,{compact:true,selected:p.id===selectedId})}</div>`).join("")}</div>
 </div>`;
}
function renderParentBlock(id){
 const ps=(parents[id]||[]).map(x=>byId[x]).filter(Boolean);if(!ps.length)return"";
 const u=ps.length>1?unionMap.get(pairKey(ps[0].id,ps[1].id)):null;
 return `<section class="family-stage parents-stage">
   <div class="family-label">Parents</div>
   ${unionBlockContent(ps[0],ps[1],u,null)}
   <div class="vertical-connector"><span></span></div>
   ${descendantList(commonSiblings(id),id,"Leurs enfants")}
 </section>`;
}
function renderUnionBlock(id,u){
 const p=byId[id],sp=byId[partner(u,id)];
 const kids=(children[id]||[]).filter(c=>(children[sp.id]||[]).includes(c)).map(x=>byId[x]);
 return `<section class="family-stage union-family">
   <div class="family-label">Couple</div>
   ${unionBlockContent(p,sp,u,id)}
   ${kids.length?`<div class="vertical-connector"><span></span></div>${descendantList(kids,null,"Enfants du couple")}`:""}
 </section>`;
}
function renderFamily(id){
 currentPerson=id;const p=byId[id];$("#familyTitle").textContent=p.name;
 const us=unionFor(id);let html=renderParentBlock(id);
 if(us.length)html+=us.map(u=>renderUnionBlock(id,u)).join("");
 else html+=`<section class="family-stage union-family"><div class="family-label">Profil</div><div class="single-profile">${card(p,{selected:true})}</div>${(children[id]||[]).length?`<div class="vertical-connector"><span></span></div>${descendantList((children[id]||[]).map(x=>byId[x]),null,"Enfants")}`:""}</section>`;
 $("#familyCanvas").innerHTML=html;bindCards($("#familyCanvas"));$("#goParents").disabled=!(parents[id]||[]).length;
}
$("#goParents").onclick=()=>{const p=(parents[currentPerson]||[])[0];if(p){currentPerson=p;renderFamily(p);openProfile(p)}};
$("#goHome").onclick=()=>showView("lineage");
$$("[data-focus]").forEach(b=>b.onclick=()=>{currentPerson=b.dataset.focus;showView("family");renderFamily(currentPerson)});


function renderArchives(filter=""){
 const q=filter.trim().toLocaleLowerCase("fr");
 const items=(D.archiveItems||[]).filter(m=>!q||[m.title,m.caption,m.date,m.type,m.person_name].join(" ").toLocaleLowerCase("fr").includes(q));
 $("#archiveGrid").innerHTML=items.map((m,i)=>`<article class="archive-card" data-archive="${i}">
   <button class="archive-image" data-archive-image="${i}"><img src="${m.thumb}" alt="${esc(m.title)}" loading="lazy"></button>
   <div class="archive-copy"><span class="archive-type">${esc(m.type||"Document")}</span><h3>${esc(m.title)}</h3>
   <p>${esc(m.date||"")}</p>${m.person_id?`<button class="person-pill" data-open-person="${m.person_id}">${esc(m.person_name)}</button>`:`<span class="unlinked-badge">Non rattaché</span>`}</div>
 </article>`).join("");
 $$("#archiveGrid [data-archive-image]").forEach(b=>b.onclick=()=>openLightbox(items,+b.dataset.archiveImage));
 $$("#archiveGrid [data-open-person]").forEach(b=>b.onclick=()=>openProfile(b.dataset.openPerson));
}
$("#archiveSearch")?.addEventListener("input",e=>renderArchives(e.target.value));

function renderIndex(filter=""){
 const q=filter.trim().toLocaleLowerCase("fr");
 const list=persons.filter(p=>!q||[p.name,p.branch,p.link,p.birth_place,p.death_place,(p.occupations||[]).join(" "),p.life_display].join(" ").toLocaleLowerCase("fr").includes(q))
 .sort((a,b)=>a.surname.localeCompare(b.surname,"fr")||a.given_names.localeCompare(b.given_names,"fr"));
 $("#indexGrid").innerHTML=list.map(p=>card(p,{compact:true,role:p.branch?.includes("directe")?"direct":""})).join("");bindCards($("#indexGrid"));
}
$("#indexSearch").addEventListener("input",e=>renderIndex(e.target.value));

function fact(label,value){return value?`<dt>${esc(label)}</dt><dd>${esc(Array.isArray(value)?value.join(" ; "):value)}</dd>`:""}
function pills(ids){return ids.length?`<div class="link-pills">${ids.map(id=>`<button class="person-pill" data-open-person="${id}">${esc(byId[id]?.name||id)}</button>`).join("")}</div>`:"";}
function openProfile(id){
 const p=byId[id];if(!p)return;const us=unionFor(id),ps=parents[id]||[],cs=children[id]||[],media=p.media||[];
 const profileFacts=[
  fact("Naissance",[p.birth_display,p.birth_time,p.birth_place].filter(Boolean).join(" · ")),
  fact("Baptême",p.baptism),fact("Décès",[p.death_display,p.death_place].filter(Boolean).join(" · ")),
  p.age_death!=null?fact("Âge au décès",`${p.age_death} ans`):"",fact("Inhumation",p.burial),
  fact("Cause du décès",p.death_cause),fact("Profession(s)",p.occupations),fact("Résidence(s)",p.residences),
  fact("Nationalité",p.nationality),fact("Études",p.education),fact("Surnom",p.nickname)
 ].join("");
 const unionsHtml=us.map(u=>{const oid=partner(u,id);return`<div class="source-item"><button class="person-pill" data-open-person="${oid}">${esc(byId[oid]?.name)}</button><small>${esc(unionLabel(u))}</small></div>`}).join("");
 const gallery=media.length?`<div class="gallery">${media.map((m,i)=>`<button class="media-card" data-media="${i}"><img src="${m.thumb}" alt="${esc(m.title)}" loading="lazy"><span class="media-meta"><strong>${esc(m.title)}</strong><small>${esc([m.date,m.type].filter(Boolean).join(" · "))}</small></span></button>`).join("")}</div>`:`<p class="empty-state">Aucun document illustré associé à cette fiche.</p>`;
 const src=(p.source_details||[]).map(s=>`<div class="source-item"><strong>${esc(s.id)} — ${esc(s.title)}</strong><small>${esc([s.type,s.date].filter(Boolean).join(" · "))}</small>${s.notes?`<div>${esc(s.notes)}</div>`:""}</div>`).join("");
 $("#drawerContent").innerHTML=`<header class="drawer-hero"><span class="eyebrow">${esc(p.branch||"Profil familial")}</span><h2>${esc(p.name)}</h2><div class="drawer-lifespan">${esc(p.life_display||p.link||"")}</div></header>
 <div class="drawer-tabs"><button class="drawer-tab active" data-tab="profile">Profil</button><button class="drawer-tab" data-tab="family">Famille</button><button class="drawer-tab" data-tab="documents">Documents${media.length?` (${media.length})`:""}</button></div>
 <div class="drawer-body">
  <section class="tab-panel active" data-panel="profile">${profileFacts?`<div class="detail-section"><h3>Informations</h3><dl class="fact-grid">${profileFacts}</dl></div>`:""}${p.bio?`<div class="detail-section"><h3>Parcours</h3><div class="bio-text">${esc(p.bio)}</div></div>`:""}${(p.events||[]).length?`<div class="detail-section"><h3>Événements</h3><div class="bio-text">${p.events.map(e=>`<p>• ${esc(e)}</p>`).join("")}</div></div>`:""}</section>
  <section class="tab-panel" data-panel="family">${ps.length?`<div class="detail-section"><h3>Parents</h3>${pills(ps)}</div>`:""}${unionsHtml?`<div class="detail-section"><h3>Union(s)</h3>${unionsHtml}</div>`:""}${cs.length?`<div class="detail-section"><h3>Enfants</h3>${pills(cs)}</div>`:""}<button class="primary-action" id="centerFamily">Voir les liens familiaux</button></section>
  <section class="tab-panel" data-panel="documents"><div class="detail-section"><h3>Documents transmis</h3>${gallery}</div>${src?`<div class="detail-section"><h3>Sources</h3>${src}</div>`:""}</section>
 </div>`;
 $$(".drawer-tab").forEach(t=>t.onclick=()=>{$$(".drawer-tab").forEach(x=>x.classList.toggle("active",x===t));$$(".tab-panel").forEach(x=>x.classList.toggle("active",x.dataset.panel===t.dataset.tab))});
 $$("[data-open-person]").forEach(b=>b.onclick=()=>openProfile(b.dataset.openPerson));
 $("#centerFamily").onclick=()=>{currentPerson=id;showView("family");renderFamily(id);closeDrawer()};
 $$("#drawerContent [data-media]").forEach(b=>b.onclick=()=>openLightbox(media,+b.dataset.media));
 $("#profileDrawer").classList.add("open");$("#drawerBackdrop").classList.add("open");$("#profileDrawer").setAttribute("aria-hidden","false");
}
function closeDrawer(){$("#profileDrawer").classList.remove("open");$("#drawerBackdrop").classList.remove("open");$("#profileDrawer").setAttribute("aria-hidden","true")}
$("#closeDrawer").onclick=closeDrawer;$("#drawerBackdrop").onclick=closeDrawer;

function searchPersons(q){q=q.trim().toLocaleLowerCase("fr");return persons.filter(p=>[p.name,p.branch,p.link,p.birth_place,p.death_place,(p.occupations||[]).join(" "),p.life_display].join(" ").toLocaleLowerCase("fr").includes(q)).slice(0,30)}
function renderGlobal(q=""){const list=q?searchPersons(q):persons.filter(p=>p.branch?.includes("directe")).slice(0,16);$("#globalResults").innerHTML=list.map(p=>`<div class="search-result" data-result="${p.id}"><div><strong>${esc(p.name)}</strong><small>${esc(p.life_display||p.link||"")}</small></div><span>→</span></div>`).join("");$$("[data-result]").forEach(x=>x.onclick=()=>{closeSearch();currentPerson=x.dataset.result;showView("family");renderFamily(currentPerson);openProfile(currentPerson)})}
function openSearch(){$("#searchPalette").classList.add("open");$("#searchPalette").setAttribute("aria-hidden","false");$("#globalSearch").value="";renderGlobal();setTimeout(()=>$("#globalSearch").focus(),50)}
function closeSearch(){$("#searchPalette").classList.remove("open");$("#searchPalette").setAttribute("aria-hidden","true")}
$("#openSearch").onclick=openSearch;$("#closeSearch").onclick=closeSearch;$("#searchPalette").onclick=e=>{if(e.target===$("#searchPalette"))closeSearch()};$("#globalSearch").oninput=e=>renderGlobal(e.target.value);
document.addEventListener("keydown",e=>{if(e.key==="/"){e.preventDefault();openSearch()}if(e.key==="Escape"){closeSearch();closeDrawer();closeLightbox()}});

function openLightbox(media,index){currentMedia=media;currentMediaIndex=index;updateLightbox();$("#lightbox").classList.add("open");$("#lightbox").setAttribute("aria-hidden","false")}
function updateLightbox(){const m=currentMedia[currentMediaIndex];if(!m)return;$("#lightboxImage").src=m.src;$("#lightboxImage").alt=m.title;$("#lightboxCaption").innerHTML=`<strong>${esc(m.title)}</strong>${m.caption?`<br>${esc(m.caption)}`:""}`}
function closeLightbox(){$("#lightbox").classList.remove("open");$("#lightbox").setAttribute("aria-hidden","true")}
$("#closeLightbox").onclick=closeLightbox;$("#lightbox").onclick=e=>{if(e.target===$("#lightbox"))closeLightbox()};$("#prevImage").onclick=()=>{currentMediaIndex=(currentMediaIndex-1+currentMedia.length)%currentMedia.length;updateLightbox()};$("#nextImage").onclick=()=>{currentMediaIndex=(currentMediaIndex+1)%currentMedia.length;updateLightbox()};

renderLineage();renderFamily(currentPerson);renderIndex();renderArchives();
})();
