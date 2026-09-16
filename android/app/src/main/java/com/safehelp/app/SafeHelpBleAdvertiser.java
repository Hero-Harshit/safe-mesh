package com.safehelp.app;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.os.ParcelUuid;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.Random;
import java.util.UUID;

public class SafeHelpBleAdvertiser {

    private static final String TAG = "SAFEHELP_BLE";

    private static final UUID SAFEHELP_SERVICE_UUID =
            UUID.fromString("00008F3A-0000-1000-8000-00805F9B34FB");

    private static SafeHelpBleAdvertiser instance;
    private BluetoothLeAdvertiser bleAdvertiser;
    private AdvertiseCallback advertiseCallback;

    private boolean isRunning = false;
    private String currentEmergencyId = null;

    private SafeHelpBleAdvertiser() {}

    public static synchronized SafeHelpBleAdvertiser getInstance() {
        if (instance == null) instance = new SafeHelpBleAdvertiser();
        return instance;
    }

    public boolean isEmergencyBeaconRunning() { return isRunning; }
    public String getCurrentEmergencyId() { return currentEmergencyId; }

    private String generateEmergencyId() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(6);
        Random random = new Random();
        for (int i = 0; i < 6; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }

    private JSONObject errorResult(String error) throws JSONException {
        JSONObject r = new JSONObject();
        r.put("type", "BLE_ADVERTISING_RESULT");
        r.put("success", false);
        r.put("running", false);
        r.put("error", error);
        return r;
    }

    // All Bluetooth API calls that need BLUETOOTH_CONNECT are gated with
    // @SuppressLint("MissingPermission") because the caller (BleActionActivity)
    // guarantees permissions are granted before this method is invoked.

    @SuppressLint("MissingPermission")
    public JSONObject startEmergencyBeacon(Context context) {
        Log.i(TAG, "Checking permissions");
        try {
            if (isRunning) {
                Log.w(TAG, "Already advertising");
                JSONObject r = new JSONObject();
                r.put("type", "BLE_ADVERTISING_RESULT");
                r.put("success", true);
                r.put("running", true);
                r.put("emergencyId", currentEmergencyId);
                return r;
            }

            // Double-check — BleActionActivity should have already enforced this.
            if (!BluetoothPermissionManager.areBluetoothPermissionsGranted(context)) {
                Log.e(TAG, "Permission check failed inside advertiser");
                return errorResult("BLUETOOTH_PERMISSION_DENIED");
            }

            Log.i(TAG, "Permissions granted");
            Log.i(TAG, "Checking Bluetooth state");

            BluetoothManager bluetoothManager =
                    (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager == null) {
                Log.e(TAG, "BluetoothManager unavailable");
                return errorResult("BLUETOOTH_UNAVAILABLE");
            }

            BluetoothAdapter adapter = bluetoothManager.getAdapter();
            if (adapter == null) {
                Log.e(TAG, "BluetoothAdapter null");
                return errorResult("BLUETOOTH_UNAVAILABLE");
            }

            // isEnabled() requires BLUETOOTH_CONNECT on Android 12+ — caller has already
            // checked/requested it above via BleActionActivity.
            if (!adapter.isEnabled()) {
                Log.e(TAG, "Bluetooth is disabled");
                return errorResult("BLUETOOTH_DISABLED");
            }

            Log.i(TAG, "Creating advertiser");
            bleAdvertiser = adapter.getBluetoothLeAdvertiser();
            if (bleAdvertiser == null) {
                Log.e(TAG, "BLE advertising not supported on this hardware");
                return errorResult("BLE_ADVERTISING_UNSUPPORTED");
            }

            currentEmergencyId = generateEmergencyId();
            Log.i(TAG, "Emergency ID = " + currentEmergencyId);
            Log.i(TAG, "Starting advertising");

            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
                    .setConnectable(false)
                    .setTimeout(0)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                    .build();

            AdvertiseData data = new AdvertiseData.Builder()
                    .setIncludeDeviceName(false)
                    .setIncludeTxPowerLevel(false)
                    .addServiceUuid(new ParcelUuid(SAFEHELP_SERVICE_UUID))
                    .addServiceData(
                            new ParcelUuid(SAFEHELP_SERVICE_UUID),
                            currentEmergencyId.getBytes(StandardCharsets.UTF_8))
                    .build();

            advertiseCallback = new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    Log.i(TAG, "Advertising started");
                }

                @Override
                public void onStartFailure(int errorCode) {
                    Log.e(TAG, "Advertising failed with error code: " + errorCode);
                    isRunning = false;
                    currentEmergencyId = null;
                }
            };

            bleAdvertiser.startAdvertising(settings, data, advertiseCallback);
            isRunning = true;

            JSONObject r = new JSONObject();
            r.put("type", "BLE_ADVERTISING_RESULT");
            r.put("success", true);
            r.put("running", true);
            r.put("emergencyId", currentEmergencyId);
            return r;

        } catch (Exception e) {
            Log.e(TAG, "Unexpected error in startEmergencyBeacon", e);
            try { return errorResult("ADVERTISE_FAILED"); } catch (JSONException je) { return new JSONObject(); }
        }
    }

    @SuppressLint("MissingPermission")
    public JSONObject stopEmergencyBeacon(Context context) {
        try {
            JSONObject r = new JSONObject();
            r.put("type", "BLE_ADVERTISING_RESULT");

            if (!isRunning || bleAdvertiser == null || advertiseCallback == null) {
                Log.w(TAG, "stopEmergencyBeacon called but not running");
                r.put("success", true);
                r.put("running", false);
                return r;
            }

            bleAdvertiser.stopAdvertising(advertiseCallback);
            Log.i(TAG, "Advertising stopped");

            isRunning = false;
            currentEmergencyId = null;
            advertiseCallback = null;

            r.put("success", true);
            r.put("running", false);
            return r;

        } catch (Exception e) {
            Log.e(TAG, "Unexpected error in stopEmergencyBeacon", e);
            try { return errorResult("ADVERTISE_FAILED"); } catch (JSONException je) { return new JSONObject(); }
        }
    }
}
