package com.xushuo.lk;

import android.os.Bundle;
import android.os.Build;
import android.content.res.Configuration;
import android.graphics.Color;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    private static final String VIEWPORT_BRIDGE_NAME = "AndroidViewport";

    private final ViewportBridge viewportBridge = new ViewportBridge();
    private Insets lastSafeAreaInsets = Insets.NONE;
    private int lastKeyboardHeight = 0;
    private boolean lastKeyboardVisible = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppVersionPlugin.class);
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);

        configureEdgeToEdge();
        bindAndroidViewportMetrics();
    }

    private void configureEdgeToEdge() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            boolean isDarkMode = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
            insetsController.setAppearanceLightStatusBars(!isDarkMode);
            insetsController.setAppearanceLightNavigationBars(!isDarkMode);
        }
    }

    private void bindAndroidViewportMetrics() {
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(viewportBridge, VIEWPORT_BRIDGE_NAME);
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            syncViewportMetrics(
                webView,
                getSafeAreaInsets(windowInsets),
                getKeyboardHeight(windowInsets),
                windowInsets.isVisible(WindowInsetsCompat.Type.ime())
            );
            // 关键：不要拦截 WebView 的默认 insets/IME 处理链，否则旧版 Android 可能出现软键盘遮挡输入框。
            return ViewCompat.onApplyWindowInsets(view, windowInsets);
        });
        webView.post(() -> ViewCompat.requestApplyInsets(webView));
    }

    private Insets getSafeAreaInsets(WindowInsetsCompat windowInsets) {
        return windowInsets.getInsets(
            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
        );
    }

    private int getKeyboardHeight(WindowInsetsCompat windowInsets) {
        Insets imeInsets = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
        Insets systemBarInsets = getSafeAreaInsets(windowInsets);
        return Math.max(0, imeInsets.bottom - systemBarInsets.bottom);
    }

    private void syncViewportMetrics(
        WebView webView,
        Insets safeAreaInsets,
        int keyboardHeight,
        boolean keyboardVisible
    ) {
        if (
            safeAreaInsets.equals(lastSafeAreaInsets)
            && keyboardHeight == lastKeyboardHeight
            && keyboardVisible == lastKeyboardVisible
        ) {
            return;
        }
        lastSafeAreaInsets = safeAreaInsets;
        lastKeyboardHeight = keyboardHeight;
        lastKeyboardVisible = keyboardVisible;
        viewportBridge.setMetrics(safeAreaInsets, keyboardHeight, keyboardVisible);
        webView.post(() -> webView.evaluateJavascript(
            buildViewportScript(safeAreaInsets, keyboardHeight, keyboardVisible),
            null
        ));
    }

    private String buildViewportScript(Insets insets, int keyboardHeight, boolean keyboardVisible) {
        String json = "{"
            + "safeAreaInsets:{"
            + "top:" + insets.top + ","
            + "right:" + insets.right + ","
            + "bottom:" + insets.bottom + ","
            + "left:" + insets.left
            + "},"
            + "keyboardHeight:" + keyboardHeight + ","
            + "keyboardVisible:" + (keyboardVisible ? "true" : "false")
            + "}";
        return "(function(){"
            + "var metrics=" + json + ";"
            + "window.__nativeViewportMetrics=metrics;"
            + "window.__nativeSafeAreaInsets=metrics.safeAreaInsets;"
            + "window.__nativeKeyboardMetrics={height:metrics.keyboardHeight,visible:metrics.keyboardVisible};"
            + "if(typeof window.__applyNativeViewportMetrics==='function'){"
            + "window.__applyNativeViewportMetrics(metrics);"
            + "return;"
            + "}"
            + "var root=document.documentElement;"
            + "if(!root){return;}"
            + "var insets=metrics.safeAreaInsets;"
            + "root.style.setProperty('--safe-area-inset-top', insets.top + 'px');"
            + "root.style.setProperty('--safe-area-inset-right', insets.right + 'px');"
            + "root.style.setProperty('--safe-area-inset-bottom', insets.bottom + 'px');"
            + "root.style.setProperty('--safe-area-inset-left', insets.left + 'px');"
            + "root.style.setProperty('--keyboard-height', metrics.keyboardHeight + 'px');"
            + "root.style.setProperty('--keyboard-offset-bottom', metrics.keyboardHeight + 'px');"
            + "})();";
    }

    private static final class ViewportBridge {
        private Insets safeAreaInsets = Insets.NONE;
        private int keyboardHeight = 0;
        private boolean keyboardVisible = false;

        @JavascriptInterface
        public String getMetrics() {
            return "{"
                + "\"safeAreaInsets\":{"
                + "\"top\":" + safeAreaInsets.top + ","
                + "\"right\":" + safeAreaInsets.right + ","
                + "\"bottom\":" + safeAreaInsets.bottom + ","
                + "\"left\":" + safeAreaInsets.left
                + "},"
                + "\"keyboardHeight\":" + keyboardHeight + ","
                + "\"keyboardVisible\":" + (keyboardVisible ? "true" : "false")
                + "}";
        }

        void setMetrics(Insets nextInsets, int nextKeyboardHeight, boolean nextKeyboardVisible) {
            safeAreaInsets = nextInsets;
            keyboardHeight = nextKeyboardHeight;
            keyboardVisible = nextKeyboardVisible;
        }
    }
}
