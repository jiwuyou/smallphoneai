import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BatteryCharging,
  Bot,
  ChevronRight,
  CheckCircle2,
  Clipboard,
  Copy,
  FileText,
  KeyRound,
  Keyboard,
  Menu,
  Play,
  Power,
  RotateCcw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Wrench,
  X
} from "lucide-react";

type SectionId =
  | "main"
  | "manual"
  | "opencodeControl"
  | "terminalGuide"
  | "shortcuts"
  | "repair"
  | "logs"
  | "advanced";
type InitState = "idle" | "running" | "done";
type OnboardingStep =
  | "permission"
  | "install"
  | "readingGuide"
  | "deepseekKey"
  | "waitingInstall"
  | "configureDeepseek"
  | "launchConfig";
type AppMode = "maintainer" | "terminal";

const sections: Array<{ id: SectionId; label: string; icon: typeof Activity }> = [
  { id: "main", label: "初始化", icon: Activity },
  { id: "manual", label: "使用手册", icon: FileText },
  { id: "opencodeControl", label: "OpenCode 控制", icon: Play },
  { id: "terminalGuide", label: "终端教学", icon: Terminal },
  { id: "shortcuts", label: "终端快捷键", icon: Keyboard },
  { id: "repair", label: "维护与修复", icon: Wrench },
  { id: "logs", label: "日志", icon: Terminal },
  { id: "advanced", label: "高级设置", icon: SlidersHorizontal }
];

const progressSteps = [
  "准备 Ubuntu /root 工作目录",
  "安装 OpenCode、Codex、Claude Code",
  "写入 DeepSeek 与 Reasonix 配置",
  "检查运行时代理策略",
  "等待用户启动 OpenCode"
];

const logLines = [
  "[10:24:02] 检查 Android 权限: 已授权",
  "[10:24:04] Ubuntu 环境路径: /root",
  "[10:24:07] OpenCode 安装完成，等待手动启动",
  "[10:24:09] DeepSeek Key 将同步到 OpenCode / Claude Code / Reasonix",
  "[10:24:10] 运行时代理: 不使用代理"
];

const baseShortcutRows = [
  [
    ["ESC", "发送 ESC"],
    ["TAB", "补全"],
    ["CTRL", "组合键"],
    ["ALT", "组合键"],
    ["←", "光标左移"],
    ["↓", "光标下移"],
    ["↑", "光标上移"],
    ["→", "光标右移"]
  ],
  [
    ["键盘", "唤起输入法键盘"],
    ["Termux", "回到 Termux"],
    ["Ubuntu", "进入 Ubuntu /root"],
    ["exit", "退出当前会话"],
    ["clear", "清屏"]
  ]
];

const shortcutPages = [
  {
    name: "常用",
    note: "保留 Termux 原本两排控制键，第三排放可拼接的 AI 命令片段。",
    aiRow: [
      ["claude", "claude"],
      ["reasonix", "reasonix"],
      ["codex", "codex"],
      ["oc", "oc"],
      ["--continue", " --continue"]
    ]
  },
  {
    name: "继续",
    note: "第二页放完整继续命令，用户不需要自己组合参数。",
    aiRow: [
      ["claude -c", "claude --continue"],
      ["codex 继续", "codex 继续完成当前任务"],
      ["reasonix 继续", "reasonix 给出下一步操作"],
      ["oc", "oc"],
      ["exit", "exit"]
    ]
  },
  {
    name: "Claude",
    note: "第三页放 Claude Code 的完整常用语句。",
    aiRow: [
      ["修复报错", "claude 修复刚才的报错并重新验证"],
      ["解释代码", "claude 解释当前目录的代码结构"],
      ["写测试", "claude 为当前改动补充测试"],
      ["改 UI", "claude 根据我的描述修改界面"],
      ["总结", "claude 总结本次修改"]
    ]
  },
  {
    name: "审查",
    note: "第四页放 Reasonix 和 Codex 的检查类完整语句。",
    aiRow: [
      ["Reasonix", "reasonix"],
      ["审查方案", "reasonix review 当前方案"],
      ["Codex review", "codex review 当前改动"],
      ["跑测试", "codex 运行相关测试并修复失败"],
      ["定位问题", "reasonix 分析失败原因"]
    ]
  }
];

function App() {
  const [appMode, setAppMode] = useState<AppMode>("terminal");
  const [section, setSection] = useState<SectionId>("main");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initState, setInitState] = useState<InitState>("idle");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("permission");
  const [progress, setProgress] = useState(0);
  const [deepseekKey, setDeepseekKey] = useState("");
  const [deepseekKeySaved, setDeepseekKeySaved] = useState(false);
  const [deepseekConfigured, setDeepseekConfigured] = useState(false);
  const [openCodeStarted, setOpenCodeStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [batteryOptimizationIgnored, setBatteryOptimizationIgnored] = useState(false);
  const [batteryGuideOpen, setBatteryGuideOpen] = useState(false);
  const [terminalTutorialActive, setTerminalTutorialActive] = useState(false);
  const [terminalTutorialSeen, setTerminalTutorialSeen] = useState(false);
  const [initGuideDismissed, setInitGuideDismissed] = useState(false);
  const [batteryOptimizationSkipped, setBatteryOptimizationSkipped] = useState(false);
  const [deepseekKeySkipped, setDeepseekKeySkipped] = useState(false);
  const [deepseekConfigSkipped, setDeepseekConfigSkipped] = useState(false);

  const keyReady = deepseekKey.trim().length >= 8;
  const initDone = initState === "done";
  const batteryReady = batteryOptimizationIgnored || batteryOptimizationSkipped;
  const keyStepReady = (keyReady && deepseekKeySaved) || deepseekKeySkipped;
  const deepseekStepReady = deepseekConfigured || deepseekConfigSkipped;
  const setupComplete = batteryReady && initDone && keyStepReady && deepseekStepReady;
  const launchConfigConfirmed = setupComplete && initGuideDismissed;
  const currentStep = useMemo(() => {
    if (progress === 0) return "尚未开始";
    const index = Math.min(progressSteps.length - 1, Math.floor((progress / 100) * progressSteps.length));
    return progressSteps[index];
  }, [progress]);

  useEffect(() => {
    if (initState !== "running") return;

    const timer = window.setInterval(() => {
      setProgress((value) => {
        const nextValue = Math.min(100, value + 8);
        if (nextValue >= 100) {
          window.clearInterval(timer);
          setInitState("done");
        }
        return nextValue;
      });
    }, 420);

    return () => window.clearInterval(timer);
  }, [initState]);

  useEffect(() => {
    if (!batteryReady) {
      setOnboardingStep("permission");
      return;
    }

    if (
      !keyStepReady &&
      (onboardingStep === "waitingInstall" || onboardingStep === "configureDeepseek" || onboardingStep === "launchConfig")
    ) {
      setOnboardingStep(initState === "idle" ? "install" : "readingGuide");
      return;
    }

    if (initDone && keyStepReady && !deepseekStepReady && onboardingStep === "waitingInstall") {
      setOnboardingStep("configureDeepseek");
      return;
    }

    if (keyStepReady && !initDone && onboardingStep !== "deepseekKey" && onboardingStep !== "waitingInstall") {
      setOnboardingStep("waitingInstall");
      return;
    }

    if (onboardingStep === "permission") {
      setOnboardingStep("install");
    }
  }, [batteryReady, deepseekStepReady, initDone, initState, keyStepReady, onboardingStep]);

  function startInit() {
    if (initDone || initState === "running") return;
    if (!batteryReady) {
      setBatteryGuideOpen(true);
      return;
    }
    setOpenCodeStarted(false);
    setCopied(false);
    setProgress(4);
    setInitState("running");
    setOnboardingStep("readingGuide");
    setInitGuideDismissed(false);
  }

  function updateDeepseekKey(value: string) {
    setDeepseekKey(value);
    setDeepseekKeySaved(false);
    setDeepseekConfigured(false);
    setDeepseekKeySkipped(false);
    setDeepseekConfigSkipped(false);
    setOpenCodeStarted(false);
    setInitGuideDismissed(false);
  }

  function saveDeepseekKey() {
    if (!keyReady) return;
    setDeepseekKeySaved(true);
    setDeepseekKeySkipped(false);
    setDeepseekConfigured(false);
    setDeepseekConfigSkipped(false);
    setOnboardingStep(initDone ? "configureDeepseek" : "waitingInstall");
  }

  function configureDeepseek() {
    if (!initDone || !deepseekKeySaved || !keyReady) return;
    setDeepseekConfigured(true);
    setDeepseekConfigSkipped(false);
    setOnboardingStep("launchConfig");
    setInitGuideDismissed(false);
  }

  function confirmBatteryIgnored() {
    setBatteryOptimizationIgnored(true);
    setBatteryOptimizationSkipped(false);
    setBatteryGuideOpen(false);
    setOnboardingStep("install");
    setInitGuideDismissed(false);
  }

  function resetPreview() {
    setInitState("idle");
    setOnboardingStep("permission");
    setProgress(0);
    setDeepseekKey("");
    setDeepseekKeySaved(false);
    setDeepseekConfigured(false);
    setOpenCodeStarted(false);
    setCopied(false);
    setBatteryOptimizationIgnored(false);
    setTerminalTutorialActive(false);
    setTerminalTutorialSeen(false);
    setInitGuideDismissed(false);
    setBatteryOptimizationSkipped(false);
    setDeepseekKeySkipped(false);
    setDeepseekConfigSkipped(false);
  }

  function selectSection(nextSection: SectionId) {
    setSection(nextSection);
    setSidebarOpen(false);
  }

  function returnToTerminal() {
    setTerminalTutorialActive(false);
    setAppMode("terminal");
    setSidebarOpen(false);
  }

  function startTerminalTutorial() {
    if (!setupComplete) {
      setInitGuideDismissed(false);
      setTerminalTutorialActive(false);
      setAppMode("terminal");
      setSidebarOpen(false);
      return;
    }
    if (!launchConfigConfirmed) {
      setTerminalTutorialActive(false);
      setAppMode("terminal");
      setSidebarOpen(false);
      return;
    }
    setInitGuideDismissed(true);
    setTerminalTutorialActive(true);
    setTerminalTutorialSeen(true);
    setAppMode("terminal");
    setSidebarOpen(false);
  }

  function confirmLaunchConfigAndStartTerminalTutorial() {
    if (!setupComplete) {
      startTerminalTutorial();
      return;
    }
    setInitGuideDismissed(true);
    setTerminalTutorialActive(true);
    setTerminalTutorialSeen(true);
    setAppMode("terminal");
    setSidebarOpen(false);
  }

  function dismissInitGuide() {
    setInitGuideDismissed(setupComplete);
  }

  function forceSkipCurrentOnboardingStep() {
    if (onboardingStep === "permission") {
      setBatteryOptimizationSkipped(true);
      setOnboardingStep("install");
      return;
    }
    if (onboardingStep === "deepseekKey") {
      setDeepseekKeySkipped(true);
      setDeepseekConfigSkipped(true);
      setOnboardingStep(initDone ? "launchConfig" : "waitingInstall");
      return;
    }
    if (onboardingStep === "readingGuide") {
      setOnboardingStep("deepseekKey");
      return;
    }
    if (onboardingStep === "configureDeepseek") {
      setDeepseekConfigSkipped(true);
      setOnboardingStep("launchConfig");
    }
  }

  function startOpenCode() {
    setOpenCodeStarted(true);
  }

  function stopOpenCode() {
    setOpenCodeStarted(false);
  }

  function copyOpenCodeAddress() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const sectionTitle = sections.find((item) => item.id === section)?.label ?? "初始化";

  return (
    <div className="preview-shell">
      <main className="phone-frame" aria-label="OpenHouseAI Android App 预览">
        <div className="android-status">
          <span>10:24</span>
          <span>5G  82%</span>
        </div>

        {appMode === "terminal" ? (
          <TerminalMode
            tutorialActive={terminalTutorialActive}
            onFinishTutorial={() => setTerminalTutorialActive(false)}
            onOpenMaintainer={() => setAppMode("maintainer")}
            onboardingStep={onboardingStep}
            initState={initState}
            initDone={initDone}
            progress={progress}
            currentStep={currentStep}
            batteryOptimizationIgnored={batteryOptimizationIgnored}
            batteryGuideOpen={batteryGuideOpen}
            openBatteryGuide={() => setBatteryGuideOpen(true)}
            closeBatteryGuide={() => setBatteryGuideOpen(false)}
            confirmBatteryIgnored={confirmBatteryIgnored}
            startInit={startInit}
            keyReady={keyReady}
            deepseekKey={deepseekKey}
            deepseekKeySaved={deepseekKeySaved}
            deepseekConfigured={deepseekConfigured}
            setOnboardingStep={setOnboardingStep}
            setDeepseekKey={updateDeepseekKey}
            saveDeepseekKey={saveDeepseekKey}
            configureDeepseek={configureDeepseek}
            openCodeStarted={openCodeStarted}
            copied={copied}
            startOpenCode={startOpenCode}
            stopOpenCode={stopOpenCode}
            copyAddress={copyOpenCodeAddress}
            startTerminalTutorial={confirmLaunchConfigAndStartTerminalTutorial}
            initGuideDismissed={initGuideDismissed}
            dismissInitGuide={dismissInitGuide}
            batteryOptimizationSkipped={batteryOptimizationSkipped}
            deepseekKeySkipped={deepseekKeySkipped}
            deepseekConfigSkipped={deepseekConfigSkipped}
            forceSkipCurrentStep={forceSkipCurrentOnboardingStep}
          />
        ) : (
          <>
        <header className="app-header">
          <button className="icon-button" type="button" aria-label="打开侧边栏" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div>
            <strong>OpenHouseAI</strong>
            <span>{sectionTitle}</span>
          </div>
          <button className="icon-button" type="button" aria-label="高级设置" onClick={() => selectSection("advanced")}>
            <Settings size={19} />
          </button>
        </header>

        {sidebarOpen && <button className="scrim" type="button" aria-label="关闭侧边栏" onClick={() => setSidebarOpen(false)} />}

        <aside className={`drawer ${sidebarOpen ? "open" : ""}`} aria-label="侧边栏">
          <div className="drawer-head">
            <div>
              <strong>OpenHouseAI</strong>
              <span>APK UI 预览</span>
            </div>
            <button className="icon-button" type="button" aria-label="关闭侧边栏" onClick={() => setSidebarOpen(false)}>
              <X size={19} />
            </button>
          </div>
          <nav className="drawer-nav">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={section === item.id ? "active" : ""}
                  type="button"
                  onClick={() => selectSection(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <ChevronRight size={16} />
                </button>
              );
            })}
          </nav>
          <button className="drawer-terminal-button" type="button" onClick={returnToTerminal}>
            <Terminal size={18} />
            <span>
              回到终端
              <small>退出维护器界面</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </aside>

        <section className="screen-content">
          {section === "main" && (
            <MainScreen
              onboardingStep={onboardingStep}
              progress={progress}
              initState={initState}
              initDone={initDone}
              keyReady={keyReady}
              deepseekKeySaved={deepseekKeySaved}
              deepseekConfigured={deepseekConfigured}
              deepseekKeySkipped={deepseekKeySkipped}
              deepseekConfigSkipped={deepseekConfigSkipped}
              currentStep={currentStep}
              openCodeStarted={openCodeStarted}
              batteryOptimizationIgnored={batteryOptimizationIgnored}
              setupComplete={setupComplete}
              launchConfigConfirmed={launchConfigConfirmed}
              resetPreview={resetPreview}
              startTerminalTutorial={startTerminalTutorial}
              returnToTerminal={returnToTerminal}
              terminalTutorialSeen={terminalTutorialSeen}
            />
          )}
          {section === "manual" && <ManualScreen />}
          {section === "opencodeControl" && (
            <OpenCodeControlScreen
              initDone={initDone}
              keySaved={deepseekKeySaved}
              deepseekConfigured={deepseekConfigured}
              launchConfigConfirmed={launchConfigConfirmed}
              openCodeStarted={openCodeStarted}
              copied={copied}
              startOpenCode={startOpenCode}
              stopOpenCode={stopOpenCode}
              copyAddress={copyOpenCodeAddress}
            />
          )}
          {section === "terminalGuide" && (
            <TerminalGuideScreen
              setupComplete={setupComplete}
              launchConfigConfirmed={launchConfigConfirmed}
              startTerminalTutorial={startTerminalTutorial}
            />
          )}
          {section === "shortcuts" && <TerminalShortcutsScreen />}
          {section === "repair" && <RepairScreen resetPreview={resetPreview} />}
          {section === "logs" && <LogsScreen />}
          {section === "advanced" && <AdvancedScreen />}
        </section>
          </>
        )}
      </main>
    </div>
  );
}

const tutorialSteps = [
  {
    title: "这里是终端",
    text: "环境部署完成后，可以在这里运行 Claude、Codex、Reasonix。",
    finger: "center"
  },
  {
    title: "拉出终端侧边栏",
    text: "从左侧拉出终端列表，可以看到多个终端会话。",
    finger: "left"
  },
  {
    title: "新建和切换终端",
    text: "需要同时跑 OpenCode、Claude 或日志时，可以新建一个终端。",
    finger: "drawer"
  },
  {
    title: "底部前两排是基础键",
    text: "ESC、TAB、方向键、键盘、Ubuntu、exit 都放在这里。",
    finger: "baseKeys"
  },
  {
    title: "第三排是 AI 快捷键",
    text: "点 claude，再点 --continue，就能拼出继续会话命令。",
    finger: "aiKeys"
  },
  {
    title: "第二页有完整命令",
    text: "也可以切到第二页，直接点 claude --continue。",
    finger: "aiKeys"
  }
];

function TerminalMode({
  tutorialActive,
  onFinishTutorial,
  onOpenMaintainer,
  onboardingStep,
  initState,
  initDone,
  progress,
  currentStep,
  batteryOptimizationIgnored,
  batteryGuideOpen,
  openBatteryGuide,
  closeBatteryGuide,
  confirmBatteryIgnored,
  startInit,
  keyReady,
  deepseekKey,
  deepseekKeySaved,
  deepseekConfigured,
  setOnboardingStep,
  setDeepseekKey,
  saveDeepseekKey,
  configureDeepseek,
  openCodeStarted,
  copied,
  startOpenCode,
  stopOpenCode,
  copyAddress,
  startTerminalTutorial,
  initGuideDismissed,
  dismissInitGuide,
  batteryOptimizationSkipped,
  deepseekKeySkipped,
  deepseekConfigSkipped,
  forceSkipCurrentStep
}: {
  tutorialActive: boolean;
  onFinishTutorial: () => void;
  onOpenMaintainer: () => void;
  onboardingStep: OnboardingStep;
  initState: InitState;
  initDone: boolean;
  progress: number;
  currentStep: string;
  batteryOptimizationIgnored: boolean;
  batteryGuideOpen: boolean;
  openBatteryGuide: () => void;
  closeBatteryGuide: () => void;
  confirmBatteryIgnored: () => void;
  startInit: () => void;
  keyReady: boolean;
  deepseekKey: string;
  deepseekKeySaved: boolean;
  deepseekConfigured: boolean;
  batteryOptimizationSkipped: boolean;
  deepseekKeySkipped: boolean;
  deepseekConfigSkipped: boolean;
  setOnboardingStep: (step: OnboardingStep) => void;
  setDeepseekKey: (value: string) => void;
  saveDeepseekKey: () => void;
  configureDeepseek: () => void;
  openCodeStarted: boolean;
  copied: boolean;
  startOpenCode: () => void;
  stopOpenCode: () => void;
  copyAddress: () => void;
  startTerminalTutorial: () => void;
  initGuideDismissed: boolean;
  dismissInitGuide: () => void;
  forceSkipCurrentStep: () => void;
}) {
  const [toolbarPageIndex, setToolbarPageIndex] = useState(0);
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const page = shortcutPages[toolbarPageIndex];
  const rows = [...baseShortcutRows, page.aiRow];
  const activeTutorial = tutorialActive ? tutorialSteps[tutorialStep] : null;
  const showSessionDrawer = sessionDrawerOpen || (tutorialActive && (tutorialStep === 1 || tutorialStep === 2));
  const batteryReady = batteryOptimizationIgnored || batteryOptimizationSkipped;
  const keyStepReady = (keyReady && deepseekKeySaved) || deepseekKeySkipped;
  const deepseekStepReady = deepseekConfigured || deepseekConfigSkipped;
  const setupComplete = batteryReady && initDone && keyStepReady && deepseekStepReady;
  const showInitGuide = !tutorialActive && (!setupComplete || !initGuideDismissed);
  const highlightedKeys =
    tutorialActive && tutorialStep === 4
      ? ["claude", "--continue"]
      : tutorialActive && tutorialStep === 5
        ? ["claude -c"]
        : [];

  useEffect(() => {
    if (!tutorialActive) return;
    setTutorialStep(0);
    setToolbarPageIndex(0);
    setSessionDrawerOpen(false);
  }, [tutorialActive]);

  useEffect(() => {
    if (!tutorialActive) return;
    if (tutorialStep === 5) setToolbarPageIndex(1);
    if (tutorialStep < 5) setToolbarPageIndex(0);
  }, [tutorialActive, tutorialStep]);

  function nextTutorialStep() {
    if (tutorialStep >= tutorialSteps.length - 1) {
      onFinishTutorial();
      return;
    }
    setTutorialStep((value) => value + 1);
  }

  function confirmSkipTutorial() {
    if (window.confirm("确定跳过终端教学吗？跳过后仍可在侧边栏重新打开教学。")) {
      onFinishTutorial();
    }
  }

  return (
    <section className={`terminal-mode ${tutorialActive ? `tutorial-step-${tutorialStep}` : ""}`} aria-label="Termux 终端预览">
      <div className="terminal-mode-head">
        <div>
          <strong>Termux</strong>
          <span>可能位于 Termux，也可能已进入 Ubuntu</span>
        </div>
        <button className="secondary-button" type="button" onClick={onOpenMaintainer}>
          维护器
        </button>
      </div>
      <button className="terminal-side-handle" type="button" aria-label="打开终端列表" onClick={() => setSessionDrawerOpen(true)}>
        终端
      </button>
      {showSessionDrawer && (
        <aside className="terminal-session-drawer" aria-label="终端列表">
          <strong>终端列表</strong>
          {["Ubuntu /root", "OpenCode 日志", "Claude 会话"].map((label, index) => (
            <button className={index === 0 ? "active" : ""} type="button" key={label}>
              <span>{label}</span>
              <small>{index === 0 ? "当前" : "可切换"}</small>
            </button>
          ))}
          <button className="new-session" type="button">
            新建终端
          </button>
        </aside>
      )}
      <pre className="terminal-canvas">
        <span className="terminal-line">$ cd ~</span>
        <span className="terminal-line">$ proot-distro login ubuntu --user root --shared-tmp</span>
        <span className="terminal-line">root@ubuntu:~# {toolbarPageIndex === 1 ? "claude --continue" : ""}</span>
        <span className="terminal-cursor"> </span>
      </pre>
      <div className="terminal-toolbar-wrap">
        <div className="terminal-toolbar-tabs">
          {shortcutPages.map((item, index) => (
            <button
              className={index === toolbarPageIndex ? "active" : ""}
              type="button"
              key={item.name}
              onClick={() => setToolbarPageIndex(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <TerminalExtraKeysToolbar rows={rows} compact highlightLabels={highlightedKeys} />
      </div>
      {activeTutorial && (
        <div className="terminal-tutorial-layer">
          <div className={`tutorial-finger ${activeTutorial.finger}`} />
          <section className="tutorial-card">
            <span>
              {tutorialStep + 1}/{tutorialSteps.length}
            </span>
            <h2>{activeTutorial.title}</h2>
            <p>{activeTutorial.text}</p>
            <div className="tutorial-actions">
              <button type="button" onClick={confirmSkipTutorial}>
                跳过
              </button>
              <button type="button" onClick={nextTutorialStep}>
                {tutorialStep === tutorialSteps.length - 1 ? "开始使用" : "下一步"}
              </button>
            </div>
          </section>
        </div>
      )}
      {showInitGuide && (
        <TerminalInitGuide
          onboardingStep={onboardingStep}
          initState={initState}
          initDone={initDone}
          progress={progress}
          currentStep={currentStep}
          batteryOptimizationIgnored={batteryOptimizationIgnored}
          batteryGuideOpen={batteryGuideOpen}
          openBatteryGuide={openBatteryGuide}
          closeBatteryGuide={closeBatteryGuide}
          confirmBatteryIgnored={confirmBatteryIgnored}
          startInit={startInit}
          keyReady={keyReady}
          deepseekKey={deepseekKey}
          deepseekKeySaved={deepseekKeySaved}
          deepseekConfigured={deepseekConfigured}
          batteryOptimizationSkipped={batteryOptimizationSkipped}
          deepseekKeySkipped={deepseekKeySkipped}
          deepseekConfigSkipped={deepseekConfigSkipped}
          setOnboardingStep={setOnboardingStep}
          setDeepseekKey={setDeepseekKey}
          saveDeepseekKey={saveDeepseekKey}
          configureDeepseek={configureDeepseek}
          openCodeStarted={openCodeStarted}
          copied={copied}
          startOpenCode={startOpenCode}
          stopOpenCode={stopOpenCode}
          copyAddress={copyAddress}
          onOpenDetail={onOpenMaintainer}
          onStartTutorial={startTerminalTutorial}
          onUseTerminal={dismissInitGuide}
          onForceSkip={forceSkipCurrentStep}
        />
      )}
    </section>
  );
}

function TerminalInitGuide(props: {
  onboardingStep: OnboardingStep;
  initState: InitState;
  initDone: boolean;
  progress: number;
  currentStep: string;
  batteryOptimizationIgnored: boolean;
  batteryGuideOpen: boolean;
  openBatteryGuide: () => void;
  closeBatteryGuide: () => void;
  confirmBatteryIgnored: () => void;
  startInit: () => void;
  keyReady: boolean;
  deepseekKey: string;
  deepseekKeySaved: boolean;
  deepseekConfigured: boolean;
  batteryOptimizationSkipped: boolean;
  deepseekKeySkipped: boolean;
  deepseekConfigSkipped: boolean;
  setOnboardingStep: (step: OnboardingStep) => void;
  setDeepseekKey: (value: string) => void;
  saveDeepseekKey: () => void;
  configureDeepseek: () => void;
  openCodeStarted: boolean;
  copied: boolean;
  startOpenCode: () => void;
  stopOpenCode: () => void;
  copyAddress: () => void;
  onOpenDetail: () => void;
  onStartTutorial: () => void;
  onUseTerminal: () => void;
  onForceSkip: () => void;
}) {
  const batteryReady = props.batteryOptimizationIgnored || props.batteryOptimizationSkipped;
  const keyStepReady = (props.keyReady && props.deepseekKeySaved) || props.deepseekKeySkipped;
  const deepseekStepReady = props.deepseekConfigured || props.deepseekConfigSkipped;
  const allDone = batteryReady && props.initDone && keyStepReady && deepseekStepReady;
  const stepOrder: OnboardingStep[] = ["permission", "install", "readingGuide", "deepseekKey", "waitingInstall", "configureDeepseek", "launchConfig"];
  const stepLabels: Record<OnboardingStep, string> = {
    permission: "后台权限",
    install: "初始化安装",
    readingGuide: "建议阅读",
    deepseekKey: "保存 Key",
    waitingInstall: "等待安装",
    configureDeepseek: "配置 DeepSeek",
    launchConfig: "启动配置"
  };
  const activeIndex = stepOrder.indexOf(props.onboardingStep);
  const progressTitle = props.initDone ? "安装完成" : props.initState === "running" ? props.currentStep : "等待开始安装";
  const previousStep = activeIndex > 0 ? stepOrder[activeIndex - 1] : null;
  const nextStep = getNextOnboardingStep(props.onboardingStep, {
    batteryOptimizationIgnored: props.batteryOptimizationIgnored,
    initStarted: props.initState !== "idle",
    initDone: props.initDone,
    deepseekKeySaved: props.deepseekKeySaved,
    deepseekConfigured: props.deepseekConfigured,
    batteryOptimizationSkipped: props.batteryOptimizationSkipped,
    deepseekKeySkipped: props.deepseekKeySkipped,
    deepseekConfigSkipped: props.deepseekConfigSkipped
  });
  const forceSkipInfo = getForceSkipInfo(props.onboardingStep, {
    initStarted: props.initState !== "idle",
    initDone: props.initDone,
    deepseekKeySkipped: props.deepseekKeySkipped,
    deepseekConfigSkipped: props.deepseekConfigSkipped
  });

  function confirmForceSkip() {
    if (!forceSkipInfo.enabled) return;
    const confirmed = window.confirm(`确定要${forceSkipInfo.label}吗？\n\n风险：${forceSkipInfo.risk}`);
    if (confirmed) props.onForceSkip();
  }

  return (
    <div className="terminal-init-overlay" role="dialog" aria-modal="true" aria-label="初始化引导">
      <section className="terminal-init-card">
        <div className="onboarding-progress" aria-label="初始化向导进度">
          {stepOrder.map((step, index) => (
            <span
              className={index < activeIndex || (allDone && step === "launchConfig") ? "done" : index === activeIndex ? "active" : ""}
              key={step}
            >
              {index + 1}. {stepLabels[step]}
            </span>
          ))}
        </div>

        {props.onboardingStep === "permission" && (
          <div className="onboarding-screen">
            <span className="onboarding-kicker">1/7 后台权限</span>
            <ShieldCheck className="onboarding-hero-icon" size={38} />
            <h1>允许后台完成初始化</h1>
            <p>初始化会安装 Ubuntu 和 AI 工具。请先允许忽略电池优化，避免息屏或切换应用后中断。</p>
            <div className="onboarding-status-card">
              <strong>{batteryReady ? "后台权限已确认" : "等待系统授权"}</strong>
              <span>{props.batteryOptimizationSkipped ? "已手动跳过检测；如果系统实际未允许，安装可能被中断。" : "真实 APK 会打开 Android 授权页；预览中点击已允许继续。"}</span>
            </div>
            <div className="onboarding-actions">
              <button className="secondary-button" type="button" onClick={props.openBatteryGuide}>
                <BatteryCharging size={17} />
                打开授权页
              </button>
              <button className="action-button no-margin" type="button" onClick={props.confirmBatteryIgnored}>
                <CheckCircle2 size={18} />
                预览：已允许
              </button>
            </div>
          </div>
        )}

        {props.onboardingStep === "install" && (
          <div className="onboarding-screen">
            <span className="onboarding-kicker">2/7 初始化安装</span>
            <Play className="onboarding-hero-icon" size={38} />
            <h1>开始一键初始化</h1>
            <p>点击后会立刻进入建议阅读屏。安装继续在后台进行，不需要等它完成。</p>
            <div className="onboarding-status-card">
              <strong>{progressTitle}</strong>
              <span>OpenCode、Codex、Claude Code、Reasonix 会写入 Ubuntu /root 环境。</span>
            </div>
            <div className="progress-track" aria-label="初始化安装进度">
              <div style={{ width: `${props.progress}%` }} />
            </div>
            <InstallReadingGuide compact />
            <div className="onboarding-actions">
              <button
                className="action-button no-margin"
                type="button"
                disabled={!batteryReady || props.initDone || props.initState === "running"}
                onClick={props.startInit}
              >
                <Play size={18} />
                {props.initDone ? "安装已完成" : props.initState === "running" ? "正在安装" : "一键初始化"}
              </button>
              <button className="secondary-button" type="button" onClick={props.onOpenDetail}>
                查看详情
              </button>
            </div>
          </div>
        )}

        {props.onboardingStep === "readingGuide" && (
          <div className="onboarding-screen">
            <span className="onboarding-kicker">3/7 建议阅读</span>
            <FileText className="onboarding-hero-icon" size={38} />
            <h1>先读完这几件事</h1>
            <p>安装正在后台继续。建议先了解安装时间、DeepSeek Key、OpenCode Web 和几个 AI Agent，再进入 Key 页面。</p>
            <InstallReadingGuide openByDefault />
          </div>
        )}

        {props.onboardingStep === "deepseekKey" && (
          <div className="onboarding-screen">
            <span className="onboarding-kicker">4/7 DeepSeek Key</span>
            <KeyRound className="onboarding-hero-icon" size={38} />
            <h1>获取并保存 DeepSeek Key</h1>
            <p>安装未完成时也可以先填写。只有点击保存后，Key 才会被视为已保存。</p>
            <a className="onboarding-choice" href="https://platform.deepseek.com/" target="_blank" rel="noreferrer">
              打开 DeepSeek 平台申请 Key
              <ChevronRight size={16} />
            </a>
            <div className="onboarding-url-card">
              <span>如果没有自动跳转，复制这个网址到浏览器打开</span>
              <code>https://platform.deepseek.com/</code>
            </div>
            <div className="onboarding-status-card">
              <strong>申请 Key 简要步骤</strong>
              <span>充值完成后，点击 API keys，再点击创建 API key。名称可以任意填写，比如 op；创建后复制生成的 Key。</span>
            </div>
            <label className="key-input init-key-input">
              <span>DeepSeek API Key</span>
              <input
                value={props.deepseekKey}
                onChange={(event) => props.setDeepseekKey(event.target.value)}
                placeholder="sk-..."
                type="password"
              />
            </label>
            <div className="onboarding-field-actions">
              <span>{props.deepseekKeySaved ? "Key 已保存。" : props.keyReady ? "Key 格式可用，请保存。" : "至少输入 8 个字符后可保存。"}</span>
              <button className="action-button no-margin" type="button" disabled={!props.keyReady} onClick={props.saveDeepseekKey}>
                <CheckCircle2 size={18} />
                保存 Key
              </button>
            </div>
            <div className="onboarding-status-card">
              <strong>{progressTitle}</strong>
              <span>当前安装进度 {props.progress}%，保存 Key 后会继续等待安装完成。</span>
            </div>
            <InstallReadingGuide />
          </div>
        )}

        {props.onboardingStep === "waitingInstall" && (
          <div className="onboarding-screen">
            <span className="onboarding-kicker">5/7 等待安装</span>
            <Bot className="onboarding-hero-icon" size={38} />
            <h1>Key 已保存，等待安装完成</h1>
            <p>{props.deepseekKeySkipped ? "你已选择暂不配置 DeepSeek Key。安装完成后建议先启动 OpenCode Web，再在网页里配置模型和其他 AI Agent。" : "现在不需要重复填写 Key。安装完成后会自动进入下一步配置。"}</p>
            <div className="onboarding-wait">
              <div className="progress-meta">
                <span>{progressTitle}</span>
                <strong>{props.progress}%</strong>
              </div>
              <div className="progress-track" aria-label="等待安装进度">
                <div style={{ width: `${props.progress}%` }} />
              </div>
              <p>OpenCode 安装约 12 分钟，占整体进度 40%；其他阶段均分剩余时间。</p>
            </div>
            <InstallReadingGuide />
            <div className="onboarding-actions">
              <button className="secondary-button" type="button" onClick={props.onOpenDetail}>
                查看详细进度
              </button>
            </div>
          </div>
        )}

        {props.onboardingStep === "configureDeepseek" && (
          <div className="onboarding-screen">
            <span className="onboarding-kicker">6/7 配置 DeepSeek</span>
            <KeyRound className="onboarding-hero-icon" size={38} />
            <h1>配置 AI 工具</h1>
            <p>{props.deepseekKeySkipped ? "你已跳过 DeepSeek Key。建议先启动 OpenCode Web，在网页里配置模型，然后让 OpenCode 帮你配置 Claude Code、Reasonix 或其他 AI Agent。" : "Key 已保存，安装也已完成。现在把 DeepSeek Key 写入 OpenCode、Claude Code 和 Reasonix。"}</p>
            <div className="onboarding-status-card">
              <strong>{deepseekStepReady ? "DeepSeek 配置步骤已处理" : "等待配置到 AI 工具"}</strong>
              <span>{props.deepseekConfigSkipped ? "已跳过自动配置；后续可在 OpenCode Web 中手动配置模型和其他 Agent。" : "这里只显示配置目标，不显示真实 API Key。"}</span>
            </div>
            <div className="info-list">
              {(props.deepseekKeySkipped
                ? [
                    ["先启动 OpenCode Web", "进入浏览器页面后，在 OpenCode 里配置你的模型 API。"],
                    ["再配置其他 Agent", "可以让 OpenCode 帮你配置 Claude Code、Reasonix、Codex 或其他 AI Agent。"],
                    ["后续仍可补 Key", "需要 DeepSeek 兜底时，可以回来填写并配置 DeepSeek Key。"]
                  ]
                : [
                    ["OpenCode", "将使用已保存的 DeepSeek Key。"],
                    ["Claude Code", "将使用已保存的 DeepSeek Key。"],
                    ["Reasonix", "将使用已保存的 DeepSeek Key。"]
                  ]
              ).map(([label, detail], index) => (
                <div className="info-row" key={label}>
                  <span>{index + 1}</span>
                  <p>
                    <strong>{label}</strong>：{detail}
                  </p>
                </div>
              ))}
            </div>
            <div className="onboarding-actions">
              <button className="action-button no-margin" type="button" disabled={!props.initDone || !props.deepseekKeySaved || props.deepseekKeySkipped} onClick={props.configureDeepseek}>
                <CheckCircle2 size={18} />
                {props.deepseekKeySkipped ? "已跳过 Key" : props.deepseekConfigured ? "已配置" : "配置 DeepSeek"}
              </button>
              <button className="secondary-button" type="button" onClick={props.onOpenDetail}>
                查看详细进度
              </button>
            </div>
          </div>
        )}

        {props.onboardingStep === "launchConfig" && (
          <div className="onboarding-screen">
            <span className="onboarding-kicker">7/7 启动配置</span>
            <Terminal className="onboarding-hero-icon" size={38} />
            <h1>配置 OpenCode 启动方式</h1>
            <p>{props.deepseekKeySkipped || props.deepseekConfigSkipped ? "初始化已完成。由于你跳过了 DeepSeek 配置，建议先启动 OpenCode Web，再在网页里配置模型 API 和其他 AI Agent。" : "初始化已完成，DeepSeek 也已配置。OpenCode 不会自动启动，需要你在这里确认启动或进入终端教学。"}</p>

            <div className="onboarding-config-grid">
              <div className="onboarding-path-card">
                <span>项目启动目录</span>
                <code>/root</code>
              </div>
              <div className="onboarding-path-card">
                <span>OpenCode Web 端口</span>
                <code>4096</code>
              </div>
            </div>

            <div className="onboarding-status-card">
              <strong>{props.openCodeStarted ? "OpenCode 运行中" : "OpenCode 未启动"}</strong>
              <span>访问地址：http://127.0.0.1:4096</span>
            </div>

            <div className="onboarding-service-actions">
              <button className="secondary-button" type="button" disabled={!allDone} onClick={props.startOpenCode}>
                <Play size={17} />
                {props.openCodeStarted ? "已启动" : "启动 OpenCode"}
              </button>
              <button className="secondary-button" type="button" disabled={!props.openCodeStarted} onClick={props.startOpenCode}>
                <RotateCcw size={17} />
                重启
              </button>
              <button className="secondary-button" type="button" disabled={!props.openCodeStarted} onClick={props.stopOpenCode}>
                <Power size={17} />
                停止
              </button>
              <button className="secondary-button" type="button" onClick={props.copyAddress}>
                {props.copied ? <Clipboard size={17} /> : <Copy size={17} />}
                {props.copied ? "已复制" : "复制地址"}
              </button>
            </div>

            <div className="onboarding-actions">
              <button className="secondary-button" type="button" disabled={!allDone} onClick={props.onStartTutorial}>
                <Play size={17} />
                开始终端教学
              </button>
              <button className="action-button no-margin" type="button" disabled={!allDone} onClick={props.onUseTerminal}>
                <Terminal size={18} />
                进入终端
              </button>
            </div>
          </div>
        )}

        <div className="onboarding-nav" aria-label="屏幕前进和后退">
          <button
            type="button"
            aria-label="上一屏"
            disabled={!previousStep}
            onClick={() => previousStep && props.setOnboardingStep(previousStep)}
          >
            &lt;
          </button>
          <span>{activeIndex + 1} / {stepOrder.length}</span>
          <button
            type="button"
            aria-label="下一屏"
            disabled={!nextStep}
            onClick={() => nextStep && props.setOnboardingStep(nextStep)}
          >
            &gt;
          </button>
        </div>
        <div className="force-skip-panel">
          <p>{forceSkipInfo.risk}</p>
          <button className="danger-button" type="button" disabled={!forceSkipInfo.enabled} onClick={confirmForceSkip}>
            {forceSkipInfo.label}
          </button>
        </div>
      </section>

      {props.batteryGuideOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="忽略电池优化授权引导">
          <button className="modal-scrim" type="button" aria-label="关闭引导" onClick={props.closeBatteryGuide} />
          <section className="bottom-sheet">
            <div className="sheet-handle" />
            <h2>忽略电池优化</h2>
            <p>真实 APK 会打开 Android 系统授权页。预览中点击“已允许”继续。</p>
            <div className="guide-steps">
              <div>
                <span>1</span>
                <p>选择 OpenHouseAI / Termux。</p>
              </div>
              <div>
                <span>2</span>
                <p>选择“允许”或“不优化”。</p>
              </div>
              <div>
                <span>3</span>
                <p>返回后开始一键初始化。</p>
              </div>
            </div>
            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={props.closeBatteryGuide}>
                返回
              </button>
              <button className="action-button sheet-primary" type="button" onClick={props.confirmBatteryIgnored}>
                预览：已允许
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InstallReadingGuide({ compact = false, openByDefault = false }: { compact?: boolean; openByDefault?: boolean }) {
  return (
    <details className={`install-reading-guide ${compact ? "compact" : ""}`} open={openByDefault}>
      <summary>
        <span>安装期间建议阅读</span>
        <strong>点开了解 AI、Key 和可用工具</strong>
      </summary>
      <div className="install-reading-body">
        <section>
          <h3>安装需要多久</h3>
          <p>第一次安装通常需要 10 分钟到半小时。时间取决于手机性能、网络和包下载速度。</p>
        </section>
        <section>
          <h3>这款软件会做什么</h3>
          <p>OpenHouseAI 会帮你配置一套顶级 AI 编程环境。它到底能做什么，取决于你想让它帮你做什么。</p>
        </section>
        <section>
          <h3>为什么需要 DeepSeek Key</h3>
          <p>AI Agent 运行时通常都需要模型 API。没有可用 API，软件可以启动，但 AI 不能正常调用模型完成任务。</p>
          <p>这里推荐 DeepSeek，是因为它相对实惠，适合作为第一次安装和配置的统一引导。</p>
          <p>OpenHouseAI 不限制你长期使用哪一个 API。后续可以让 OpenCode、Claude Code 或 Reasonix 帮你配置自己的模型 API。</p>
        </section>
        <section>
          <h3>DeepSeek Key 怎么拿</h3>
          <p>
            初始化开始后，可以点击申请 Key 跳转到 DeepSeek 官方网站。你可以先充值 5 元，或者 1 元也可以；然后进入 API Keys，创建 API Key，名称可以随便填，比如 op。
          </p>
          <p>创建后复制 Key，回到 OpenHouseAI，点击“填写 Key”并粘贴。后台会在后续步骤中把这个 Key 配置到 OpenCode、Claude Code 和 Reasonix。</p>
        </section>
        <section>
          <h3>为什么是这几个 AI Agent</h3>
          <p>Claude Code 是非常顶级的 AI Agent 软件，适合改代码、解释代码、修复问题和持续协作。</p>
          <p>
            OpenCode 的优势是模型接入范围广，并且原生支持 Web 页面。已经在电脑上用 AI 编程软件的用户，可以把已有 API 接入 OpenCode；浏览器访问也能减少终端压力。
          </p>
          <p>Reasonix 专门适配 DeepSeek，使用 DeepSeek API 比较省钱。它作为兜底，保证至少有一个 AI Agent 可以直接使用。</p>
          <p>Codex 也已安装，是很强的 AI Agent；但 DeepSeek 官方没有直接给出接入 Codex 的方式，所以当前不默认配置。</p>
        </section>
        <section>
          <h3>还能用其他软件或模型吗</h3>
          <p>可以。配置好之后，你可以让 OpenCode、Claude Code 或 Reasonix 帮你安装和配置 OpenClaw、Hermes 或其他 AI Agent 软件。</p>
          <p>也可以接入其他大模型 API。仍建议先充值少量 DeepSeek API 并完成基础配置，再让 AI 帮你配置自己的 API。</p>
        </section>
        <section>
          <h3>关于 Key 和官方登录</h3>
          <p>不建议把 API Key 直接发到聊天里。这里的预期方式是由 OpenHouseAI 保存 Key，并自动写入对应工具配置。</p>
          <p>Codex 和 Claude Code 的官方登录也支持，但需要你所在地区支持使用。具体登录方式可以继续询问 AI。</p>
          <p>如果使用中转站 API，也可以让 OpenCode、Claude Code 或 Reasonix 帮你把它接入 Codex，或者使用官方 GPT 账号登录。</p>
        </section>
      </div>
    </details>
  );
}

function InitGuideStep({
  number,
  title,
  detail,
  state
}: {
  number: number;
  title: string;
  detail: string;
  state: "done" | "active" | "pending";
}) {
  return (
    <div className={`init-guide-step ${state}`}>
      <span>{state === "done" ? <CheckCircle2 size={15} /> : number}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function TerminalShortcutsScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const page = shortcutPages[pageIndex];
  const rows = [...baseShortcutRows, page.aiRow];

  return (
    <div className="stack shortcuts-screen">
      <section className="panel">
        <div className="panel-title-row compact">
          <div>
            <h2>终端快捷键</h2>
            <p>在 Termux 原本两排快捷键下新增一排 AI 快捷键，目标是不输入命令也能启动常用 AI。</p>
          </div>
          <Keyboard size={21} />
        </div>
      </section>

      <div className="shortcut-tabs" role="tablist" aria-label="快捷键页">
        {shortcutPages.map((item, index) => (
          <button
            key={item.name}
            className={index === pageIndex ? "active" : ""}
            type="button"
            onClick={() => setPageIndex(index)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <section className="shortcut-page">
        <div className="shortcut-page-head">
          <div>
            <strong>{page.name}页演示</strong>
            <p>{page.note}</p>
          </div>
          {page.name === "常用" ? <Terminal size={21} /> : <Bot size={21} />}
        </div>
        <TerminalExtraKeysToolbar rows={rows} />
      </section>

      <TerminalPreviewPanel rows={rows} />

      <section className="panel shortcut-help">
        <h2>多页与自定义</h2>
        <p>
          第 1 页适合放短按键和参数片段，例如先点 `claude`，再点 `--continue`，也可以直接切到第 2 页点完整的 `claude --continue`。
        </p>
        <p>
          按键支持自定义和多页。用户可以让 AI 修改配置，例如“把第三排改成我的常用命令”，维护器会把名称和发送到终端的语句一起更新。
        </p>
      </section>
    </div>
  );
}

function TerminalGuideScreen({
  setupComplete,
  launchConfigConfirmed,
  startTerminalTutorial
}: {
  setupComplete: boolean;
  launchConfigConfirmed: boolean;
  startTerminalTutorial: () => void;
}) {
  const canStartTutorial = setupComplete && launchConfigConfirmed;

  return (
    <div className="stack">
      <section className="panel">
        <h2>终端教学</h2>
        <p className="muted">部署完成后使用。教学会进入终端，演示多终端侧边栏和底部三排快捷键。</p>
      </section>
      <div className="info-list">
        {["回到 Termux / Ubuntu 终端", "从左侧拉出多个终端列表", "新建、切换和关闭终端", "使用第三排 AI 快捷键启动 Claude / Codex / Reasonix"].map(
          (item, index) => (
            <div className="info-row" key={item}>
              <span>{index + 1}</span>
              <p>{item}</p>
            </div>
          )
        )}
      </div>
      <button className="action-button no-margin" type="button" disabled={!canStartTutorial} onClick={startTerminalTutorial}>
        <Play size={18} />
        {!setupComplete ? "先完成初始化配置" : launchConfigConfirmed ? "开始终端教学" : "先确认启动配置"}
      </button>
    </div>
  );
}

function TerminalPreviewPanel({ rows }: { rows: string[][][] }) {
  return (
    <section className="terminal-preview-panel" aria-label="终端预览">
      <div className="terminal-preview-head">
        <strong>终端预览</strong>
        <span>侧边栏点“回到终端”后进入这里</span>
      </div>
      <pre className="terminal-preview-canvas">
        <span>$ cd ~</span>
        <span>$ proot-distro login ubuntu --user root --shared-tmp</span>
        <span>root@ubuntu:~# claude --continue</span>
        <span className="terminal-preview-cursor"> </span>
      </pre>
      <TerminalExtraKeysToolbar rows={rows} compact />
    </section>
  );
}

function TerminalExtraKeysToolbar({
  rows,
  selected,
  onSelect,
  highlightLabels = [],
  compact = false
}: {
  rows: string[][][];
  selected?: { row: number; key: number };
  onSelect?: (value: { row: number; key: number }) => void;
  highlightLabels?: string[];
  compact?: boolean;
}) {
  return (
    <div className={`extra-keys-toolbar ${compact ? "compact" : ""}`}>
      {rows.map((row, rowIndex) => (
        <div className="extra-key-row" key={`row-${rowIndex}`}>
          {row.map(([label, command], keyIndex) => (
            <button
              className={[
                selected?.row === rowIndex && selected.key === keyIndex ? "selected" : "",
                highlightLabels.includes(label) ? "highlighted" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              key={`${rowIndex}-${label}`}
              title={command}
              onClick={() => onSelect?.({ row: rowIndex, key: keyIndex })}
            >
              {label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function MainScreen(props: {
  onboardingStep: OnboardingStep;
  progress: number;
  initState: InitState;
  initDone: boolean;
  keyReady: boolean;
  deepseekKeySaved: boolean;
  deepseekConfigured: boolean;
  deepseekKeySkipped: boolean;
  deepseekConfigSkipped: boolean;
  currentStep: string;
  openCodeStarted: boolean;
  batteryOptimizationIgnored: boolean;
  setupComplete: boolean;
  launchConfigConfirmed: boolean;
  resetPreview: () => void;
  startTerminalTutorial: () => void;
  returnToTerminal: () => void;
  terminalTutorialSeen: boolean;
}) {
  const keyStatus = props.deepseekKeySkipped ? "已跳过" : props.deepseekKeySaved ? "已保存" : props.keyReady ? "已填写未保存" : "待保存";
  const configStatus = props.deepseekConfigSkipped ? "已跳过" : props.deepseekConfigured ? "已配置" : props.deepseekKeySaved ? "待配置" : "等待 Key";

  return (
    <div className="stack">
      <div className="status-strip">
        <StatusPill label="存储权限" value="已授权" tone="ok" />
        <StatusPill
          label="电池优化"
          value={props.batteryOptimizationIgnored ? "已忽略" : "待授权"}
          tone={props.batteryOptimizationIgnored ? "ok" : "warn"}
        />
        <StatusPill label="安装" value={stateLabel(props.initState)} tone={props.initDone ? "ok" : "plain"} />
        <StatusPill label="Key" value={keyStatus} tone={props.deepseekKeySaved ? "ok" : props.deepseekKeySkipped ? "plain" : "warn"} />
        <StatusPill label="配置" value={configStatus} tone={props.deepseekConfigured ? "ok" : props.deepseekConfigSkipped ? "plain" : "warn"} />
      </div>

      <section className="panel primary-panel">
        <div className="panel-title-row">
          <div>
            <h1>初始化安装和配置</h1>
            <p>主流程现在统一在终端向导中完成；这里仅展示当前阶段摘要，避免两套入口互相冲突。</p>
          </div>
          <span className={`state-badge ${props.setupComplete ? "done" : props.initState}`}>
            {props.setupComplete ? "待进入终端" : onboardingStepLabel(props.onboardingStep)}
          </span>
        </div>

        <button className="action-button" type="button" onClick={props.returnToTerminal}>
          <Terminal size={19} />
          <span>
            {props.setupComplete ? "回到终端" : "打开终端向导"}
          </span>
        </button>

        <div className="progress-block">
          <div className="progress-meta">
            <span>当前进度</span>
            <strong>{props.progress}%</strong>
          </div>
          <div className="progress-track" aria-label="初始化进度">
            <div style={{ width: `${props.progress}%` }} />
          </div>
          <p>{props.currentStep}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row compact">
          <div>
            <h2>当前向导阶段</h2>
            <p>{onboardingStepDescription(props.onboardingStep)}</p>
          </div>
          <ChevronRight size={18} />
        </div>
        <div className="info-list">
          {[
            ["后台权限", props.batteryOptimizationIgnored ? "已允许忽略电池优化" : "等待授权"],
            ["初始化安装", props.initDone ? "安装完成" : props.initState === "running" ? `进行中，${props.progress}%` : "尚未开始"],
            ["DeepSeek Key", keyStatus],
            ["AI 工具配置", configStatus],
            ["OpenCode", props.openCodeStarted ? "运行中，http://127.0.0.1:4096" : "待手动启动"]
          ].map(([label, value], index) => (
            <div className="info-row" key={label}>
              <span>{index + 1}</span>
              <p>
                <strong>{label}</strong>：{value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel launch-panel">
        <div>
          <h2>启动配置摘要</h2>
          <p>最终启动配置只在终端向导的启动配置屏操作。</p>
        </div>
        <div className="onboarding-config-grid">
          <div className="onboarding-path-card">
            <span>OpenCode 目录</span>
            <code>/root</code>
          </div>
          <div className="onboarding-path-card">
            <span>端口</span>
            <code>4096</code>
          </div>
        </div>
        <div className="tutorial-start-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={!props.setupComplete || !props.launchConfigConfirmed}
            onClick={props.startTerminalTutorial}
          >
            <Play size={18} />
            {!props.setupComplete
              ? "先完成向导"
              : !props.launchConfigConfirmed
                ? "先确认启动配置"
                : props.terminalTutorialSeen
                  ? "重新观看教学"
                  : "开始教学"}
          </button>
          <button className="secondary-button" type="button" onClick={props.resetPreview}>
            <RotateCcw size={17} />
            重置预览状态
          </button>
        </div>
      </section>
    </div>
  );
}

function ManualScreen() {
  const manualSections = [
    {
      title: "1. 终端使用入门",
      summary: "简要学习 Termux / Ubuntu 终端、多终端侧边栏和底部三排快捷键。",
      points: ["回到终端后可能位于 Termux，也可能已进入 Ubuntu。", "左侧可以拉出多个终端列表，新建和切换会话。", "底部前两排是基础键，第三排是 AI 快捷键。"]
    },
    {
      title: "2. AI 软件总览",
      summary: "Claude Code、Codex、Reasonix、OpenCode 都是可用入口，DeepSeek Key 会自动配置。",
      points: ["OpenHouseAI 的特点是可接入的模型和 AI 编程工具较广。", "普通用户优先通过快捷键或 OpenCode Web 使用，不需要手敲命令。"]
    },
    {
      title: "3. Claude Code 详细介绍",
      summary: "适合持续对话式改代码、解释项目、修复报错。",
      points: ["第三排可点 claude 和 --continue。", "第二页提供完整 claude --continue。", "常用语句可做成快捷键。"]
    },
    {
      title: "4. Codex 详细介绍",
      summary: "适合实现功能、检查改动、跑测试和整理提交。",
      points: ["可通过 codex 快捷键启动。", "可让 Codex 继续当前任务或 review 当前改动。"]
    },
    {
      title: "5. Reasonix 详细介绍",
      summary: "适合方案审查、原因分析、风险检查和多方案比较。",
      points: ["可通过 reasonix 快捷键启动。", "适合在修改前后做推理和验证。"]
    },
    {
      title: "6. 其他 Agent 与模型接入",
      summary: "保留后续扩展位置，用于说明更多模型、API Key 和工具接入方式。",
      points: ["当前主线先配置 DeepSeek Key。", "后续可以把更多模型或 Agent 的配置说明放到在线手册。"]
    },
    {
      title: "7. OpenCode Web",
      summary: "OpenCode 原生提供网页访问，适合在浏览器里使用 AI 编程环境。",
      points: ["新增项目时一开始填写 /root。", "默认地址是 http://127.0.0.1:4096。", "4096 是端口，不是项目路径。"]
    }
  ];

  return (
    <div className="stack">
      <section className="panel manual-head">
        <div>
          <h2>使用手册</h2>
          <p>离线基础说明已内置；联网时可打开在线最新版。</p>
        </div>
        <div className="manual-actions">
          <a className="secondary-button" href="https://jiwuyou.github.io/openhouseai-docs/" target="_blank" rel="noreferrer">
            在线最新版
          </a>
          <button className="secondary-button" type="button">
            离线手册
          </button>
        </div>
      </section>

      <section className="panel opencode-path-panel">
        <span>OpenCode 新增项目先用</span>
        <code>/root</code>
        <p>OpenCode 会在 Ubuntu 的 `/root` 目录启动。第一次新增项目或选择项目时，先填写 `/root`，不要把端口 `4096` 当成项目路径。</p>
      </section>

      <div className="manual-section-list">
        {manualSections.map((item) => (
          <section className="manual-section" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <ul>
              {item.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function OpenCodeControlScreen(props: {
  initDone: boolean;
  keySaved: boolean;
  deepseekConfigured: boolean;
  launchConfigConfirmed: boolean;
  openCodeStarted: boolean;
  copied: boolean;
  startOpenCode: () => void;
  stopOpenCode: () => void;
  copyAddress: () => void;
}) {
  const ready = props.initDone && props.launchConfigConfirmed;

  return (
    <div className="stack">
      <section className="panel opencode-control-hero">
        <div>
          <h2>OpenCode 控制</h2>
          <p>这里集中控制 OpenCode Web 服务；未配置 DeepSeek 或未确认启动配置前保持锁定。</p>
        </div>
        <span className={`service-status ${props.openCodeStarted ? "running" : ""}`}>
          {props.openCodeStarted ? "运行中" : "未启动"}
        </span>
      </section>

      <section className="panel opencode-control-panel">
        <div className="opencode-control-grid">
          <button className="action-button no-margin" type="button" disabled={!ready} onClick={props.startOpenCode}>
            <Play size={18} />
            启动
          </button>
          <button className="secondary-button" type="button" disabled={!ready || !props.openCodeStarted} onClick={props.startOpenCode}>
            <RotateCcw size={17} />
            重启
          </button>
          <button className="secondary-button" type="button" disabled={!ready || !props.openCodeStarted} onClick={props.stopOpenCode}>
            <Power size={17} />
            停止
          </button>
          <button className="secondary-button" type="button" disabled={!ready || !props.openCodeStarted} onClick={props.copyAddress}>
            {props.copied ? <Clipboard size={17} /> : <Copy size={17} />}
            {props.copied ? "已复制" : "复制地址"}
          </button>
        </div>
        <code className={props.openCodeStarted ? "address ready" : "address"}>http://127.0.0.1:4096</code>
      </section>

      <div className="info-list">
        {[
          "OpenCode 会在 Ubuntu 的 `/root` 目录启动。",
          "新增项目时一开始填写 `/root`。",
          "停止只关闭 OpenCode Web 服务，不会删除 Ubuntu 或用户项目。",
          "运行时不使用代理；端口默认是 4096。"
        ].map((item, index) => (
          <div className="info-row" key={item}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RepairScreen({ resetPreview }: { resetPreview: () => void }) {
  return (
    <div className="stack">
      <section className="panel">
        <h2>维护与修复</h2>
        <p className="muted">分步维护入口集中放在这里，主页面只保留主线流程。</p>
      </section>
      {["重新检查电池优化", "重写配置文件", "修复 Ubuntu 环境", "重新安装 OpenCode", "清理缓存日志"].map((label) => (
        <button className="repair-row" key={label} type="button">
          <Wrench size={18} />
          <span>{label}</span>
          <ChevronRight size={16} />
        </button>
      ))}
      <button className="danger-button" type="button" onClick={resetPreview}>
        重置预览状态
      </button>
    </div>
  );
}

function LogsScreen() {
  return (
    <div className="stack">
      <section className="panel">
        <h2>日志</h2>
        <p className="muted">日志页展示终端输出，主页面底部终端默认折叠。</p>
      </section>
      <pre className="log-panel">{logLines.join("\n")}</pre>
    </div>
  );
}

function AdvancedScreen() {
  return (
    <div className="stack">
      <section className="panel">
        <h2>高级设置</h2>
        <p className="muted">保留给调试和安装器参数确认，默认值面向普通用户。</p>
      </section>
      {[
        ["OpenCode 端口", "4096"],
        ["启动目录", "/root"],
        ["运行时代理", "不使用"],
        ["在线手册地址", "https://jiwuyou.github.io/openhouseai-docs/"],
        ["手册模式", "离线内置 + 在线增强"],
        ["日志级别", "标准"]
      ].map(([label, value]) => (
        <div className="setting-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function InfoScreen({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="stack">
      <section className="panel">
        <h2>{title}</h2>
        <p className="muted">用于 APK 内页面文案和信息结构确认。</p>
      </section>
      <div className="info-list">
        {items.map((item, index) => (
          <div className="info-row" key={item}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: "ok" | "plain" | "warn" }) {
  return (
    <div className={`status-pill ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function onboardingStepLabel(step: OnboardingStep) {
  if (step === "permission") return "后台权限";
  if (step === "install") return "初始化安装";
  if (step === "readingGuide") return "建议阅读";
  if (step === "deepseekKey") return "保存 Key";
  if (step === "waitingInstall") return "等待安装";
  if (step === "configureDeepseek") return "配置 DeepSeek";
  return "启动配置";
}

function onboardingStepDescription(step: OnboardingStep) {
  if (step === "permission") return "先允许忽略电池优化，确保后台安装不会被系统中断。";
  if (step === "install") return "点击一键初始化后会立即进入建议阅读页面，安装继续后台运行。";
  if (step === "readingGuide") return "先读完安装时间、Key、OpenCode Web 和 AI Agent 说明，再进入 Key 页面。";
  if (step === "deepseekKey") return "填写 DeepSeek Key 并点击保存；只输入不保存不会完成配置。";
  if (step === "waitingInstall") return "Key 已保存或已跳过，当前等待初始化安装结束。";
  if (step === "configureDeepseek") return "安装完成后，配置 DeepSeek；如果已跳过 Key，则建议先启动 OpenCode Web 再手动配置。";
  return "确认 /root 和 4096，手动启动 OpenCode，或进入终端教学。";
}

function getNextOnboardingStep(
  step: OnboardingStep,
  state: {
    batteryOptimizationIgnored: boolean;
    initStarted: boolean;
    initDone: boolean;
    deepseekKeySaved: boolean;
    deepseekConfigured: boolean;
    batteryOptimizationSkipped: boolean;
    deepseekKeySkipped: boolean;
    deepseekConfigSkipped: boolean;
  }
) {
  if (step === "permission") return state.batteryOptimizationIgnored || state.batteryOptimizationSkipped ? "install" : null;
  if (step === "install") return state.initStarted ? "readingGuide" : null;
  if (step === "readingGuide") return "deepseekKey";
  if (step === "deepseekKey") {
    if (!state.deepseekKeySaved && !state.deepseekKeySkipped) return null;
    return state.initDone ? "configureDeepseek" : "waitingInstall";
  }
  if (step === "waitingInstall") return state.initDone ? "configureDeepseek" : null;
  if (step === "configureDeepseek") return state.deepseekConfigured || state.deepseekConfigSkipped ? "launchConfig" : null;
  return null;
}

function getForceSkipInfo(
  step: OnboardingStep,
  state: {
    initStarted: boolean;
    initDone: boolean;
    deepseekKeySkipped: boolean;
    deepseekConfigSkipped: boolean;
  }
) {
  if (step === "permission") {
    return {
      enabled: true,
      label: "强行跳过权限检测",
      risk: "如果系统实际没有允许后台运行，初始化安装可能在息屏、切换应用或省电策略下中断。"
    };
  }
  if (step === "install") {
    return {
      enabled: false,
      label: "先启动一键初始化",
      risk: "初始化安装不能直接跳过。请先点击一键初始化；启动后会自动进入下一屏。"
    };
  }
  if (step === "readingGuide") {
    return {
      enabled: true,
      label: "跳过阅读，继续填写 Key",
      risk: "跳过阅读不会影响安装，但你可能错过 Key 获取、OpenCode Web 和其他 AI Agent 配置方式说明。"
    };
  }
  if (step === "deepseekKey") {
    return {
      enabled: true,
      label: "暂不配置 Key，下一步",
      risk: "跳过 DeepSeek Key 后，OpenCode 可以先启动，但模型 API 需要稍后在 OpenCode Web 中手动配置。"
    };
  }
  if (step === "waitingInstall") {
    return {
      enabled: false,
      label: "等待安装完成",
      risk: state.deepseekKeySkipped
        ? "你已跳过 Key。安装完成后建议先启动 OpenCode Web，再在网页里配置模型和其他 AI Agent。"
        : "安装仍在进行，暂时不能跳过到启动配置。"
    };
  }
  if (step === "configureDeepseek") {
    return {
      enabled: !state.deepseekConfigSkipped,
      label: state.deepseekKeySkipped ? "去启动 OpenCode Web" : "跳过自动配置",
      risk: state.deepseekKeySkipped
        ? "你已跳过 DeepSeek Key。下一步建议先启动 OpenCode Web，在网页里配置模型 API。"
        : "跳过自动配置后，OpenCode 可启动，但 Claude Code、Reasonix 等工具不会自动写入 DeepSeek Key。"
    };
  }
  return {
    enabled: false,
    label: "已到最后一屏",
    risk: "启动配置页不能再跳过；请启动 OpenCode，或进入终端继续。"
  };
}

function stateLabel(state: InitState) {
  if (state === "running") return "进行中";
  if (state === "done") return "已完成";
  return "未开始";
}

export default App;
