import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Boxes,
  CircleDot,
  Cloud,
  Code2,
  Compass,
  Database,
  FileText,
  Folder,
  Gamepad2,
  Gauge,
  Globe2,
  Home,
  KeyRound,
  LayoutGrid,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Terminal,
  Wifi,
  Wrench,
  X
} from "lucide-react";

type SurfaceId = "home" | "browser" | "terminal";
type SettingsSectionId = "status" | "maintenance" | "ai" | "network" | "developer";

const smallPhoneApps = [
  { name: "AI 联系人", icon: MessageCircle, accent: "teal", detail: "任务、聊天、长期记忆" },
  { name: "应用管理", icon: Boxes, accent: "amber", detail: "SmallPhone 管理子应用" },
  { name: "文件", icon: Folder, accent: "blue", detail: "上传、下载、共享" },
  { name: "浏览器", icon: Globe2, accent: "violet", detail: "本地页面与外部网页" },
  { name: "终端", icon: Terminal, accent: "green", detail: "必要时进入 shell" },
  { name: "日记", icon: FileText, accent: "rose", detail: "本地记录和素材" },
  { name: "小游戏", icon: Gamepad2, accent: "cyan", detail: "轻应用示例" },
  { name: "设置", icon: Settings, accent: "gray", detail: "SmallPhone 自己维护自己" }
];

const runtimeServices = [
  { name: "SmallPhone", status: "运行中", endpoint: "127.0.0.1:22082", icon: Smartphone },
  { name: "SmallPhone Core API", status: "健康", endpoint: "127.0.0.1:22000", icon: Code2 },
  { name: "service-manager", status: "控制中", endpoint: "127.0.0.1:20087", icon: Database },
  { name: "SmallPhone Apps", status: "受控", endpoint: "service-manager", icon: Boxes },
  { name: "cc-connect", status: "就绪", endpoint: "127.0.0.1:21040", icon: Cloud }
];

const settingsSections: Array<{ id: SettingsSectionId; label: string; icon: typeof Activity }> = [
  { id: "status", label: "运行状态", icon: Gauge },
  { id: "maintenance", label: "安装修复", icon: Wrench },
  { id: "ai", label: "AI 配置", icon: KeyRound },
  { id: "network", label: "网络代理", icon: Wifi },
  { id: "developer", label: "开发者", icon: Terminal }
];

function App() {
  const [surface, setSurface] = useState<SurfaceId>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("maintenance");
  const [url, setUrl] = useState("http://127.0.0.1:22082/");
  const [runtimeRunning, setRuntimeRunning] = useState(true);

  const activeTitle = useMemo(() => {
    if (surface === "browser") return "SmallPhone 浏览器";
    if (surface === "terminal") return "终端";
    return "SmallPhone";
  }, [surface]);

  function openSettings(section: SettingsSectionId = "status") {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

  return (
    <div className="preview-page">
      <div className={settingsOpen ? "product-frame drawer-open" : "product-frame"}>
        <header className="android-status">
          <span>09:42</span>
          <span className="status-right">5G  84%</span>
        </header>

        <div className="browser-topbar">
          <div className="browser-actions" aria-label="浏览器导航">
            <button className="icon-button" type="button" aria-label="返回">
              <ArrowLeft size={18} />
            </button>
            <button className="icon-button" type="button" aria-label="刷新">
              <RefreshCw size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="回到 SmallPhone"
              onClick={() => setSurface("home")}
            >
              <Home size={18} />
            </button>
          </div>

          <div className="address-bar">
            <ShieldCheck size={16} />
            <input
              aria-label="地址"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>

          <button
            className="icon-button settings-button"
            type="button"
            aria-label="打开维护抽屉"
            onClick={() => openSettings("maintenance")}
          >
            <Settings size={18} />
          </button>
        </div>

        <main className="workspace">
          <section className="shell-banner">
            <div>
              <span className="eyebrow">SmallPhoneAI 默认打开 SmallPhone</span>
              <h1>{activeTitle}</h1>
            </div>
            <button
              className={runtimeRunning ? "run-pill active" : "run-pill"}
              type="button"
              onClick={() => setRuntimeRunning((value) => !value)}
            >
              <CircleDot size={14} />
              {runtimeRunning ? "SmallPhone 已启动" : "点击启动 SmallPhone"}
            </button>
          </section>

          {surface === "home" && (
            <SmallPhoneHome
              runtimeRunning={runtimeRunning}
              onOpenBrowser={() => setSurface("browser")}
              onOpenTerminal={() => setSurface("terminal")}
              onOpenSettings={openSettings}
            />
          )}

          {surface === "browser" && <BrowserSurface />}
          {surface === "terminal" && <TerminalSurface />}
        </main>

        <nav className="bottom-dock" aria-label="主导航">
          <DockButton active={surface === "home"} icon={LayoutGrid} label="桌面" onClick={() => setSurface("home")} />
          <DockButton active={surface === "browser"} icon={Compass} label="浏览" onClick={() => setSurface("browser")} />
          <DockButton active={surface === "terminal"} icon={Terminal} label="终端" onClick={() => setSurface("terminal")} />
          <DockButton
            active={settingsOpen}
            icon={Settings}
            label="维护"
            onClick={() => openSettings("maintenance")}
          />
        </nav>

        <aside className={settingsOpen ? "settings-drawer open" : "settings-drawer"} aria-label="系统设置抽屉">
          <div className="drawer-header">
            <div>
              <span className="eyebrow">OpenHouse Recovery</span>
              <strong>维护抽屉</strong>
            </div>
            <button className="icon-button" type="button" aria-label="关闭设置" onClick={() => setSettingsOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <OuterMaintenanceCenter
            selected={settingsSection}
            onSelect={setSettingsSection}
            runtimeRunning={runtimeRunning}
            onToggleRuntime={() => setRuntimeRunning((value) => !value)}
            onOpenSmallPhone={() => {
              setSurface("home");
              setSettingsOpen(false);
            }}
          />
        </aside>
      </div>
    </div>
  );
}

function SmallPhoneHome({
  runtimeRunning,
  onOpenBrowser,
  onOpenTerminal,
  onOpenSettings
}: {
  runtimeRunning: boolean;
  onOpenBrowser: () => void;
  onOpenTerminal: () => void;
  onOpenSettings: (section?: SettingsSectionId) => void;
}) {
  return (
    <div className="home-layout">
      <section className="smallphone-stage">
        <div className="wallpaper-panel">
          <div className="world-line">
            <span className="world-node node-a" />
            <span className="world-node node-b" />
            <span className="world-node node-c" />
          </div>
          <div className="stage-copy">
            <p>打开 App 后直接到这里</p>
            <strong>SmallPhone 是产品本体</strong>
          </div>
        </div>

        <div className="app-grid">
          {smallPhoneApps.map((app) => {
            const Icon = app.icon;
            const clickHandler =
              app.name === "浏览器" ? onOpenBrowser : app.name === "终端" ? onOpenTerminal : app.name === "设置" ? () => onOpenSettings("status") : undefined;
            return (
              <button
                className={`app-tile accent-${app.accent}`}
                type="button"
                key={app.name}
                onClick={clickHandler}
              >
                <span className="app-icon">
                  <Icon size={21} />
                </span>
                <strong>{app.name}</strong>
                <small>{app.detail}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="runtime-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">service-manager 托管核心栈</span>
            <h2>SmallPhone 健康状态</h2>
          </div>
          <span className={runtimeRunning ? "health-dot ok" : "health-dot down"} />
        </div>
        <div className="service-list">
          {runtimeServices.map((service) => {
            const Icon = service.icon;
            return (
              <div className="service-row" key={service.name}>
                <Icon size={18} />
                <div>
                  <strong>{service.name}</strong>
                  <small>{service.endpoint}</small>
                </div>
                <span>{runtimeRunning ? service.status : "未启动"}</span>
              </div>
            );
          })}
        </div>
        <div className="action-row">
          <button className="primary-button" type="button" onClick={() => onOpenSettings("maintenance")}>
            <Wrench size={16} />
            修复 SmallPhone
          </button>
          <button className="secondary-button" type="button" onClick={onOpenTerminal}>
            <Terminal size={16} />
            终端
          </button>
        </div>
      </section>
    </div>
  );
}

function BrowserSurface() {
  return (
    <section className="work-surface browser-surface">
      <div className="surface-head">
        <Search size={18} />
        <div>
          <h2>SmallPhone 内置浏览器</h2>
          <p>默认服务本地页面，必要时打开外部网页。</p>
        </div>
      </div>
      <div className="browser-preview">
        <div className="browser-result">
          <Smartphone size={22} />
          <strong>SmallPhone</strong>
          <span>http://127.0.0.1:22082</span>
        </div>
        <div className="browser-result">
          <FileText size={22} />
          <strong>本地使用手册</strong>
          <span>smallphone.local/guide</span>
        </div>
        <div className="browser-result">
          <Code2 size={22} />
          <strong>SmallPhone Core API</strong>
          <span>127.0.0.1:22000</span>
        </div>
        <div className="browser-result">
          <Database size={22} />
          <strong>service-manager</strong>
          <span>127.0.0.1:20087</span>
        </div>
        <div className="browser-result">
          <Cloud size={22} />
          <strong>cc-connect</strong>
          <span>127.0.0.1:21040</span>
        </div>
        <div className="browser-result">
          <Activity size={22} />
          <strong>服务状态页</strong>
          <span>smallphone.local/status</span>
        </div>
      </div>
    </section>
  );
}

function TerminalSurface() {
  return (
    <section className="work-surface terminal-surface">
      <div className="terminal-title">
        <Terminal size={18} />
        <span>Ubuntu /root</span>
      </div>
      <pre>{`$ smallphone status
SmallPhone      running  :22082
SmallPhone API  healthy  :22000
service-manager running  :20087
cc-connect      ready    :21040

$ openhouse repair smallphone
service-manager backend ok
cc-connect ready
health ok, no repair needed`}</pre>
      <div className="terminal-keys">
        <button type="button">claude -c</button>
        <button type="button">codex review</button>
        <button type="button">git status</button>
      </div>
    </section>
  );
}

function OuterMaintenanceCenter({
  selected,
  onSelect,
  runtimeRunning,
  onToggleRuntime,
  onOpenSmallPhone
}: {
  selected: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
  runtimeRunning: boolean;
  onToggleRuntime: () => void;
  onOpenSmallPhone: () => void;
}) {
  return (
    <div className="maintenance-center">
      <section className="maintenance-hero">
        <div>
          <span className="eyebrow">OpenHouse 外层维护中心</span>
          <h2>这里只负责把 SmallPhone 拉起来、修好、更新好</h2>
          <p>用户日常直接进入 SmallPhone；外层只在首次安装、异常恢复和高级配置时出现，生命周期动作交给 service-manager。</p>
        </div>
        <div className="hero-status-card">
          <span className={runtimeRunning ? "health-dot ok" : "health-dot down"} />
          <strong>{runtimeRunning ? "SmallPhone 正常运行" : "SmallPhone 未启动"}</strong>
          <small>入口 http://127.0.0.1:22082</small>
        </div>
      </section>

      <section className="quick-actions">
        <button className="primary-button" type="button" onClick={onToggleRuntime}>
          <Play size={16} />
          {runtimeRunning ? "重启核心栈" : "启动核心栈"}
        </button>
        <button className="secondary-button" type="button">
          <RefreshCw size={16} />
          重新检查
        </button>
        <button className="secondary-button" type="button">
          <Wrench size={16} />
          一键修复
        </button>
        <button className="secondary-button" type="button" onClick={onOpenSmallPhone}>
          <Smartphone size={16} />
          打开 SmallPhone
        </button>
      </section>

      <div className="settings-tabs">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              className={selected === section.id ? "active" : ""}
              type="button"
              key={section.id}
              onClick={() => onSelect(section.id)}
            >
              <Icon size={16} />
              {section.label}
            </button>
          );
        })}
      </div>
      <div className="settings-content">
        {selected === "status" && (
          <StatusDashboard runtimeRunning={runtimeRunning} />
        )}
        {selected === "maintenance" && (
          <RepairDashboard />
        )}
        {selected === "ai" && (
          <MaintenanceBlock
            title="AI 配置"
            rows={[
              ["API Key", "统一写入 SmallPhone 配置"],
              ["默认模型", "由 SmallPhone 设置页暴露"],
              ["Agent", "通过 cc-connect / OpenCode 承接"],
              ["应用生命周期", "由 service-manager 控制 SmallPhone apps"]
            ]}
            actionLabel="打开 AI 设置"
          />
        )}
        {selected === "network" && (
          <MaintenanceBlock
            title="网络代理"
            rows={[
              ["VPN 代理", "由外层统一检测"],
              ["Git 代理", "按需临时注入"],
              ["服务代理", "由外层统一检测"]
            ]}
            actionLabel="检测代理"
          />
        )}
        {selected === "developer" && (
          <MaintenanceBlock
            title="开发者入口"
            rows={[
              ["终端", "进入 Termux / Ubuntu"],
              ["端口", "查看当前运行端口"],
              ["调试", "打开日志和 WebView 调试"],
              ["后端", "验证 service-manager API"]
            ]}
            actionLabel="打开终端"
          />
        )}
      </div>
    </div>
  );
}

function StatusDashboard({ runtimeRunning }: { runtimeRunning: boolean }) {
  return (
    <section className="status-dashboard">
      <div className="status-card large">
        <span className={runtimeRunning ? "health-dot ok" : "health-dot down"} />
        <div>
          <h2>SmallPhone</h2>
          <p>{runtimeRunning ? "WebView 会默认打开这个入口。" : "启动失败时停留在维护中心。"}</p>
        </div>
        <strong>{runtimeRunning ? "运行中" : "未启动"}</strong>
      </div>
      <div className="status-grid">
        {runtimeServices.map((service) => {
          const Icon = service.icon;
          return (
            <div className="status-card" key={service.name}>
              <Icon size={20} />
              <div>
                <strong>{service.name}</strong>
                <small>{service.endpoint}</small>
              </div>
              <span>{runtimeRunning ? service.status : "未启动"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RepairDashboard() {
  return (
    <section className="repair-dashboard">
      <div className="repair-main">
        <h2>维护流程</h2>
        <div className="repair-steps">
          <RepairStep number="1" title="首次安装核心栈" detail="bootstrap 安装 SmallPhone、service-manager、cc-connect" state="可恢复" />
          <RepairStep number="2" title="检查 service-manager" detail="后端接管核心服务和 SmallPhone apps 生命周期" state="通过" />
          <RepairStep number="3" title="检查 cc-connect" detail="桥接 Agent 连接和远端客户端" state="通过" />
          <RepairStep number="4" title="检查 SmallPhone 入口" detail="WebView 默认打开 127.0.0.1:22082" state="通过" />
          <RepairStep number="5" title="启动失败自动恢复" detail="查看日志、重启服务、必要时进入终端" state="待命" />
        </div>
      </div>
      <div className="log-panel">
        <h2>最近日志</h2>
        <pre>{`[09:41:03] smallphone check: ok
[09:41:04] service-manager: healthy
[09:41:04] port 22082: listening
[09:41:04] port 22000: healthy
[09:41:05] cc-connect: ready
[09:41:06] webview target: 127.0.0.1:22082`}</pre>
      </div>
    </section>
  );
}

function RepairStep({
  number,
  title,
  detail,
  state
}: {
  number: string;
  title: string;
  detail: string;
  state: string;
}) {
  return (
    <div className="repair-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <em>{state}</em>
    </div>
  );
}

function MaintenanceBlock({
  title,
  rows,
  actionLabel,
  onAction
}: {
  title: string;
  rows: Array<[string, string]>;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <section className="maintenance-block">
      <h2>{title}</h2>
      <div className="maintenance-rows">
        {rows.map(([label, value]) => (
          <div className="maintenance-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <button className="primary-button" type="button" onClick={onAction}>
        <Play size={16} />
        {actionLabel}
      </button>
    </section>
  );
}

function DockButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof Activity;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "dock-button active" : "dock-button"} type="button" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

export default App;
