import assert from 'node:assert/strict';
import {
  isKeyboardLayoutVisible,
  KEYBOARD_VISIBLE_THRESHOLD_PX,
  resolveKeyboardLayoutState,
  resolveKeyboardOffsetBottom
} from '../src/services/androidKeyboardCompat.ts';

{
  const state = resolveKeyboardLayoutState({ windowHeight: 900, viewportHeight: 620 });
  assert.equal(state.keyboardHeight, 280, '可视区缩小时应正确计算键盘高度');
  assert.equal(state.isVisible, true, '超过可见阈值时应视为键盘已弹出');
}

{
  const state = resolveKeyboardLayoutState({ windowHeight: 900, viewportHeight: 850 });
  assert.equal(state.keyboardHeight, 50, '小幅视口变化不应被放大成异常高度');
  assert.equal(state.isVisible, false, '低于阈值时不应误判为键盘弹出');
}

{
  const state = resolveKeyboardLayoutState({ windowHeight: 900, viewportHeight: Number.NaN });
  assert.equal(state.keyboardHeight, 0, '当视口高度为空值时应回退为 0，避免残留旧键盘高度');
  assert.equal(state.isVisible, false, '空值场景不应保留键盘可见态');
}

{
  assert.equal(isKeyboardLayoutVisible(280), true, '键盘高度超过阈值时应视为可见');
  assert.equal(isKeyboardLayoutVisible(50), false, '键盘高度低于阈值时不应视为可见');
}

{
  const offset = resolveKeyboardOffsetBottom({ isNativeAndroid: true, keyboardHeight: 280 });
  assert.equal(offset, 0, '原生 Android 键盘不应再把壳层整体抬高，避免主页和消息页一起位移');
}

{
  const offset = resolveKeyboardOffsetBottom({ isNativeAndroid: false, keyboardHeight: 280 });
  assert.equal(offset, 0, '非原生 Android 不应套用原生键盘抬升逻辑');
}

assert.equal(KEYBOARD_VISIBLE_THRESHOLD_PX, 100, '键盘可见阈值应保持 100px，避免误判普通视口变化');

console.log('测试通过：Android 键盘兼容计算符合预期。');
