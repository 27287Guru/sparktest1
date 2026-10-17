(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORE = {tasks:'spark_tasks_v1', days:'spark_days_v1', profile:'spark_profile_v1', mood:'spark_mood_v1', pet:'spark_pet_v1'};
  const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { showToast('Your browser could not save this change.'); } };
  const isoToday = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  const dateFromISO = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,12); };
  const formatDate = value => { if (!value) return 'No due date'; const date = dateFromISO(value); const today = isoToday(); const tomorrow = new Date(dateFromISO(today)); tomorrow.setDate(tomorrow.getDate()+1); const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`; if (value === today) return 'Today'; if (value === tomorrowISO) return 'Tomorrow'; return date.toLocaleDateString(undefined,{month:'short',day:'numeric'}); };
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  let tasks = read(STORE.tasks, []), completedDays = read(STORE.days, []), profile = read(STORE.profile, {name:'', intention:'Make a little progress.'}), mood = read(STORE.mood, false);
  let pet = read(STORE.pet, {type:'cat', name:'Mochi', xp:0, coins:0, owned:[], equipped:null, cuddles:0, claimedMilestones:[]});
  const PETS = {cat:{emoji:'🐱',mood:'A tiny purr of encouragement.'},fox:{emoji:'🦊',mood:'Clever, curious, and on your side.'},frog:{emoji:'🐸',mood:'A little leap at a time.'},bunny:{emoji:'🐰',mood:'Soft ears, big dreams.'}};
  const ACCESSORIES = [{id:'bow',name:'Butter bow',emoji:'🎀',cost:20,desc:'A sunny little bow.'},{id:'glasses',name:'Bookworm specs',emoji:'🤓',cost:35,desc:'For serious study sessions.'},{id:'flower',name:'Daisy crown',emoji:'🌼',cost:45,desc:'A garden-party look.'},{id:'scarf',name:'Cozy scarf',emoji:'🧣',cost:55,desc:'Warm and wonderfully cozy.'},{id:'crown',name:'Tiny crown',emoji:'👑',cost:90,desc:'Royalty of the homework desk.'},{id:'halo',name:'Lucky halo',emoji:'😇',cost:120,desc:'A rare little glow.'}];
  let currentView = 'today', currentFilter = 'all', editingId = null, sortMode = 0, toastTimer = null, reminderTimer = null;
  if (!Array.isArray(tasks)) tasks = [];
  if (!Array.isArray(completedDays)) completedDays = [];
  if (!profile || typeof profile !== 'object') profile = {name:'', intention:'Make a little progress.'};
  if (!pet || typeof pet !== 'object') pet = {type:'cat',name:'Mochi',xp:0,coins:0,owned:[],equipped:null,cuddles:0,claimedMilestones:[]};
  if (!PETS[pet.type]) pet.type='cat'; if (!Array.isArray(pet.owned)) pet.owned=[]; if (!Array.isArray(pet.claimedMilestones)) pet.claimedMilestones=[]; if (!Number.isFinite(pet.xp)) pet.xp=0; if (!Number.isFinite(pet.coins)) pet.coins=0;
  if (mood) document.body.classList.add('alt-mood');

  function showToast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600); }
  function openModal(id) { const el = $(id); el.classList.add('open'); el.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; const first = el.querySelector('input,textarea,select'); if (first) setTimeout(() => first.focus(),60); }
  function closeModal(id) { const el = $(id); el.classList.remove('open'); el.setAttribute('aria-hidden','true'); if (!$('taskModal').classList.contains('open') && !$('profileModal').classList.contains('open') && !$('petNameModal').classList.contains('open')) document.body.style.overflow=''; }
  function persistTasks() { save(STORE.tasks,tasks); }
  function persistDays() { save(STORE.days,completedDays); }
  function savePet() { save(STORE.pet, pet); }
  function awardDay(day) { if (completedDays.includes(day)) return; completedDays.push(day); persistDays(); pet.coins += 10; pet.xp += 10; const streak=calculateStreak(); const bonus={3:20,7:50,14:100,30:250}; if (bonus[streak] && !pet.claimedMilestones.includes(streak)) { pet.coins+=bonus[streak]; pet.claimedMilestones.push(streak); showToast(`${streak}-day streak! +${10+bonus[streak]} coins and +10 pet XP ✦`); } else showToast('Daily win! +10 coins and +10 pet XP ✦'); savePet(); }
  function markTodayIfEarned() {
    const today = isoToday();
    const dueToday = tasks.filter(t => t.due === today);
    if (dueToday.length && dueToday.every(t => t.done)) awardDay(today);
  }
  function calculateStreak() {
    const wins = new Set(completedDays);
    let cursor = dateFromISO(isoToday()), streak = 0;
    if (!wins.has(isoToday())) cursor.setDate(cursor.getDate()-1);
    for (let i=0;i<370;i++) { const key = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`; if (!wins.has(key)) break; streak++; cursor.setDate(cursor.getDate()-1); }
    return streak;
  }
  function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function getViewTasks() {
    const today = isoToday(); let list = [...tasks];
    if (currentView === 'today') list = list.filter(t => t.due === today);
    else if (currentView === 'upcoming') list = list.filter(t => t.due > today && !t.done);
    else if (currentView === 'done') list = list.filter(t => t.done);
    if (currentFilter === 'open') list = list.filter(t => !t.done);
    if (currentFilter === 'done') list = list.filter(t => t.done);
    list.sort((a,b) => {
      if (sortMode === 1) return ({high:0,normal:1,low:2}[a.priority] - {high:0,normal:1,low:2}[b.priority]) || a.due.localeCompare(b.due);
      if (sortMode === 2) return b.createdAt - a.createdAt;
      return Number(a.done)-Number(b.done) || a.due.localeCompare(b.due) || ({high:0,normal:1,low:2}[a.priority]-{high:0,normal:1,low:2}[b.priority]);
    });
    return list;
  }
  function taskCard(task) {
    const overdue = !task.done && task.due < isoToday();
    const priority = task.priority === 'high' ? '<span class="priority-tag">IMPORTANT</span>' : task.priority === 'low' ? '<span class="priority-tag low">LOW PRESSURE</span>' : '';
    const reminder = task.time ? `<span class="reminder-tag">◷ ${escapeHTML(task.time)}</span>` : '';
    const due = `<span class="due-tag ${overdue?'overdue':''}">${overdue?'Overdue · ':''}${escapeHTML(formatDate(task.due))}</span>`;
    return `<article class="task-card ${task.done?'is-done':''}" data-id="${escapeHTML(task.id)}"><button class="task-check" data-action="toggle" aria-label="${task.done?'Mark incomplete':'Mark complete'}">✓</button><div class="task-main"><div class="task-title">${escapeHTML(task.title)}</div><div class="task-meta"><span class="subject-tag">${escapeHTML(task.subject)}</span>${due}${priority}${reminder}</div>${task.notes?`<p class="task-notes">${escapeHTML(task.notes)}</p>`:''}</div><div class="task-actions"><button class="task-action" data-action="edit" title="Edit task" aria-label="Edit task">✎</button><button class="task-action delete" data-action="delete" title="Delete task" aria-label="Delete task">×</button></div></article>`;
  }
  function renderTasks() {
    const list = getViewTasks(); $('taskList').innerHTML = list.map(taskCard).join('');
    $('emptyState').classList.toggle('visible', list.length === 0); $('taskList').style.display = list.length ? 'grid' : 'none';
    const title = {today:"Today's little list",all:'Everything in one place',upcoming:'A little further ahead',done:'Look what you did'}[currentView];
    $('taskSectionTitle').innerHTML = `${title}<span class="title-period">.</span>`;
    $('taskFooterText').textContent = list.length ? `${list.length} ${list.length===1?'thing':'things'} on this page. Take them one at a time.` : 'A list is just a starting point.';
    $('clearDoneBtn').style.visibility = tasks.some(t=>t.done) ? 'visible' : 'hidden';
    document.querySelectorAll('[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === currentView));
    document.querySelectorAll('[data-filter]').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
    $('viewCrumb').textContent = ({today:'TODAY',all:'ALL WORK',upcoming:'COMING UP',done:'FINISHED'})[currentView];
  }
  function renderWeek() {
    const wins = new Set(completedDays), today = dateFromISO(isoToday()); let html = '', count = 0;
    const day = today.getDay(), mondayOffset = (day + 6) % 7; const monday = new Date(today); monday.setDate(today.getDate()-mondayOffset);
    for (let i=0;i<7;i++) { const d = new Date(monday); d.setDate(monday.getDate()+i); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const win = wins.has(key); if (win) count++; html += `<div class="week-day ${win?'has-win':''} ${key===isoToday()?'today':''}"><span>${d.toLocaleDateString(undefined,{weekday:'narrow'})}</span><span class="day-dot">${win?'✓':d.getDate()}</span></div>`; }
    $('weekDays').innerHTML = html; $('weekProgress').textContent = `${count} / 7`; const percent = Math.round(count/7*100); $('weekPercent').textContent = `${percent}%`; $('weekRing').style.setProperty('--progress',`${percent}%`);
  }
  function renderStats() {
    markTodayIfEarned(); const open = tasks.filter(t=>!t.done).length, done = tasks.filter(t=>t.done).length, streak = calculateStreak();
    $('openCount').textContent = open; $('completedCount').textContent = done; $('streakCount').textContent = streak; $('todayNavCount').textContent = tasks.filter(t=>t.due===isoToday()&&!t.done).length;
    $('streakHint').textContent = streak ? 'Look at you, showing up.' : 'Every day is a new chance';
    $('headline').innerHTML = profile.name ? `You've got this,<br><span>${escapeHTML(profile.name)}.</span>` : 'Make room<br>for <span>what matters.</span>';
    $('welcomeSub').textContent = open ? `One step at a time. ${open} ${open===1?'task is':'tasks are'} still on your plate.` : 'You don’t have to do it all. Just begin with one thing.';
    $('profileNameLabel').textContent = profile.name || 'Your little corner'; $('avatarInitials').textContent = profile.name ? profile.name.trim().slice(0,1).toUpperCase() : 'S';
    $('intentionDisplay').textContent = profile.intention || 'Make a little progress.';
    $('focusQuote').textContent = ['You can do hard things in small pieces.','Progress counts, even when it is quiet.','Start where you are. Use what you have.','Done is a kindness you can give future-you.'][new Date().getDate()%4];
    const next = tasks.filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due))[0]; $('focusTaskText').textContent = next ? `Try: ${next.title}` : 'Pick one task to begin.';
    renderWeek();
  }
  function render() { renderStats(); renderTasks(); renderPet(); }
  function resetTaskForm() { $('taskForm').reset(); $('taskDue').value = isoToday(); $('taskPriority').value = 'normal'; }
  function showTaskModal(task=null) {
    editingId = task ? task.id : null; resetTaskForm();
    $('modalTitle').innerHTML = task ? 'Edit this task<span class="title-period">.</span>' : 'Add a task<span class="title-period">.</span>';
    $('saveTaskBtn').innerHTML = task ? 'Save changes <span>↗</span>' : 'Save task <span>↗</span>';
    if (task) { $('taskTitle').value=task.title; $('taskSubject').value=task.subject; $('taskPriority').value=task.priority; $('taskDue').value=task.due; $('taskTime').value=task.time||''; $('taskNotes').value=task.notes||''; }
    openModal('taskModal');
  }
  function showProfileModal() { $('userName').value=profile.name||''; $('userIntention').value=profile.intention||''; openModal('profileModal'); }
  function addOrEditTask(event) {
    event.preventDefault(); const title = $('taskTitle').value.trim(); if (!title) { $('taskTitle').focus(); return; }
    const data = {title,subject:$('taskSubject').value,priority:$('taskPriority').value,due:$('taskDue').value||isoToday(),time:$('taskTime').value,notes:$('taskNotes').value.trim()};
    if (editingId) { const old = tasks.find(t=>t.id===editingId); if (old) Object.assign(old,data); showToast('Task updated. Nice and easy.'); }
    else { tasks.push({...data,id:uid(),done:false,createdAt:Date.now()}); showToast('Task added. One step closer.'); }
    persistTasks(); closeModal('taskModal'); currentView='all'===currentView && false ? 'all' : currentView; render();
  }
  function handleTaskAction(event) {
    const button = event.target.closest('[data-action]'); if (!button) return; const card = button.closest('.task-card'); if (!card) return; const task = tasks.find(t=>t.id===card.dataset.id); if (!task) return;
    if (button.dataset.action==='toggle') { task.done=!task.done; if (task.done) { if (!task.rewarded) { task.rewarded=true; pet.coins+=5; pet.xp+=20; savePet(); showToast('A little win! +5 coins and +20 pet XP ✦'); } else showToast('A little win. Give yourself credit.'); awardDay(isoToday()); } else showToast('Moved back to your list.'); persistTasks(); render(); }
    if (button.dataset.action==='edit') showTaskModal(task);
    if (button.dataset.action==='delete') { if (confirm(`Delete “${task.title}”?`)) { tasks=tasks.filter(t=>t.id!==task.id); persistTasks(); render(); showToast('Task removed.'); } }
  }
  function setView(view) { currentView=view; currentFilter='all'; renderTasks(); document.querySelector('.tasks-panel').scrollIntoView({behavior:'smooth',block:'start'}); }
  function checkReminders() {
    if (!('Notification' in window) || Notification.permission!=='granted') return;
    const now = new Date(), today=isoToday(), time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    tasks.forEach(task => { const key=`${task.id}:${today}:${task.time}`; if (!task.done && task.due===today && task.time===time && !read('spark_reminded_v1',{})[key]) { try { new Notification('A little Spark reminder',{body:task.title,tag:key}); } catch {} const sent=read('spark_reminded_v1',{}); sent[key]=true; save('spark_reminded_v1',sent); } });
  }
  async function enableReminders() { if (!('Notification' in window)) { showToast('This browser does not support notifications.'); return; } try { const permission=await Notification.requestPermission(); if (permission==='granted') { showToast('Reminders enabled while Spark is open.'); checkReminders(); } else showToast('Notifications are still off in your browser settings.'); } catch { showToast('Could not enable notifications in this browser.'); } }

  function petLevel() { return Math.floor(pet.xp / 100) + 1; }
  function renderPet() {
    const data=PETS[pet.type]||PETS.cat, level=petLevel(), inLevel=pet.xp%100;
    $('petCoins').textContent=pet.coins; $('petLevel').textContent=level; $('petNextLevel').textContent=level+1; $('petXpText').textContent=`${inLevel} / 100 XP`; $('petXpBar').style.width=`${inLevel}%`;
    $('petLevelTitle').textContent=level>=10?'LEGENDARY PAL':level>=5?'STAR COMPANION':level>=3?'GROWING BUDDY':'LITTLE SPROUT';
    $('petAvatar').textContent=data.emoji; $('petNameDisplay').textContent=pet.name||'Mochi'; $('petMood').textContent=pet.cuddles>0?`${data.mood} Cuddles shared: ${pet.cuddles}.`:data.mood;
    const equipped=ACCESSORIES.find(a=>a.id===pet.equipped); $('petAccessoryOverlay').textContent=equipped?equipped.emoji:''; $('petAvatar').classList.toggle('has-accessory',!!equipped);
    document.querySelectorAll('[data-pet]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.pet===pet.type));
    $('accessoryShop').innerHTML=ACCESSORIES.map(item=>{const owned=pet.owned.includes(item.id),equippedNow=pet.equipped===item.id;return `<article class="accessory-item ${owned?'owned':''} ${equippedNow?'equipped':''}"><div class="accessory-art">${item.emoji}</div><div class="accessory-info"><strong>${item.name}</strong><small>${item.desc}</small><span class="accessory-cost">✦ ${item.cost} coins</span></div><button class="shop-action" data-shop="${item.id}" ${(!owned&&pet.coins<item.cost)?'disabled':''}>${equippedNow?'Wearing':owned?'Equip':`Buy · ${item.cost}`}</button></article>`}).join('');
  }
  function shopAction(event) { const btn=event.target.closest('[data-shop]'); if(!btn)return; const item=ACCESSORIES.find(a=>a.id===btn.dataset.shop); if(!item)return; if(pet.owned.includes(item.id)){pet.equipped=pet.equipped===item.id?null:item.id;savePet();renderPet();showToast(pet.equipped===item.id?`${item.name} equipped!`:'Accessory put away.');return;} if(pet.coins<item.cost){showToast(`You need ${item.cost-pet.coins} more coins for that treasure.`);return;} pet.coins-=item.cost;pet.owned.push(item.id);pet.equipped=item.id;savePet();renderPet();showToast(`${item.name} unlocked and equipped!`); }
  $('petsNavBtn').addEventListener('click',()=>{$('petWorld').scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));$('petsNavBtn').classList.add('active');});
  $('petChoices').addEventListener('click',event=>{const btn=event.target.closest('[data-pet]');if(!btn)return;pet.type=btn.dataset.pet;savePet();renderPet();showToast(`${pet.name} is now your ${btn.querySelector('span').textContent.toLowerCase()} buddy!`);});
  $('accessoryShop').addEventListener('click',shopAction);
  $('renamePetBtn').addEventListener('click',()=>{ $('petNameInput').value=pet.name||'';openModal('petNameModal'); });
  $('petNameForm').addEventListener('submit',event=>{event.preventDefault();pet.name=$('petNameInput').value.trim()||'Mochi';savePet();closeModal('petNameModal');renderPet();showToast(`Hello, ${pet.name}!`);});
  $('petPlayBtn').addEventListener('click',()=>{pet.cuddles=(pet.cuddles||0)+1;savePet();renderPet();const messages=['Your pet gives you a tiny boost of courage.','A tiny cuddle break. Breathe, then begin again.','Your study buddy believes in you.'];showToast(messages[pet.cuddles%messages.length]);$('petAvatar').classList.remove('pet-bounce');void $('petAvatar').offsetWidth;$('petAvatar').classList.add('pet-bounce');});

  // Drag-and-drop dashboard customization. Each card can be reordered inside its layout zone.
  const LAYOUT_KEY = 'spark_v2_dashboard_layout';
  const layoutZones = [
    { id: 'overview', parent: document.querySelector('.overview-strip'), selector: '.overview-item' },
    { id: 'main-columns', parent: document.querySelector('.content-grid'), selector: ':scope > .tasks-panel, :scope > .right-column' },
    { id: 'rhythm-cards', parent: document.querySelector('.right-column'), selector: ':scope > .week-card, :scope > .focus-card, :scope > .intention-card' },
    { id: 'pet-columns', parent: document.querySelector('.pet-layout'), selector: ':scope > .pet-stage-card, :scope > .pet-side-panel' },
    { id: 'pet-tools', parent: document.querySelector('.pet-side-panel'), selector: ':scope > .pet-choose-card, :scope > .pet-shop-card' }
  ].filter(zone => zone.parent);
  let layoutEditing = false;
  let draggedWidget = null;
  let savedLayout = read(LAYOUT_KEY, {});
  const originalLayout = {};

  function getZoneWidgets(zone) { return [...zone.parent.querySelectorAll(zone.selector)]; }
  function saveLayout() {
    const layout = {};
    layoutZones.forEach(zone => { layout[zone.id] = getZoneWidgets(zone).map(el => el.dataset.layoutWidget); });
    savedLayout = layout;
    save(LAYOUT_KEY, layout);
  }
  function applyLayout(layout) {
    layoutZones.forEach(zone => {
      const widgets = getZoneWidgets(zone);
      const order = layout && layout[zone.id];
      if (!Array.isArray(order)) return;
      const byId = new Map(widgets.map(el => [el.dataset.layoutWidget, el]));
      order.forEach(id => { const el = byId.get(id); if (el) zone.parent.appendChild(el); });
    });
  }
  function setLayoutEditing(on) {
    layoutEditing = on;
    document.body.classList.toggle('layout-editing', on);
    $('layoutBtn').classList.toggle('is-active', on);
    $('layoutBtn').setAttribute('aria-pressed', String(on));
    $('layoutBtn').innerHTML = on ? '✓ Done arranging' : '↔ Arrange';
    $('resetLayoutBtn').hidden = !on;
    layoutZones.forEach(zone => getZoneWidgets(zone).forEach(el => { el.draggable = on; }));
    let hint = document.getElementById('layoutHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'layout-hint'; hint.id = 'layoutHint';
      hint.textContent = 'Layout mode is on: drag a card by its dotted outline to move it within its section. Your arrangement saves automatically.';
      document.querySelector('.topbar').insertAdjacentElement('afterend', hint);
    }
    hint.style.display = on ? 'block' : 'none';
    if (!on) document.querySelectorAll('.is-dragging,.drop-target').forEach(el => el.classList.remove('is-dragging','drop-target'));
  }
  function setupLayoutCustomization() {
    const ids = new Map();
    layoutZones.forEach(zone => {
      originalLayout[zone.id] = [];
      getZoneWidgets(zone).forEach((el, index) => {
        const stableId = `${zone.id}-${index}`;
        el.dataset.layoutWidget = stableId;
        el.dataset.layoutZone = zone.id;
        originalLayout[zone.id].push(stableId);
        const handle = document.createElement('button');
        handle.type = 'button'; handle.className = 'layout-drag-handle';
        handle.textContent = '⠿'; handle.title = 'Drag to rearrange';
        handle.setAttribute('aria-label', 'Drag this box to rearrange it');
        handle.addEventListener('click', () => {
          if (layoutEditing) showToast('Drag this box to another position in its section.');
        });
        el.appendChild(handle);
        el.addEventListener('dragstart', event => {
          if (!layoutEditing) { event.preventDefault(); return; }
          draggedWidget = el; event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', stableId);
          requestAnimationFrame(() => el.classList.add('is-dragging'));
        });
        el.addEventListener('dragend', () => {
          el.classList.remove('is-dragging');
          document.querySelectorAll('.drop-target').forEach(item => item.classList.remove('drop-target'));
          if (draggedWidget) saveLayout();
          draggedWidget = null;
        });
        el.addEventListener('dragover', event => {
          if (!layoutEditing || !draggedWidget || draggedWidget === el || draggedWidget.dataset.layoutZone !== el.dataset.layoutZone) return;
          event.preventDefault(); event.dataTransfer.dropEffect = 'move'; el.classList.add('drop-target');
        });
        el.addEventListener('dragleave', event => { if (!el.contains(event.relatedTarget)) el.classList.remove('drop-target'); });
        el.addEventListener('drop', event => {
          if (!layoutEditing || !draggedWidget || draggedWidget === el || draggedWidget.dataset.layoutZone !== el.dataset.layoutZone) return;
          event.preventDefault(); el.classList.remove('drop-target');
          const parent = el.parentElement;
          const style = getComputedStyle(parent);
          const columns = style.display.includes('grid') ? style.gridTemplateColumns.split(' ').length : 1;
          const rect = el.getBoundingClientRect();
          const after = columns > 1 ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2;
          if (after) parent.insertBefore(draggedWidget, el.nextElementSibling); else parent.insertBefore(draggedWidget, el);
          saveLayout();
        });
      });
    });
    applyLayout(savedLayout);
    $('layoutBtn').addEventListener('click', () => {
      setLayoutEditing(!layoutEditing);
      if (!layoutEditing) { saveLayout(); showToast('Layout saved. Your space, your way.'); }
      else showToast('Drag the boxes to arrange your space.');
    });
    $('resetLayoutBtn').addEventListener('click', () => {
      applyLayout(originalLayout); saveLayout(); showToast('Dashboard layout reset.');
    });
  }
  setupLayoutCustomization();

  $('datePill').textContent = new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}).toUpperCase();
  $('addTaskBtn').addEventListener('click',()=>showTaskModal()); $('quickAddBtn').addEventListener('click',()=>showTaskModal()); $('emptyAddBtn').addEventListener('click',()=>showTaskModal());
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
  document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{currentFilter=btn.dataset.filter;renderTasks();}));
  $('sortBtn').addEventListener('click',()=>{sortMode=(sortMode+1)%3; $('sortBtn').innerHTML=['Sort: Due date <span>⌄</span>','Sort: Importance <span>⌄</span>','Sort: Recently added <span>⌄</span>'][sortMode]; renderTasks();});
  $('taskList').addEventListener('click',handleTaskAction); $('taskForm').addEventListener('submit',addOrEditTask);
  $('profileBtn').addEventListener('click',showProfileModal); $('intentionBtn').addEventListener('click',showProfileModal); $('editIntentionBtn').addEventListener('click',showProfileModal);
  $('profileForm').addEventListener('submit',event=>{event.preventDefault();profile={name:$('userName').value.trim(),intention:$('userIntention').value.trim()||'Make a little progress.'};save(STORE.profile,profile);closeModal('profileModal');render();showToast('Your space, your way.');});
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.dataset.close)));
  document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal(backdrop.id);}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal('taskModal');closeModal('profileModal');closeModal('petNameModal');} if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showTaskModal();}});
  $('themeBtn').addEventListener('click',()=>{mood=!mood;document.body.classList.toggle('alt-mood',mood);save(STORE.mood,mood);showToast(mood?'Periwinkle mood, on.':'Back to lavender.');});
  $('focusBtn').addEventListener('click',()=>{const next=tasks.filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due))[0];if(!next){showToast('Nothing waiting right now. Enjoy the breathing room.');return;}currentView='all';currentFilter='open';renderTasks();const card=document.querySelector(`.task-card[data-id="${CSS.escape(next.id)}"]`);if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.style.borderColor='#a391d0';setTimeout(()=>card.style.borderColor='',1600);}showToast(`Your next little step: ${next.title}`);});
  $('clearDoneBtn').addEventListener('click',()=>{const count=tasks.filter(t=>t.done).length;if(!count)return;if(confirm(`Remove ${count} finished ${count===1?'task':'tasks'} from your list?`)){tasks=tasks.filter(t=>!t.done);persistTasks();render();showToast('Finished tasks cleared. Your wins stay counted.');}});
  // Enable reminders through the reminder time field: the browser asks permission when a time is entered.
  $('taskTime').addEventListener('change',()=>{if($('taskTime').value) enableReminders();});
  render();
  reminderTimer=setInterval(checkReminders,15000); checkReminders();
})();
