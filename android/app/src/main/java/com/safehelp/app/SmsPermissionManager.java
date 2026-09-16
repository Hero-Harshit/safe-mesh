package com.safehelp.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class SmsPermissionManager {
    public static final int REQUEST_CODE_SMS = 1002;

    public static boolean isSmsPermissionGranted(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    public static void requestSmsPermission(Activity activity) {
        ActivityCompat.requestPermissions(activity, new String[]{
                Manifest.permission.SEND_SMS
        }, REQUEST_CODE_SMS);
    }
}
