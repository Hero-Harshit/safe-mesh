package com.safehelp.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URLEncoder;

public class BleActionActivity extends Activity {

    private static final String TAG = "SAFEHELP_BLE_ACTION";
    private static final int REQUEST_CODE_BLE_PERMISSIONS = 2001;

    // Track which BLE action was requested so we can resume after permissions
    private String pendingAction = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (intent == null || intent.getData() == null) {
            finish();
            return;
        }

        pendingAction = intent.getData().getHost(); // "ble_start" or "ble_stop"

        if (hasBlePermissions()) {
            executeBleAction(pendingAction);
        } else {
            requestBlePermissions();
        }
    }

    private boolean hasBlePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED;
        }
        // Below Android 12, only location permission was needed for BLE
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestBlePermissions() {
        Log.i(TAG, "Requesting BLE permissions");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE
            }, REQUEST_CODE_BLE_PERMISSIONS);
        } else {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION
            }, REQUEST_CODE_BLE_PERMISSIONS);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_BLE_PERMISSIONS) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Log.i(TAG, "BLE permissions granted, continuing");
                executeBleAction(pendingAction);
            } else {
                Log.e(TAG, "BLE permissions denied");
                returnResultToReact(buildErrorResult("BLUETOOTH_PERMISSION_DENIED"));
            }
        }
    }

    private void executeBleAction(String action) {
        JSONObject result = null;
        SafeHelpBleAdvertiser advertiser = SafeHelpBleAdvertiser.getInstance();

        if ("ble_start".equals(action)) {
            result = advertiser.startEmergencyBeacon(this);
        } else if ("ble_stop".equals(action)) {
            result = advertiser.stopEmergencyBeacon(this);
        } else if ("ble_scan_start".equals(action)) {
            SafeHelpBleScanner scanner = SafeHelpBleScanner.getInstance();
            result = scanner.startGuardianScanner(this);
        } else if ("ble_scan_stop".equals(action)) {
            SafeHelpBleScanner scanner = SafeHelpBleScanner.getInstance();
            result = scanner.stopGuardianScanner(this);
        }

        if (result != null) {
            returnResultToReact(result.toString());
        } else {
            finish();
        }
    }

    private String buildErrorResult(String error) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", "BLE_ADVERTISING_RESULT");
            obj.put("success", false);
            obj.put("running", false);
            obj.put("error", error);
            return obj.toString();
        } catch (JSONException e) {
            return "{\"type\":\"BLE_ADVERTISING_RESULT\",\"success\":false,\"running\":false,\"error\":\"" + error + "\"}";
        }
    }

    private void returnResultToReact(String jsonPayload) {
        try {
            String encodedPayload = URLEncoder.encode(jsonPayload, "UTF-8");
            String hashFragment = "ble_result=" + encodedPayload;
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://muj-cnaf.vercel.app/#" + hashFragment));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to return result to React", e);
        }
        finish();
    }
}
