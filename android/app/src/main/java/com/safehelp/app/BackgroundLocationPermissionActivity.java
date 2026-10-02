package com.safehelp.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class BackgroundLocationPermissionActivity extends Activity {
    
    private static final int REQUEST_CODE = 2002;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACCESS_BACKGROUND_LOCATION
                }, REQUEST_CODE);
            } else {
                returnResultToReact(true);
            }
        } else {
            returnResultToReact(true); // Pre-Q, background location is implicit with foreground
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQUEST_CODE) {
            boolean granted = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                granted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
            } else {
                granted = true;
            }
            returnResultToReact(granted);
        }
    }

    private void returnResultToReact(boolean granted) {
        String hashFragment = granted ? "bg_loc_result=granted" : "bg_loc_result=denied";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://safety-mesh.vercel.app/#" + hashFragment));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}
