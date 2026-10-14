'use strict';
const INSTALL_STEPS = STEPS.filter(s => s.id !== 'finish');
const STEP_COUNT = INSTALL_STEPS.length;
const STORAGE_KEY = 'omics-onboarding:v1';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let storageOK = true;
function resolveStep(id) { return STEP_ALIASES[id] || id; }
function knownPage(id) { return STEPS.some(s=>s.id===id) || SUPPORT_PAGES.some(s=>s.id===id); }
function freshState() {
  return {flowVersion:GUIDE_VERSION,preparationVersion:PREPARATION_VERSION,route:'trae',current:'prepare',done:[],checks:{},os:'win11',arch:'x64',mirror:'tuna',biocMirror:'tuna',ubuntuRelease:'24.04'};
}
function restoreState(saved) {
  const result = freshState();
  if (!saved || typeof saved !== 'object') return result;
  const sameFlow = saved.flowVersion === GUIDE_VERSION;
  // New Agent/workspace checks must not inherit completion from a different tool or task.
  const retainedIds = sameFlow ? INSTALL_STEPS.map(s=>s.id) : ['prepare','wsl','mirrors','environment'];
  const previousCurrent = resolveStep(saved.current);
  result.current = STEPS.some(s=>s.id===previousCurrent) ? previousCurrent : 'prepare';
  result.done = Array.isArray(saved.done) ? [...new Set(saved.done.filter(id=>retainedIds.includes(id)))] : [];
  for (const id of retainedIds) {
    if (Array.isArray(saved.checks?.[id])) result.checks[id] = saved.checks[id].slice(0,2).map(v=>v===true);
  }
  result.os = ['win11','win10','older'].includes(saved.os) ? saved.os : 'win11';
  result.arch = ['x64','arm','unknown'].includes(saved.arch) ? saved.arch : 'x64';
  const aptChoices = saved.preparationVersion === PREPARATION_VERSION ? ['tuna','ustc','westlake'] : ['tuna','ustc'];
  result.mirror = aptChoices.includes(saved.mirror) ? saved.mirror : 'tuna';
  result.biocMirror = ['tuna','ustc','westlake'].includes(saved.biocMirror) ? saved.biocMirror : (['tuna','ustc','westlake'].includes(saved.mirror) ? saved.mirror : 'tuna');
  result.ubuntuRelease = ['22.04','24.04'].includes(saved.ubuntuRelease) ? saved.ubuntuRelease : '24.04';
  if (!sameFlow) result.legacyGuideProgress = saved;
  else if (saved.legacyGuideProgress) result.legacyGuideProgress = saved.legacyGuideProgress;
  if (saved.previousPreparationProgress) result.previousPreparationProgress = saved.previousPreparationProgress;
  if (saved.preparationVersion !== PREPARATION_VERSION) {
    const ids = ['ubuntu','mirrors'];
    const previous = {done:[],checks:{}};
    for (const id of ids) {
      if (Array.isArray(saved.done) && saved.done.includes(id)) previous.done.push(id);
      if (Array.isArray(saved.checks?.[id])) previous.checks[id] = saved.checks[id].slice(0,2).map(value=>value===true);
      result.done = result.done.filter(doneId=>doneId!==id);
      delete result.checks[id];
    }
    if (previous.done.length || Object.values(previous.checks).some(values=>values.some(Boolean))) result.previousPreparationProgress = previous;
  }
  return result;
}
let state = freshState();
try { state = restoreState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
catch { storageOK = false; }
let current = state.current;
let codes = [];
let toastTimer;
let mirrorHelpOpen = false;
let biocHelpOpen = false;
const $ = selector => document.querySelector(selector);
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOK = true; }
  catch { storageOK = false; toast('浏览器未允许保存进度；离开前可在完成页下载记录。'); }
}
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3300); }
function routeName() { return 'TRAE Agent + 内置国内模型'; }
function displayStep(step) { return step; }
function canPrepare() { return state.os !== 'older' && state.arch === 'x64'; }
function checksFor(step) { return step.id === 'prepare' ? ['我已确认电脑满足上面的 Windows 与 x64 条件', '我可以安装软件，并已保存需要保留的工作'] : (displayStep(step).checks || []); }
function isReady(step) { return checksFor(step).every((_, i) => state.checks[step.id]?.[i]) && (step.id !== 'prepare' || canPrepare()); }
function codeBlock(text, shell, format) {
  const index = codes.push(text) - 1;
  const prompt = format === 'prompt';
  const copyLabel = prompt ? '复制指令' : '复制';
  return `<div class="codebox${prompt?' promptbox':''}"><div class="codehead"><span>›_ &nbsp;${escapeHTML(shell || 'Ubuntu · Bash')}</span><button class="copy-button" data-copy="${index}" data-copy-label="${copyLabel}" aria-label="${prompt?'复制给 Agent 的任务说明':'复制'+escapeHTML(shell || 'Ubuntu')+'命令'}">▣ &nbsp;${copyLabel}</button></div><pre><code>${escapeHTML(text)}</code></pre></div>`;
}
function sectionsHTML(sections) {
  return sections.map((item,index) => {
    const content = '<p>'+escapeHTML(item.text)+'</p><div class="content-indent">'+
      (item.code ? codeBlock(item.code,item.shell,item.format) : '')+
      (item.items ? '<ul class="action-list">'+item.items.map(entry=>'<li><strong>'+escapeHTML(entry.title)+'</strong><span>'+escapeHTML(entry.text)+'</span></li>').join('')+'</ul>' : '')+
      (item.expected ? '<div class="expected"><strong>对照参考 · 请以实际结果为准</strong><pre>'+escapeHTML(item.expected)+'</pre></div>' : '')+
      (item.note ? '<p class="inline-note">ⓘ &nbsp;'+escapeHTML(item.note)+'</p>' : '')+
      (item.link ? '<a class="out-link" href="'+escapeHTML(item.link[1])+'" target="_blank" rel="noreferrer">'+escapeHTML(item.link[0])+'</a>' : '')+
      (item.links ? '<div class="resource-links">'+item.links.map(([label,url])=>'<a class="out-link" href="'+escapeHTML(url)+'" target="_blank" rel="noreferrer">'+escapeHTML(label)+'</a>').join('')+'</div>' : '')+'</div>';
    if(item.optional) return '<details class="help-inline optional-step"><summary>'+escapeHTML(item.title)+'</summary>'+content+'</details>';
    return '<section class="instruction"><div class="instruction-head"><span class="count">'+String(index+1).padStart(2,'0')+'</span><h2>'+escapeHTML(item.title)+'</h2></div>'+content+'</section>';
  }).join('');
}
function faqHTML(items) { return items.map(([q,a]) => `<details class="faq-row"><summary>${escapeHTML(q)}</summary><p>${escapeHTML(a)}</p></details>`).join(''); }
function journeyHTML() {
  return '<div class="notice green"><span class="symbol">✦</span><p><strong>一条路线，在 TRAE 里完成</strong><br>打开 Agent → 选择国内模型 → 准备 WSL → 加载 Skills → 部署并验收环境</p></div>';
}
function mirrorPicker() {
  return `<div class="route-picker mirror-picker" role="group" aria-label="Ubuntu 与 PyPI 备用镜像">${Object.entries(MIRRORS).filter(([,m])=>m.apt).map(([key,m])=>`<button class="route-card ${state.mirror===key?'active':''}" data-mirror="${key}" aria-pressed="${state.mirror===key}"><strong>${escapeHTML(m.name)}</strong><small>${m.pip?'Ubuntu · PyPI':'Ubuntu 软件包'}</small></button>`).join('')}</div><div class="settings-row"><label>按 Agent 检查到的实际 Ubuntu 版本选择<select id="ubuntu-release"><option value="24.04" ${state.ubuntuRelease==='24.04'?'selected':''}>Ubuntu 24.04 · ubuntu.sources</option><option value="22.04" ${state.ubuntuRelease==='22.04'?'selected':''}>Ubuntu 22.04 · sources.list</option></select></label></div><p class="quiet">其他版本或自定义源文件布局，请按官方帮助操作。切换这里只改变参考说明，不会修改电脑或完成记录。</p>`;
}
function mirrorRecovery() {
  const file = state.ubuntuRelease==='22.04'?'/etc/apt/sources.list':'/etc/apt/sources.list.d/ubuntu.sources';
  return `<details class="help-inline"><summary>需要撤销 APT 换源？展开恢复命令</summary><p class="inline-note">仅适用于使用下方 .omics-backup 备份方式的配置。Agent 若另存了备份，请使用准备记录中的实际路径。恢复前先核对备份内容；备份文件会保留。</p>${codeBlock(`if [ -f "${file}.omics-backup" ]; then\n  sudo cp -a -- "${file}.omics-backup" "${file}"\n  sudo apt update\nelse\n  printf '%s\\n' '没有备份，不做修改。'\nfi`,'Ubuntu · Bash · 恢复 APT')}</details>`;
}
function mirrorReferenceHTML() {
  return `<details id="mirror-reference" class="help-inline reference-panel" ${mirrorHelpOpen?'open':''}><summary>下载有问题？查看清华 / 西湖 / 中科大备用配置</summary><div class="reference-body">${mirrorPicker()}${sectionsHTML(mirrorSections(state.mirror,state.ubuntuRelease))}${mirrorRecovery()}</div></details>`;
}
function biocReferenceHTML() {
  const picker = `<div class="route-picker mirror-picker" role="group" aria-label="部署后的 Bioconductor 镜像">${Object.entries(MIRRORS).map(([key,m])=>`<button class="route-card ${state.biocMirror===key?'active':''}" data-bioc-mirror="${key}" aria-pressed="${state.biocMirror===key}"><strong>${escapeHTML(m.name)}</strong><small>Bioconductor${key==='westlake'?' · 需实测':''}</small></button>`).join('')}</div>`;
  return `<details id="bioc-reference" class="help-inline reference-panel" ${biocHelpOpen?'open':''}><summary>部署后需要额外 R 包？查看 Bioconductor 镜像（可选）</summary><div class="reference-body"><p class="inline-note">基础环境部署成功后，按具体 Skill 的需要使用。清华、中科大、西湖均保留在这里；无需额外下载时直接跳过。</p>${picker}${sectionsHTML([bioconductorSection(state.biocMirror)])}<details class="help-inline"><summary>恢复当前 R 会话之前的设置</summary>${codeBlock('if (exists(".omics_previous_bioc", inherits = FALSE)) {\n  options(.omics_previous_bioc)\n  rm(.omics_previous_bioc)\n}','R 控制台 · 恢复 Bioconductor')}</details></div></details>`;
}
function preparationNotice(step) {
  const previous = state.previousPreparationProgress;
  const hadRecord = previous?.done?.includes(step.id) || previous?.checks?.[step.id]?.some(Boolean);
  return ['ubuntu','mirrors'].includes(step.id) && hadRecord && !state.done.includes(step.id) ? '<div class="notice"><span class="symbol">ⓘ</span><p>这一步新增了验收内容，请按新检查项重新确认。原确认记录已保留，其他步骤进度不受影响；已有环境让 Agent 检查复用即可。</p></div>' : '';
}
function prepareHTML() {
  return `<div class="hero-board"><div class="board-copy"><span class="board-label">LESS SETUP. MORE SCIENCE.</span><h2>你的第一套<br>组学分析工作台。</h2><p>先打开 TRAE Agent，<br>让助手带你加载 Skills、准备 Python 和 R。</p><div class="board-chips"><span>TRAE Agent</span><span>内置国内模型</span><span>Omics Skills</span></div></div><div class="workbench" aria-label="Ubuntu 工作台插画"><div class="mini-window"><div class="mini-title"><i></i><i></i><i></i><span>omics-workspace</span></div><div class="mini-body"><div class="mini-tree">EXPLORER<br>⌄ workspace<br>　◇ skills<br>　◇ reports</div><div class="mini-terminal"><b>hello, science.</b>$ python --version<br>$ Rscript --version<br><span style="color:#93a382">准备你的分析工具 ▏</span></div></div></div><div class="floating-check"><span>✓</span> 从准备，到开始</div></div></div>
    ${journeyHTML()}<div class="section-heading"><h2>开始前，准备好这三件事</h2><span>先花一分钟确认，后面会更顺利。</span></div>
    <div class="prep-grid"><article class="prep-card"><div class="card-icon">⊞</div><h3>一台适合的电脑</h3><p>Windows 11，或 Windows 10<br>2004 / 内部版本 19041 及以上。</p><button class="small-link" data-action="system-help">如何查看系统版本？ ↗</button></article><article class="prep-card"><div class="card-icon">⌁</div><h3>网络和可用空间</h3><p>需要下载系统与分析依赖。<br>先检查磁盘余量，保持网络连接。</p></article><article class="prep-card"><div class="card-icon">◇</div><h3>安装权限与耐心</h3><p>安装 WSL 需要管理员权限，<br>中途可能需要重启电脑。</p></article></div>
    <div class="settings-row"><label>我的 Windows 版本<select id="os-select"><option value="win11" ${state.os==='win11'?'selected':''}>Windows 11</option><option value="win10" ${state.os==='win10'?'selected':''}>Windows 10 · 2004 / 19041 及以上</option><option value="older" ${state.os==='older'?'selected':''}>更旧版本 / 暂时不确定</option></select></label><label>我的系统类型<select id="arch-select"><option value="x64" ${state.arch==='x64'?'selected':''}>基于 x64 的处理器（Intel / AMD）</option><option value="arm" ${state.arch==='arm'?'selected':''}>基于 ARM 的处理器</option><option value="unknown" ${state.arch==='unknown'?'selected':''}>我还不确定</option></select></label></div>
    ${!canPrepare()?'<div class="blocked">这条安装路线需要兼容的 Windows 版本与 x64 处理器。请先确认系统信息；ARM 暂不适用。你仍可以浏览后续教程，但不要执行环境安装。</div>':''}
    <div class="notice"><span class="symbol">ⓘ</span><p>这里是你的安装向导。网页提供步骤和可复制的任务说明；把任务交给 TRAE Agent，在自己的电脑上执行并核对结果。</p></div>`;
}
function checklistHTML(step) {
  const checks = checksFor(step);
  return `<div class="${step.id==='prepare'?'completion':'verification-box'}">${step.id==='prepare'?'':'<h2>看到了这些结果，再继续</h2><p>下列勾选是你的确认，不代表网页自动检测通过。</p>'}${checks.map((label,i) => `<label class="check-label"><input type="checkbox" data-check="${i}" ${state.checks[step.id]?.[i]?'checked':''}><span>${escapeHTML(label)}</span></label>`).join('')}</div>`;
}
function finishHTML() {
  const all = state.done.length === STEP_COUNT;
  return `<div class="finish-banner"><span class="eyebrow">${all?'YOUR CHECKLIST IS COMPLETE':'YOUR PROGRESS, AT A GLANCE'}</span><h2>${all?'全部步骤确认完成。下一站，开始分析。':`你已经确认完成 ${state.done.length} / ${STEP_COUNT} 步。`}</h2><p>当前路线：${routeName()}。下载这份进度记录，下次可以快速定位工作进展。</p></div><div class="summary-list">${INSTALL_STEPS.map(displayStep).map(s => `<div class="summary-item ${state.done.includes(s.id)?'done':''}"><strong>${escapeHTML(s.name)}</strong>${state.done.includes(s.id)?'<span>✓ 你已确认完成</span>':`<button data-go="${s.id}">返回完成 ↗</button>`}</div>`).join('')}</div><div class="notice green"><span class="symbol">✦</span><p>请把部署脚本生成的 report.json 和实际解释器路径一起保存。基础环境就绪后，按具体分析方法运行 runtime-preflight；专用方法和 GPU 环境需要另外准备。</p></div><div class="section-heading"><h2>接下来，让助手先做运行前检查</h2></div>${codeBlock('请先阅读 skills/_meta/omics-analysis-runtime-preflight/SKILL.md。我会提供本次部署报告和想做的分析任务。请核对实际解释器、数据要求和方法依赖，先列出检查结果，暂不运行真实数据分析。',routeName()+' · 对话框')}<div class="bottom-actions"><button class="button-secondary" data-go="environment">← 返回部署步骤</button><button class="button-primary" data-action="download">下载我的进度记录 ↓</button></div><p class="quiet">下载内容只包含路线和手动确认记录，不包含密钥，也不是环境验证报告。</p>`;
}
function renderSidebar() {
  $('#progress-text').textContent = `${state.done.length} / ${STEP_COUNT}`;
  $('#progress-fill').style.width = `${state.done.length/STEP_COUNT*100}%`;
  $('.progress-track').setAttribute('aria-valuemax', STEP_COUNT);
  $('.progress-track').setAttribute('aria-valuenow',state.done.length);
  $('#step-nav').innerHTML = STEPS.map(displayStep).map((step,i) => `<a href="#${step.id}" class="step-link ${current===step.id?'active':''} ${state.done.includes(step.id)?'complete':''}" ${current===step.id?'aria-current="step"':''}><span class="step-num">${step.id==='finish'?'→':state.done.includes(step.id)?'✓':String(i+1).padStart(2,'0')}</span><span><strong>${escapeHTML(step.name)}</strong><small>${escapeHTML(step.sub)}</small></span>${current===step.id?'<span class="step-arrow">›</span>':''}</a>`).join('');
}
function render(focus=false) {
  codes = [];
  const step = displayStep(STEPS.find(s => s.id === current) || SUPPORT_PAGES.find(s=>s.id===current) || STEPS[0]);
  current = step.id;
  const index = STEPS.findIndex(s=>s.id===step.id);
  document.title = `${step.name} · Omics 起步`;
  renderSidebar();
  document.querySelectorAll('[data-nav-page]').forEach(link=>{
    const active=link.dataset.navPage===(step.support?current:'guide');
    link.classList.toggle('top-active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  let body = '';
  if (current==='faq') body = faqPageHTML();
  else if (current==='feedback') body = feedbackPageHTML();
  else if (current==='prepare') body = prepareHTML();
  else if (current==='finish') body = finishHTML();
  else {
    const sections = step.sections || [];
    body =       (step.where ? '<div class="where '+step.whereClass+'"><span>›_ &nbsp; 操作位置</span><strong>'+escapeHTML(step.where)+'</strong></div>' : '')+
      preparationNotice(step)+sectionsHTML(sections)+
      (current==='mirrors' ? mirrorReferenceHTML() : '')+
      (current==='environment' ? biocReferenceHTML() : '')+
      (step.faq ? '<details class="help-inline"><summary>遇到问题？查看这一步的常见情况</summary>'+faqHTML(step.faq)+'</details>' : '');
    body += '<div class="step-support-links"><a href="#faq">查找更多常见问题 ↗</a><a href="#feedback">反馈这一步的问题 ↗</a></div>';
  }
  $('#main').innerHTML = `${!storageOK?'<div class="storage-error">当前浏览器无法保存进度。你仍可使用教程，离开前请下载进度记录。</div>':''}<div class="breadcrumb"><span>起步指南</span><span>/</span><b>${step.support?'帮助与反馈':'Windows 安装向导'}</b></div><div class="hero-top"><span class="step-tag"><i></i>${escapeHTML(step.tag)}</span><span class="step-meta">${step.support?'帮助与反馈':current==='finish'?'安装记录':`STEP ${String(index+1).padStart(2,'0')} / ${String(STEP_COUNT).padStart(2,'0')}`}</span></div><h1>${escapeHTML(step.title)}</h1><p class="lead">${escapeHTML(step.desc)}</p>${body}${current==='finish'||step.support?'':checklistHTML(step)+`<div class="bottom-actions">${index===0?'<div class="prep-help">已经完成了一部分？<br><button data-action="pick-step">从左侧选择对应步骤</button></div>':`<button class="button-secondary" data-go="${STEPS[index-1].id}">← 上一步</button>`}<div class="action-right"><button class="button-primary" id="next-button" data-action="complete" ${!isReady(step)?'disabled':''}>${index===0?'准备好了，开始安装':index===STEP_COUNT-1?'确认完成，查看记录':'确认完成，下一步'} <span>→</span></button><p class="quiet">${index===0?'勾选准备项后即可开始':'先勾选上方结果，再确认本步完成'}</p></div></div>`}`;
  if(step.support)mountSupport(current);
  if (focus) { window.scrollTo({top:0,behavior:'instant'}); $('#main').focus({preventScroll:true}); }
}
function go(id) { id=resolveStep(id); if (location.hash.slice(1)===id) { current=id; render(true); } else location.hash = id; }
function openDialog(title, html) {
  $('#help-title').textContent = title;
  $('#dialog-content').innerHTML = html;
  if (!$('#help-dialog').open) $('#help-dialog').showModal();
}
function showHelp() { go('faq'); }
function downloadProgress() {
  const text = ['Omics 起步 · 安装进度记录',`导出时间：${new Date().toLocaleString('zh-CN')}`,`路线：${routeName()}`,`系统选择：${state.os} / ${state.arch}`,'','以下记录来自用户手动确认，不是本机环境检测报告。','',...INSTALL_STEPS.map(displayStep).map(s => `${state.done.includes(s.id)?'[已确认]':'[待完成]'} ${s.name}`),'','请另行保存部署脚本生成的 report.json 和实际解释器路径。','基础环境不代表全部 44 个 Skills、专用方法或 GPU 可用。',`仓库：${REPO}`].join('\n');
  const url = URL.createObjectURL(new Blob(['\ufeff',text],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download='Omics-安装进度.txt'; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000); toast('进度记录已准备下载。');
}
document.addEventListener('click',async event => {
  if (event.target.closest('a.skip')) { event.preventDefault(); $('#main').focus(); return; }
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.go) { go(button.dataset.go); return; }
  if (button.dataset.copy!==undefined) {
    const text = codes[Number(button.dataset.copy)];
    if (typeof text !== 'string') return;
    try { await navigator.clipboard.writeText(text); button.textContent='✓ 已复制'; toast('已复制。请到标注的终端或对话框粘贴。'); setTimeout(()=> {if(button.isConnected) button.textContent='▣ '+(button.dataset.copyLabel || '复制');},2200); }
    catch { openDialog('手动复制这段内容','<p>浏览器未开放剪贴板权限。选中下方文本，按 Ctrl + C 复制。</p><textarea class="copy-fallback" readonly aria-label="待复制内容"></textarea>'); $('.copy-fallback').value=text; $('.copy-fallback').select(); }
    return;
  }
  if (button.dataset.mirror) {
    if (!['tuna','ustc','westlake'].includes(button.dataset.mirror)) return;
    state.mirror = button.dataset.mirror; mirrorHelpOpen = true; save(); render(); return;
  }
  if (button.dataset.biocMirror) {
    if (!Object.hasOwn(MIRRORS,button.dataset.biocMirror)) return;
    state.biocMirror = button.dataset.biocMirror; biocHelpOpen = true; save(); render(); return;
  }
  switch(button.dataset.action) {
    case 'complete': {
      const step = STEPS.find(s=>s.id===current);
      if (!step || !isReady(step) || current==='finish') return;
      if (!state.done.includes(current)) state.done.push(current);
      save(); go(STEPS[STEPS.indexOf(step)+1].id); break;
    }
    case 'help': showHelp(); break;
    case 'feedback-copy': await copyFeedback(); break;
    case 'feedback-from-faq':
      feedbackDraft ||= newFeedbackDraft();
      if(!feedbackDraft.title)feedbackDraft.title=faqFilters.query.slice(0,100);
      if(INSTALL_STEPS.some(s=>s.id===faqFilters.category))feedbackDraft.step=faqFilters.category;
      go('feedback');break;
    case 'faq-clear': faqFilters={query:'',category:'all'};render();$('#support-search').focus();break;
    case 'close': $('#help-dialog').close(); break;
    case 'pick-step': $('#step-nav .step-link').focus(); $('#step-nav').scrollIntoView({block:'nearest'}); toast('点击步骤名称即可跳转，浏览不会标记完成。'); break;
    case 'system-help': openDialog('查看你的 Windows 和处理器','<p>按 Windows + R，输入 <strong>winver</strong> 并按 Enter，查看 Windows 版本及内部版本号。</p><p>再打开「设置 → 系统 → 系统信息 / 关于」，查看「系统类型」。本教程的部署环境需要<strong>基于 x64 的处理器</strong>。</p><p>Windows 10 需要版本 2004、内部版本 19041 或更高；Windows 11 可继续。ARM 处理器暂不适用这份环境锁定配置。</p>'); break;
    case 'sources': openDialog('资料来源与版本',`<p>基础教程核对日期：2026-10-13；Ubuntu 国内下载与软件源补充核对：2026-10-14。页面依据官方安装文档及本地 Omics Skills 部署契约整理。第三方软件界面、账号权限和模型名称可能更新。</p><ul class="sources-list">${SOURCES.map(([name,url])=>`<li><a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">${escapeHTML(name)} ↗</a></li>`).join('')}</ul><p>本网站不收集 API Key、不自动上传日志、不自动安装软件。浏览器保存安装进度；反馈草稿只在当前页面暂存。点击前往 GitHub 时会把你预览的反馈带到公开 Issues 编辑页，由你确认提交。TRAE 技能自动发现、账号连接与国内直连全流程仍需在实际电脑验收。</p><p>网站版本 0.7.2。Skills 仓库目前未指定许可证；公开可见不等于已授予开源许可。</p>`); break;
    case 'download': downloadProgress(); break;
    case 'reset': openDialog('重置这份安装进度？','<p>只清除这个浏览器中保存的路线和勾选记录，不影响电脑上已经安装的软件或任何分析数据。</p><div class="bottom-actions"><button class="button-secondary" data-action="close">保留进度</button><button class="button-primary" data-action="confirm-reset">重置进度</button></div>'); break;
    case 'confirm-reset': state=freshState(); save(); $('#help-dialog').close(); go('prepare'); toast('进度已重置，已安装的软件不受影响。'); break;
  }
});
document.addEventListener('change',event => {
  const target = event.target;
  if (target.matches('[data-check]')) {
    state.checks[current] ||= [];
    state.checks[current][Number(target.dataset.check)] = target.checked;
    if (!target.checked) state.done = state.done.filter(id=>id!==current);
    save(); renderSidebar(); $('#next-button').disabled = !isReady(STEPS.find(s=>s.id===current));
  }
  if (target.id==='ubuntu-release' && ['22.04','24.04'].includes(target.value)) { state.ubuntuRelease=target.value; mirrorHelpOpen=true; save(); render(); }
  if (target.id==='os-select' || target.id==='arch-select') {
    state[target.id==='os-select'?'os':'arch']=target.value;
    state.done = state.done.filter(id=>id!=='prepare'); state.checks.prepare=[]; save(); render();
  }
});
document.addEventListener('toggle',event=>{
  if(event.target.id==='mirror-reference') mirrorHelpOpen=event.target.open;
  if(event.target.id==='bioc-reference') biocHelpOpen=event.target.open;
},true);
$('#help-dialog').addEventListener('click',event => { if(event.target===$('#help-dialog')) { const r=event.target.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) event.target.close(); } });
window.addEventListener('hashchange',()=>{ const id=resolveStep(location.hash.slice(1)); current=knownPage(id)?id:'prepare'; if(STEPS.some(s=>s.id===current))state.current=current; save(); render(true); });
const initialHash = resolveStep(location.hash.slice(1));
current = knownPage(initialHash)?initialHash:state.current;
if(STEPS.some(s=>s.id===current))state.current=current;
history.replaceState(null,'',`#${current}`);
save(); render();
