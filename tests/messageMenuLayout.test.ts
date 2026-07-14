import assert from 'node:assert/strict';
import { resolveAnchorRectWithinContainer, resolveMessageMenuLayout } from '../src/chatroom/chatRoomUiUtils.ts';

// 复现：旧实现使用固定 top 偏移，菜单会漂在消息附近，顶部空间不足时也不会基于消息锚点自动翻转。
// 期望：菜单以消息矩形为锚点定位，优先显示在消息上方；如果上方空间不足，则翻到消息下方，并保持箭头对准消息中心。

{
  const layout = resolveMessageMenuLayout({
    containerWidth: 390,
    containerHeight: 640,
    scrollTop: 0,
    anchorRect: { left: 220, top: 420, width: 96, height: 52 }
  });

  assert.equal(layout.placeAboveAnchor, true, '消息下方空间充足时，菜单应优先显示在消息上方');
  assert.equal(layout.top, 234, '菜单顶部应基于消息顶部和菜单高度计算，而不是固定常量偏移');
  assert.equal(layout.left, 124, '菜单应以消息中心为基准水平对齐');
  assert.equal(layout.arrowLeft, 136, '箭头应对准消息中心点');
}

{
  const layout = resolveMessageMenuLayout({
    containerWidth: 390,
    containerHeight: 640,
    scrollTop: 0,
    anchorRect: { left: 36, top: 48, width: 120, height: 56 }
  });

  assert.equal(layout.placeAboveAnchor, false, '顶部空间不足时，菜单应翻到消息下方');
  assert.equal(layout.top, 120, '翻转到下方后，菜单应紧跟消息底部显示');
  assert.equal(layout.left, 10, '菜单应限制在容器左右安全边距内');
  assert.equal(layout.arrowLeft, 78, '贴边时箭头仍应尽量对准消息中心');
}

{
  const layout = resolveMessageMenuLayout({
    containerWidth: 320,
    containerHeight: 220,
    scrollTop: 180,
    anchorRect: { left: 250, top: 110, width: 54, height: 44 }
  });

  assert.equal(layout.placeAboveAnchor, true, '上下都紧张时，应优先保留菜单在消息上方');
  assert.equal(layout.top, 190, '滚动容器内定位应叠加当前 scrollTop');
  assert.equal(layout.left, 54, '右侧贴边时菜单应被夹紧在可见区域内');
  assert.equal(layout.arrowLeft, 215, '右侧贴边时箭头仍应落在菜单内部');
}

{
  const container = {
    scrollLeft: 0,
    scrollTop: 420,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 640 })
  } as any;
  const bubbleWrapper = {
    offsetLeft: 24,
    offsetTop: 560,
    offsetParent: container
  } as any;
  const target = {
    offsetLeft: 188,
    offsetTop: 36,
    offsetWidth: 112,
    offsetHeight: 48,
    offsetParent: bubbleWrapper,
    getBoundingClientRect: () => ({ left: 999, top: 999, width: 112, height: 48 })
  } as any;

  const anchorRect = resolveAnchorRectWithinContainer(target, container);
  assert.deepEqual(anchorRect, {
    left: 212,
    top: 176,
    width: 112,
    height: 48
  }, '容器内锚点应优先使用 offset 链换算，避免原生 WebView 视口偏移污染菜单定位');
}

{
  const container = {
    scrollLeft: 0,
    scrollTop: 0,
    getBoundingClientRect: () => ({ left: 18, top: 96, width: 390, height: 640 })
  } as any;
  const target = {
    offsetLeft: 40,
    offsetTop: 30,
    offsetWidth: 96,
    offsetHeight: 52,
    offsetParent: null,
    getBoundingClientRect: () => ({ left: 214, top: 360, width: 96, height: 52 })
  } as any;

  const anchorRect = resolveAnchorRectWithinContainer(target, container);
  assert.deepEqual(anchorRect, {
    left: 196,
    top: 264,
    width: 96,
    height: 52
  }, '当 offset 链无法回溯到滚动容器时，应回退到 rect 差值定位');
}

console.log('测试通过：消息菜单定位会跟随被点击消息锚点。');
