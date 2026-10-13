/* FAQ and feedback are separate from installation progress. Feedback stays in memory until the visitor follows the GitHub link. */
const GUIDE_ISSUES = 'https://github.com/ning2978/-omics-guide/issues';
const SUPPORT_PAGES = [
  {id:'faq',name:'常见问题 FAQ',tag:'HELP CENTER',title:'卡住了？先从这里找答案。',desc:'按步骤筛选，或输入报错关键词。没有找到答案时，可以把问题提交给维护者。',support:true},
  {id:'feedback',name:'问题反馈',tag:'FEEDBACK',title:'把遇到的问题，告诉我们。',desc:'写下卡住的步骤和实际现象，网页会帮你整理成一份反馈，再由你到 GitHub 确认提交。',support:true},
];
const GENERAL_FAQ = [
  ['网页会自动安装软件吗？','不会。网页提供步骤和任务说明，实际操作在自己的 TRAE 和 WSL 中完成；勾选进度只是你的确认。'],
  ['使用 TRAE 内置模型还要买 DeepSeek API 吗？','不一定。直接使用账号可用的内置模型即可；只有使用自己的 API 时才需要在 DeepSeek 开放平台准备密钥和额度。'],
  ['刷新后进度还在吗？','进度保存在当前浏览器。换浏览器、使用隐私窗口或清除站点数据后可能无法恢复；可在完成页下载自己的进度记录。'],
  ['怎么反馈问题，提交后在哪里看？','在「问题反馈」填写并预览后，前往 GitHub 登录并确认提交。看到 Issue 编号才表示收集成功；后续回复和处理状态都在对应 Issue 中。'],
  ['可以上传截图或完整日志吗？','请先检查并去掉密钥、密码、个人信息和研究数据。需要截图时，可在 GitHub 最后的编辑页面按其提示添加；本网页不自动收集或上传文件。'],
];
let faqFilters = {query:'',category:'all'};
let feedbackDraft = null;
function faqEntries() {
  return [
    ...GENERAL_FAQ.map(([question,answer])=>({question,answer,step:'general',category:'使用指南'})),
    ...STEPS.flatMap(s=>(s.faq||[]).map(([question,answer])=>({question,answer,step:s.id,category:s.name}))),
  ];
}
function filterFAQs(query='',category='all') {
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return faqEntries().filter(row=>(category==='all'||row.step===category)&&words.every(word=>[row.question,row.answer,row.category].join(' ').toLowerCase().includes(word)));
}
function faqPageHTML() {
  const categories=[['all','全部问题'],['general','使用指南'],...STEPS.filter(s=>s.faq?.length).map(s=>[s.id,s.name])];
  return `<div class="support-filters"><label for="support-search">搜索关键词<input id="support-search" type="search" maxlength="120" placeholder="例如：WSL、密码、API、下载失败" value="${escapeHTML(faqFilters.query)}"></label><label for="support-category">按步骤筛选<select id="support-category">${categories.map(([id,name])=>`<option value="${id}" ${faqFilters.category===id?'selected':''}>${escapeHTML(name)}</option>`).join('')}</select></label></div><p id="support-count" class="support-count" role="status" aria-live="polite"></p><div id="support-results" class="faq-collection"></div><div class="support-callout"><div><h2>还没有找到答案？</h2><p>把发生问题的步骤和现象告诉我们。</p></div><button class="button-primary" data-action="feedback-from-faq">填写问题反馈 →</button></div>`;
}
function updateFAQResults() {
  const rows=filterFAQs(faqFilters.query,faqFilters.category);
  $('#support-count').textContent=`找到 ${rows.length} 个问题`;
  $('#support-results').innerHTML=rows.length?rows.map(row=>`<details class="faq-row"><summary><span class="faq-category">${escapeHTML(row.category)}</span>${escapeHTML(row.question)}</summary><p>${escapeHTML(row.answer)}</p>${row.step==='general'?'':`<a class="faq-step-link" href="#${row.step}">查看这一步的教程 ↗</a>`}</details>`).join(''):'<div class="support-empty"><h2>暂时没有匹配的答案</h2><p>试试更短的关键词，或点击下方按钮提交反馈。</p><button class="button-secondary" data-action="faq-clear">清除筛选</button></div>';
}
function newFeedbackDraft() {
  return {type:'安装报错',step:INSTALL_STEPS.some(s=>s.id===state.current)?state.current:'general',title:'',details:'',environment:'',error:'',tried:''};
}
function feedbackOptions(values,selected) {
  return values.map(([id,name])=>`<option value="${escapeHTML(id)}" ${selected===id?'selected':''}>${escapeHTML(name)}</option>`).join('');
}
function feedbackPageHTML() {
  feedbackDraft ||= newFeedbackDraft();
  const d=feedbackDraft;
  return `<div class="notice"><span class="symbol">ⓘ</span><p>反馈将提交到公开的 GitHub Issues，需要 GitHub 账号。请不要填写 API Key、密码、联系方式或研究数据。当前填写内容只暂存在本页，刷新后会清除。</p></div><div class="support-link-row"><a class="out-link" href="${GUIDE_ISSUES}" target="_blank" rel="noopener noreferrer">查看已有反馈与处理进度 ↗</a><a class="out-link" href="#faq">先查看常见问题 ↗</a></div>
    <form id="feedback-form" class="feedback-form">
      <div class="feedback-grid"><label for="feedback-type">反馈类型<select id="feedback-type" name="type">${feedbackOptions(['安装报错','网站问题','内容建议','其他问题'].map(x=>[x,x]),d.type)}</select></label><label for="feedback-step">发生在哪一步？<select id="feedback-step" name="step">${feedbackOptions([['general','不确定 / 整体建议'],...INSTALL_STEPS.map(s=>[s.id,s.name])],d.step)}</select></label></div>
      <label for="feedback-title">一句话描述问题 <span class="required">必填</span><input id="feedback-title" name="title" required maxlength="100" value="${escapeHTML(d.title)}" placeholder="例如：Agent 执行命令时进入了另一个 Ubuntu"></label>
      <label for="feedback-details">发生了什么？ <span class="required">必填</span><textarea id="feedback-details" name="details" required maxlength="2500" rows="5" placeholder="我做了哪些操作？原本希望看到什么？实际出现了什么？">${escapeHTML(d.details)}</textarea></label>
      <label for="feedback-environment">系统与工具版本 <span class="field-optional">选填</span><input id="feedback-environment" name="environment" maxlength="250" value="${escapeHTML(d.environment)}" placeholder="例如：Windows 11、Ubuntu 22.04、TRAE 版本、所选模型"></label>
      <label for="feedback-error">错误信息 <span class="field-optional">选填</span><textarea id="feedback-error" name="error" maxlength="3000" rows="4" placeholder="只粘贴相关报错片段；先去掉密钥、密码和个人信息。">${escapeHTML(d.error)}</textarea></label>
      <label for="feedback-tried">已经尝试过什么？ <span class="field-optional">选填</span><textarea id="feedback-tried" name="tried" maxlength="1000" rows="3" placeholder="例如：重启终端、检查发行版名称；分别有什么结果？">${escapeHTML(d.tried)}</textarea></label>
      <p class="quiet">需要补充截图时，可以在 GitHub 确认提交前添加。</p><div class="feedback-actions"><button class="button-primary" type="submit">预览反馈内容 →</button></div>
    </form><section id="feedback-preview" class="feedback-preview" hidden aria-labelledby="feedback-preview-title" tabindex="-1"></section>`;
}
function feedbackStepName(id) { return INSTALL_STEPS.find(s=>s.id===id)?.name || '不确定 / 整体建议'; }
function buildFeedback(d) {
  const title=`[${d.type}] ${d.title.trim()}`;
  const body=[
    '## 问题信息',`- 类型：${d.type}`,`- 所在步骤：${feedbackStepName(d.step)}`,'- 网站版本：0.6.1',
    '', '## 发生了什么',d.details.trim(),'', '## 系统与工具版本',d.environment.trim()||'未填写',
    '', '## 错误信息',d.error.trim()||'未填写','', '## 已尝试的处理',d.tried.trim()||'未填写',
    '', '---','此反馈由 Omics 起步网页整理，用户在 GitHub 确认后提交。',
  ].join('\n');
  const url=new URL(GUIDE_ISSUES+'/new');
  url.searchParams.set('title',title);
  url.searchParams.set('body',body);
  const useClipboard=url.href.length>7000;
  if(useClipboard) url.searchParams.delete('body');
  return {title,body,url:url.href,useClipboard};
}
function captureFeedback(form) {
  for(const key of ['type','step','title','details','environment','error','tried']) feedbackDraft[key]=form.elements.namedItem(key).value;
}
function showFeedbackPreview() {
  const report=buildFeedback(feedbackDraft);
  const preview=$('#feedback-preview');
  preview.hidden=false;
  preview.innerHTML=`<h2 id="feedback-preview-title">确认内容，再前往 GitHub</h2><p>${report.useClipboard?'内容较长，请先复制下方反馈，再在 GitHub 新建页面的正文中粘贴。':'点击下方按钮会打开已填好标题和正文的 GitHub 页面，你可以继续编辑。'}<strong>目前尚未提交；在 GitHub 点击提交并看到 Issue 编号后才算完成。</strong></p><label for="feedback-report">整理后的反馈<textarea id="feedback-report" rows="12" readonly>${escapeHTML(report.body)}</textarea></label><div class="feedback-actions"><button class="button-secondary" type="button" data-action="feedback-copy">复制反馈内容</button><a class="button-primary" href="${escapeHTML(report.url)}" target="_blank" rel="noopener noreferrer">前往 GitHub 确认提交 ↗</a></div><p class="quiet">看不到 GitHub 页面？可以先复制内容保存，网络恢复后再提交。复制或打开页面不代表已送达。</p>`;
  preview.focus({preventScroll:true});
  preview.scrollIntoView({behavior:'smooth',block:'start'});
}
function mountSupport(id) {
  if(id==='faq') {
    updateFAQResults();
    $('#support-search').addEventListener('input',event=>{faqFilters.query=event.target.value;updateFAQResults();});
    $('#support-category').addEventListener('change',event=>{faqFilters.category=event.target.value;updateFAQResults();});
  }
  if(id==='feedback') {
    const form=$('#feedback-form');
    const capture=()=>{captureFeedback(form);$('#feedback-preview').hidden=true;$('#feedback-preview').innerHTML='';};
    form.addEventListener('input',capture);
    form.addEventListener('change',capture);
    form.addEventListener('submit',event=>{event.preventDefault();captureFeedback(form);if(!form.reportValidity())return;if(!feedbackDraft.title.trim()||!feedbackDraft.details.trim()){toast('请填写问题标题和具体情况。');return;}showFeedbackPreview();});
  }
}
async function copyFeedback() {
  const report=$('#feedback-report');
  if(!report)return;
  try{await navigator.clipboard.writeText(report.value);toast('反馈内容已复制，尚未提交。');}
  catch{report.focus();report.select();toast('请按 Ctrl + C 复制已选中的内容。');}
}
