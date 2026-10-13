'use strict';
const INSTALL_STEPS = STEPS.filter(s => s.id !== 'finish');
const STEP_COUNT = INSTALL_STEPS.length;
const STORAGE_KEY = 'omics-onboarding:v1';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let storageOK = true;
let state = { route: 'claude', current: 'prepare', done: [], checks: {}, os: 'win11', arch: 'x64', mirror: 'tuna', ubuntuRelease: '24.04' };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    state.mirror = ['tuna','ustc','westlake'].includes(saved.mirror) ? saved.mirror : 'tuna';
    state.ubuntuRelease = saved.ubuntuRelease === '22.04' ? '22.04' : '24.04';
    state.route = saved.route === 'codex' ? 'codex' : 'claude';
    state.current = STEPS.some(s => s.id === saved.current) ? saved.current : 'prepare';
    state.done = Array.isArray(saved.done) ? [...new Set(saved.done.filter(id => INSTALL_STEPS.some(s => s.id === id)))] : [];
    state.os = ['win11','win10','older'].includes(saved.os) ? saved.os : 'win11';
    state.arch = ['x64','arm','unknown'].includes(saved.arch) ? saved.arch : 'x64';
    if (saved.checks && typeof saved.checks === 'object') STEPS.forEach(s => { if (Array.isArray(saved.checks[s.id])) state.checks[s.id] = saved.checks[s.id].slice(0, 2).map(v => v === true); });
  }
} catch { storageOK = false; }
let current = state.current;
let codes = [];
let toastTimer;
const $ = selector => document.querySelector(selector);
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOK = true; }
  catch { storageOK = false; toast('浏览器未允许保存进度；离开前可在完成页下载记录。'); }
}
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3300); }
function routeName() { return state.route === 'claude' ? 'Claude Code + DeepSeek' : 'Codex'; }
function canPrepare() { return state.os !== 'older' && state.arch === 'x64'; }
function checksFor(step) { return step.id === 'prepare' ? ['我已确认电脑满足上面的 Windows 与 x64 条件', '我可以安装软件，并已保存需要保留的工作'] : (step.checks || []); }
function isReady(step) { return checksFor(step).every((_, i) => state.checks[step.id]?.[i]) && (step.id !== 'prepare' || canPrepare()); }
function codeBlock(text, shell) {
  const index = codes.push(text) - 1;
  return `<div class="codebox"><div class="codehead"><span>›_ &nbsp;${escapeHTML(shell || 'Ubuntu · Bash')}</span><button class="copy-button" data-copy="${index}" aria-label="复制${escapeHTML(shell || 'Ubuntu')}命令">▣ &nbsp;复制</button></div><pre><code>${escapeHTML(text)}</code></pre></div>`;
}
function mock(type) {
  if (type === 'powershell') return '<div class="mock"><div class="mock-caption">操作位置示意 · 请在你自己的电脑上打开</div><div class="mock-top">管理员: Windows PowerShell</div><div class="mock-content">PS C:\\Windows\\system32&gt; <span style="color:#b8d49b">▏</span></div></div>';
  return '<div class="mock"><div class="mock-caption">连接成功后的界面示意</div><div class="mock-top">omics-workspace [WSL: Ubuntu] — Visual Studio Code</div><div class="mock-vscode"><div class="mock-explorer">EXPLORER<br>⌄ omics-workspace</div><div class="mock-content">终端 &nbsp; Ubuntu<br>researcher@ubuntu:~/omics-workspace$</div></div><div class="mock-status">&gt;&lt; &nbsp; WSL: Ubuntu &nbsp; ← 在左下角找这个标识</div></div>';
}
function sectionsHTML(sections) {
  return sections.map((item,index) => `<section class="instruction"><div class="instruction-head"><span class="count">${String(index+1).padStart(2,'0')}</span><h2>${escapeHTML(item.title)}</h2></div><p>${escapeHTML(item.text)}</p><div class="content-indent">${item.code ? codeBlock(item.code,item.shell) : ''}${item.visual ? mock(item.visual) : ''}${item.expected ? `<div class="expected"><strong>对照参考 · 实际版本与用户名可能不同</strong><pre>${escapeHTML(item.expected)}</pre></div>` : ''}${item.note ? `<p class="inline-note">ⓘ &nbsp;${escapeHTML(item.note)}</p>` : ''}${item.link ? `<a class="out-link" href="${escapeHTML(item.link[1])}" target="_blank" rel="noreferrer">${escapeHTML(item.link[0])}</a>` : ''}</div></section>`).join('');
}
function faqHTML(items) { return items.map(([q,a]) => `<details class="faq-row"><summary>${escapeHTML(q)}</summary><p>${escapeHTML(a)}</p></details>`).join(''); }
function routePicker() { return `<div class="route-picker" role="group" aria-label="AI 工具路线"><button class="route-card ${state.route==='claude'?'active':''}" data-route="claude" aria-pressed="${state.route==='claude'}"><strong>Claude Code + DeepSeek</strong><small>国产 API 路线 · 明确读取部署说明</small></button><button class="route-card ${state.route==='codex'?'active':''}" data-route="codex" aria-pressed="${state.route==='codex'}"><strong>Codex</strong><small>与现有仓库安装说明一致</small></button></div>`; }
function mirrorPicker() {
  return `<div class="route-picker mirror-picker" role="group" aria-label="镜像站选择">${Object.entries(MIRRORS).map(([key,m])=>`<button class="route-card ${state.mirror===key?'active':''}" data-mirror="${key}" aria-pressed="${state.mirror===key}"><strong>${escapeHTML(m.name)}</strong><small>${escapeHTML(m.scope)}</small></button>`).join('')}</div>${state.mirror==='westlake'?'':`<div class="settings-row"><label>运行 cat /etc/os-release，按实际 Ubuntu 版本选择<select id="ubuntu-release"><option value="24.04" ${state.ubuntuRelease==='24.04'?'selected':''}>Ubuntu 24.04 · ubuntu.sources</option><option value="22.04" ${state.ubuntuRelease==='22.04'?'selected':''}>Ubuntu 22.04 · sources.list</option></select></label></div><p class="quiet">其他版本或自定义源文件布局，请按官方帮助操作。</p>`}<div class="notice"><span class="symbol">ⓘ</span><p>现在可配置 APT / PyPI；R 部分等环境部署完成后再执行。也可以保持原源，勾选确认后继续。</p></div>`;
}
function mirrorRecovery() {
  const file = state.ubuntuRelease==='22.04'?'/etc/apt/sources.list':'/etc/apt/sources.list.d/ubuntu.sources';
  return `<details class="help-inline"><summary>需要撤销换源？展开恢复命令</summary><p class="inline-note">只在需要恢复时执行。APT 恢复首次换源前的备份；PyPI 关闭终端即可恢复；R 需在同一会话恢复或重启。备份文件会保留。</p>${state.mirror==='westlake'?'':codeBlock(`if [ -f "${file}.omics-backup" ]; then\n  sudo cp -a -- "${file}.omics-backup" "${file}"\n  sudo apt update\nelse\n  printf '%s\\n' '没有备份，不做修改。'\nfi`,'Ubuntu · Bash · 恢复 APT')}${codeBlock('if (exists(".omics_previous_bioc", inherits = FALSE)) {\n  options(.omics_previous_bioc)\n  rm(.omics_previous_bioc)\n}','R 控制台 · 恢复 Bioconductor')}</details>`;
}
function prepareHTML() {
  return `<div class="hero-board"><div class="board-copy"><span class="board-label">LESS SETUP. MORE SCIENCE.</span><h2>你的第一套<br>组学分析工作台。</h2><p>从安装 WSL 到准备 Python 和 R，<br>每一步都有操作说明和结果参考。</p><div class="board-chips"><span>Windows → Linux</span><span>本机运行</span><span>无需网站账号</span></div></div><div class="workbench" aria-label="Ubuntu 工作台插画"><div class="mini-window"><div class="mini-title"><i></i><i></i><i></i><span>omics-workspace</span></div><div class="mini-body"><div class="mini-tree">EXPLORER<br>⌄ workspace<br>　◇ skills<br>　◇ reports</div><div class="mini-terminal"><b>hello, science.</b>$ python --version<br>$ Rscript --version<br><span style="color:#93a382">准备你的分析工具 ▏</span></div></div></div><div class="floating-check"><span>✓</span> 从准备，到开始</div></div></div>
    <div class="section-heading"><h2>开始前，准备好这三件事</h2><span>先花一分钟确认，后面会更顺利。</span></div>
    <div class="prep-grid"><article class="prep-card"><div class="card-icon">⊞</div><h3>一台适合的电脑</h3><p>Windows 11，或 Windows 10<br>2004 / 内部版本 19041 及以上。</p><button class="small-link" data-action="system-help">如何查看系统版本？ ↗</button></article><article class="prep-card"><div class="card-icon">⌁</div><h3>网络和可用空间</h3><p>需要下载系统与分析依赖。<br>先检查磁盘余量，保持网络连接。</p></article><article class="prep-card"><div class="card-icon">◇</div><h3>安装权限与耐心</h3><p>安装 WSL 需要管理员权限，<br>中途可能需要重启电脑。</p></article></div>
    <div class="settings-row"><label>我的 Windows 版本<select id="os-select"><option value="win11" ${state.os==='win11'?'selected':''}>Windows 11</option><option value="win10" ${state.os==='win10'?'selected':''}>Windows 10 · 2004 / 19041 及以上</option><option value="older" ${state.os==='older'?'selected':''}>更旧版本 / 暂时不确定</option></select></label><label>我的系统类型<select id="arch-select"><option value="x64" ${state.arch==='x64'?'selected':''}>基于 x64 的处理器（Intel / AMD）</option><option value="arm" ${state.arch==='arm'?'selected':''}>基于 ARM 的处理器</option><option value="unknown" ${state.arch==='unknown'?'selected':''}>我还不确定</option></select></label></div>
    ${!canPrepare()?'<div class="blocked">这条安装路线需要兼容的 Windows 版本与 x64 处理器。请先确认系统信息；ARM 暂不适用。你仍可以浏览后续教程，但不要执行环境安装。</div>':''}
    <div class="notice"><span class="symbol">ⓘ</span><p>这里是你的安装向导。网页帮你看步骤、复制命令；安装操作在自己的电脑上完成，进度由你手动确认。</p></div>`;
}
function checklistHTML(step) {
  const checks = checksFor(step);
  return `<div class="${step.id==='prepare'?'completion':'verification-box'}">${step.id==='prepare'?'':'<h2>看到了这些结果，再继续</h2><p>下列勾选是你的确认，不代表网页自动检测通过。</p>'}${checks.map((label,i) => `<label class="check-label"><input type="checkbox" data-check="${i}" ${state.checks[step.id]?.[i]?'checked':''}><span>${escapeHTML(label)}</span></label>`).join('')}</div>`;
}
function finishHTML() {
  const all = state.done.length === STEP_COUNT;
  return `<div class="finish-banner"><span class="eyebrow">${all?'YOUR CHECKLIST IS COMPLETE':'YOUR PROGRESS, AT A GLANCE'}</span><h2>${all?'全部步骤确认完成。下一站，开始分析。':`你已经确认完成 ${state.done.length} / ${STEP_COUNT} 步。`}</h2><p>当前路线：${routeName()}。下载这份进度记录，下次可以快速定位工作进展。</p></div><div class="summary-list">${INSTALL_STEPS.map(s => `<div class="summary-item ${state.done.includes(s.id)?'done':''}"><strong>${escapeHTML(s.name)}</strong>${state.done.includes(s.id)?'<span>✓ 你已确认完成</span>':`<button data-go="${s.id}">返回完成 ↗</button>`}</div>`).join('')}</div><div class="notice green"><span class="symbol">✦</span><p>请把部署脚本生成的 report.json 和实际解释器路径一起保存。基础环境就绪后，按具体分析方法运行 runtime-preflight；专用方法和 GPU 环境需要另外准备。</p></div><div class="section-heading"><h2>接下来，让助手先做运行前检查</h2></div>${codeBlock('请先阅读 skills/_meta/omics-analysis-runtime-preflight/SKILL.md。我会提供本次部署报告和想做的分析任务。请核对实际解释器、数据要求和方法依赖，先列出检查结果，暂不运行真实数据分析。',routeName()+' · 对话框')}<div class="bottom-actions"><button class="button-secondary" data-go="environment">← 返回部署步骤</button><button class="button-primary" data-action="download">下载我的进度记录 ↓</button></div><p class="quiet">下载内容只包含路线和手动确认记录，不包含密钥，也不是环境验证报告。</p>`;
}
function renderSidebar() {
  $('#progress-text').textContent = `${state.done.length} / ${STEP_COUNT}`;
  $('#progress-fill').style.width = `${state.done.length/STEP_COUNT*100}%`;
  $('.progress-track').setAttribute('aria-valuemax', STEP_COUNT);
  $('.progress-track').setAttribute('aria-valuenow',state.done.length);
  $('#step-nav').innerHTML = STEPS.map((step,i) => `<a href="#${step.id}" class="step-link ${current===step.id?'active':''} ${state.done.includes(step.id)?'complete':''}" ${current===step.id?'aria-current="step"':''}><span class="step-num">${state.done.includes(step.id)?'✓':String(i+1).padStart(2,'0')}</span><span><strong>${escapeHTML(step.name)}</strong><small>${escapeHTML(step.sub)}</small></span>${current===step.id?'<span class="step-arrow">›</span>':''}</a>`).join('');
}
function render(focus=false) {
  codes = [];
  const step = STEPS.find(s => s.id === current) || STEPS[0];
  current = step.id;
  const index = STEPS.indexOf(step);
  document.title = `${step.name} · Omics 起步`;
  renderSidebar();
  let body = '';
  if (current==='prepare') body = prepareHTML();
  else if (current==='finish') body = finishHTML();
  else {
    let sections = step.sections || [];
    if (current==='mirrors') sections = mirrorSections(state.mirror, state.ubuntuRelease);
    if (current==='ai') sections = aiSections(state.route);
    if (current==='skills') sections = [...sections,...skillSections(state.route)];
    body = `${step.where?`<div class="where ${step.whereClass}"><span>›_ &nbsp; 操作位置</span><strong>${escapeHTML(step.where)}</strong></div>`:''}${current==='ai'?routePicker():''}${current==='mirrors'?mirrorPicker():''}${sectionsHTML(sections)}${current==='mirrors'?mirrorRecovery():''}${step.faq?`<details class="help-inline"><summary>遇到问题？查看这一步的常见情况</summary>${faqHTML(step.faq)}</details>`:''}`;
  }
  $('#main').innerHTML = `${!storageOK?'<div class="storage-error">当前浏览器无法保存进度。你仍可使用教程，离开前请下载进度记录。</div>':''}<div class="breadcrumb"><span>起步指南</span><span>/</span><b>Windows 安装向导</b></div><div class="hero-top"><span class="step-tag"><i></i>${escapeHTML(step.tag)}</span><span class="step-meta">${current==='finish'?'安装记录':`STEP ${String(index+1).padStart(2,'0')} / ${String(STEP_COUNT).padStart(2,'0')}`}</span></div><h1>${escapeHTML(step.title)}</h1><p class="lead">${escapeHTML(step.desc)}</p>${body}${current==='finish'?'':checklistHTML(step)+`<div class="bottom-actions">${index===0?'<div class="prep-help">已经完成了一部分？<br><button data-action="pick-step">从左侧选择对应步骤</button></div>':`<button class="button-secondary" data-go="${STEPS[index-1].id}">← 上一步</button>`}<div class="action-right"><button class="button-primary" id="next-button" data-action="complete" ${!isReady(step)?'disabled':''}>${index===0?'准备好了，开始安装':index===STEP_COUNT-1?'确认完成，查看记录':'确认完成，下一步'} <span>→</span></button><p class="quiet">${index===0?'勾选准备项后即可开始':'先勾选上方结果，再确认本步完成'}</p></div></div>`}`;
  if (focus) { window.scrollTo({top:0,behavior:'instant'}); $('#main').focus({preventScroll:true}); }
}
function go(id) { if (location.hash.slice(1)===id) { current=id; render(true); } else location.hash = id; }
function openDialog(title, html) {
  $('#help-title').textContent = title;
  $('#dialog-content').innerHTML = html;
  if (!$('#help-dialog').open) $('#help-dialog').showModal();
}
function showHelp() {
  const items = STEPS.flatMap(s => (s.faq || []).map(pair => [...pair,s.name]));
  openDialog('卡住了？从这里找答案。','<p>选中与你看到的情况最接近的问题。不需要提交日志或密钥。</p><label>搜索问题<input type="search" id="faq-search" placeholder="例如：密码、WSL、下载失败" autocomplete="off"></label><div id="faq-results"></div>');
  const update = () => {
    const q = $('#faq-search').value.trim().toLowerCase();
    const found = items.filter(row => row.join(' ').toLowerCase().includes(q));
    $('#faq-results').innerHTML = found.length ? faqHTML(found.map(([q,a,section])=>[`${section} · ${q}`,a])) : '<p class="search-empty">暂时没有匹配项。可以换一个关键词，或查看「资料来源与版本」中的官方排错说明。</p>';
  };
  $('#faq-search').addEventListener('input',update); update();
}
function downloadProgress() {
  const text = ['Omics 起步 · 安装进度记录',`导出时间：${new Date().toLocaleString('zh-CN')}`,`路线：${routeName()}`,`系统选择：${state.os} / ${state.arch}`,'','以下记录来自用户手动确认，不是本机环境检测报告。','',...INSTALL_STEPS.map(s => `${state.done.includes(s.id)?'[已确认]':'[待完成]'} ${s.name}`),'','请另行保存部署脚本生成的 report.json 和实际解释器路径。','基础环境不代表全部 44 个 Skills、专用方法或 GPU 可用。',`仓库：${REPO}`].join('\n');
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
    try { await navigator.clipboard.writeText(text); button.textContent='✓ 已复制'; toast('已复制。请到标注的终端或对话框粘贴。'); setTimeout(()=> {if(button.isConnected) button.innerHTML='▣ &nbsp;复制';},2200); }
    catch { openDialog('手动复制这段内容','<p>浏览器未开放剪贴板权限。选中下方文本，按 Ctrl + C 复制。</p><textarea class="copy-fallback" readonly aria-label="待复制内容"></textarea>'); $('.copy-fallback').value=text; $('.copy-fallback').select(); }
    return;
  }
  if (button.dataset.mirror) {
    state.mirror = button.dataset.mirror; state.done = state.done.filter(id=>id!=='mirrors'); delete state.checks.mirrors; save(); render(); return;
  }
  if (button.dataset.route) {
    if (state.route === button.dataset.route) return;
    state.route = button.dataset.route === 'codex'?'codex':'claude';
    state.done = state.done.filter(id=>!['ai','skills'].includes(id));
    delete state.checks.ai; delete state.checks.skills;
    save(); render(); toast('路线已切换，请重新确认助手和 Skills 步骤。'); return;
  }
  switch(button.dataset.action) {
    case 'complete': {
      const step = STEPS.find(s=>s.id===current);
      if (!step || !isReady(step) || current==='finish') return;
      if (!state.done.includes(current)) state.done.push(current);
      save(); go(STEPS[STEPS.indexOf(step)+1].id); break;
    }
    case 'help': showHelp(); break;
    case 'close': $('#help-dialog').close(); break;
    case 'pick-step': $('#step-nav .step-link').focus(); $('#step-nav').scrollIntoView({block:'nearest'}); toast('点击步骤名称即可跳转，浏览不会标记完成。'); break;
    case 'system-help': openDialog('查看你的 Windows 和处理器','<p>按 Windows + R，输入 <strong>winver</strong> 并按 Enter，查看 Windows 版本及内部版本号。</p><p>再打开「设置 → 系统 → 系统信息 / 关于」，查看「系统类型」。本教程的部署环境需要<strong>基于 x64 的处理器</strong>。</p><p>Windows 10 需要版本 2004、内部版本 19041 或更高；Windows 11 可继续。ARM 处理器暂不适用这份环境锁定配置。</p>'); break;
    case 'sources': openDialog('资料来源与版本',`<p>教程核对日期：2026-10-13。页面依据官方安装文档及本地 Omics Skills 部署契约整理。第三方软件界面、账号权限和模型名称可能更新。</p><ul class="sources-list">${SOURCES.map(([name,url])=>`<li><a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">${escapeHTML(name)} ↗</a></li>`).join('')}</ul><p>本网站不收集 API Key、不上传日志、不自动安装软件。浏览器仅保存路线、系统选择和勾选进度。Claude 自动注册完整 Skills、API 实际连接和本机全流程安装仍需独立验收。</p><p>本地网站版本 0.2.0。Skills 仓库目前未指定许可证；公开可见不等于已授予开源许可。</p>`); break;
    case 'download': downloadProgress(); break;
    case 'reset': openDialog('重置这份安装进度？','<p>只清除这个浏览器中保存的路线和勾选记录，不影响电脑上已经安装的软件或任何分析数据。</p><div class="bottom-actions"><button class="button-secondary" data-action="close">保留进度</button><button class="button-primary" data-action="confirm-reset">重置进度</button></div>'); break;
    case 'confirm-reset': state={route:'claude',current:'prepare',done:[],checks:{},os:'win11',arch:'x64',mirror:'tuna',ubuntuRelease:'24.04'}; save(); $('#help-dialog').close(); go('prepare'); toast('进度已重置，已安装的软件不受影响。'); break;
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
  if (target.id==='ubuntu-release') { state.ubuntuRelease=target.value; state.done=state.done.filter(id=>id!=='mirrors'); delete state.checks.mirrors; save(); render(); }
  if (target.id==='os-select' || target.id==='arch-select') {
    state[target.id==='os-select'?'os':'arch']=target.value;
    state.done = state.done.filter(id=>id!=='prepare'); state.checks.prepare=[]; save(); render();
  }
});
$('#help-dialog').addEventListener('click',event => { if(event.target===$('#help-dialog')) { const r=event.target.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) event.target.close(); } });
window.addEventListener('hashchange',()=>{ const id=location.hash.slice(1); current=STEPS.some(s=>s.id===id)?id:'prepare'; state.current=current; save(); render(true); });
const initialHash = location.hash.slice(1);
current = STEPS.some(s=>s.id===initialHash)?initialHash:state.current;
state.current=current;
history.replaceState(null,'',`#${current}`);
save(); render();
