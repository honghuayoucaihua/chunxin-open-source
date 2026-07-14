package com.xushuo.lk;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import org.junit.Test;

public class MainActivityInsetsForwardingTest {

    @Test
    public void bindLegacyAndroidSafeArea_应转发WindowInsets到WebView默认处理链() throws Exception {
        File sourceFile = findMainActivitySourceFile();
        assertNotNull("未找到 MainActivity.java 源文件，无法进行回归断言。", sourceFile);

        String src = new String(Files.readAllBytes(sourceFile.toPath()), StandardCharsets.UTF_8);

        // 复现根因：对 View/WebView 设置 setOnApplyWindowInsetsListener 后，若不显式调用 onApplyWindowInsets，
        // 旧版系统可能无法正确触发 WebView 的默认 insets/IME 处理，从而导致软键盘遮挡底部输入框。
        // 回归目标：必须在监听器中转发给 ViewCompat.onApplyWindowInsets，让默认处理链继续工作。
        assertTrue(
            "bindLegacyAndroidSafeArea 的 insets 监听器必须转发到 ViewCompat.onApplyWindowInsets，避免拦截默认 IME 处理。",
            src.contains("ViewCompat.setOnApplyWindowInsetsListener")
                && src.contains("return ViewCompat.onApplyWindowInsets")
        );
    }

    private static File findMainActivitySourceFile() {
        String rel = "src/main/java/com/xushuo/lk/MainActivity.java";
        String[] candidates = new String[] {
            rel,
            "app/" + rel,
            "../app/" + rel,
            "../../app/" + rel,
        };

        for (String candidate : candidates) {
            File file = new File(candidate);
            if (file.isFile()) return file;
        }
        return null;
    }
}
