import assert from 'node:assert/strict';
import { shouldUseFloatingDesktopEditToolbar } from '../src/utils/desktopPageUtils.ts';

assert.equal(
  shouldUseFloatingDesktopEditToolbar(false, 'default'),
  true,
  '关闭状态栏后，编辑模式必须切换到独立工具条'
);

assert.equal(
  shouldUseFloatingDesktopEditToolbar(true, 'minimal'),
  true,
  '极简状态栏布局下，编辑模式也必须切换到独立工具条'
);

assert.equal(
  shouldUseFloatingDesktopEditToolbar(true, 'default'),
  false,
  '默认状态栏布局下，编辑模式仍可复用状态栏右侧按钮区'
);

console.log('测试通过：编辑模式工具条会在状态栏不可用时切换到独立顶部入口。');
