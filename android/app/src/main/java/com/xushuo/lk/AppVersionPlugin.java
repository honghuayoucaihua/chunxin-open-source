package com.xushuo.lk;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppVersion")
public class AppVersionPlugin extends Plugin {

    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo info = pm.getPackageInfo(getContext().getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? info.getLongVersionCode()
                : info.versionCode;

            JSObject ret = new JSObject();
            ret.put("versionCode", versionCode);
            ret.put("versionName", info.versionName == null ? "" : info.versionName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("读取应用版本失败: " + e.getMessage(), e);
        }
    }
}

