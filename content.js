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
  const parts = [{ title: '先分清：你要加速哪一种下载？', text: 'APT 用于 Ubuntu 软件，PyPI 用于 Python 包，Bioconductor 用于 R 生物信息学包。它们的地址不能混用。原来的源能正常下载，就不用改。', note: '本页不会加速 WSL 首次下载、GitHub、TRAE 下载或模型 API，也不会改写本项目锁定文件中的下载地址。' }];
  if (m.apt) parts.push(
    { title: `Ubuntu ${release}：先备份，再换源`, text: '先运行 cat /etc/os-release 确认版本，再使用上面的版本选项。命令只替换指定文件中的 Ubuntu 普通归档地址，保留发行版代号、签名、安全更新源和第三方源。已有镜像地址请按官方帮助核对。', code: `if [ -f "${file}" ]; then\n  if [ ! -e "${file}.omics-backup" ]; then\n    sudo cp -a -- "${file}" "${file}.omics-backup"\n  fi\n  if [ -f "${file}.omics-backup" ]; then\n    sudo sed -i -E 's@https?://([a-z][a-z]\\.)?archive\\.ubuntu\\.com/ubuntu/?@${m.apt}@g' "${file}"\n    sudo apt update\n  fi\nelse\n  printf '%s\\n' '未找到对应源文件，请核对 Ubuntu 版本与官方帮助。'\nfi`, shell: 'Ubuntu · Bash', note: '首次备份保留为 .omics-backup。不要同时套用两个版本配置；安全更新源仍访问 Ubuntu 官方地址。', link: [`查看${m.name} Ubuntu 帮助 ↗`,m.help] },
    { title: '确认地址和下载结果', text: '下面只显示源地址。确认其中出现所选镜像，并确认上一步 apt update 没有下载或签名错误。', code: `grep -E '^(URIs:|deb )' "${file}"`, shell: 'Ubuntu · Bash', expected: `普通软件源应包含：${m.apt}\n安全更新源保留原设置` },
    { title: 'Python：设置当前终端的 PyPI 源', text: '此设置只影响当前终端启动的 pip，不写入配置文件。实际安装包时使用部署报告对应的 Python 或项目虚拟环境，不要向系统 Python 强行安装分析包。', code: `export PIP_INDEX_URL="${m.pip}"\nprintf '%s\\n' "$PIP_INDEX_URL"`, shell: 'Ubuntu · Bash', note: '打印地址只确认配置，不证明实际下载成功。关闭终端可恢复；现在不必安装或升级 pip，不要使用 sudo pip 或 --break-system-packages。', link: ['查看 PyPI 镜像帮助 ↗',key==='ustc'?'https://mirrors.ustc.edu.cn/help/pypi.html':'https://mirrors.tuna.tsinghua.edu.cn/help/pypi/'] },
  );
  else parts.push({ title: '西湖：提供已确认的 Bioconductor 地址', text: 'Bioconductor 官方目录收录了西湖镜像。维护端本次直接访问未成功，因此不标记为已测试可用。Ubuntu 和 PyPI 请切换清华或中科大选项；不推测西湖其他软件源路径。', link: ['查看官方镜像目录 ↗',m.help] });
  parts.push(
    { title: 'R / Bioconductor：部署好环境后再设置', text: `完成后面的环境部署后，用报告对应的 R 进入控制台（提示符为 >）。以下代码只设置当前 R 会话的${m.name}镜像，不安装或升级包。`, code: `if (!exists(".omics_previous_bioc", inherits = FALSE)) {\n  .omics_previous_bioc <- list(BioC_mirror = getOption("BioC_mirror"))\n}\noptions(BioC_mirror = "${m.bioc}")\ngetOption("BioC_mirror")`, shell: '部署完成后的 R 控制台 · 不是 Bash', note: '这是 Bioconductor 源，不要填到 CRAN repos 选项。后续安装仍需匹配 R 与 Bioconductor 版本；旧版本是否可下载需单独检查。回显地址不代表网络测试通过。', link: ['核对 Bioconductor 官方镜像目录 ↗','https://bioconductor.org/about/mirrors/'] },
    { title: 'Conda 与锁定环境：普通换源并不覆盖', text: '当前 setup.py 读取 explicit 锁定文件中的完整包 URL；Miniforge 从固定 GitHub Release 下载。仅修改 .condarc 不会替换这些地址。这里不改写版本或校验值，也不承诺加速下一步的锁定环境部署。', note: '普通 conda create 的镜像配置见帮助。本项目的镜像部署需另行实现地址映射、校验保留、缺包处理和安装验收。', link: ['了解 Conda 镜像 ↗',key==='ustc'?'https://mirrors.ustc.edu.cn/help/anaconda.html':'https://mirrors.tuna.tsinghua.edu.cn/help/anaconda/'] },
  );
  return parts;
}
/* TRAE Agent 主路线；与 content.js 中保留的镜像源函数组合发布。 */
const GUIDE_VERSION = 'trae-agent-v1';
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
  { id: 'wsl', name: '检查或安装 WSL', sub: '已有 Ubuntu 就继续使用', tag: 'WSL 2', title: '让 Agent 先看看，你有没有 Linux。', desc: '日常在 TRAE 中操作，组学工具实际运行在 WSL Ubuntu。先检查现有安装，再决定是否需要下载。', where: 'TRAE · Agent；首次安装时使用管理员 PowerShell', whereClass: 'windows', checks: ['已安装并能启动一个 Ubuntu 22.04 或更高版本', 'wsl --list --verbose 中，所选 Ubuntu 的 VERSION 为 2'], sections: [
    { title: '先把这段检查要求交给 Agent', text: '让助手列出已安装的发行版。已有符合要求的 Ubuntu 就继续使用，不要因为名字不同重复安装。', code: '请只读检查这台电脑的 WSL 状态。在 Windows 终端运行 wsl --list --verbose，展示原始结果；若工具已在 WSL 中，请报告 WSL_DISTRO_NAME，并尝试通过 wsl.exe 获取列表。列出每个发行版的名称和 WSL 版本，再核对候选 Ubuntu 的 /etc/os-release。若有多个 Ubuntu，请让我选择要用的那个。现在不要安装、卸载或更改默认发行版。', shell: 'TRAE · Agent 对话框', note: '如果 Agent 无法访问 Windows 的 WSL 管理命令，在自己的 PowerShell 运行 wsl --list --verbose，把输出交给它。Stopped 表示尚未启动，不表示安装失败。' },
    { title: '只有尚未安装时，再安装 Ubuntu', optional: true, text: '点击 Windows 开始菜单，搜索 PowerShell，右键选择「以管理员身份运行」。执行下面的命令，按提示保存工作并重启电脑。已有 Ubuntu 22.04+ 可跳过。', code: 'wsl --install -d Ubuntu-24.04', shell: 'Windows PowerShell · 管理员', note: '管理员确认、重启和首次设置密码需要你在电脑上完成。重启后回到 TRAE 和本教程继续。', link: ['查看 Microsoft WSL 安装说明 ↗', 'https://learn.microsoft.com/zh-cn/windows/wsl/install'] },
    { title: '确认具体的发行版名称', text: '保留列表中你要使用的完整名称，例如 Ubuntu-22.04 或 Ubuntu-24.04。之后的检查、下载和部署都要落在同一个发行版和 Linux 用户中。', code: 'wsl --list --verbose', shell: 'Windows PowerShell · 检查', expected: '例如：Ubuntu-22.04    Running    2\n或：Ubuntu-24.04    Stopped    2', note: 'Ubuntu 和 Ubuntu-22.04 可以是两个独立环境。不要只看 Linux 字样就认为选对了。' },
  ], faq: [
    ['列表里有两个 Ubuntu，怎么选？', '选择包含自己项目和用户目录的发行版，让 Agent 分别只读检查再确认。不要为了统一名字卸载任何发行版。'],
    ['安装卡在 0% 或下载失败', '保留错误，检查 Microsoft 下载服务是否可访问。尚未完成安装时，可参考官方文档使用 wsl --install --web-download -d Ubuntu-24.04。'],
    ['提示需要启用虚拟化', '任务管理器 → 性能 → CPU 可查看虚拟化状态。未启用时按电脑厂商说明设置，或联系设备管理员；Agent 不能代替 BIOS/UEFI 中的操作。'],
  ] },
  { id: 'ubuntu', name: '确认 Linux 工作位置', sub: '固定发行版、用户和目录', tag: 'LINUX WORKSPACE', title: '先确认位置，再让 Agent 动手。', desc: '用真实工具输出确认目标 Ubuntu、普通用户、Linux 架构与工作目录。Agent 可以在 Linux 工作区运行，也可以从 Windows 明确调用指定 WSL。', where: 'TRAE · Agent 执行检查', whereClass: 'linux', checks: ['已确认目标发行版、普通 Linux 用户与 /home/ 下的项目目录', 'Agent 实际执行结果为 Linux x86_64，Python 至少为 3.10'], sections: [
    { title: '第一次启动？先完成本地用户设置', text: '刚安装 Ubuntu 时，在开始菜单打开对应 Ubuntu，按提示设置小写英文用户名和密码。已有普通用户和项目可以直接使用。输入密码时不显示字符是正常现象。', note: '如果当前用户是 root，让 Agent 先查找已有普通用户；不要把本教程的分析环境放到 /root 或 Windows 挂载目录里，也不要直接改动已有项目。' },
    { title: '复制检查要求，填入自己的发行版和目录', text: '把下方两个方括号替换成前一步确认的完整名称与自己的目录，再交给 Agent。已有项目无需搬迁；没有目录时先让助手给出创建建议。', code: '目标发行版：[填写前一步的完整名称]\n目标 Linux 工作目录：[填写已有的 /home/用户名/项目目录，或说明尚未创建]\n请只读确认目标发行版、Linux 用户及工作目录。用终端实际执行 pwd、uname -s、uname -m、whoami、python3 --version、cat /etc/os-release，并读取 WSL_DISTRO_NAME，展示原始结果。若工具从 Windows 发起，每次都明确指定 wsl -d 的目标发行版、-u 的普通用户和 --cd 的 Linux 目录，不使用默认发行版。发现目录不存在或身份不对时先停下来说明。', shell: 'TRAE · Agent 对话框', expected: '发行版：与你选定的名称一致\n用户：你的普通 Linux 用户\npwd：你的 /home/ 下项目目录\nuname -s：Linux\nuname -m：x86_64\nPython：3.10 或更新版本', note: 'Linux 字样本身不能确认具体 WSL 发行版。请展开实际工具调用记录，核对调用参数和输出。' },
    { title: '缺少基础工具时，让助手补齐', text: '检查通过后，按需要让 Agent 在刚确认的 Ubuntu 中安装 Python、Git 和下载工具。需要 sudo 时，由你在相应终端输入密码。', code: '请在刚确认的目标 Ubuntu 和普通用户下检查 python3、git、curl、wget、ca-certificates。仅补齐缺少的系统基础工具，先说明安装内容；不要安装分析包或改动已有 Python/R 环境。如果下载失败，先记录错误，参考下一步的镜像源说明。', shell: 'TRAE · Agent 对话框' },
    { title: '可选：在 TRAE 的 IDE 窗口直接连接 WSL', optional: true, text: '需要查看 Linux 文件时，可以返回 TRAE 的 IDE 窗口，在远程资源管理器选择 WSL，连接目标 Ubuntu，再打开项目目录。也可继续让 Agent 通过明确的 wsl 调用完成任务。', note: '只打开 WSL 终端或浏览 \\wsl.localhost 文件夹，不代表整个编辑器已远程连接。误进 SSH 命令输入框时按 Esc 返回。', link: ['查看 TRAE WSL 官方图解 ↗', 'https://docs.trae.cn/ide_wsl'] },
  ], faq: [
    ['提示 uname 不是命令', '命令正在 PowerShell 中运行。让 Agent 使用明确指定发行版的 wsl 调用，或在 TRAE 中连接目标 WSL 后打开 Linux 终端。不要在 PowerShell 里直接运行 Bash 命令。'],
    ['每次执行都跑到另一个 Ubuntu', '检查工具调用是否只有 wsl 而没有 -d。要求每次明确指定发行版、用户和工作目录，新对话也重新核对；不必修改系统默认发行版。'],
    ['输出 aarch64 或 Python 版本太低', '本教程当前的环境锁定文件需要 Linux x86_64，启动脚本需要 Python 3.10+。先解决兼容性再部署，不要让 Agent 忽略检查。'],
  ] },
  { id: 'mirrors', name: '按需配置镜像', sub: '清华、中科大、西湖', tag: 'DOWNLOAD SOURCES', title: '下载慢时，再选择镜像来源。', desc: '可以把本页对应软件的配置交给 Agent，在已确认的 Ubuntu 中执行。下载正常时保持原源即可。', where: '目标 WSL Ubuntu；R 镜像在环境部署后设置', whereClass: 'linux', checks: ['已配置需要的镜像，或决定继续使用原来的源', '已了解换源范围：不会改写锁定环境或加速 GitHub / AI API'], faq: [
    ['可以让 Agent 自动选择镜像吗？', '可以让它检查网络并提出建议。执行前核对 Ubuntu 版本与软件类型，保留备份、签名和固定依赖版本。'],
    ['西湖镜像能用于所有下载吗？', '本页仅收录官方目录确认的西湖 Bioconductor 地址，实时可用性待确认。Ubuntu 和 PyPI 请选择清华或中科大。'],
    ['换源后部署仍然下载失败', '当前部署脚本使用 GitHub Miniforge 和 Anaconda 的完整锁定包 URL，普通换源不会覆盖这些地址。保留日志定位失败的下载，不跳过校验。'],
  ] },
  { id: 'skills', name: '加载 Omics Skills', sub: '把方法与脚本交给 Agent', tag: 'OMICS SKILLS', title: '让 Agent 读到你的分析方法。', desc: '先准备完整仓库，再加载环境部署 Skill。确认助手读到了真实文件和引用资源，下一步才开始安装分析环境。', where: 'TRAE · Agent；文件位于目标 WSL 项目中', whereClass: 'linux', checks: ['已准备完整 Skills 仓库，部署脚本和引用文件都可读取', 'Agent 已实际读取部署 SKILL.md，并说明调用路径和部署计划'], sections: [
    { title: '让 Agent 获取或复用完整仓库', text: '将下面的要求发送给助手。已有仓库直接复用；首次下载会访问 GitHub。', code: '请在刚确认的 WSL 发行版、普通用户和工作目录中准备 https://github.com/ning2978/codex-omics-skills 。已有仓库则检查并复用，不覆盖、不强制更新；没有才克隆完整仓库。展示仓库绝对路径和当前版本，确认 skills/_meta/omics-environment-setup/SKILL.md、scripts/setup.py（位于该 Skill 内）及其引用文件存在。现在只准备文件，不安装分析环境。', shell: 'TRAE · Agent 对话框', note: '下载 ZIP 也要保留完整目录结构，包含 scripts、references、锁定文件和 _shared 等资源。仓库名中的 codex 不要求安装 Codex 客户端。', link: ['打开 Omics Skills 仓库 ↗', REPO] },
    { title: '先明确加载部署 Skill', text: '让 Agent 通过文件工具读取说明及引用内容。这条方式可以直接开始当前任务；是否已经登记为自动发现的技能，要看下一项的技能列表。', code: '请从刚确认的完整仓库加载 skills/_meta/omics-environment-setup/SKILL.md，并实际读取它引用的 environment-installation-policy/SKILL.md 和 references/platforms.md。说明你实际读取的文件路径、目标 WSL 发行版、部署脚本路径及 Python/R 基础环境的计划。现在只读取与说明，暂不执行 create。', shell: 'TRAE · Agent 对话框', note: '只回复「已加载」还不够。应能列出真实读取的文件和对应的脚本路径；缺少引用文件时先补齐仓库。' },
    { title: '可选：登记到 TRAE 的技能列表', optional: true, text: '需要后续任务自动调用时，在「设置 → 技能与命令 → 创建」中选择项目技能，可导入 SKILL.md 或包含它的 ZIP。也可以使用当前版本支持的 .agents/skills 导入设置。添加后在技能列表确认已启用，再新建任务验证调用。', note: 'Omics 仓库有跨目录引用，不要仅移动一个 SKILL.md。让 Agent 检查导入后的路径、脚本和共享资源；未验证前继续使用完整仓库中的明确路径。没有声称全部 Skills 已自动注册。', link: ['查看 TRAE 官方 Skills 导入说明 ↗', 'https://docs.trae.cn/ide_skills'] },
  ], faq: [
    ['加载 Skill 就等于装好了 Scanpy 或 Seurat 吗？', '还没有。Skill 提供方法、脚本和约束，实际 Python/R 依赖需要下一步创建并验证。'],
    ['Agent 看不到 WSL 中的文件', '让它通过指定发行版读取文件，或在 TRAE IDE 中打开对应 WSL 项目。若内置文件工具只能看到 Windows 文件，请如实使用 WSL 终端读取，不要凭空声称已经读过。'],
    ['导入后提示缺少脚本或 references', '通常是只导入了 SKILL.md，或移动位置破坏了相对路径。保留完整仓库并使用原路径，待所有引用校验通过后再使用自动加载。'],
  ] },
  { id: 'environment', name: '部署并验收环境', sub: '让 Agent 执行，按报告验收', tag: 'ENVIRONMENT', title: '把部署交给 Agent，把结果核对清楚。', desc: '复用 Skills 里的固定部署流程：先生成计划，再创建独立环境，最后检查报告和测试图。', where: 'TRAE · Agent → 同一目标 WSL Ubuntu', whereClass: 'linux', checks: ['create 成功结束，report.json 中 operation 为 create、status 为 PASS', '已保存报告中的实际解释器路径，并检查生成的测试图'], sections: [
    { title: '先生成部署计划', text: '发送下面的要求，让 Agent 使用仓库原有脚本生成计划并解释结果。计划会写入报告，不安装分析依赖。', code: '请按已加载的 omics-environment-setup Skill，在已确认的 WSL 发行版、普通用户和仓库目录运行 setup.py plan --profile both，使用位于仓库外的新报告目录。展示真实执行结果、平台兼容性、安装位置、所需空间和下载来源。先解释计划，暂不执行 create。', shell: 'TRAE · Agent 对话框', note: 'plan / inspect 的 PASS 只说明检查通过，不能证明分析环境可用。' },
    { title: '确认计划后，让 Agent 创建环境', text: '核对目标路径和计划后，把下面的话发送给助手。它会下载依赖并运行合成数据测试，耗时取决于网络与电脑性能。', code: '按刚才核对的计划，开始部署 Python 和 R 基础环境。使用同一 WSL 发行版和普通用户，按 Skill 运行 setup.py create --profile both --bootstrap；安装目录放在 Linux 用户目录下的独立位置，报告写到仓库外的新目录。保留原有环境、锁定版本和 SHA256 校验。完成后展示真实退出状态、report.json 的 operation/status、实际 Python/R 解释器路径和测试 PNG；失败时保留日志并说明原因。', shell: 'TRAE · Agent 对话框', note: '下载来源仍包含 GitHub 与 Anaconda。遇到错误先定位下载地址，不让助手用任意升级依赖的方式绕过问题。' },
    { title: '打开报告和测试图，确认完成', text: '让 Agent 给出本次报告的绝对路径，并在 TRAE 中打开 report.json 和测试 PNG。核对以下结果后再勾选完成。', expected: '本次报告：operation = create\n实际结果：status = PASS\nenvironments：保存准确的 Python / R 解释器路径\n测试图：已打开并检查生成的 PNG', note: '基础环境覆盖的检查以报告为准。GPU、scVI、cell2location、Monocle2 等专用方法需要后续单独检查。' },
  ], faq: [
    ['Agent 说完成了，但没有报告', '要求展示实际命令、退出状态、报告路径与内容。没有 create 报告及测试结果，不要勾选部署完成。'],
    ['显示 PASS，分析仍然失败', '先确认 PASS 来自 create / verify，再检查分析是否使用报告中的准确解释器。专用方法需要读取对应 Skill 并执行运行前检查。'],
    ['需要把整台电脑交给自动审批吗？', '不需要。本教程没有要求修改全局审批设置；按当前客户端的提示处理具体操作即可。'],
  ] },
  { id: 'finish', name: '完成与下一步', sub: '保存报告，开始分析', tag: 'READY FOR SCIENCE', title: '为你的分析工作台，留一份记录。', desc: '这份进度来自你的手动确认。真正的环境可用性，请以实际部署报告、解释器路径和测试结果为准。' },
];
