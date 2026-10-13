/* 教程内容与界面分离；命令仅展示和复制，网站不执行本机安装。 */
const REPO = 'https://github.com/ning2978/codex-omics-skills';
const MIRRORS = {
  tuna: { name: '清华大学', scope: 'Ubuntu · PyPI · Bioconductor', apt: 'https://mirrors.tuna.tsinghua.edu.cn/ubuntu/', pip: 'https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple', bioc: 'https://mirrors.tuna.tsinghua.edu.cn/bioconductor', help: 'https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/' },
  ustc: { name: '中国科学技术大学', scope: 'Ubuntu · PyPI · Bioconductor', apt: 'https://mirrors.ustc.edu.cn/ubuntu/', pip: 'https://mirrors.ustc.edu.cn/pypi/simple', bioc: 'https://mirrors.ustc.edu.cn/bioc/', help: 'https://mirrors.ustc.edu.cn/help/ubuntu.html' },
  westlake: { name: '西湖大学', scope: 'Bioconductor · 可用性待确认', bioc: 'https://mirrors.westlake.edu.cn/bioconductor', help: 'https://bioconductor.org/about/mirrors/' },
};
function mirrorSections(key, release) {
  const m = MIRRORS[key] || MIRRORS.tuna;
  const file = release === '22.04' ? '/etc/apt/sources.list' : '/etc/apt/sources.list.d/ubuntu.sources';
  const parts = [{ title: '备用说明：仅在对应下载失败时使用', text: 'APT 用于 Ubuntu 基础工具，PyPI 用于后续 Python 包。先让 Agent 判断失败原因，原来的源能正常下载就继续使用。R / Bioconductor 镜像已移到第 8 步部署后的可选说明。', note: '这些配置不会加速 WSL 首次下载、GitHub、TRAE 下载或模型 API，也不会改写本项目锁定文件中的下载地址。' }];
  if (m.apt) parts.push(
    { title: `Ubuntu ${release}：先备份，再换源`, text: '先运行 cat /etc/os-release 确认版本，再使用上面的版本选项。命令只替换指定文件中的 Ubuntu 普通归档地址，保留发行版代号、签名、安全更新源和第三方源。已有镜像地址请按官方帮助核对。', code: `if [ -f "${file}" ]; then\n  if [ ! -e "${file}.omics-backup" ]; then\n    sudo cp -a -- "${file}" "${file}.omics-backup"\n  fi\n  if [ -f "${file}.omics-backup" ]; then\n    sudo sed -i -E 's@https?://([a-z][a-z]\\.)?archive\\.ubuntu\\.com/ubuntu/?@${m.apt}@g' "${file}"\n    sudo apt update\n  fi\nelse\n  printf '%s\\n' '未找到对应源文件，请核对 Ubuntu 版本与官方帮助。'\nfi`, shell: 'Ubuntu · Bash', note: '首次备份保留为 .omics-backup。不要同时套用两个版本配置；安全更新源仍访问 Ubuntu 官方地址。', link: [`查看${m.name} Ubuntu 帮助 ↗`,m.help] },
    { title: '确认地址和下载结果', text: '下面只显示源地址。确认其中出现所选镜像，并确认上一步 apt update 没有下载或签名错误。', code: `grep -E '^(URIs:|deb )' "${file}"`, shell: 'Ubuntu · Bash', expected: `普通软件源应包含：${m.apt}\n安全更新源保留原设置` },
    { title: '以后需要 pip 下载时，再指定 PyPI 镜像', text: '本步不需要安装 Python 分析包。后续 Skill 确实使用 pip 时，让 Agent 在对应环境的实际安装命令中显式指定下方 --index-url 参数；不要依赖另一个终端里设置过的临时变量。', code: `--index-url ${m.pip}`, shell: 'pip 下载参数 · 不是独立命令', note: '把这项参数交给 Agent，和部署报告对应的 Python、Skill 要求的包名与版本一起使用。保持原版本及校验要求，不使用系统 Python 强行安装，不使用 sudo pip 或 --break-system-packages。实际下载成功才算可用。', link: ['查看 PyPI 镜像帮助 ↗',key==='ustc'?'https://mirrors.ustc.edu.cn/help/pypi.html':'https://mirrors.tuna.tsinghua.edu.cn/help/pypi/'] },
  );
  else parts.push({ title: '西湖镜像用于部署后的 Bioconductor', text: 'Ubuntu 和 PyPI 请选择清华或中科大。西湖 Bioconductor 配置在第 8 步的可选说明中；本教程不推测西湖其他软件源路径。', link: ['查看官方镜像目录 ↗',m.help] });
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
  ['Omics Skills · 环境部署', REPO + '/tree/main/skills/_meta/omics-environment-setup'],
  ['清华 · Ubuntu 镜像', 'https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/'],
  ['中科大 · Ubuntu 镜像', 'https://mirrors.ustc.edu.cn/help/ubuntu.html'],
  ['Bioconductor · 官方镜像目录', 'https://bioconductor.org/about/mirrors/'],
  ['DeepSeek · 自定义 API（可选）', 'https://api-docs.deepseek.com/zh-cn/'],
  ['DeepSeek · 开放平台与 API 充值', 'https://platform.deepseek.com/'],
];
const STEPS = [
  { id: 'prepare', name: '开始前的准备', sub: '先有助手，再准备环境', tag: '准备', title: '打开 TRAE，让 Agent 陪你起步。', desc: '先选好国内模型，再让 Agent 带你检查 Linux、加载 Omics Skills、部署 Python 和 R。整个过程在 TRAE 中完成。' },
  { id: 'trae', name: '安装 TRAE', sub: '打开内置 Agent 工作台', tag: 'TRAE', title: '先把你的 Agent 助手准备好。', desc: 'TRAE 已内置 Agent。安装并登录后就可以打开助手窗口，无需另外部署一个 Agent 服务。', where: 'Windows · TRAE 中国版', whereClass: 'windows', checks: ['已安装并登录 TRAE 中国版', '已打开 Agent 窗口，并找到新建任务入口'], sections: [
    { title: '下载 Windows 版并完成登录', text: '从中国官网下载适合 Windows x64 的安装包，安装后按界面提示完成初始化和登录。已经安装可直接打开。', link: ['打开 TRAE 中国官网 ↗', 'https://www.trae.cn/'] },
    { title: '打开 Agent 窗口', text: '在 TRAE 的 IDE 窗口右上角点击「Agent」。进入后能看到「新建任务」等入口；右上角的「IDE」可返回文件和编辑器窗口。', note: '这里的 IDE 和 Agent 都属于 TRAE。旧版本入口可能不同，可对照官方图解。', link: ['查看 TRAE 官方快速开始 ↗', 'https://docs.trae.cn/ide_get-started-with-trae'] },
    { title: '从一个本地任务开始', text: '点击「新建任务」，使用本机任务。有已有项目时可以选中它；尚未准备 Linux 项目也没关系，先在下一步选模型并验证对话，再让助手检查 WSL。', note: '后面的组学环境需要安装到自己的 WSL Ubuntu。请核对任务的执行位置，不要把云端任务结果当成本机安装结果。' },
  ], faq: [
    ['还需要 VS Code、Cursor 或 Claude Code 吗？', '这条路线直接使用 TRAE 内置 Agent，不需要额外安装这些客户端，也不需要为 Agent 单独安装 Node.js 或 npm。'],
    ['必须创建自定义智能体吗？', '不用，先使用内置 Agent。Skills 为它提供分析方法和部署说明；熟悉流程后再按需要创建自定义智能体。'],
  ] },
  { id: 'agent', name: '选择模型与 Agent', sub: '使用账号可用的国内模型', tag: 'AGENT & MODEL', title: '选好模型，就可以开始对话。', desc: '使用 TRAE 内置模型即可起步。模型负责理解任务，Agent 负责读取文件、调用工具并执行步骤。', where: 'TRAE · Agent 窗口', whereClass: 'linux', checks: ['已选中账号可用的国内模型，并收到正常回复', '已确认使用能够读取文件和运行终端工具的本地 Agent 任务'], sections: [
    { title: '从输入框右下角选择模型', text: '点击当前模型名称，在内置模型列表中选择可用的 DeepSeek Flash，也可以选择其他适合任务的国内模型。截图中显示的名称是 DeepSeek-V4.1-Flash；可用列表与额度以自己的 TRAE 账号为准。', note: '使用内置模型无需另填 DeepSeek API Key。模型在服务端运行，不需要把模型权重下载到电脑。', link: ['查看 TRAE 官方模型说明 ↗', 'https://docs.trae.cn/ide_models'] },
    { title: '让助手说明它能做什么', text: '复制下面的话到 Agent 对话框。收到回复后，查看它是否具备文件和终端工具；下一步会让它实际检查 WSL。', code: '你好，请用中文协助我在这台 Windows 电脑上准备 Omics Skills 分析环境。请说明当前任务是本地还是云端、能否读取本机文件和调用终端。先不要安装软件或修改文件；下一步我们先检查 WSL。', shell: 'TRAE · Agent 对话框', note: '这一步只确认助手可以对话。工具实际运行在哪里，要通过后面的真实执行结果核对。' },
    { title: '可选：需要自己的 API 时再添加', optional: true, text: '如果内置模型已够用，跳过这一项。需要自己的 DeepSeek API 时，点击下方开放平台链接，注册或登录后充值 API 余额，并在 API Keys 中创建密钥。再回到 TRAE「设置 → 模型 → 添加模型」，选择 DeepSeek 服务商，填写密钥并完成校验，然后在对话框选中新增模型。', note: '自定义 API 余额与 TRAE 内置模型额度分别计算。充值在 DeepSeek 官方平台完成，密钥只在自己的客户端填写。', link: ['打开 DeepSeek 开放平台 · 充值 / 购买 API 额度 ↗', 'https://platform.deepseek.com/'] },
  ], faq: [
    ['我的列表没有 DeepSeek-V4.1-Flash', '模型名、账号权限和套餐会变化。选当前可用的 DeepSeek Flash 或其他国内模型即可，不必因为名称不同重新安装软件。'],
    ['能聊天，但不能执行命令', '确认任务运行在本机，并支持文件与终端工具。查看工具调用是否等待你的操作；如果工具不可用，先解决 Agent 的执行能力，再进入部署。'],
    ['是否全程都不需要代理？', TRAE_NETWORK_NOTE],
  ] },
  { id: 'wsl', name: '让 Agent 安装 WSL', sub: '先检查，缺少时直接安装', tag: 'WSL 2', title: '把 WSL 的检查和安装，交给 Agent。', desc: '把下面的话复制到 TRAE 本地 Agent，让它检查电脑并按需发起 WSL 和 Ubuntu 安装。已有可用环境就继续使用。', where: 'TRAE · 本地 Agent；按提示处理 Windows 管理员确认', whereClass: 'windows', checks: ['已安装并能启动一个 Ubuntu 22.04 或更高版本', 'wsl --list --verbose 中，所选 Ubuntu 的 VERSION 为 2'], sections: [
    { title: '复制给 Agent：检查并按需安装', text: '在前一步准备好的本地任务中发送这段话。助手会实际检查和执行；需要终端权限时，按 TRAE 界面提示处理。', code: '请帮我在这台 Windows 电脑上检查并安装 WSL 2 和 Ubuntu，实际执行，不只给出教程。\n1. 先确认工具运行在本机，检查 Windows 版本、wsl --status 和 wsl --list --verbose，展示结果；若工具在 WSL 中，使用 wsl.exe 访问 Windows 管理命令。\n2. 核对已有 Ubuntu 的 /etc/os-release；有 Ubuntu 22.04+ 且为 WSL 2 就复用，多个候选时让我选择。若已有环境是 WSL 1、版本太旧或状态异常，先解释修复或迁移方案与备份要求，不直接覆盖或转换。\n3. 确认尚未安装可用 Ubuntu 且系统满足要求时，请发起官方安装：wsl --install -d Ubuntu-24.04 --no-launch。需要提权时，通过当前工具支持的方式请求 Windows 管理员确认；无法提权或调用终端时，给我需要手动执行的步骤。\n4. 保留已有发行版、数据和默认设置，不自动重启。需要重启时告诉我先保存工作；首次 Ubuntu 用户名和密码由我在本地窗口设置，不在对话中填写。\n5. 展示实际命令与结果，区分安装中、等待重启、等待首次用户设置、已验收和失败。启动安装程序不等于安装成功；遇到下载错误先保留错误并说明原因。', shell: 'TRAE · Agent 对话框', note: 'Agent 能否直接发起安装取决于本地工具与权限。下载仍使用 Microsoft 官方渠道；国内网络能否顺利下载要以实际结果为准。' },
    { title: '你需要配合：管理员确认、重启和首次设置', text: '安装时可能弹出 Windows 管理员确认；只有系统提示需要重启时，先保存工作再重启。安装完成后，在开始菜单打开对应 Ubuntu，按提示设置小写英文用户名和密码；输入密码不显示字符是正常现象。已有普通用户可跳过首次设置。', note: '使用 --no-launch 会暂不打开 Ubuntu，首次用户设置留给你在本地完成。没有管理员权限时请联系设备管理员；重启后重新打开 TRAE 和本页即可继续。', link: ['查看 Microsoft WSL 安装说明 ↗', 'https://learn.microsoft.com/zh-cn/windows/wsl/install'] },
    { title: '安装结束或重启后，让 Agent 继续检查', text: '回到 TRAE，把下面的话发送给助手。验收通过后再勾选本页完成，下一步确认 Linux 用户和项目目录。', code: '请继续刚才的 WSL 安装任务。先重新检查 wsl --status 和 wsl --list --verbose，不要直接重复安装。若新对话没有记录，请根据实际结果确认进度；有多个 Ubuntu 时让我选择。对选定发行版明确使用 wsl -d 的完整名称，检查能否启动，并读取 /etc/os-release 和 whoami。尚需重启或首次用户设置时告诉我具体操作；系统组件已启用但 Ubuntu 尚未装好时，说明情况并继续缺失的安装。最后展示完整发行版名称、Ubuntu 版本、WSL 的 VERSION 和真实执行结果，确认 Ubuntu 22.04+、WSL 2 且可启动后再报告本步通过；失败则说明卡在哪里。', shell: 'TRAE · Agent 对话框', expected: '完整发行版名称：例如 Ubuntu-24.04\nUbuntu 版本：22.04 或更新\nWSL 列表中的 VERSION：2\n明确启动该发行版后：可读取系统版本和用户名', note: 'Stopped 只是当前未运行，不表示安装失败。Ubuntu 和 Ubuntu-22.04 可能是两个独立环境，后续使用刚确认的完整名称。' },
    { title: '备用：Agent 无法安装时，手动执行', optional: true, text: '仅在确认尚未安装可用 Ubuntu、但 Agent 无法调用终端或请求管理员权限时使用。点击 Windows 开始菜单，搜索 PowerShell，右键选择「以管理员身份运行」，执行下面的命令，再按提示完成重启和用户设置。', code: 'wsl --install -d Ubuntu-24.04', shell: 'Windows PowerShell · 管理员', note: '手动完成后仍回到上面的「继续检查」步骤。不确定是否已有安装时，可先在 PowerShell 运行 wsl --list --verbose，把输出交给 Agent。' },
  ], faq: [
    ['TRAE 可以全自动安装 WSL 吗？', '具备本地终端工具与相应权限的 Agent 可以检查并发起官方安装。Windows 管理员确认、必要的重启和首次 Ubuntu 用户名/密码设置需要你配合；是否安装成功以真实验收输出为准。'],
    ['重启后怎么继续？', '重新打开 TRAE 和本教程 WSL 页，把「安装结束或重启后，让 Agent 继续检查」中的话发给助手。它会先核对现状，再继续缺失步骤；无需重新从头安装。'],
    ['Agent 提示权限不足，怎么办？', '按 TRAE 提示允许本次终端操作；Windows 管理员确认需要在本机完成。若 Agent 无法请求提权，展开手动备用步骤；没有管理员权限时联系设备管理员。'],
    ['列表里有两个 Ubuntu，怎么选？', '选择包含自己项目和用户目录的发行版，让 Agent 分别只读检查再确认。不要为了统一名字卸载任何发行版。'],
    ['安装卡在 0% 或下载失败', '保留错误，检查 Microsoft 下载服务是否可访问。尚未完成安装时，可参考官方文档使用 wsl --install --web-download -d Ubuntu-24.04。'],
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
    { title: '复制给 Agent：检查并补齐基础工具', text: '在刚才的任务中继续发送。助手先检查是否缺少工具，只下载必要的部分。', code: '请在刚确认的 WSL 发行版、普通用户和工作目录中准备基础工具；先读取 omics-setup-notes.md 并核对实际执行位置。\n1. 检查 python3、git、curl、wget 和 ca-certificates。现有工具满足要求就复用；Python 需至少 3.10，缺少时用此 Ubuntu 的系统软件包补齐，不改系统 Python 链接，不安装分析依赖。\n2. 确需安装时，先用已有 APT 配置更新索引并安装缺少的工具。全部已有时不必为测试而重装，明确记录本步无需下载。需要 sudo 时让我在本地终端输入密码。\n3. 下载失败先区分网络、源地址、证书、权限或软件包锁等原因。仅在确认换源适用时，按实际 Ubuntu 版本和源文件布局，参考清华 https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/ 或中科大 https://mirrors.ustc.edu.cn/help/ubuntu.html 选择实测可用的源。先备份原文件，保留发行版代号、签名、安全更新及第三方源；不关闭证书或签名校验。再验证实际 apt update 和必要软件安装，失败则保留错误，不声称已修复。\n4. 不预先配置 pip、R 或 Conda 镜像，不改 Skills 固定下载地址和包版本。基础工具检查不代表后续 GitHub 或分析环境包已下载成功。\n5. 展示工具版本、Python 路径、证书包状态、本步实际下载结果或无需下载、是否换源及备份位置，把结果追加到工作目录的 omics-setup-notes.md。遇到异常旧版 Python，先诊断来源，不强行替换已有环境。', shell: 'TRAE · Agent 对话框' },
    { title: '你需要配合什么', text: '需要安装基础工具时，按提示在本地终端输入 Ubuntu 密码。正常情况下不用选择清华、中科大或其他镜像，也不用另外安装 pip 或 R。', note: '如果 Agent 只能给建议、不能执行 sudo，请让它提供具体命令，在目标 Ubuntu 终端执行后把结果交回验收；不要把密码发到聊天框。' },
    { title: '工具可用，就继续加载 Skills', text: '看到以下实际结果后即可继续。镜像配置不是必做任务；后续仓库和分析依赖的下载会在对应步骤单独检查。', expected: 'Python：3.10 或更新，已显示实际路径\nGit / curl / wget：可运行并返回版本\nca-certificates：已安装\n本步下载：成功，或工具齐全无需下载\n软件源：保持原配置，或已换源并记录备份\n准备记录：已追加本步结果' },
  ], faq: [
    ['必须选择镜像才能继续吗？', '不用。已有基础工具就复用，需要下载时先检查原来源。只有发生适合换源解决的问题时，再让 Agent 选择并验证；查看备用镜像说明不会更改电脑设置或清除完成记录。'],
    ['为什么原来确认过的第 5、6 步需要再确认？', '这两步新增了工作目录读写和基础工具验收，旧的镜像勾选不能代表新检查通过。原确认记录已保留，其他步骤不受影响；已有环境请让 Agent 检查复用即可。'],
    ['西湖镜像在哪里？', '西湖 Bioconductor 镜像在第 8 步「部署后需要额外 R 包？」的可选说明中，和清华、中科大一起保留。仅收录官方目录中的地址，实时可用性仍需检查。'],
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
  { id: 'environment', name: '部署并验收环境', sub: '让 Agent 执行，按报告验收', tag: 'ENVIRONMENT', title: '把部署交给 Agent，把结果核对清楚。', desc: '复用 Skills 里的固定部署流程：先生成计划，再创建独立环境，最后检查报告和测试图。', where: 'TRAE · Agent → 同一目标 WSL Ubuntu', whereClass: 'linux', checks: ['create 成功结束，report.json 中 operation 为 create、status 为 PASS', '已保存报告中的实际解释器路径，并检查生成的测试图'], sections: [
    { title: '先生成部署计划', text: '发送下面的要求，让 Agent 使用仓库原有脚本生成计划并解释结果。计划会写入报告，不安装分析依赖。', code: '先读取 omics-setup-notes.md 并核对目标位置，再按已加载的 omics-environment-setup Skill，在已确认的 WSL 发行版、普通用户和仓库目录运行 setup.py plan --profile both，使用位于仓库外的新报告目录。展示真实执行结果、平台兼容性、安装位置、所需空间和下载来源。先解释计划，暂不执行 create。', shell: 'TRAE · Agent 对话框', note: 'plan / inspect 的 PASS 只说明检查通过，不能证明分析环境可用。' },
    { title: '确认计划后，让 Agent 创建环境', text: '核对目标路径和计划后，把下面的话发送给助手。它会下载依赖并运行合成数据测试，耗时取决于网络与电脑性能。', code: '按刚才核对的计划，开始部署 Python 和 R 基础环境。使用同一 WSL 发行版和普通用户，按 Skill 运行 setup.py create --profile both --bootstrap；安装目录放在 Linux 用户目录下的独立位置，报告写到仓库外的新目录。保留原有环境、锁定版本和 SHA256 校验。完成后展示真实退出状态、report.json 的 operation/status、实际 Python/R 解释器路径和测试 PNG；失败时保留日志并说明原因。', shell: 'TRAE · Agent 对话框', note: '下载来源仍包含 GitHub 与 Anaconda。遇到错误先定位下载地址，不让助手用任意升级依赖的方式绕过问题。' },
    { title: '打开报告和测试图，确认完成', text: '让 Agent 给出本次报告的绝对路径，并在 TRAE 中打开 report.json 和测试 PNG。核对以下结果后再勾选完成。', expected: '本次报告：operation = create\n实际结果：status = PASS\nenvironments：保存准确的 Python / R 解释器路径\n测试图：已打开并检查生成的 PNG', note: '基础环境覆盖的检查以报告为准。GPU、scVI、cell2location、Monocle2 等专用方法需要后续单独检查。' },
  ], faq: [
    ['Agent 说完成了，但没有报告', '要求展示实际命令、退出状态、报告路径与内容。没有 create 报告及测试结果，不要勾选部署完成。'],
    ['显示 PASS，分析仍然失败', '先确认 PASS 来自 create / verify，再检查分析是否使用报告中的准确解释器。专用方法需要读取对应 Skill 并执行运行前检查。'],
    ['需要把整台电脑交给自动审批吗？', '不需要。本教程没有要求修改全局审批设置；按当前客户端的提示处理具体操作即可。'],
  ] },
  { id: 'finish', name: '完成与下一步', sub: '查看记录，开始分析', tag: 'READY FOR SCIENCE', title: '为你的分析工作台，留一份记录。', desc: '这份进度来自你的手动确认。真正的环境可用性，请以实际部署报告、解释器路径和测试结果为准。' },
];
