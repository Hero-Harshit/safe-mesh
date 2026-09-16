package com.safehelp.app;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.ParcelUuid;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class SafeHelpBleScanner {
    private static final String TAG = "SAFEHELP_BLE";

    private static final UUID SAFEHELP_SERVICE_UUID =
            UUID.fromString("00008F3A-0000-1000-8000-00805F9B34FB");

    private static SafeHelpBleScanner instance;
    private BluetoothLeScanner bleScanner;
    private ScanCallback scanCallback;

    private boolean isRunning = false;
    private Map<String, Long> detectedEmergencyIds;
    
    // Cooldown in milliseconds to prevent spamming duplicate events
    private static final long DEDUPLICATION_COOLDOWN_MS = 10000;

    private SafeHelpBleScanner() {
        detectedEmergencyIds = new HashMap<>();
    }

    public static synchronized SafeHelpBleScanner getInstance() {
        if (instance == null) instance = new SafeHelpBleScanner();
        return instance;
    }

    public boolean isScannerRunning() {
        return isRunning;
    }

    private JSONObject errorResult(String error) throws JSONException {
        JSONObject r = new JSONObject();
        r.put("type", "BLE_SCANNER_RESULT");
        r.put("success", false);
        r.put("running", false);
        r.put("error", error);
        return r;
    }

    @SuppressLint("MissingPermission")
    public JSONObject startGuardianScanner(Context context) {
        Log.i(TAG, "Guardian scanner start requested");
        try {
            if (isRunning) {
                Log.w(TAG, "Scanner already running");
                JSONObject r = new JSONObject();
                r.put("type", "BLE_SCANNER_RESULT");
                r.put("success", true);
                r.put("running", true);
                return r;
            }

            if (!BluetoothPermissionManager.areBluetoothPermissionsGranted(context)) {
                Log.e(TAG, "Permission check failed inside scanner");
                return errorResult("BLUETOOTH_PERMISSION_DENIED");
            }
            Log.i(TAG, "Bluetooth permissions granted");

            BluetoothManager bluetoothManager =
                    (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager == null) {
                return errorResult("BLUETOOTH_UNAVAILABLE");
            }

            BluetoothAdapter adapter = bluetoothManager.getAdapter();
            if (adapter == null) {
                return errorResult("BLUETOOTH_UNAVAILABLE");
            }

            if (!adapter.isEnabled()) {
                Log.e(TAG, "Bluetooth is disabled");
                return errorResult("BLUETOOTH_DISABLED");
            }

            bleScanner = adapter.getBluetoothLeScanner();
            if (bleScanner == null) {
                Log.e(TAG, "BLE scanning not supported on this hardware");
                return errorResult("BLE_SCAN_UNSUPPORTED");
            }

            Log.i(TAG, "Starting filtered SafeHelp scan");
            detectedEmergencyIds.clear();

            ScanFilter filter = new ScanFilter.Builder()
                    .setServiceUuid(new ParcelUuid(SAFEHELP_SERVICE_UUID))
                    .build();
            List<ScanFilter> filters = new ArrayList<>();
            filters.add(filter);

            ScanSettings settings = new ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .build();

            scanCallback = new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    processScanResult(context, result);
                }

                @Override
                public void onBatchScanResults(List<ScanResult> results) {
                    for (ScanResult result : results) {
                        processScanResult(context, result);
                    }
                }

                @Override
                public void onScanFailed(int errorCode) {
                    Log.e(TAG, "Scan failed with error code: " + errorCode);
                    isRunning = false;
                }
            };

            bleScanner.startScan(filters, settings, scanCallback);
            isRunning = true;

            JSONObject r = new JSONObject();
            r.put("type", "BLE_SCANNER_RESULT");
            r.put("success", true);
            r.put("running", true);
            return r;

        } catch (Exception e) {
            Log.e(TAG, "Unexpected error in startGuardianScanner", e);
            try { return errorResult("SCAN_FAILED"); } catch (JSONException je) { return new JSONObject(); }
        }
    }

    private void processScanResult(Context context, ScanResult result) {
        ScanRecord record = result.getScanRecord();
        if (record == null) return;

        byte[] serviceData = record.getServiceData(new ParcelUuid(SAFEHELP_SERVICE_UUID));
        if (serviceData == null) return;

        String emergencyId = new String(serviceData, StandardCharsets.UTF_8);
        if (emergencyId.length() != 6) return;

        long currentTime = System.currentTimeMillis();
        if (detectedEmergencyIds.containsKey(emergencyId)) {
            long lastSeen = detectedEmergencyIds.get(emergencyId);
            if (currentTime - lastSeen < DEDUPLICATION_COOLDOWN_MS) {
                // Log.d(TAG, "Duplicate emergency ignored");
                return;
            }
        }

        Log.i(TAG, "SafeHelp beacon detected");
        Log.i(TAG, "Emergency ID = " + emergencyId);
        Log.i(TAG, "RSSI = " + result.getRssi());

        detectedEmergencyIds.put(emergencyId, currentTime);

        String proximity = "Far";
        if (result.getRssi() > -50) {
            proximity = "Very Near";
        } else if (result.getRssi() >= -75) {
            proximity = "Near";
        }

        sendDetectionEventToReact(context, emergencyId, result.getRssi(), proximity);
    }

    private void sendDetectionEventToReact(Context context, String emergencyId, int rssi, String proximity) {
        try {
            JSONObject event = new JSONObject();
            event.put("type", "SAFEHELP_EMERGENCY_DETECTED");
            event.put("emergencyId", emergencyId);
            event.put("rssi", rssi);
            event.put("proximity", proximity);
            event.put("detectedAt", System.currentTimeMillis());

            String encodedPayload = URLEncoder.encode(event.toString(), "UTF-8");
            String hashFragment = "ble_event=" + encodedPayload;
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://muj-cnaf.vercel.app/#" + hashFragment));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            context.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send detection event to React", e);
        }
    }

    @SuppressLint("MissingPermission")
    public JSONObject stopGuardianScanner(Context context) {
        try {
            JSONObject r = new JSONObject();
            r.put("type", "BLE_SCANNER_RESULT");

            if (!isRunning || bleScanner == null || scanCallback == null) {
                Log.w(TAG, "stopGuardianScanner called but not running");
                r.put("success", true);
                r.put("running", false);
                return r;
            }

            bleScanner.stopScan(scanCallback);
            Log.i(TAG, "Guardian scanner stopped");

            isRunning = false;
            scanCallback = null;
            detectedEmergencyIds.clear();

            r.put("success", true);
            r.put("running", false);
            return r;

        } catch (Exception e) {
            Log.e(TAG, "Unexpected error in stopGuardianScanner", e);
            try { return errorResult("SCAN_FAILED"); } catch (JSONException je) { return new JSONObject(); }
        }
    }
}
