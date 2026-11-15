/* Prague Pocket Guide 4.0 — independent, local-first travel enhancements.
   Requires the existing classic-script app. No account, backend, or tracking. */
(()=>{'use strict';
 const BUILD='4.0.0', BUILD_DATE='15.11.2026';
 const KEY='prague2026-v4-companion';
 const byId=id=>document.getElementById(id);
 const ids=new Set(PLACES.map(p=>p.id));
 const original=new Map(PLACES.map(p=>[p.id,{day:p.day,clock:p.clock,minutes:p.minutes}]));
 const WORDS={
  flightBufferWarning:['⚠ Saturday: this stop may conflict with the 14:15–14:30 taxi to the airport.','⚠ שבת: הביקור עלול להתנגש עם היציאה לשדה התעופה ב־14:15–14:30.'],
  updateTitle:['Pocket Guide v4.0','מדריך פראג v4.0'],checkUpdate:['Check for updates','בדיקת עדכונים'],checking:['Checking…','בודק…'],upToDate:['You have the latest version.','זוהי הגרסה העדכנית.'],updateReady:['New version available!','גרסה חדשה זמינה!'],updateNow:['Update now ↻','עדכנו עכשיו ↻'],updateOffline:['Cannot check now — connect to internet and ensure version.json is uploaded.','לא ניתן לבדוק כעת — נדרש חיבור לרשת והעלאה של version.json.'],localVersion:['Local HTML preview · deploy to enable updates','תצוגה מקומית · יש לפרסם כדי לבדוק עדכונים'],
  smartTitle:['📍 Smart next stops near you','📍 האתרים הבאים שכדאי לראות בקרבתכם'],smartIntro:['Unvisited sights near your GPS position, prioritized for importance and published hours.','אתרים שטרם ביקרתם בהם, לפי המיקום, החשיבות ושעות הפתיחה שפורסמו.'],smartMinutes:['approx. walking','הליכה משוערת'],smartEmpty:['No unvisited recommended sights nearby. Keep exploring!','אין כרגע אתרים מומלצים נוספים בקרבתכם.'],smartAdd:['+ Add to route','+ הוספה למסלול'],smartAlready:['On route','במסלול'],smartHoursCaution:['Hours not verified','שעות לא מאומתות'],smartNotLive:['Distance and walking time are estimates; open Google Maps for directions.','המרחק וזמן ההליכה משוערים; למסלול בפועל פתחו את Google Maps.'],
  planToolsTitle:['✏️ Customize your sightseeing timetable','✏️ התאמת מסלול האתרים'],planToolsInfo:['Change a stop’s day, time or duration. Use arrows for a quick reorder. Your original plan can be restored without losing visited checkmarks.','שנו יום, שעה או משך ביקור. החצים משנים את סדר האתרים. ניתן לשחזר את הזמנים המקוריים בלי לאבד סימוני ביקור.'],resetPlan:['↺ Restore original times','↺ שחזור הזמנים המקוריים'],resetConfirm:['Restore the original days, times and durations? Your selected and visited places will stay unchanged.','לשחזר את הימים, השעות ומשך הביקורים המקוריים? הבחירות וסימוני הביקור יישמרו.'],editStop:['Edit day / time','עריכת יום / שעה'],earlier:['Move earlier','העברה למעלה'],later:['Move later','העברה למטה'],editHeading:['Edit sightseeing stop','עריכת אתר במסלול'],editDay:['Day','יום'],editTime:['Suggested visit time','שעה מוצעת'],editDuration:['Minutes at the stop','דקות באתר'],editShift:['Shift later selected stops by the duration change','הזזת האתרים הבאים לפי שינוי משך הביקור'],save:['Save changes','שמירת שינויים'],cancel:['Cancel','ביטול'],resetStop:['Reset this stop','איפוס האתר'],edited:['Custom time','שעה מותאמת'],editError:['Enter a valid time and duration (5–240 minutes).','יש להזין שעה ומשך ביקור תקינים (5–240 דקות).'],
  hoursTitle:['⏰ Opening-hours watch','⏰ מעקב שעות פתיחה'],hoursIntro:['Based on published seasonal schedules, not live confirmation. Always check the official venue before paying.','לפי שעות עונתיות שפורסמו, לא אימות בזמן אמת. בדקו באתר הרשמי לפני רכישת כרטיס.'],hoursNoIssues:['No scheduled opening-time conflicts found for selected sights with known hours.','לא נמצאו התנגשויות בשעות המתוכננות של האתרים שנבחרו וששעותיהם ידועות.'],hoursBefore:['Scheduled before opening','מתוכנן לפני הפתיחה'],hoursAfter:['Scheduled after last entry','מתוכנן אחרי הכניסה האחרונה'],hoursNear:['Close to last entry','קרוב לכניסה האחרונה'],hoursClosed:['Closed on this day','סגור ביום הזה'],hoursToday:['Right now, by published hours','לפי השעות שפורסמו, כרגע'],hoursClosing:['Last entry soon','הכניסה האחרונה בקרוב'],hoursUnknown:['Opening hours not verified','שעות פתיחה לא מאומתות'],hoursOfficial:['Official hours ↗','שעות רשמיות ↗'],
  shareLink:['🔗 Share a restorable trip link with Dima','🔗 שיתוף קישור מסלול עם דימה'],shareExplain:['Includes chosen stops, visited checkmarks, route mode and time edits. Never includes beer logs or private booking information. This is a one-time snapshot, not live sync.','כולל אתרים שנבחרו, סימוני ביקור, מצב מסלול ועריכות זמנים. לא כולל יומן בירות או פרטי הזמנה פרטיים. זהו צילום מצב, לא סנכרון חי.'],shareSuccess:['Link ready to share.','הקישור מוכן לשיתוף.'],shareLocal:['Upload the app to HTTPS to share a working link.','יש לפרסם את האפליקציה ב־HTTPS כדי לשתף קישור פעיל.'],shareReceived:['📥 Dima shared an itinerary','📥 התקבל מסלול משותף'],shareReview:['This link contains','הקישור כולל'],shareStops:['selected places','אתרים נבחרים'],shareVisits:['visited checkmarks','סימוני ביקור'],shareApply:['Import this snapshot','ייבוא המסלול'],shareReject:['Keep my current plan','שמירת המסלול שלי'],shareError:['This share link is invalid or too large.','קישור השיתוף אינו תקין או גדול מדי.'],shareApplied:['Shared itinerary imported. Your personal beer history was not changed.','המסלול המשותף יובא. יומן הבירות האישי לא השתנה.'],
  offlineTitle:['🧳 Offline essentials','🧳 פרטים חיוניים ללא אינטרנט'],offlineIntro:['Your itinerary, apartment and flight facts are saved in the page. External maps, live weather and rate updates still need internet.','המסלול, כתובת הדירה ופרטי הטיסות נמצאים בדף. מפות חיצוניות, תחזית חיה ושערי מטבע דורשים אינטרנט.'],offlineAddress:['Apartment · Karlova 153/38, Praha 1','דירה · Karlova 153/38, פראג 1'],offlineOutbound:['Outbound · Thu 19 Nov · TLV 05:35 → PRG 08:45','הלוך · ה׳ 19.11 · נתב״ג 05:35 ← פראג 08:45'],offlineReturn:['Return · Sat 21 Nov · PRG 18:00 → TLV 22:45','חזור · ש׳ 21.11 · פראג 18:00 ← נתב״ג 22:45'],offlineTaxi:['Leave apartment for PRG around 14:15–14:30 Sat (verify flight).','יציאה מהדירה לשדה בשבת בסביבות 14:15–14:30 (ודאו את הטיסה).'],offlineEmergency:['Czech emergency number · 112','מוקד חירום בצ׳כיה · 112'],offlineStatus:['Offline-ready app files','קובצי אפליקציה זמינים ללא רשת'],offlineReady:['Saved for offline use','נשמרו לשימוש לא מקוון'],offlineUnavailable:['Not verified yet · install via HTTPS and revisit online','טרם אומת · התקינו דרך HTTPS ופתחו ברשת'],offlineCheck:['Check offline readiness','בדיקת זמינות ללא אינטרנט'],offlineLink:['Open flight details','פתיחת פרטי הטיסות'],
  flightChecksTitle:['✅ My flight-day checklist','✅ רשימת בדיקה לטיסות'],flightChecksIntro:['Saved only on this device. These are personal reminders, not confirmation from an airline.','נשמר רק במכשיר זה. אלו תזכורות אישיות, לא אישור מחברת התעופה.'],flightOut:['Thursday · outbound','יום חמישי · הלוך'],flightBack:['Saturday · return','יום שבת · חזור'],flightCheckA:['Confirm departure time and terminal with airline','אימות זמן וטרמינל מול חברת התעופה'],flightCheckB:['Complete check-in and save boarding pass offline','ביצוע צ׳ק־אין ושמירת כרטיס עלייה ללא אינטרנט'],flightCheckC:['Passport and cabin baggage ready','דרכון ותיק יד מוכנים'],flightCheckD:['Airport transport planned','הסעה לשדה מתוכננת'],flightCheckE:['Apartment checkout and belongings checked','צ׳ק־אאוט ובדיקת חפצים בדירה']
 };
 const tt=k=>(WORDS[k]||[k,k])[lang==='he'?1:0];
 function validOverrides(raw){
  const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for(const [id,value] of Object.entries(raw).slice(0,122)){
   if(!ids.has(id)||!value||typeof value!=='object'||Array.isArray(value))continue;
   const {day,clock,minutes}=value;
   if(!Number.isInteger(day)||day<0||day>2||typeof clock!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$|^Optional$/.test(clock)||!Number.isInteger(minutes)||minutes<5||minutes>240)continue;
   out[id]={day,clock,minutes};
  }
  return out;
 }
 let state={overrides:{},flightChecks:{}};
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object'){
  state.overrides=validOverrides(raw.overrides);
  if(raw.flightChecks&&typeof raw.flightChecks==='object'&&!Array.isArray(raw.flightChecks)){
   for(const [key,value] of Object.entries(raw.flightChecks))if(/^(out|back)-[a-e]$/.test(key)&&value===true)state.flightChecks[key]=true;
  }
 }}catch(e){}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){return false;}}
 function applyOverrides(){
  for(const p of PLACES){const base=original.get(p.id);Object.assign(p,base,state.overrides[p.id]||{});}
 }
 function setOverride(id,changes){
  if(!ids.has(id))return false;
  const base=original.get(id),current=state.overrides[id]||base;
  const value=validOverrides({[id]:{...current,...changes}})[id];if(!value)return false;
  if(value.day===base.day&&value.clock===base.clock&&value.minutes===base.minutes)delete state.overrides[id];
  else state.overrides[id]=value;
  applyOverrides();save();return true;
 }
 function applyImportedOverrides(raw){state.overrides=validOverrides(raw);applyOverrides();save();}
 window.PragueV4={build:BUILD,validateOverrides:validOverrides,setOverride,applyImportedOverrides,
  getOverrides:()=>JSON.parse(JSON.stringify(state.overrides)),
  getFlightChecks:()=>({...state.flightChecks})};
 window.v4ExportExtras=()=>({overrides:window.PragueV4.getOverrides()});
 window.v4ImportExtras=(backup)=>{if(backup&&Object.prototype.hasOwnProperty.call(backup,'overrides'))applyImportedOverrides(backup.overrides);};
 applyOverrides();

 function elt(tag,cls,id){const e=document.createElement(tag);if(cls)e.className=cls;if(id)e.id=id;return e;}
 function showStatus(id,msg){const el=byId(id);if(el)el.textContent=msg;}
 const versionBar=elt('div','v4-version-bar card','v4VersionBar');
 versionBar.innerHTML='<div><strong data-v4-label="updateTitle"></strong><p id="v4VersionStatus" role="status" aria-live="polite"></p></div><button type="button" class="small-btn" id="v4CheckUpdate" data-v4-label="checkUpdate"></button><button type="button" class="small-btn v4-update-now" id="v4UpdateNow" data-v4-label="updateNow" hidden></button>';
 byId('view-today').insertBefore(versionBar,byId('view-today').firstElementChild);
 const smart=elt('section','card v4-smart','v4Smart');smart.hidden=true;
 document.querySelector('#view-today .today-nearby').after(smart);
 const planTools=elt('section','card v4-plan-tools','v4PlanTools');
 planTools.innerHTML='<h3 data-v4-label="planToolsTitle"></h3><p data-v4-label="planToolsInfo"></p><div class="v4-actions"><button type="button" class="small-btn" id="v4ShareLink" data-v4-label="shareLink"></button><button type="button" class="small-btn" id="v4RestoreTimes" data-v4-label="resetPlan"></button></div><p id="v4ShareStatus" class="subtle" role="status" aria-live="polite"></p><p class="subtle" data-v4-label="shareExplain"></p>';
 byId('modePlan').after(planTools);
 const hours=elt('section','card v4-hours','v4Hours');byId('mustSeeToday').after(hours);
 const offline=elt('details','card v4-offline','v4Offline');
 offline.innerHTML='<summary data-v4-label="offlineTitle"></summary><p data-v4-label="offlineIntro"></p><ul><li data-v4-label="offlineAddress"></li><li data-v4-label="offlineOutbound"></li><li data-v4-label="offlineReturn"></li><li data-v4-label="offlineTaxi"></li><li data-v4-label="offlineEmergency"></li></ul><div class="v4-actions"><button type="button" class="small-btn" id="v4OfflineCheck" data-v4-label="offlineCheck"></button><button type="button" class="small-btn" data-open-view="trip" data-v4-label="offlineLink"></button></div><p id="v4OfflineStatus" class="subtle" role="status" aria-live="polite"></p>';
 document.querySelector('.v9-build').before(offline);
 const flightCard=elt('section','card v4-flight-checks','v4FlightChecks');
 flightCard.innerHTML='<h3 data-v4-label="flightChecksTitle"></h3><p data-v4-label="flightChecksIntro"></p><div class="v4-flight-columns"><fieldset><legend data-v4-label="flightOut"></legend><div id="v4FlightOut"></div></fieldset><fieldset><legend data-v4-label="flightBack"></legend><div id="v4FlightBack"></div></fieldset></div>';
 byId('view-trip').appendChild(flightCard);
 const editOverlay=elt('div','v4-overlay','v4EditOverlay');editOverlay.hidden=true;
 editOverlay.innerHTML='<div class="v4-dialog" role="dialog" aria-modal="true" aria-labelledby="v4EditHeading"><div class="topline"><h3 id="v4EditHeading" data-v4-label="editHeading"></h3><button type="button" class="v4-close" data-v4-close aria-label="Close">×</button></div><p id="v4EditPlace"></p><form id="v4EditForm"><label><span data-v4-label="editDay"></span><select id="v4EditDay" required></select></label><label><span data-v4-label="editTime"></span><input id="v4EditTime" type="time" required></label><label><span data-v4-label="editDuration"></span><input id="v4EditMinutes" type="number" min="5" max="240" step="5" required></label><label class="v4-inline-check"><input type="checkbox" id="v4EditShift"><span data-v4-label="editShift"></span></label><p id="v4EditError" class="v4-error" role="alert"></p><div class="v4-actions"><button type="submit" class="primary-btn" data-v4-label="save"></button><button type="button" class="small-btn" data-v4-reset data-v4-label="resetStop"></button><button type="button" class="small-btn" data-v4-close data-v4-label="cancel"></button></div></form></div>';
 document.body.appendChild(editOverlay);
 const shareOverlay=elt('div','v4-overlay','v4ShareOverlay');shareOverlay.hidden=true;
 shareOverlay.innerHTML='<div class="v4-dialog" role="dialog" aria-modal="true" aria-labelledby="v4ShareHeading"><h3 id="v4ShareHeading" data-v4-label="shareReceived"></h3><p id="v4ImportDescription"></p><p id="v4ImportError" class="v4-error" role="alert"></p><div class="v4-actions"><button type="button" class="primary-btn" id="v4ShareApply" data-v4-label="shareApply"></button><button type="button" class="small-btn" id="v4ShareReject" data-v4-label="shareReject"></button></div></div>';
 document.body.appendChild(shareOverlay);

 function translate(){for(const el of document.querySelectorAll('[data-v4-label]'))el.textContent=tt(el.dataset.v4Label);}
 function paintFlightChecks(){
  const fields={out:['flightCheckA','flightCheckB','flightCheckC','flightCheckD'],back:['flightCheckA','flightCheckB','flightCheckC','flightCheckD','flightCheckE']};
  for(const [direction,items] of Object.entries(fields))byId(direction==='out'?'v4FlightOut':'v4FlightBack').innerHTML=items.map((key,i)=>{
   const id=direction+'-'+String.fromCharCode(97+i);
   return `<label class="v4-check-row"><input type="checkbox" data-v4-flight="${id}" ${state.flightChecks[id]?'checked':''}><span>${esc(tt(key))}</span></label>`;
  }).join('');
 }
 function paintSmart(){
  if(!gpsPosition){smart.hidden=true;return;}
  smart.hidden=false;
  const current=pragueTripDay(),dayIndex=current===null?day:current,now=current===null?null:v3NowPrague();
  const candidates=PLACES.filter(p=>isSight(p)&&p.importance<=2&&!visited.has(p.id)&&p.day===dayIndex)
   .map(p=>({p,km:hav(gpsPosition,p),status:now===null?'unknown':v4EntryStatus(p,now)}))
   .filter(x=>!['after','closed'].includes(x.status)&&x.km<=2)
   .sort((a,b)=>(a.km+Math.max(0,a.p.importance-1)*.15)-(b.km+Math.max(0,b.p.importance-1)*.15)).slice(0,4);
  const rows=candidates.map(({p,km})=>{
   const walk=Math.max(2,Math.round(km*1.35/4.5*60));
   const hours=V3_HOURS[p.id]?'':`<small>${tt('smartHoursCaution')}</small>`;
   return `<div class="v4-smart-item"><div><b>${esc(localizedName(p))}</b><div>${importanceBadge(p)}${HIDDEN_GEM_IDS.has(p.id)?' 💎':''}</div><small>📍 ${v3Km(km)} · 🚶 ~${walk} min ${tt('smartMinutes')}</small>${hours}</div><div class="v4-smart-actions"><a class="small-btn" href="${hrefPlace(p)}" target="_blank" rel="noopener noreferrer">🚶 Maps ↗</a>${chosen.has(p.id)?`<span class="v4-muted">${tt('smartAlready')}</span>`:`<button class="small-btn" data-v4-add="${esc(p.id)}">${tt('smartAdd')}</button>`}</div></div>`;
  }).join('');
  smart.innerHTML=`<h3>${tt('smartTitle')}</h3><p class="subtle">${tt('smartIntro')}</p>${rows||`<p class="subtle">${tt('smartEmpty')}</p>`}<p class="v4-muted">${tt('smartNotLive')}</p>`;
 }
 function paintPlan(){
  for(const card of document.querySelectorAll('#planList article.place-card')){
   const p=PLACES.find(x=>x.id===card.dataset.placeId);if(!p||!chosen.has(p.id)||!isSight(p))continue;
   const main=card.querySelector('.place-actions');if(!main)continue;
   const siblings=selected(p.day).filter(isSight),index=siblings.findIndex(x=>x.id===p.id);
   const validMove=p.clock!=='Optional';
   const div=elt('div','v4-edit-actions');
   div.innerHTML=`<button type="button" class="small-btn" data-v4-reorder="up" data-v4-id="${esc(p.id)}" ${!validMove||index<=0?'disabled':''} title="${tt('earlier')}" aria-label="${tt('earlier')}">↑</button><button type="button" class="small-btn" data-v4-reorder="down" data-v4-id="${esc(p.id)}" ${!validMove||index<0||index===siblings.length-1?'disabled':''} title="${tt('later')}" aria-label="${tt('later')}">↓</button><button type="button" class="small-btn" data-v4-edit="${esc(p.id)}">🕒 ${tt('editStop')}</button>${state.overrides[p.id]?`<span class="v4-custom">${tt('edited')}</span>`:''}`;
   main.after(div);
  }
  paintHours();
 }
 function paintHours(){
  const warnings=selected(day).filter(isSight).map(p=>({p,status:v4EntryStatus(p)}))
   .filter(x=>['before','after','near','closed'].includes(x.status))
   .sort((a,b)=>({closed:0,after:1,before:2,near:3}[a.status]-{closed:0,after:1,before:2,near:3}[b.status])).slice(0,5);
  const liveDay=pragueTripDay();
  const current=liveDay===day?v3NowPrague():null;
  const soon=current===null?[]:selected(day).filter(isSight).map(p=>({p,h:v4HoursFor(p),status:v4EntryStatus(p,current)})).filter(x=>x.h&&!x.h.timed&&x.status==='near').slice(0,3);
  const tooLate=day===2&&selected(day).some(p=>v3Minutes(p.clock)!==null&&v3Minutes(p.clock)+p.minutes>14*60+15);
  hours.innerHTML=`<h3>${tt('hoursTitle')}</h3><p class="subtle">${tt('hoursIntro')}</p>${tooLate?`<p class="v4-hour-warning">${tt('flightBufferWarning')}</p>`:''}${warnings.length?warnings.map(({p,status})=>`<div class="v4-hours-row"><b>${esc(localizedName(p))}</b><span class="v4-hour-warning">⚠ ${tt('hours'+status[0].toUpperCase()+status.slice(1))}</span><small>${esc(p.clock)} · ${esc(v4HoursFor(p)?.open||'')}–${esc(v4HoursFor(p)?.close||'')}</small>${V3_HOURS[p.id]?.url?`<a href="${esc(V3_HOURS[p.id].url)}" target="_blank" rel="noopener noreferrer">${tt('hoursOfficial')}</a>`:''}</div>`).join(''):`<p class="v4-success">✓ ${tt('hoursNoIssues')}</p>`}${soon.length?`<div class="v4-hour-warning">${tt('hoursToday')}: ${soon.map(x=>esc(localizedName(x.p))).join(', ')} · ${tt('hoursClosing')}</div>`:''}`;
 }
 function editOpen(id){
  const p=PLACES.find(x=>x.id===id);if(!p)return;
  editOverlay.dataset.place=id;byId('v4EditPlace').textContent=localizedName(p);showStatus('v4EditError','');
  byId('v4EditDay').innerHTML=META.map((m,i)=>`<option value="${i}">${esc(dayLabel(i))}</option>`).join('');
  byId('v4EditDay').value=String(p.day);
  byId('v4EditTime').value=p.clock==='Optional'?'12:00':p.clock;
  byId('v4EditMinutes').value=String(p.minutes);
  byId('v4EditShift').checked=false;editOverlay.hidden=false;byId('v4EditTime').focus();
 }
 function editClose(){editOverlay.hidden=true;delete editOverlay.dataset.place;}
 function editSave(e){
  e.preventDefault();const id=editOverlay.dataset.place,p=PLACES.find(x=>x.id===id);if(!p)return;
  const nextDay=Number(byId('v4EditDay').value),nextClock=byId('v4EditTime').value,nextMinutes=Number(byId('v4EditMinutes').value);
  const oldDay=p.day,oldMin=p.minutes,oldClock=p.clock,shift=byId('v4EditShift').checked;
  if(!Number.isInteger(nextDay)||nextDay<0||nextDay>2||!/^([01]\d|2[0-3]):[0-5]\d$/.test(nextClock)||!Number.isInteger(nextMinutes)||nextMinutes<5||nextMinutes>240){showStatus('v4EditError',tt('editError'));return;}
  const later=shift&&nextDay===oldDay?selected(oldDay).filter(q=>q.id!==id&&v3Minutes(q.clock)!==null&&v3Minutes(q.clock)>v3Minutes(oldClock)):[];
  if(!setOverride(id,{day:nextDay,clock:nextClock,minutes:nextMinutes})){showStatus('v4EditError',tt('editError'));return;}
  const delta=nextMinutes-oldMin;
  if(delta!==0){for(const q of later){const val=v3Minutes(q.clock)+delta;if(val<0||val>=1440)continue;setOverride(q.id,{clock:String(Math.floor(val/60)).padStart(2,'0')+':'+String(val%60).padStart(2,'0')});}}
  day=nextDay;persist();editClose();render();
 }
 function reorder(id,direction){
  const p=PLACES.find(x=>x.id===id);if(!p)return;
  const group=selected(p.day).filter(x=>isSight(x)&&x.clock!=='Optional');const ix=group.findIndex(x=>x.id===id),other=group[ix+(direction==='up'?-1:1)];
  if(ix<0||!other)return;
  const a=p.clock,b=other.clock;if(a===b)return;
  setOverride(id,{clock:b});setOverride(other.id,{clock:a});render();
 }
 function restoreTimes(){if(!confirm(tt('resetConfirm')))return;state.overrides={};applyOverrides();save();render();}
 function formatBase64(json){return btoa(json).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function decodeBase64(raw){const base=raw.replace(/-/g,'+').replace(/_/g,'/');return atob(base+'='.repeat((4-base.length%4)%4));}
 function validSnapshot(data){
  if(!data||data.v!==1||!Array.isArray(data.chosen)||!Array.isArray(data.visited)||data.chosen.length>122||data.visited.length>122||!data.chosen.every(id=>typeof id==='string'&&ids.has(id))||!data.visited.every(id=>typeof id==='string'&&ids.has(id)))return null;
  return {chosen:[...new Set(data.chosen)],visited:[...new Set(data.visited)],routeMode:['essentials','recommended','all'].includes(data.routeMode)?data.routeMode:'all',day:Number.isInteger(data.day)&&data.day>=0&&data.day<=2?data.day:0,overrides:validOverrides(data.overrides)};
 }
 function snapshot(){return {v:1,chosen:[...chosen].sort(),visited:[...visited].sort(),routeMode,day,overrides:window.PragueV4.getOverrides()};}
 window.PragueV4.encodeSnapshot=payload=>formatBase64(JSON.stringify(payload));
 window.PragueV4.decodeSnapshot=raw=>{try{if(typeof raw!=='string'||raw.length>25000)return null;return validSnapshot(JSON.parse(decodeBase64(raw)));}catch(e){return null;}};
 async function shareLink(){
  if(!/^https?:$/.test(location.protocol)){showStatus('v4ShareStatus',tt('shareLocal'));return;}
  const url=new URL(location.href);url.hash='route='+window.PragueV4.encodeSnapshot(snapshot());url.searchParams.delete('sel');
  const content=url.toString();try{if(navigator.share){await navigator.share({title:'Prague 2026 itinerary',url:content});showStatus('v4ShareStatus',tt('shareSuccess'));return;}}catch(e){if(e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(content);showStatus('v4ShareStatus',tt('shareSuccess'));}
  catch(e){window.prompt(tt('shareLink'),content);}
 }
 let incoming=null;
 function clearShareHash(){try{if(location.hash.startsWith('#route='))history.replaceState(null,'',location.pathname+location.search);}catch(e){}}
 function checkIncoming(){
  if(!location.hash.startsWith('#route='))return;
  incoming=window.PragueV4.decodeSnapshot(location.hash.slice(7));
  if(!incoming){showStatus('v4ImportError',tt('shareError'));byId('v4ShareApply').hidden=true;}
  else{byId('v4ShareApply').hidden=false;byId('v4ImportDescription').textContent=`${tt('shareReview')}: ${incoming.chosen.length} ${tt('shareStops')} · ${incoming.visited.length} ${tt('shareVisits')}.`;showStatus('v4ImportError','');}
  shareOverlay.hidden=false;
 }
 function applyIncoming(){if(!incoming)return;chosen=new Set(incoming.chosen);visited=new Set(incoming.visited);routeMode=incoming.routeMode;day=incoming.day;applyImportedOverrides(incoming.overrides);persist();shareOverlay.hidden=true;clearShareHash();incoming=null;render();setTab('plan');showStatus('v4ShareStatus',tt('shareApplied'));}
 async function offlineCheck(){
  let ready=false;
  try{if(location.protocol==='https:'&&'caches' in window&&'serviceWorker' in navigator){
   const result=await Promise.all(['index.html','v4.js','v4.css','manifest.webmanifest'].map(name=>caches.match(new URL('./'+name,location.href))));
   ready=result.every(Boolean)&&!!navigator.serviceWorker.controller;
  }}catch(e){}
  showStatus('v4OfflineStatus',tt(ready?'offlineReady':'offlineUnavailable'));
 }
 const compareVersions=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)-(y[i]||0);}return 0;};
 let latestVersion=BUILD,lastChecked=0;
 async function checkUpdates(force=false){
  if(location.protocol!=='https:'){showStatus('v4VersionStatus',tt('localVersion'));return;}
  if(!force&&Date.now()-lastChecked<600000)return;
  lastChecked=Date.now();showStatus('v4VersionStatus',tt('checking'));
  try{
   const resp=await fetch('./version.json?vcheck='+Date.now(),{cache:'no-store'});
   if(!resp.ok)throw Error('No release metadata');const data=await resp.json();
   if(typeof data.version!=='string'||!/^\d+\.\d+\.\d+$/.test(data.version))throw Error('Invalid version');
   latestVersion=data.version;
   if(compareVersions(latestVersion,BUILD)>0){showStatus('v4VersionStatus',tt('updateReady')+' v'+latestVersion);byId('v4UpdateNow').hidden=false;}
   else{showStatus('v4VersionStatus',tt('upToDate'));byId('v4UpdateNow').hidden=true;}
  }catch(e){showStatus('v4VersionStatus',navigator.onLine===false?tt('updateOffline'):tt('updateOffline'));}
 }
 async function installUpdate(){
  if(compareVersions(latestVersion,BUILD)<=0){checkUpdates(true);return;}
  byId('v4UpdateNow').disabled=true;
  try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.update();}catch(e){}
  const url=new URL(location.href);url.searchParams.set('v',latestVersion);url.hash='';location.assign(url.toString());
 }
 const rawPlanRender=renderPlan;renderPlan=function(){rawPlanRender();paintPlan();};
 const rawTodayRender=renderToday;renderToday=function(){rawTodayRender();paintSmart();};
 const rawAllRender=render;render=function(){rawAllRender();paintFlightChecks();translate();};
 byId('v4CheckUpdate').addEventListener('click',()=>checkUpdates(true));
 byId('v4UpdateNow').addEventListener('click',installUpdate);
 byId('v4OfflineCheck').addEventListener('click',offlineCheck);
 byId('v4ShareLink').addEventListener('click',shareLink);
 byId('v4RestoreTimes').addEventListener('click',restoreTimes);
 byId('v4EditForm').addEventListener('submit',editSave);
 byId('v4ShareApply').addEventListener('click',applyIncoming);
 byId('v4ShareReject').addEventListener('click',()=>{shareOverlay.hidden=true;incoming=null;clearShareHash();});
 document.addEventListener('change',e=>{
  const item=e.target.closest('[data-v4-flight]');if(!item)return;
  const key=item.dataset.v4Flight;if(!/^(out|back)-[a-e]$/.test(key))return;
  if(item.checked)state.flightChecks[key]=true;else delete state.flightChecks[key];save();
 });
 document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-v4-edit]'),order=e.target.closest('[data-v4-reorder]'),add=e.target.closest('[data-v4-add]');
  if(edit){editOpen(edit.dataset.v4Edit);return;}
  if(order){reorder(order.dataset.v4Id,order.dataset.v4Reorder);return;}
  if(add){if(ids.has(add.dataset.v4Add)){chosen.add(add.dataset.v4Add);persist();render();}return;}
  if(e.target.closest('[data-v4-close]')||e.target===editOverlay){editClose();return;}
  if(e.target.closest('[data-v4-reset]')){const id=editOverlay.dataset.place;if(id){delete state.overrides[id];applyOverrides();save();editClose();render();}}
 });
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!editOverlay.hidden)editClose();});
 window.addEventListener('online',()=>{checkUpdates(true);offlineCheck();});
 window.addEventListener('hashchange',checkIncoming);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdates();});
 setInterval(()=>{if(tab==='plan')paintHours();},60000);
 render();offlineCheck();checkUpdates();checkIncoming();
 document.documentElement.classList.add('v4-ready');
})();
