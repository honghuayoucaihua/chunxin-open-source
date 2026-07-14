/**
 * 安全执行动态导入的运行时函数。
 * 当动态 import() 因网络、新版部署后旧 chunk 被删除等原因失败时，
 * 捕获拒绝避免产生未捕获的 Promise 拒绝。
 *
 * @param loader 动态导入加载函数（返回 Promise 的函数）
 * @param fn 加载成功后执行的函数，接收运行时对象
 */
export const withLoadedRuntime = <T>(
  loader: () => Promise<T>,
  fn: (runtime: T) => void
): void => {
  loader().then(fn).catch((error) => {
    console.error('[Runtime] 运行时加载失败:', error);
  });
};
