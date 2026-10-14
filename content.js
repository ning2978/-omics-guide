/* 教程内容与界面分离；命令仅展示和复制，网站不执行本机安装。 */
const REPO = 'https://github.com/ning2978/codex-omics-skills';
const UBUNTU_WSL = {
  file: 'ubuntu-24.04.5-wsl-amd64.wsl',
  sha256: 'bb415d824822c4b878125729af451a5d18fb13d1cf5cbed9a7393ad64ac6039e',
  primary: 'https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/24.04/',
  fallback: 'https://mirrors.ustc.edu.cn/ubuntu-releases/24.04/',
  officialChecksums: 'https://releases.ubuntu.com/24.04/SHA256SUMS',
};
const MIRRORS = {
  tuna: { name: '清华大学', scope: 'Ubuntu · PyPI · Bioconductor', apt: 'https://mirrors.tuna.tsinghua.edu.cn/ubuntu/', pip: 'https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple', bioc: 'https://mirrors.tuna.tsinghua.edu.cn/bioconductor', help: 'https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/' },
  ustc: { name: '中国科学技术大学', scope: 'Ubuntu · PyPI · Bioconductor', apt: 'https://mirrors.ustc.edu.cn/ubuntu/', pip: 'https://mirrors.ustc.edu.cn/pypi/simple', bioc: 'https://mirrors.ustc.edu.cn/bioc/', help: 'https://mirrors.ustc.edu.cn/help/ubuntu.html' },
  westlake: { name: '西湖大学', scope: 'Ubuntu · Bioconductor', apt: 'https://mirrors.westlake.edu.cn/ubuntu/', bioc: 'https://mirrors.westlake.edu.cn/bioconductor', help: 'https://mirrors.westlake.edu.cn/posts/ubuntu_help.html' },
};
function mirrorSections(key, release) {
  const m = MIRRORS[key] || MIRRORS.tuna;
  const file = release === '22.04' ? '/etc/apt/sources.list' : '/etc/apt/sources.list.d/ubuntu.sources';
  const parts = [{ title: '备用说明：仅在对应下载失败时使用', text: 'APT 用于 Ubuntu 基础工具，PyPI 用于后续 Python 包。先让 Agent 判断失败原因，原来的源能正常下载就继续使用。R / Bioconductor 镜像已移到第 8 步部署后的可选说明。', note: '这些配置不会加速 WSL 首次下载、GitHub、TRAE 下载或模型 API，也不会改写本项目锁定文件中的下载地址。' }];
  if (m.apt) parts.push(
    { title: `Ubuntu ${release}：先备份，再换源`, text: '先运行 cat /etc/os-release 确认版本，再使用上面的版本选项。命令只替换指定文件中的 Ubuntu 普通归档地址，保留发行版代号、签名、安全更新源和第三方源。已有镜像地址请按官方帮助核对。', code: `if [ -f "${file}" ]; then\n  if [ ! -e "${file}.omics-backup" ]; then\n    sudo cp -a -- "${file}" "${file}.omics-backup"\n  fi\n  if [ -f "${file}.omics-backup" ]; then\n    sudo sed -i -E 's@https?://([a-z][a-z]\\.)?archive\\.ubuntu\\.com/ubuntu/?@${m.apt}@g' "${file}"\n    sudo apt update\n  fi\nelse\n  printf '%s\\n' '未找到对应源文件，请核对 Ubuntu 版本与官方帮助。'\nfi`, shell: 'Ubuntu · Bash', note: '首次备份保留为 .omics-backup。不要同时套用两个版本配置；安全更新源仍访问 Ubuntu 官方地址。', link: [`查看${m.name} Ubuntu 帮助 ↗`,m.help] },
    { title: '确认地址和下载结果', text: '下面只显示源地址。确认其中出现所选镜像，并确认上一步 apt update 没有下载或签名错误。', code: `grep -E '^(URIs:|deb )' "${file}"`, shell: 'Ubuntu · Bash', expected: `普通软件源应包含：${m.apt}\n安全更新源保留原设置` },
  );
  if (m.pip) parts.push({ title: '以后需要 pip 下载时，再指定 PyPI 镜像', text: '本步不需要安装 Python 分析包。后续 Skill 确实使用 pip 时，让 Agent 在对应环境的实际安装命令中显式指定下方 --index-url 参数；不要依赖另一个终端里设置过的临时变量。', code: `--index-url ${m.pip}`, shell: 'pip 下载参数 · 不是独立命令', note: '把这项参数交给 Agent，和部署报告对应的 Python、Skill 要求的包名与版本一起使用。保持原版本及校验要求，不使用系统 Python 强行安装，不使用 sudo pip 或 --break-system-packages。实际下载成功才算可用。', link: ['查看 PyPI 镜像帮助 ↗',key==='ustc'?'https://mirrors.ustc.edu.cn/help/pypi.html':'https://mirrors.tuna.tsinghua.edu.cn/help/pypi/'] });
  else parts.push({ title: '西湖在这里用于 Ubuntu 软件包', text: '已核对西湖 Ubuntu 源及 24.04 更新索引。需要 PyPI 时请选择清华或中科大，本页不提供未经确认的西湖 PyPI 地址；Bioconductor 设置仍在第 8 步。', link: ['查看西湖 Ubuntu 使用帮助 ↗',m.help] });
  parts.push(
    { title: 'Conda 与锁定环境：普通换源并不覆盖', text: '当前 setup.py 读取 explicit 锁定文件中的完整包 URL；Miniforge 从固定 GitHub Release 下载。仅修改 .condarc 不会替换这些地址。这里不改写版本或校验值，也不承诺加速下一步的锁定环境部署。', note: '普通 conda create 的镜像配置见帮助。本项目的镜像部署需另行实现地址映射、校验保留、缺包处理和安装验收。', link: ['了解 Conda 镜像 ↗',key==='ustc'?'https://mirrors.ustc.edu.cn/help/anaconda.html':'https://mirrors.tuna.tsinghua.edu.cn/help/anaconda/'] },
  );
  return parts;
}
function bioconductorSection(key) {
  const m = MIRRORS[key] || MIRRORS.tuna;
  return { title: 'R 已部署，且确实需要额外下载时再使用', text: `让 Agent 使用报告中对应的 R，在执行实际下载的同一 R 会话或脚本中设置${m.name}镜像。下面只设置镜像，不安装或升级包；无需额外包时可跳过。`, code: `if (!exists(".omics_previous_bioc", inherits = FALSE)) {\n  .omics_previous_bioc <- list(BioC_mirror = getOption("BioC_mirror"))\n}\noptions(BioC_mirror = "${m.bioc}")\ngetOption("BioC_mirror")`, shell: '部署完成后的 R 控制台 · 不是 Bash', note: '这是 Bioconductor 源，不是 CRAN 源。关闭 R 后设置不保留；Agent 下次启动 R 需在实际下载脚本中重新指定。保持 Skill 要求的 R / Bioconductor 和包版本，回显地址不代表下载成功。'+(key==='westlake'?' 西湖地址已被官方目录收录，但维护端此前直接访问未成功，使用前需实测。':''), link: ['核对 Bioconductor 官方镜像目录 ↗','https://bioconductor.org/about/mirrors/'] };
}
/* TRAE Agent 主路线；与 content.js 中保留的镜像源函数组合发布。 */
const GUIDE_VERSION = 'trae-agent-v1';
const PREPARATION_VERSION = 'workspace-tools-v1';
const STEP_ALIASES = { vscode: 'trae', ai: 'agent' };
const TRAE_NETWORK_NOTE = '模型使用 TRAE 账号当前可用的国内服务。Skills 和部分环境包仍从 GitHub、Anaconda 下载，遇到网络错误时让 Agent 定位具体地址；完整流程的国内直连仍需在实际电脑验收。';
const SOURCES = [
  ['TRAE · 安装与打开 Agent 窗口', 'https://docs.trae.cn/ide_get-started-with-trae'],
  ['TRAE · 内置 Agent', 'https://docs.trae.cn/ide_built-in-agent'],
  ['TRAE · 内置模型与自定义模型', 'https://docs.trae.cn/ide_models'],
  ['TRAE · Skills 创建、导入与调用', 'https://docs.trae.cn/ide_skills'],
  ['TRAE · IDE 连接 WSL 2', 'https://docs.trae.cn/ide_wsl'],
  ['Microsoft · 安装 WSL', 'https://learn.microsoft.com/zh-cn/windows/wsl/install'],
  ['Microsoft · WSL 命令', 'https://learn.microsoft.com/zh-cn/windows/wsl/basic-commands'],
  ['Ubuntu · 从本地 .wsl 文件安装（WSL 2.4.10+）', 'https://ubuntu.com/wsl/docs/latest/howto/install-ubuntu-wsl2/'],
  ['Ubuntu · 官方安装文件校验值', UBUNTU_WSL.officialChecksums],
  ['清华 · Ubuntu 24.04 安装镜像目录', UBUNTU_WSL.primary],
  ['中科大 · Ubuntu 24.04 安装镜像目录', UBUNTU_WSL.fallback],
  ['西湖 · Ubuntu 软件源使用帮助', MIRRORS.westlake.help],
  ['Omics Skills · 环境部署', REPO + '/tree/main/skills/_meta/omics-environment-setup'],
  ['清华 · Ubuntu 镜像', 'https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/'],
  ['中科大 · Ubuntu 镜像', 'https://mirrors.ustc.edu.cn/help/ubuntu.html'],
  ['Bioconductor · 官方镜像目录', 'https://bioconductor.org/about/mirrors/'],
  ['DeepSeek · 自定义 API（可选）', 'https://api-docs.deepseek.com/zh-cn/'],
  ['DeepSeek · 开放平台与 API 充值', 'https://platform.deepseek.com/'],
];
const STEPS = [
  { id: 'prepare', name: '开始前的准备', sub: '先有助手，再准备环境', tag: '准备', title: '打开 TRAE，让 Agent 陪你起步。', desc: '先选好国内模型，再让 Agent 带你检查 Linux、加载 Omics Skills、部署 Python 和 R。整个过程在 TRAE 中完成。' },
  { id: 'trae', name: '安装 TRAE', sub: '打开 Agent，选择 DeepSeek', tag: 'TRAE', title: '先把你的 Agent 助手准备好。', desc: 'TRAE 已内置 Agent。安装并登录后打开助手窗口，发送任务前先切换到 DeepSeek 模型；下一步再验证对话与工具。', where: 'Windows · TRAE 中国版', whereClass: 'windows', checks: ['已安装并登录 TRAE 中国版', '已打开 Agent 窗口，并找到新建任务入口'], sections: [
    { title: '下载 Windows 版并完成登录', text: '从中国官网下载适合 Windows x64 的安装包，安装后按界面提示完成初始化和登录。已经安装可直接打开。', link: ['打开 TRAE 中国官网 ↗', 'https://www.trae.cn/'] },
    { title: '打开 Agent 窗口', text: '在 TRAE 的 IDE 窗口右上角点击「Agent」。进入后能看到「新建任务」等入口；右上角的「IDE」可返回文件和编辑器窗口。', note: '这里的 IDE 和 Agent 都属于 TRAE。旧版本入口可能不同，可对照官方图解。', link: ['查看 TRAE 官方快速开始 ↗', 'https://docs.trae.cn/ide_get-started-with-trae'] },
    { title: '新建本地任务，先切换 DeepSeek 模型', text: '点击「新建任务」，使用本机任务；已有项目可以选中，尚未准备 Linux 项目也没关系。发送第一条消息前，点击输入框旁的当前模型名称，打开模型列表。', items: [{ title: '优先选择：DeepSeek V4 FLASH v1', text: '如果列表提供这个选项，选中后确认输入框旁显示的模型已经切换。具体名称以当前 TRAE 客户端为准。' },{ title: '没有这个名称？选择其他可用的 DeepSeek（DS）模型', text: '不必为了名称一致重新安装 TRAE。按自己的账号可用列表与额度选择，下一步验证正常回复和工具调用。' }], note: '使用内置模型无需另填 API Key。后面的组学环境需要安装到自己的 WSL Ubuntu，请使用本地任务。' },
  ], faq: [
    ['还需要 VS Code、Cursor 或 Claude Code 吗？', '这条路线直接使用 TRAE 内置 Agent，不需要额外安装这些客户端，也不需要为 Agent 单独安装 Node.js 或 npm。'],
    ['必须创建自定义智能体吗？', '不用，先使用内置 Agent。Skills 为它提供分析方法和部署说明；熟悉流程后再按需要创建自定义智能体。'],
    ['安装后要切换模型吗？', '建议在发送第一条任务前打开模型列表，优先选择账号可用的 DeepSeek V4 FLASH v1；没有时选择其他可用的 DeepSeek 模型。确认输入框旁显示的是所选模型，再到下一步验证对话和工具。'],
  ] },
  { id: 'agent', name: '选择模型与 Agent', sub: '使用账号可用的国内模型', tag: 'AGENT & MODEL', title: '选好模型，就可以开始对话。', desc: '使用 TRAE 内置模型即可起步。模型负责理解任务，Agent 负责读取文件、调用工具并执行步骤。', where: 'TRAE · Agent 窗口', whereClass: 'linux', checks: ['已选中账号可用的国内模型，并收到正常回复', '已确认使用能够读取文件和运行终端工具的本地 Agent 任务'], sections: [
    { title: '确认已切换到 DeepSeek 模型', text: '如果上一步已经选好，核对输入框旁的当前模型名称即可。尚未选择时，点击模型名称，优先选择列表中可用的 DeepSeek V4 FLASH v1，也可以选择其他可用的 DeepSeek（DS）模型；名称、可用列表与额度以自己的 TRAE 客户端和账号为准。', note: '使用内置模型无需另填 DeepSeek API Key。模型在服务端运行，不需要把模型权重下载到电脑。', link: ['查看 TRAE 官方模型说明 ↗', 'https://docs.trae.cn/ide_models'] },
    { title: '让助手说明它能做什么', text: '复制下面的话到 Agent 对话框。收到回复后，查看它是否具备文件和终端工具；下一步会让它实际检查 WSL。', code: '你好，请用中文协助我在这台 Windows 电脑上准备 Omics Skills 分析环境。请说明当前任务是本地还是云端、能否读取本机文件和调用终端。先不要安装软件或修改文件；下一步我们先检查 WSL。', shell: 'TRAE · Agent 对话框', note: '这一步只确认助手可以对话。工具实际运行在哪里，要通过后面的真实执行结果核对。' },
    { title: '可选：需要自己的 API 时再添加', optional: true, text: '如果内置模型已够用，跳过这一项。需要自己的 DeepSeek API 时，点击下方开放平台链接，注册或登录后充值 API 余额，并在 API Keys 中创建密钥。再回到 TRAE「设置 → 模型 → 添加模型」，选择 DeepSeek 服务商，填写密钥并完成校验，然后在对话框选中新增模型。', note: '自定义 API 余额与 TRAE 内置模型额度分别计算。充值在 DeepSeek 官方平台完成，密钥只在自己的客户端填写。', link: ['打开 DeepSeek 开放平台 · 充值 / 购买 API 额度 ↗', 'https://platform.deepseek.com/'] },
  ], faq: [
    ['我的列表没有 DeepSeek V4 FLASH v1', '模型名、账号权限和套餐会变化。选择账号当前可用的其他 DeepSeek（DS）模型即可；如果没有可用的 DeepSeek，可先使用支持本地 Agent 工具的其他国内模型。以真实回复和工具结果为准，不必因为名称不同重新安装软件。'],
    ['能聊天，但不能执行命令', '确认任务运行在本机，并支持文件与终端工具。查看工具调用是否等待你的操作；如果工具不可用，先解决 Agent 的执行能力，再进入部署。'],
    ['是否全程都不需要代理？', TRAE_NETWORK_NOTE],
  ] },
  { id: 'wsl', name: '让 Agent 安装 WSL', sub: 'Ubuntu 从国内镜像下载', tag: 'WSL 2', title: 'Ubuntu 从国内下载，安装交给 Agent。', desc: '先复用已有环境。需要新装时，从清华下载 Ubuntu 24.04 LTS 的 WSL 文件，中科大作为备用；下载校验通过后再安装。', where: 'TRAE · 本地 Agent；按提示处理 Windows 管理员确认', whereClass: 'windows', checks: ['已安装并能启动一个 Ubuntu 22.04 或更高版本', 'wsl --list --verbose 中，所选 Ubuntu 的 VERSION 为 2'], sections: [
    { title: '复制这一段，交给 Agent 开始', text: '点击「复制指令」，粘贴到 TRAE 的本地 Agent 任务中。助手会先检查，再按需下载；你不必自己挑安装文件。', code: `请实际检查并按需安装 WSL 2 + Ubuntu，Ubuntu 安装文件不要从 GitHub 下载。\n\n先检查 Windows、x64 架构和已有 Ubuntu；兼容环境直接复用，多候选让我选择。缺少 WSL 时通过 Microsoft Store 安装，按需运行 wsl --install --no-distribution；旧版经 Store 更新。不使用 --web-download。新装 .wsl 文件前确认 WSL 程序版本至少 2.4.10，且支持 --from-file。\n\n需要新装 Ubuntu 时，下载：\n${UBUNTU_WSL.primary}${UBUNTU_WSL.file}\n失败改用同名文件：\n${UBUNTU_WSL.fallback}${UBUNTU_WSL.file}\n下载后计算 SHA256，必须等于：\n${UBUNTU_WSL.sha256}\n不匹配或下载失败就停止，不跳过校验、不自动换成其他文件。\n\n确认没有同名发行版后，用 wsl --install --from-file 加实际文件完整路径和 --no-launch 安装。保留已有环境和默认设置，不自动转换或重启；管理员确认、首次用户名和密码由我在本机完成。展示真实下载与校验结果，核对 Ubuntu 版本、WSL 2 和能否启动，再报告完成。`, shell: 'TRAE · Agent 对话框', format: 'prompt', note: 'Ubuntu 大文件走国内镜像；WSL 组件仍由微软提供。新文件安装要求 WSL 程序版本 2.4.10+，它与列表中的“VERSION 2”含义不同。' },
    { title: '按提示配合必要操作', text: '助手会告诉你当前需要做哪一项。已有环境验收通过时，可以直接进入下一步。', items: [
      { title: '管理员确认', text: 'Windows 弹窗时，核对是本次 WSL 安装再确认；没有管理员权限时联系设备管理员。' },
      { title: '保存工作后重启', text: '仅在系统要求时重启。回来后打开 TRAE 和本页，使用下方「继续安装」指令。' },
      { title: '首次设置 Ubuntu 用户', text: '让 Agent 给出启动已安装 Ubuntu 的命令，在本地终端执行并设置用户名和密码。也可从开始菜单打开已有入口；没有入口不代表安装失败。密码输入时不显示字符，已有用户可跳过。' },
    ], note: '下载完成不等于安装完成。首次用户设置需要打开 Ubuntu；密码不需要发给 Agent。' },
    { title: '看到真实检查结果，再确认完成', text: '让 Agent 展示下面的结果。等待下载、重启或用户设置时，本步还未完成；重启或任务中断后，可展开下方指令继续。', expected: 'Ubuntu：完整名称与版本（22.04 或更新）\nWSL：列表中的 VERSION 为 2\n启动检查：能读取系统版本和用户名', note: '列表中的 Stopped 只表示当前未运行。验收时需要实际启动选定的 Ubuntu；下一步继续使用它准备工作目录。' },
    { title: '下载入口与校验值（需要手动下载时展开）', optional: true, text: '选 Ubuntu 24.04.5、amd64、文件名以 .wsl 结尾的版本。这里的 amd64 同时适用于 Intel / AMD 的 x64 电脑；不要下载 desktop 或 server 的 .iso，也不要把别的文件改名。', items: [{ title: '清华优先，中科大备用', text: '两处提供同名 WSL 文件。安装前让 Agent 核对完整文件的 SHA256，不能只检查文件名或下载成功提示。' },{ title: '下载镜像与软件源分别处理', text: '此处只下载系统安装文件；安装后的 APT 软件源在第 6 步检查，需要时再使用清华、西湖或中科大。' }], expected: `文件：${UBUNTU_WSL.file}\nSHA256：${UBUNTU_WSL.sha256}\n校验依据：Ubuntu 官方 SHA256SUMS，核对日期 2026-10-14`, links: [['清华：下载 Ubuntu WSL ↗',UBUNTU_WSL.primary+UBUNTU_WSL.file],['中科大：备用下载 ↗',UBUNTU_WSL.fallback+UBUNTU_WSL.file],['查看 Ubuntu 官方校验清单 ↗',UBUNTU_WSL.officialChecksums]] },
    { title: '重启或中断了？从这里继续安装', optional: true, text: '重新打开 TRAE 本地任务，发送下面的话。助手会先确认安装到了哪一步，再补齐缺失部分。', code: '请继续这台电脑的 WSL 安装任务。先重新检查状态，保留已有环境，只补齐缺失步骤。\n\n沿用已选的 Ubuntu；有多个候选时让我确认。尚未下载时使用本页清华 / 中科大地址；已有下载先按本页 SHA256 验证，校验不匹配就停止。不从 GitHub 下载 Ubuntu，不使用 --web-download；安装文件前检查 WSL 程序 2.4.10+ 和 --from-file 支持。缺少下载规格时让我重新复制本页主指令，不猜地址。\n\n需要管理员确认、重启或首次用户设置时，告诉我具体操作，不自动重启。用 wsl --list --verbose 确认 WSL 2，再通过 wsl -d 指定完整名称读取 /etc/os-release 和 whoami。实际能启动、Ubuntu 至少为 22.04 且使用 WSL 2，才报告完成。', shell: 'TRAE · Agent 对话框', format: 'prompt' },
    { title: '备用：Agent 无法安装时，手动执行', optional: true, text: '先通过 Microsoft Store 安装或更新 Windows Subsystem for Linux，确认 wsl --version 至少为 2.4.10；需要启用系统组件时，在管理员 PowerShell 执行 wsl --install --no-distribution，并按提示重启。已有可用 Ubuntu 无需重装。', items: [{ title: '1. 下载 .wsl 文件', text: '从上方清华或中科大入口下载。确认没有同名 Ubuntu 发行版，避免重复安装。' },{ title: '2. 核对文件', text: '把下方占位文字替换为下载文件的完整路径后执行。结果应与上方 SHA256 完全一致，不一致就停止。' },{ title: '3. 双击安装', text: '校验通过后双击 .wsl 文件，按提示完成本地用户名和密码设置；最后把真实检查输出交给 Agent 验收。' }], code: "Get-FileHash -LiteralPath '替换为下载文件的完整路径' -Algorithm SHA256", shell: 'Windows PowerShell · 文件校验', note: '提示不支持 --from-file 时，先更新 WSL 程序。系统版本、虚拟化或 Store 不可用的问题，按官方说明排查。', links: [['打开 Microsoft Store 的 WSL 页面 ↗','https://apps.microsoft.com/detail/9p9tqf7mrm4r'],['查看 Ubuntu 本地文件安装说明 ↗','https://ubuntu.com/wsl/docs/latest/howto/install-ubuntu-wsl2/']] },
  ], faq: [
    ['TRAE 可以全自动安装 WSL 吗？', '具备本地终端工具与相应权限的 Agent 可以检查并发起官方安装。Windows 管理员确认、必要的重启和首次 Ubuntu 用户名/密码设置需要你配合；是否安装成功以真实验收输出为准。'],
    ['重启后怎么继续？', '重新打开 TRAE 和本教程 WSL 页，展开「重启或中断了？从这里继续安装」，把指令发给助手。它会先核对现状，再继续缺失步骤；无需重新从头安装。'],
    ['Agent 提示权限不足，怎么办？', '按 TRAE 提示允许本次终端操作；Windows 管理员确认需要在本机完成。若 Agent 无法请求提权，展开手动备用步骤；没有管理员权限时联系设备管理员。'],
    ['列表里有两个 Ubuntu，怎么选？', '选择包含自己项目和用户目录的发行版，让 Agent 分别只读检查再确认。不要为了统一名字卸载任何发行版。'],
    ['安装卡在 0% 或下载失败', '先确认失败的是微软 WSL 组件，还是 Ubuntu 的 .wsl 文件。Ubuntu 下载可切换清华与中科大的同名文件，并重新核对 SHA256；WSL 组件需检查 Microsoft Store / Windows 更新渠道。APT 换源不会修复这两类下载，也不要改用 GitHub 代理链接。'],
    ['WSL 2 与 WSL 2.4.10 是一回事吗？', '不是。wsl --list --verbose 的 VERSION 2 表示发行版使用 WSL 2 架构；wsl --version 的 2.4.10 是 WSL 程序版本。本教程的 .wsl 本地文件安装需要程序 2.4.10 或更新。'],
    ['从清华下载后，还要配置清华或西湖的软件源吗？', '不一定。下载镜像只提供安装文件，不会自动改 APT。第 6 步先检查工具和现有源，下载正常就保留；确需加速时再选择清华、西湖或中科大，并实际验证 apt update 与软件安装。'],
    ['提示需要启用虚拟化', '任务管理器 → 性能 → CPU 可查看虚拟化状态。未启用时按电脑厂商说明设置，或联系设备管理员；Agent 不能代替 BIOS/UEFI 中的操作。'],
  ] },
  { id: 'ubuntu', name: '准备 Linux 工作台', sub: '让 Agent 识别用户、准备目录', tag: 'LINUX WORKSPACE', title: '让 Agent 把工作目录准备好。', desc: '继续使用上一步的 Ubuntu，让助手识别用户、创建工作目录并保存记录。无需自己填写发行版名称或拼接路径。', where: 'TRAE · 同一个本地 Agent 任务', whereClass: 'linux', checks: ['Agent 已确认目标 Ubuntu、普通用户和 Linux x86_64', '工作目录可读写，已看到准备记录的完整路径'], sections: [
    { title: '复制给 Agent：准备我的 Linux 工作台', text: '直接发送下面的话。没有项目目录时，助手会在你的 Linux 用户目录下创建 omics-workspace；已有目录先检查再复用。', code: '请继续准备我的 Omics Linux 工作台，实际检查并完成必要的目录创建。\n1. 沿用上一步验收的 Ubuntu。若对话没有记录，先通过 wsl --list --verbose（在 WSL 内用 wsl.exe）重新识别；有多个候选时让我选择。核对 WSL 2、Ubuntu 22.04+ 和 uname -m 为 x86_64，不满足时说明原因。\n2. 识别目标发行版中的普通 Linux 用户及其实际 home 目录，不使用 root。若尚未完成首次用户设置，指导我在本地 Ubuntu 窗口完成，再继续。\n3. 使用我已明确选定的 Linux 项目目录；否则在该普通用户的实际 home（例如 /home/用户名）下创建 omics-workspace。已有目录先检查所有权、内容和权限，不覆盖文件、不搬迁项目、不批量改权限；有冲突再询问。用该用户创建一个唯一的临时文件验证读写，只清理本次测试文件。\n4. 展示实际执行的 pwd、uname -s、uname -m、whoami、cat /etc/os-release 和 WSL_DISTRO_NAME。Windows 发起的后续任务都显式指定 wsl -d 的发行版、-u 的普通用户和 --cd 的目标目录。记录 python3、git、curl、wget、ca-certificates 的状态；缺失或 Python 低于 3.10 的问题留给下一步处理，本步不安装分析包。\n5. 在工作目录的 omics-setup-notes.md 中记录实际发行版、用户、工作目录、架构和待处理项，已有文件则追加本次记录，不写入密码或密钥。给我记录文件的完整路径和执行结果。', shell: 'TRAE · Agent 对话框' },
    { title: '你需要配合什么', text: '只有存在多个 Ubuntu 或用户、目录冲突等情况时，才需要你选择。首次 Ubuntu 用户名和密码在本地窗口设置；目录创建通常不需要管理员权限。', note: '尽量在同一个 Agent 任务里继续。换了任务时，把刚才的准备记录路径交给新助手读取并重新核对工作位置。' },
    { title: '看到这些结果，再进入下一步', text: '查看 Agent 的实际工具结果和准备记录。缺少 Python、Git 等基础工具时可以进入下一步补齐；发行版、用户或架构不对时先解决。', expected: '目标 Ubuntu：完整名称，WSL 2\nLinux 用户：普通用户，不是 root\n系统与架构：Linux / x86_64\n工作目录：已创建或复用，读写测试通过\n准备记录：完整路径，以 omics-setup-notes.md 结尾', note: '准备记录由 Agent 在电脑中保存；网页不会自动读取这个文件，也不会自动判断是否完成。' },
    { title: '可选：在 TRAE 的 IDE 窗口直接连接 WSL', optional: true, text: '需要查看 Linux 文件时，可以返回 TRAE 的 IDE 窗口，在远程资源管理器选择 WSL，连接目标 Ubuntu，再打开项目目录。也可继续让 Agent 通过明确的 wsl 调用完成任务。', note: '只打开 WSL 终端或浏览 \\wsl.localhost 文件夹，不代表整个编辑器已远程连接。误进 SSH 命令输入框时按 Esc 返回。', link: ['查看 TRAE WSL 官方图解 ↗', 'https://docs.trae.cn/ide_wsl'] },
  ], faq: [
    ['提示 uname 不是命令', '命令正在 PowerShell 中运行。让 Agent 使用明确指定发行版的 wsl 调用，或在 TRAE 中连接目标 WSL 后打开 Linux 终端。不要在 PowerShell 里直接运行 Bash 命令。'],
    ['每次执行都跑到另一个 Ubuntu', '检查工具调用是否只有 wsl 而没有 -d。要求每次明确指定发行版、用户和工作目录，新对话也重新核对；不必修改系统默认发行版。'],
    ['没有项目目录，需要自己创建吗？', '不用。把主指令发给 Agent，它会在目标普通用户的 home 下按需创建 omics-workspace，检查读写并保存准备记录。已有同名目录时先核对，不覆盖文件。'],
    ['当前用户是 root，怎么办？', '让 Agent 检查已有普通用户；尚未完成首次设置时，在本地 Ubuntu 窗口设置用户名和密码。不要直接把分析环境部署到 /root。'],
    ['输出 aarch64 或缺少 Python', 'aarch64 不符合当前 Linux x86_64 锁定环境，需要先解决平台兼容性。缺少 Python 或版本低于 3.10 则在下一步检查并补齐，不必手动修改系统 Python。'],
  ] },
  { id: 'mirrors', name: '检查下载与基础工具', sub: '缺什么补什么，按需加速', tag: 'DOWNLOAD & TOOLS', title: '先检查下载，再补齐基础工具。', desc: '把检查交给 Agent。工具齐全就复用；需要下载时先用现有来源，遇到问题再处理，无需提前选择镜像。', where: 'TRAE · Agent → 刚确认的 WSL 工作台', whereClass: 'linux', checks: ['Agent 已验证基础工具可用，Python 至少为 3.10', '已查看本步下载结果或无需下载的说明，以及源配置是否改变'], sections: [
    { title: '复制给 Agent：检查并补齐基础工具', text: '在刚才的任务中继续发送。助手先检查是否缺少工具，只下载必要的部分。', code: '请在刚确认的 WSL 发行版、普通用户和工作目录中准备基础工具；先读取 omics-setup-notes.md 并核对实际执行位置。\n1. 检查 python3、git、curl、wget 和 ca-certificates。现有工具满足要求就复用；Python 需至少 3.10，缺少时用此 Ubuntu 的系统软件包补齐，不改系统 Python 链接，不安装分析依赖。\n2. 确需安装时，先用已有 APT 配置更新索引并安装缺少的工具。全部已有时不必为测试而重装，明确记录本步无需下载。需要 sudo 时让我在本地终端输入密码。\n3. 下载失败先区分网络、源地址、证书、权限或软件包锁等原因。仅在确认换源适用时，按实际 Ubuntu 版本和源文件布局，优先参考清华 https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/，也可选择西湖 https://mirrors.westlake.edu.cn/posts/ubuntu_help.html 或中科大 https://mirrors.ustc.edu.cn/help/ubuntu.html，按当前网络实测选择一个源。先备份原文件，保留发行版代号、签名、安全更新及第三方源；不关闭证书或签名校验。检查对应版本的 InRelease 与更新日期，再验证实际 apt update 和必要软件安装；保留安全更新通道，不能把部分索引失败当作成功。失败则保留错误，不声称已修复。\n4. 不预先配置 pip、R 或 Conda 镜像，不改 Skills 固定下载地址和包版本。基础工具检查不代表后续 GitHub 或分析环境包已下载成功。\n5. 展示工具版本、Python 路径、证书包状态、本步实际下载结果或无需下载、是否换源及备份位置，把结果追加到工作目录的 omics-setup-notes.md。遇到异常旧版 Python，先诊断来源，不强行替换已有环境。', shell: 'TRAE · Agent 对话框' },
    { title: '你需要配合什么', text: '需要安装基础工具时，按提示在本地终端输入 Ubuntu 密码。本步不必安装 Conda、Miniforge、pip 或 R；Miniforge 和分析用 Python / R 环境统一放在第 8 步部署。', note: '如果 Agent 只能给建议、不能执行 sudo，请让它提供具体命令，在目标 Ubuntu 终端执行后把结果交回验收；不要把密码发到聊天框。' },
    { title: '工具可用，就继续加载 Skills', text: '看到以下实际结果后即可继续。镜像配置不是必做任务；后续仓库和分析依赖的下载会在对应步骤单独检查。', expected: 'Python：3.10 或更新，已显示实际路径\nGit / curl / wget：可运行并返回版本\nca-certificates：已安装\n本步下载：成功，或工具齐全无需下载\n软件源：保持原配置，或已换源并记录备份\n准备记录：已追加本步结果' },
  ], faq: [
    ['必须选择镜像才能继续吗？', '不用。已有基础工具就复用，需要下载时先检查原来源。只有发生适合换源解决的问题时，再让 Agent 选择并验证；查看备用镜像说明不会更改电脑设置或清除完成记录。'],
    ['为什么原来确认过的第 5、6 步需要再确认？', '这两步新增了工作目录读写和基础工具验收，旧的镜像勾选不能代表新检查通过。原确认记录已保留，其他步骤不受影响；已有环境请让 Agent 检查复用即可。'],
    ['清华和西湖的软件源需要都配置吗？', '不用。Ubuntu 安装文件的下载来源与 APT 独立；第 6 步按当前网络选择一个实测可用的 Ubuntu 源即可。清华、西湖和中科大均有备用说明；西湖的主仓库与 24.04 更新索引已于 2026-10-14 检查可访问，仍需在实际电脑验证下载。Bioconductor 配置在第 8 步；本页未提供西湖 PyPI 地址。'],
    ['换源后部署仍然下载失败', '当前部署脚本使用 GitHub Miniforge 和 Anaconda 的完整锁定包 URL，普通 APT / PyPI 换源不会覆盖这些地址。让 Agent 定位具体失败文件，保留日志和校验；本页没有实现固定包地址的镜像映射。'],
    ['Agent 新开终端后，镜像设置还在吗？', 'APT 写入配置文件的设置会保留；临时终端变量和 R 会话设置不会自动传到新任务。后续实际使用 pip 或 R 下载时，应在对应命令或脚本中明确指定镜像，参见可选说明。'],
  ] },
  { id: 'skills', name: '加载 Omics Skills', sub: '把方法与脚本交给 Agent', tag: 'OMICS SKILLS', title: '让 Agent 读到你的分析方法。', desc: '先准备完整仓库，再加载环境部署 Skill。确认助手读到了真实文件和引用资源，下一步才开始安装分析环境。', where: 'TRAE · Agent；文件位于目标 WSL 项目中', whereClass: 'linux', checks: ['已准备完整 Skills 仓库，部署脚本和引用文件都可读取', 'Agent 已实际读取部署 SKILL.md，并说明调用路径和部署计划'], sections: [
    { title: '让 Agent 获取或复用完整仓库', text: '将下面的要求发送给助手。已有仓库直接复用；首次下载会访问 GitHub。', code: '先读取工作目录中的 omics-setup-notes.md，核对实际 WSL 发行版、普通用户和工作目录，再准备 https://github.com/ning2978/codex-omics-skills 。已有仓库则检查并复用，不覆盖、不强制更新；没有才克隆完整仓库。展示仓库绝对路径和当前版本，确认 skills/_meta/omics-environment-setup/SKILL.md、scripts/setup.py（位于该 Skill 内）及其引用文件存在。将实际仓库路径与版本追加到 omics-setup-notes.md。下载失败时保留具体 URL 和错误，再诊断网络；APT 换源不代表 GitHub 已可用。现在只准备文件，不安装分析环境。', shell: 'TRAE · Agent 对话框', note: '下载 ZIP 也要保留完整目录结构，包含 scripts、references、锁定文件和 _shared 等资源。仓库名中的 codex 不要求安装 Codex 客户端。', link: ['打开 Omics Skills 仓库 ↗', REPO] },
    { title: '先明确加载部署 Skill', text: '让 Agent 通过文件工具读取说明及引用内容。这条方式可以直接开始当前任务；是否已经登记为自动发现的技能，要看下一项的技能列表。', code: '请从刚确认的完整仓库加载 skills/_meta/omics-environment-setup/SKILL.md，并实际读取它引用的 environment-installation-policy/SKILL.md 和 references/platforms.md。说明你实际读取的文件路径、目标 WSL 发行版、部署脚本路径及 Python/R 基础环境的计划。现在只读取与说明，暂不执行 create。', shell: 'TRAE · Agent 对话框', note: '只回复「已加载」还不够。应能列出真实读取的文件和对应的脚本路径；缺少引用文件时先补齐仓库。' },
    { title: '可选：登记到 TRAE 的技能列表', optional: true, text: '需要后续任务自动调用时，在「设置 → 技能与命令 → 创建」中选择项目技能，可导入 SKILL.md 或包含它的 ZIP。也可以使用当前版本支持的 .agents/skills 导入设置。添加后在技能列表确认已启用，再新建任务验证调用。', note: 'Omics 仓库有跨目录引用，不要仅移动一个 SKILL.md。让 Agent 检查导入后的路径、脚本和共享资源；未验证前继续使用完整仓库中的明确路径。没有声称全部 Skills 已自动注册。', link: ['查看 TRAE 官方 Skills 导入说明 ↗', 'https://docs.trae.cn/ide_skills'] },
  ], faq: [
    ['加载 Skill 就等于装好了 Scanpy 或 Seurat 吗？', '还没有。Skill 提供方法、脚本和约束，实际 Python/R 依赖需要下一步创建并验证。'],
    ['Agent 看不到 WSL 中的文件', '让它通过指定发行版读取文件，或在 TRAE IDE 中打开对应 WSL 项目。若内置文件工具只能看到 Windows 文件，请如实使用 WSL 终端读取，不要凭空声称已经读过。'],
    ['导入后提示缺少脚本或 references', '通常是只导入了 SKILL.md，或移动位置破坏了相对路径。保留完整仓库并使用原路径，待所有引用校验通过后再使用自动加载。'],
  ] },
  { id: 'environment', name: '部署并验收环境', sub: 'Miniforge → Python / R 环境', tag: 'ENVIRONMENT', title: '从 Miniforge 到分析环境，一次准备好。', desc: '第 8 步统一部署：先看计划，首次创建时准备 Miniforge，再创建 Python / R 分析环境，最后检查报告和测试图。', where: 'TRAE · Agent → 同一目标 WSL Ubuntu', whereClass: 'linux', checks: ['create 成功结束，report.json 中 operation 为 create、status 为 PASS', '已保存报告中的实际解释器路径，并检查生成的测试图'], sections: [
    { title: '先生成部署计划', text: 'Miniforge 自带 Conda，用来管理独立的 Python / R 环境，不需要分别安装两套软件。先让 Agent 使用 Skill 的原有脚本生成计划，确认 Linux 安装位置和下载来源；此时还不安装。', code: '先读取 omics-setup-notes.md 并核对目标位置，再按已加载的 omics-environment-setup Skill，在已确认的 WSL 发行版、普通用户和仓库目录运行 setup.py plan --profile both，使用位于仓库外的新报告目录。展示真实执行结果、平台兼容性、安装位置、所需空间和下载来源，说明 Miniforge 与 Python/R 环境如何按 Skill 准备。先解释计划，暂不执行 create。', shell: 'TRAE · Agent 对话框', note: '第 6 步的系统 Python 用来启动部署脚本；运行组学分析时使用这里创建的独立环境。plan / inspect 的 PASS 只说明检查通过，不能证明环境可用。' },
    { title: '确认计划后，准备 Miniforge 和分析环境', text: '把下面的话发送给助手。首次创建时，脚本会下载并校验 Miniforge，再安装固定版本的 Python / R 依赖并运行测试；目标位置已有兼容环境时会验证后复用。', code: '按刚才核对的计划，开始部署 Python 和 R 基础环境。使用同一 WSL 发行版和普通用户，按 Skill 运行 setup.py create --profile both --bootstrap，由原脚本按需准备独立 Miniforge；安装目录放在 Linux 用户目录下的独立位置，报告写到仓库外的新目录。保留原有环境、锁定版本和 SHA256 校验。完成后展示真实退出状态、report.json 的 operation/status、实际 Python/R 解释器路径和测试 PNG；如果本次准备了 Miniforge，也展示实际 Conda 路径。失败时保留日志并说明原因。', shell: 'TRAE · Agent 对话框', note: '下载来源仍包含 GitHub 与 Anaconda。遇到错误先定位下载地址，不让助手用任意升级依赖的方式绕过问题。' },
    { title: '打开报告和测试图，确认完成', text: '让 Agent 给出本次报告的绝对路径，并在 TRAE 中打开 report.json 和测试 PNG。核对以下结果后再勾选完成。', expected: '本次报告：operation = create\n实际结果：status = PASS\nenvironments：保存准确的 Python / R 解释器路径\n测试图：已打开并检查生成的 PNG', note: '基础环境覆盖的检查以报告为准。GPU、scVI、cell2location、Monocle2 等专用方法需要后续单独检查。' },
  ], faq: [
    ['Conda / Miniforge 放在哪一步安装？', '统一在第 8 步。第 6 步只补齐启动脚本需要的系统基础工具，第 7 步获取并读取 Skills，第 8 步确认计划后由 setup.py create --bootstrap 按需准备 Miniforge 和分析环境。Miniforge 包含 Conda，无需分别下载安装。'],
    ['已经安装过 Anaconda、Miniconda 或 Miniforge 呢？', '先让 Agent 说明已有安装位置。当前教程使用 --bootstrap，在 Linux 用户目录下准备本流程的独立 Miniforge，避免改动原安装；本流程目标位置已有兼容环境时会验证复用。Windows 中的 Conda 不能当作 WSL 的 Linux 环境使用。'],
    ['必须先在 TRAE 装 R / Python 插件吗？', 'Agent 通过终端调用部署报告中的实际解释器即可运行分析，插件不是此路线的必装项。需要手动编辑、调试或使用 Notebook 时，再按 TRAE 扩展商店支持情况配置；安装插件不等于安装了 R、Python 或分析包。'],
    ['Agent 说完成了，但没有报告', '要求展示实际命令、退出状态、报告路径与内容。没有 create 报告及测试结果，不要勾选部署完成。'],
    ['显示 PASS，分析仍然失败', '先确认 PASS 来自 create / verify，再检查分析是否使用报告中的准确解释器。专用方法需要读取对应 Skill 并执行运行前检查。'],
    ['需要把整台电脑交给自动审批吗？', '不需要。本教程没有要求修改全局审批设置；按当前客户端的提示处理具体操作即可。'],
  ] },
  { id: 'finish', name: '完成与下一步', sub: '查看记录，开始分析', tag: 'READY FOR SCIENCE', title: '为你的分析工作台，留一份记录。', desc: '这份进度来自你的手动确认。真正的环境可用性，请以实际部署报告、解释器路径和测试结果为准。' },
];
