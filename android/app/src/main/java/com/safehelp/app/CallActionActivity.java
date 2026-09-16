package com.safehelp.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class CallActionActivity extends Activity {

    private static final int PERMISSION_REQUEST_CALL_PHONE = 4001;
    private static final String DEFAULT_EMERGENCY_NUMBER = "9422039955";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        long delayMs = 0;
        if (getIntent() != null && getIntent().getData() != null) {
            String delayStr = getIntent().getData().getQueryParameter("delay");
            if (delayStr != null) {
                try {
                    delayMs = Long.parseLong(delayStr);
                } catch (NumberFormatException e) {
                    Log.e("CallActionActivity", "Invalid delay parameter");
                }
            }
        }
        
        final long finalDelay = delayMs;
        
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CALL_PHONE}, PERMISSION_REQUEST_CALL_PHONE);
        } else {
            if (finalDelay > 0) {
                Log.d("CallActionActivity", "Waiting " + finalDelay + "ms to make call...");
                new android.os.Handler().postDelayed(this::makeCall, finalDelay);
            } else {
                makeCall();
            }
        }
    }

    private void makeCall() {
        try {
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + DEFAULT_EMERGENCY_NUMBER));
            startActivity(callIntent);
        } catch (SecurityException e) {
            Log.e("CallActionActivity", "Permission Denied: " + e.getMessage());
        }
        finish();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CALL_PHONE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                makeCall();
            } else {
                Log.e("CallActionActivity", "User denied CALL_PHONE permission.");
                finish();
            }
        }
    }
}
