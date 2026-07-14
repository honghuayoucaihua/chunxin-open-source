
import './compat/runtimeCompat';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { cleanupResetQueryParam } from './appResetQuery';
import { isAdminRoutePath } from './admin/adminRouteConfig';
import { APP_LOGO_COMPACT_SRC } from './services/staticAssetPaths';
import { buildAppErrorReport } from './appErrorReport';

// 检测动态模块加载失败（新版部署后旧资源文件被删除导致）
const isChunkLoadError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    const msg = error.message || '';
    return msg.includes('Failed to fetch dynamically imported module') ||
           msg.includes('Importing a module script failed');
  }
  return false;
};

// 防止无限刷新：15 秒内最多自动刷新一次
const CHUNK_RELOAD_KEY = '__chunk_reload_ts';
let _chunkReloaded = false;

const tryChunkReload = (): boolean => {
  if (_chunkReloaded) return false;
  _chunkReloaded = true;

  try {
    const prev = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    if (prev) {
      const prevTime = parseInt(prev, 10);
      if (now - prevTime < 15000) {
        console.error('[ChunkReload] 短时间内已刷新过但问题仍存在，停止自动刷新');
        return false;
      }
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    // sessionStorage 不可用时跳过
  }

  // 清除 Service Worker 缓存，确保下次拿到新版本
  if ('caches' in window) {
    caches.keys().then(keys => { keys.forEach(k => caches.delete(k)); }).catch(() => {});
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister().catch(() => {}));
    }).catch(() => {});
  }

  // 用带时间戳的 URL 强制绕过浏览器和 CDN 缓存，重新拉取 index.html
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set('_v', Date.now().toString());
  window.location.replace(url.toString());
  return true;
};

// 安全懒加载包装：在 import() 层面拦截模块加载失败
const safeLazy = <T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => {
  return React.lazy(() =>
    importer().catch((err) => {
      if (isChunkLoadError(err)) {
        console.warn('[ChunkReload] import() 失败，尝试刷新');
        if (tryChunkReload()) {
          return new Promise<{ default: T }>(() => {}); // 永久挂起，等待页面刷新
        }
      }
      throw err;
    })
  );
};

const App = safeLazy(() => import('./App'));
const AdminPanel = safeLazy(() => import('./admin/AdminPanel'));

const BootFallback: React.FC = () => (
  <div className="h-screen w-screen bg-[#f5f5f5] flex items-center justify-center overflow-hidden">
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-2 border-[#d7d7d7]"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#a8a8a8] animate-spin"></div>
        <img
          src={APP_LOGO_COMPACT_SRC}
          alt="logo"
          className="shadow-sm block"
          width={56}
          height={56}
          fetchPriority="high"
          decoding="async"
          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 14 }}
        />
    </div>
  </div>
);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到错误:', error);
    console.error('[ErrorBoundary] 错误堆栈:', errorInfo.componentStack);

    // 动态模块加载失败（新版部署后旧资源文件被删除）→ 自动刷新页面获取新版本
    if (isChunkLoadError(error)) {
      console.warn('[ErrorBoundary] 检测到动态模块加载失败，尝试自动刷新');
      if (tryChunkReload()) return;
    }

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // 尝试刷新页面
    window.location.reload();
  };

  buildErrorReport = () => {
    return buildAppErrorReport({
      error: this.state.error,
      componentStack: this.state.errorInfo?.componentStack || ''
    });
  };

  copyErrorReport = async () => {
    const text = this.buildErrorReport();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert('错误信息已复制');
        return;
      }
    } catch {
      // ignore and fallback
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('错误信息已复制');
  };

  render() {
    if (this.state.hasError) {
      const report = this.buildErrorReport();
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          backgroundColor: '#F7F7F7',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>😔</div>
          <h2 style={{
            fontSize: '18px',
            color: '#333',
            marginBottom: '12px',
            margin: 0
          }}>出错了</h2>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px',
            maxWidth: '300px'
          }}>
            应用遇到了一个错误，请尝试刷新页面
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              backgroundColor: '#07C160',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            刷新页面
          </button>
          <div style={{
            marginTop: '20px',
            width: '100%',
            maxWidth: '760px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#666', fontSize: '13px' }}>错误详情</span>
              <button
                onClick={this.copyErrorReport}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  backgroundColor: '#1976D2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                复制错误信息
              </button>
            </div>
            <textarea
              readOnly
              value={report}
              style={{
                width: '100%',
                minHeight: '220px',
                fontSize: '12px',
                color: '#D32F2F',
                backgroundColor: '#FFEBEE',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #F5C2C7',
                whiteSpace: 'pre',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 全局错误处理 - 捕获未处理的 Promise 拒绝和 JS 错误
const setupGlobalErrorHandler = () => {
  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global] 未处理的 Promise 拒绝:', event.reason);
    // 阻止默认行为（控制台报错）
    event.preventDefault();
  });

  // 捕获未处理的 JS 错误
  window.addEventListener('error', (event) => {
    // 动态模块加载失败（新版部署后旧资源被删除）→ 自动刷新
    const message = event.message || '';
    if (message.includes('Failed to fetch dynamically imported module')) {
      console.warn('[Global] 动态模块加载失败，尝试自动刷新');
      if (tryChunkReload()) return;
    }
    console.error('[Global] 未处理的错误:', event.error);
  });
};

// 初始化全局错误处理
setupGlobalErrorHandler();
cleanupResetQueryParam();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// 根据路径决定渲染哪个组件
const path = window.location.pathname;
const isAdminRoute = isAdminRoutePath(path);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense fallback={<BootFallback />}>
        {isAdminRoute ? <AdminPanel /> : <App />}
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);

// 应用加载成功后清除刷新标记，允许下次部署变更时再次自动恢复
setTimeout(() => {
  try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch { /* ignore */ }
}, 5000);
