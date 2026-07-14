package com.xushuo.lk;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.Locale;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void install(PluginCall call) {
        final String rawUri = call.getString("uri");
        if (rawUri == null || rawUri.trim().isEmpty()) {
            call.reject("安装失败：缺少 APK 文件路径");
            return;
        }

        try {
            Uri installUri = buildInstallUri(rawUri);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(installUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("started", true);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            call.reject("安装失败：系统未找到可用安装器", e);
        } catch (Exception e) {
            call.reject("安装失败：" + e.getMessage(), e);
        }
    }

    private Uri buildInstallUri(String rawUri) {
        String normalized = rawUri.trim();
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.startsWith("content://")) return Uri.parse(normalized);

        File file = lower.startsWith("file://")
            ? new File(Uri.parse(normalized).getPath())
            : new File(normalized);

        if (!file.exists()) {
            throw new IllegalStateException("APK 文件不存在: " + file.getAbsolutePath());
        }

        String authority = getContext().getPackageName() + ".fileprovider";
        return FileProvider.getUriForFile(getContext(), authority, file);
    }
}
