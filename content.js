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
  const parts = [{ title: '先分清：你要加速哪一种下载？', text: 'APT 用于 Ubuntu 软件，PyPI 用于 Python 包，Bioconductor 用于 R 生物信息学包。它们的地址不能混用。原来的源能正常下载，就不用改。', note: '本页不会加速 WSL 首次下载、GitHub、Claude Code 安装器或 DeepSeek API，也不会改写本项目锁定文件中的下载地址。' }];
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
const SOURCES = [
  ['Microsoft · 安装 WSL', 'https://learn.microsoft.com/zh-cn/windows/wsl/install'],
  ['Microsoft · 在 WSL 中使用 VS Code', 'https://learn.microsoft.com/zh-cn/windows/wsl/tutorials/wsl-vscode'],
  ['Claude Code · 安装与验证', 'https://code.claude.com/docs/en/setup'],
  ['DeepSeek · 接入 Claude Code', 'https://api-docs.deepseek.com/zh-cn/guides/coding_agents/'],
  ['OpenAI · Codex CLI', 'https://learn.chatgpt.com/docs/codex/cli'],
  ['Omics Skills · 部署说明', REPO + '/tree/main/skills/_meta/omics-environment-setup'],
  ['清华 · Ubuntu 镜像', 'https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/'],
  ['清华 · PyPI 镜像', 'https://mirrors.tuna.tsinghua.edu.cn/help/pypi/'],
  ['中科大 · PyPI 镜像', 'https://mirrors.ustc.edu.cn/help/pypi.html'],
  ['Bioconductor · 官方镜像目录（含西湖、清华、中科大）', 'https://bioconductor.org/about/mirrors/'],
  ['清华 · Conda 镜像', 'https://mirrors.tuna.tsinghua.edu.cn/help/anaconda/'],
];
const STEPS = [
  { id: 'prepare', name: '开始前的准备', sub: '认识这段安装旅程', tag: '准备', title: '准备好，迈出第一步。', desc: '把复杂的环境配置，拆成你能完成的小步骤。我们会陪你从 Windows 出发，一直到基础组学环境就绪。' },
  { id: 'wsl', name: '安装 WSL', sub: '让 Windows 也能运行 Linux', tag: 'WINDOWS', title: '给 Windows，添一个 Linux 工作间。', desc: 'WSL 让你在 Windows 里使用 Linux。你的组学工具会在 Ubuntu 中运行，日常使用的 Windows 仍然在。', where: 'Windows PowerShell · 管理员', whereClass: 'windows', checks: ['已重启电脑，并能够打开 Ubuntu', 'wsl --list --verbose 中，Ubuntu 的 VERSION 显示为 2'], sections: [
    { title: '以管理员身份打开 PowerShell', text: '点击 Windows 开始菜单，搜索 PowerShell，右键选择「以管理员身份运行」，在系统询问时选择「是」。看到 PS C:\\ 开头的提示符，就找对窗口了。', visual: 'powershell' },
    { title: '安装 Ubuntu，然后按提示重启', text: '复制下面的命令，粘贴到 PowerShell，按 Enter。这里明确选择 Ubuntu 24.04；下载时间取决于网络。安装完成后保存其他工作，再手动重启电脑。', code: 'wsl --install -d Ubuntu-24.04', shell: 'PowerShell · 管理员', note: '已经安装了 Ubuntu 22.04 或更高版本？可以跳过安装，先用下一条命令检查现有发行版。不要卸载已有环境。' },
    { title: '回来后，确认使用 WSL 2', text: '重启后再次打开 PowerShell，查看发行版列表。首次使用 Ubuntu 时，下一步会教你设置本地用户名。', code: 'wsl --list --verbose', shell: 'PowerShell', expected: 'NAME                STATE           VERSION\nUbuntu-24.04        Stopped         2', note: 'Stopped 只是当前没有启动；看见 VERSION 为 2 即符合这项要求。如果为 1，按官方 WSL 指引升级后再继续。' },
  ], faq: [
    ['安装卡在 0%，怎么办？', '先确认网络可访问 Microsoft 下载服务。官方还提供 web-download 安装方式：wsl --install --web-download -d Ubuntu-24.04。仅在尚未完成安装时尝试，并等待命令结束。'],
    ['提示需要启用虚拟化，或出现 0x80370102', '打开任务管理器 → 性能 → CPU，查看「虚拟化」状态。若未启用，需要按电脑厂商说明进入 BIOS/UEFI 设置；不熟悉时请联系设备管理员。启用后重启，再按 Microsoft 排错文档操作。'],
    ['我的列表里叫 Ubuntu，不叫 Ubuntu-24.04', '已有发行版可以继续使用。在 Ubuntu 里运行 cat /etc/os-release，确认版本至少为 22.04；不要为了改名字重装系统。'],
  ] },
  { id: 'ubuntu', name: '设置 Ubuntu', sub: '创建你的 Linux 本地用户', tag: 'UBUNTU', title: '认识你的新工作间。', desc: '第一次打开 Ubuntu，只需要设置一个本地用户名和密码。它不是新的在线账号，也不用邮箱注册。', where: 'Ubuntu 终端', whereClass: 'linux', checks: ['已经创建 Linux 用户，并记住了密码', 'uname -m 输出 x86_64，Python 版本至少为 3.10'], sections: [
    { title: '创建本地用户名和密码', text: '在开始菜单搜索并打开 Ubuntu。按提示输入用户名，例如 researcher，再设置密码并重复输入。用户名建议用小写英文字母。', expected: 'Enter new UNIX username: researcher\nNew password:\nRetype new password:', note: '输入密码时不会出现字符或星号，这是 Linux 的正常行为。直接输入后按 Enter。不要把密码填到这个网站。' },
    { title: '安装教程需要的基础工具', text: '在 Ubuntu 窗口依次运行下面两行命令。出现 [sudo] password 时，输入刚才设置的 Linux 密码；询问是否继续时，核对后输入 Y。', code: 'sudo apt update\nsudo apt install python3 git curl ca-certificates wget', shell: 'Ubuntu · Bash', note: '这些是系统基础工具。Scanpy 和 Seurat 将由后面的部署脚本放到独立环境。' },
    { title: '确认系统与 Python 版本', text: '当前部署流程面向 Linux x86_64。若输出 aarch64（ARM），请先停在这里；这份基础环境锁定文件不支持该架构。', code: 'uname -m\npython3 --version\ncat /etc/os-release', shell: 'Ubuntu · Bash', expected: 'x86_64\nPython 3.12.x\n… Ubuntu 24.04 …', note: '上面是示意输出，具体小版本可以不同；Ubuntu 至少 22.04，启动脚本所用 Python 至少 3.10。' },
  ], faq: [
    ['密码打不进去，也没有星号', '这是正常的隐藏输入。点击终端，直接输入密码，再按 Enter。若提示 incorrect password，检查大小写和输入法后重试。'],
    ['sudo 提示没有权限', '请确认你正在使用首次创建的普通 Linux 用户。如果这是学校或单位预配的环境，联系管理员提供软件安装权限，不要盲目改系统权限。'],
    ['apt 下载失败', '先确认电脑网络和系统时间正常，保留完整错误。重试 sudo apt update；如果是证书或网络策略错误，应先修复连接，不要关闭证书验证。'],
  ] },
  { id: 'mirrors', name: '配置镜像源', sub: '按软件类型选择下载来源', tag: 'DOWNLOAD SOURCES', title: '下载慢？换一个合适的来源。', desc: '镜像源是软件包的下载站。按软件类型选择一家即可；官方源速度正常时，也可以保持不变。', where: 'Ubuntu 终端；R 设置在部署完成后的 R 控制台', whereClass: 'linux', checks: ['已配置需要的镜像，或决定继续使用原来的源', '已了解换源范围：不会改写锁定环境或加速 GitHub / AI API'], faq: [
    ['三家镜像可以随便互换吗？', '不能。Ubuntu、PyPI、Conda、CRAN 和 Bioconductor 的地址不同。此页西湖选项仅提供官方目录确认过的 Bioconductor 地址；Ubuntu 和 PyPI 请选择清华或中科大。'],
    ['配置镜像后，下一步部署还是下载很慢', '现有 setup.py 使用 explicit 锁定文件中的完整包地址，Miniforge 也从固定 GitHub Release 下载。普通 pip、Conda 或 R 换源不会改写这些地址。本页不修改锁定文件、版本或校验值；部署仍慢时保留日志定位具体下载源。'],
    ['镜像提示 404 或缺少旧版本', '先核对 Ubuntu 版本、软件类型和镜像同步状态。Bioconductor 的历史版本并非每家都保留；可以按已安装 R 对应的 Bioconductor 版本检查西湖目录，不要为了换源升级或降级分析环境。'],
    ['如何恢复原来的源？', 'APT 用本页备份恢复命令；PyPI 会话变量随终端关闭而失效；R 设置可使用本页恢复命令或重新启动 R。页面默认不改写 .condarc、pip.conf 或 .Rprofile。'],
    ['西湖镜像一定可以访问吗？', '地址列在 Bioconductor 官方镜像目录中，但本次从维护端直接访问超时或被拒绝，尚未确认实时可用。请在自己的网络测试，失败时换清华、中科大或官方源。'],
  ] },
  { id: 'vscode', name: '连接 VS Code', sub: '在熟悉的窗口里使用 Linux', tag: 'WORKSPACE', title: '把 VS Code，连接到 Ubuntu。', desc: 'VS Code 安装在 Windows，项目和分析工具放在 Linux。连接后，你就能在同一个窗口查看文件、打开终端。', where: 'Windows 安装 VS Code → Ubuntu 打开项目', whereClass: 'windows', checks: ['VS Code 左下角显示 WSL: Ubuntu（或对应版本名）', 'VS Code 终端中的 pwd 指向 /home/ 下的工作目录'], sections: [
    { title: '安装 Windows 版 VS Code 和 WSL 扩展', text: '打开官方下载页，选择适合电脑的 Windows 安装包。安装时勾选 Add to PATH。启动 VS Code，按 Ctrl + Shift + X 打开扩展，搜索 WSL，安装 Microsoft 发布的 WSL 扩展。', link: ['下载 VS Code ↗', 'https://code.visualstudio.com/download'] },
    { title: '从 Ubuntu 打开工作目录', text: '回到 Ubuntu 终端，依次运行下面三行。第一次会下载 VS Code Server，稍等片刻。最后一行的点表示「打开当前文件夹」。', code: 'mkdir -p ~/omics-workspace\ncd ~/omics-workspace\ncode .', shell: 'Ubuntu · Bash', visual: 'vscode' },
    { title: '确认终端也在 Linux 中', text: '在 VS Code 菜单选择「终端 → 新建终端」，输入下面的命令。应看到 /home/你的用户名/omics-workspace。后续标注 Ubuntu 的命令，都在这个终端运行。', code: 'pwd\nuname -s', shell: 'VS Code · WSL 终端', expected: '/home/researcher/omics-workspace\nLinux', note: '如果提示符以 PS C:\\ 开头，说明仍在 Windows PowerShell。点击左下角远程连接图标，选择连接到 WSL，再打开新终端。' },
  ], faq: [
    ['code: command not found', '确认 Windows 版 VS Code 已安装且启用了 Add to PATH。关闭并重新打开 Ubuntu 终端后重试；也可在 VS Code 按 Ctrl + Shift + P，搜索 WSL 并选择连接，再打开 /home/ 下的目录。'],
    ['左下角没有 WSL 标识', '检查 WSL 扩展是否来自 Microsoft 且已启用。按 Ctrl + Shift + P 搜索 WSL，选择连接到 WSL；普通 Windows 窗口不能代替远程连接窗口。'],
    ['文件应该放在哪里？', '分析环境和项目优先放在 ~/omics-workspace 等 Linux 文件系统目录。WSL 也能访问 /mnt/c 等 Windows 磁盘，但不要把本教程的环境安装目录改到那里。'],
  ] },
  { id: 'ai', name: '配置 AI 助手', sub: '选择工具并完成连接', tag: 'AI ASSISTANT', title: '给工作间，配一位 AI 助手。', desc: '选择一条路线，页面会跟着切换。Claude Code + DeepSeek 使用 DeepSeek API；Codex 使用它自己的登录方式。', where: 'VS Code · WSL 终端', whereClass: 'linux', checks: ['所选工具的版本命令可以正常运行', '已在工作目录启动工具，并收到一条正常回复'], faq: [
    ['claude 或 codex: command not found', '先查看安装器输出的 PATH 提示，按提示操作，再关闭并重新打开终端。Claude 原生安装通常位于 ~/.local/bin；可运行 ~/.local/bin/claude --version 检查。'],
    ['DeepSeek 返回 401 或余额错误', '401 通常需要检查密钥是否正确、是否撤销，以及当前终端是否重新配置了令牌。余额错误需到 DeepSeek 官方控制台核对 API 余额。网页聊天账号的可用次数不代表 API 额度。'],
    ['关闭终端后，DeepSeek 配置失效了', '本教程使用当前会话环境变量，没有把密钥写入磁盘。重新打开终端后，需要再次配置地址、模型和密钥，然后在同一终端启动 claude。'],
    ['DeepSeek 路线仍然提示登录或不支持模型', '确认环境变量设置和启动 claude 在同一个 Ubuntu 终端，并查看页面中的 DeepSeek 官方接入说明。模型名与客户端行为会更新；本地网站没有实际验证你的 API 账号，不要把密钥发给维护者。'],
  ] },
  { id: 'skills', name: '准备 Omics Skills', sub: '接上你的分析工具箱', tag: 'OMICS SKILLS', title: '把分析方法，放进工作目录。', desc: '先下载 Skills 仓库。它包含分析说明、脚本和环境配置；下载完成后，还需要下一步创建真正的分析环境。', where: 'VS Code · WSL 终端', whereClass: 'linux', checks: ['仓库下载成功，能看到环境部署 SKILL.md', '已了解当前 AI 路线如何读取这些说明'], sections: [
    { title: '获取公开仓库', text: '在 WSL 终端依次执行。首次下载公开仓库通常不需要注册 GitHub。若目录已存在，先检查内容，不要覆盖或删除。', code: 'cd ~/omics-workspace\ngit clone https://github.com/ning2978/codex-omics-skills.git\ncd codex-omics-skills', shell: 'VS Code · WSL 终端' },
    { title: '确认部署入口存在', text: '这份说明将负责创建独立的 Python 和 R 环境。命令应打印出相对路径；如果提示文件不存在，先检查当前工作目录。', code: 'ls skills/_meta/omics-environment-setup/SKILL.md\npython3 scripts/install_skills.py --list', shell: 'VS Code · WSL 终端', note: '安装 Skills 文件不等于安装分析软件。先完成文件准备，再运行下一步的环境部署。' },
  ], faq: [
    ['git clone 下载失败', '先用浏览器确认 GitHub 仓库可以访问，再检查终端网络。出现目标目录已存在时，先进入目录查看 README；不要执行删除命令。如果浏览器能下载 ZIP，也可以解压到 Linux 工作目录，再打开其中的仓库目录。'],
    ['安装器显示 SKIP，返回非零状态', '仓库安装器默认保留已有同名目录。这不一定是损坏；检查它列出的目标路径和文件版本。不要为了消除提示直接使用 --force，它会覆盖同名文件。'],
    ['为什么 Claude Code 没有列出所有 Skills？', '当前仓库采用分类目录并按 Codex 方式发布，本向导不假设 Claude Code 自动发现全部嵌套 Skills。Claude 路线使用明确的文件路径读取部署说明；完整技能自动发现还需单独适配和测试。'],
  ] },
  { id: 'environment', name: '部署基础环境', sub: '创建、验证，再开始分析', tag: 'ENVIRONMENT', title: '最后，把分析环境准备好。', desc: '复用 Omics Skills 的部署脚本，创建独立环境并运行合成数据测试。你可以先查看计划，再开始安装。', where: 'VS Code · WSL 终端（仓库目录）', whereClass: 'linux', checks: ['create 成功结束，report.json 中 operation 为 create、status 为 PASS', '已保存报告中的实际解释器路径，并检查生成的测试图'], sections: [
    { title: '进入仓库，查看安装计划', text: '计划会写入报告，不会安装依赖。检查报告中的平台兼容性和建议操作，再继续。每次使用带时间标记的新报告目录。', code: 'cd ~/omics-workspace/codex-omics-skills\npython3 skills/_meta/omics-environment-setup/scripts/setup.py plan --profile both --report-dir "$HOME/omics-reports/plan-$(date +%Y%m%d-%H%M%S)"', shell: 'VS Code · WSL 终端', note: 'plan 或 inspect 的 PASS 只表示检查成功，不代表环境已经能运行分析。' },
    { title: '创建 Python 和 R 基础环境', text: '此命令会下载 Miniforge 和分析依赖，安装到 Linux 用户目录，并自动执行运行验证。所需时间与空间取决于网络和包体积；运行期间保持终端开启。', code: 'python3 skills/_meta/omics-environment-setup/scripts/setup.py create --profile both --bootstrap --install-dir "$HOME/omics-environments" --report-dir "$HOME/omics-reports/create-$(date +%Y%m%d-%H%M%S)"', shell: 'VS Code · WSL 终端', note: '部署过程不需要 sudo，也不会升级你已有的分析环境。若遇到失败，保留日志，先排查原因，再使用新的安装和报告目录重试。' },
    { title: '打开报告，核对结果', text: '在 VS Code 打开 ~/omics-reports，进入刚生成的 create-日期时间 文件夹，查看 report.json。确认 operation 是 create、status 是 PASS，保存 environments 中记录的实际 Python/R 路径，并检查报告目录中的测试 PNG。', code: 'code "$HOME/omics-reports"', shell: 'VS Code · WSL 终端', expected: '核对本次 create 报告：\n• operation = create\n• status = PASS\n• environments 中的实际环境与解释器路径\n• 联合检查结果与测试图', note: '基础环境覆盖 Scanpy、Seurat、桥接、DotPlot 和 edgeR。scVI、cell2location、Monocle2、GPU 等专用方法仍需自己的环境检查。' },
  ], faq: [
    ['下载失败或校验失败', '保留当前报告目录，查看日志中的下载地址和错误，先解决网络或证书问题。SHA256 不匹配时不要执行下载文件，也不要关闭校验；修复后使用新的安装和报告目录重建。'],
    ['显示 PASS，但分析仍然报错', '先确认 PASS 来自 create 或 verify，而不是 plan/inspect。后续分析必须使用报告中记录的准确解释器；默认 python 或 Rscript 不一定指向新环境。专用方法还需 runtime-preflight。'],
    ['我的电脑是 ARM 或内存不够', '当前向导的 Linux 锁定环境只支持 x86_64。若硬件不符合要求，先停止安装并考虑兼容的服务器；环境能安装也不代表能运行任意规模的数据。'],
  ] },
  { id: 'finish', name: '完成与下一步', sub: '带着记录，开始你的研究', tag: 'READY FOR WHAT’S NEXT', title: '准备工作，有了清晰的记录。', desc: '下面是你亲自确认过的安装步骤。网站不会读取电脑的真实环境；实际可用状态，请以部署脚本的报告为准。' },
];
function aiSections(route) {
  if (route === 'codex') return [
    { title: '在 WSL 中安装 Codex', text: '使用官方 Linux 安装入口。以下命令会下载并执行 OpenAI 提供的安装器；请先通过官方说明确认来源。', code: 'curl -fsSL https://chatgpt.com/codex/install.sh | sh', shell: 'VS Code · WSL 终端', link: ['查看 Codex 官方说明 ↗', 'https://learn.chatgpt.com/docs/codex/cli'] },
    { title: '验证版本，然后登录', text: '先确认版本命令成功，再从工作目录启动 Codex，按照工具提示选择可用的登录方式。账号权限和费用以官方界面为准。', code: 'codex --version\ncd ~/omics-workspace\ncodex', shell: 'VS Code · WSL 终端' },
    { title: '发送第一条消息', text: '将下面的话发送到 Codex 对话框，收到回复后再继续。', code: '请用中文说明当前工作目录和操作系统。先不要安装软件，也不要修改文件。', shell: 'Codex 对话框', note: '这一步只验证工具能对话；组学软件将在后面单独安装。' },
  ];
  return [
    { title: '安装 Claude Code', text: '这里使用官方原生安装方式，不需要 Node.js 或 npm。另一种 npm 安装方式才需要先装 Node.js（通常自带 npm）。两条路线选一条即可；本教程继续使用原生安装。下面的命令会下载并执行官方安装器。', code: 'curl -fsSL https://claude.ai/install.sh | bash', shell: 'VS Code · WSL 终端', link: ['查看 Claude Code 安装说明 ↗', 'https://code.claude.com/docs/en/setup'] },
    { title: '确认版本，准备 DeepSeek API Key', text: '先运行版本检查。再前往 DeepSeek 开放平台注册或登录，创建 API Key，并查看 API 余额。密钥只在自己的 Ubuntu 终端输入，本网站没有密钥输入框。', code: 'claude --version', shell: 'VS Code · WSL 终端', link: ['打开 DeepSeek 开放平台 ↗', 'https://platform.deepseek.com/'] },
    { title: '设置接入地址和模型', text: '复制到 Ubuntu 终端执行。模型设置按 2026-10-13 核对的官方文档填写；之后若官方调整模型名，请以链接中的接入说明为准。', code: 'export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"\nexport ANTHROPIC_MODEL="deepseek-flash[1m]"\nexport ANTHROPIC_DEFAULT_OPUS_MODEL="deepseek-flash[1m]"\nexport ANTHROPIC_DEFAULT_SONNET_MODEL="deepseek-flash[1m]"\nexport ANTHROPIC_DEFAULT_HAIKU_MODEL="deepseek-flash"\nexport CLAUDE_CODE_SUBAGENT_MODEL="deepseek-flash"\nexport CLAUDE_CODE_EFFORT_LEVEL="max"', shell: 'VS Code · WSL 终端', link: ['查看 DeepSeek 官方接入说明 ↗', 'https://api-docs.deepseek.com/zh-cn/guides/coding_agents/'] },
    { title: '在本机隐藏输入密钥', text: '执行下面的命令后，粘贴你刚创建的 API Key，再按 Enter。输入不会显示，也不会把密钥文本写进这条命令的历史记录。', code: 'read -rsp "DeepSeek API Key: " ANTHROPIC_AUTH_TOKEN', shell: 'VS Code · WSL 终端', note: '完成输入后再运行下面一段。令牌只保留在当前终端会话中，关闭后需要重新输入。' },
    { title: '启动助手，试着打个招呼', text: '在同一终端执行，按客户端提示完成首次设置。进入对话后发送「你好，请用中文回复」。收到正常回答后确认本步完成。', code: 'export ANTHROPIC_AUTH_TOKEN\ncd ~/omics-workspace\nclaude', shell: 'VS Code · WSL 终端', note: '此路线依据官方接入文档整理；你的 API 账号、额度与当前客户端组合仍需要实际连接验证。' },
  ];
}
function skillSections(route) {
  if (route === 'codex') return [
    { title: '按仓库安装器准备 Skills', text: '先预览安装位置，再执行安装。默认位置为 CODEX_HOME/skills，未设置时为 ~/.codex/skills。安装器保留分类和共享资源结构。', code: 'python3 scripts/install_skills.py --dry-run\npython3 scripts/install_skills.py', shell: 'VS Code · WSL 终端', note: '安装后重新开启 Codex 对话。如当前客户端没有自动发现嵌套 Skill，可明确让它读取下面的仓库内说明文件。' },
    { title: '把部署说明交给 Codex', text: '在仓库目录启动 Codex，把下面的话发送到对话框。也可以直接执行下一步的固定部署命令。', code: '请读取 skills/_meta/omics-environment-setup/SKILL.md 及其引用的安装策略，先检查当前 WSL 平台并生成 Python 与 R 基础环境部署计划。请解释计划，暂不执行 create。', shell: 'Codex 对话框' },
  ];
  return [
    { title: '让 Claude Code 读取明确的部署入口', text: '在仓库目录启动 claude，再把下面的话发送到对话框。此处直接读取说明，不依赖 Claude 自动发现仓库内所有 Skills。', code: '请读取 skills/_meta/omics-environment-setup/SKILL.md 及其引用的安装策略，先检查当前 WSL 平台并生成 Python 与 R 基础环境部署计划。请解释计划，暂不执行 create。', shell: 'Claude Code 对话框', note: '当前仓库按 Codex 方式发布；完整 Claude Skills 注册尚未做兼容验收。下一步的部署脚本可直接执行，不依赖技能注册。' },
  ];
}
