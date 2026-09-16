package com.safehelp.app;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.Random;
import java.util.UUID;

public class SafeHelpBleAdvertiser {

    private static final String TAG = "SAFEHELP_BLE";
    
    // Constant Service UUID for SafeHelp Phase 2
    private static final UUID SAFEHELP_SERVICE_UUID = UUID.fromString("00008F3A-0000-1000-8000-00805F9B34FB");
    
    private static SafeHelpBleAdvertiser instance;
    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback advertiseCallback;
    
    private boolean isRunning = false;
    private String currentEmergencyId = null;

    private SafeHelpBleAdvertiser() {}

    public static synchronized SafeHelpBleAdvertiser getInstance() {
        if (instance == null) {
            instance = new SafeHelpBleAdvertiser();
        }
        return instance;
    }

    public boolean isEmergencyBeaconRunning() {
        return isRunning;
    }
    
    public String getCurrentEmergencyId() {
        return currentEmergencyId;
    }

    private String generateEmergencyId() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(6);
        Random random = new Random();
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public JSONObject startEmergencyBeacon(Context context) {
        Log.i(TAG, "Checking Bluetooth adapter");
        JSONObject result = new JSONObject();
        try {
            result.put("type", "BLE_ADVERTISING_RESULT");

            if (isRunning) {
                Log.w(TAG, "Advertising already running");
                result.put("success", true);
                result.put("running", true);
                result.put("emergencyId", currentEmergencyId);
                return result;
            }

            if (!BluetoothPermissionManager.areBluetoothPermissionsGranted(context)) {
                Log.e(TAG, "Advertising failed: BLUETOOTH_PERMISSION_DENIED");
                result.put("success", false);
                result.put("running", false);
                result.put("error", "BLUETOOTH_PERMISSION_DENIED");
                return result;
            }

            BluetoothManager bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager == null) {
                Log.e(TAG, "Advertising failed: BLUETOOTH_NOT_AVAILABLE");
                result.put("success", false);
                result.put("running", false);
                result.put("error", "BLUETOOTH_NOT_AVAILABLE");
                return result;
            }

            BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                Log.e(TAG, "Advertising failed: BLUETOOTH_DISABLED");
                result.put("success", false);
                result.put("running", false);
                result.put("error", "BLUETOOTH_DISABLED");
                return result;
            }

            advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
            if (advertiser == null) {
                Log.e(TAG, "Advertising failed: BLE_ADVERTISING_UNSUPPORTED");
                result.put("success", false);
                result.put("running", false);
                result.put("error", "BLE_ADVERTISING_UNSUPPORTED");
                return result;
            }

            currentEmergencyId = generateEmergencyId();
            Log.i(TAG, "Starting emergency beacon");
            Log.i(TAG, "Emergency ID = " + currentEmergencyId);

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
                    .addServiceData(new ParcelUuid(SAFEHELP_SERVICE_UUID), currentEmergencyId.getBytes(StandardCharsets.UTF_8))
                    .build();

            advertiseCallback = new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    super.onStartSuccess(settingsInEffect);
                    Log.i(TAG, "Advertising started");
                }

                @Override
                public void onStartFailure(int errorCode) {
                    super.onStartFailure(errorCode);
                    Log.e(TAG, "Advertising failed: " + errorCode);
                    isRunning = false;
                    currentEmergencyId = null;
                }
            };

            // Android Studio will warn about missing permission check, but we validated it above.
            startAdvertisingInternal(settings, data, advertiseCallback);

            isRunning = true;
            result.put("success", true);
            result.put("running", true);
            result.put("emergencyId", currentEmergencyId);

        } catch (JSONException e) {
            Log.e(TAG, "Error building JSON", e);
        }
        return result;
    }

    @SuppressLint("MissingPermission")
    private void startAdvertisingInternal(AdvertiseSettings settings, AdvertiseData data, AdvertiseCallback callback) {
        advertiser.startAdvertising(settings, data, callback);
    }

    public JSONObject stopEmergencyBeacon(Context context) {
        JSONObject result = new JSONObject();
        try {
            result.put("type", "BLE_ADVERTISING_RESULT");
            if (!isRunning || advertiser == null || advertiseCallback == null) {
                Log.w(TAG, "Advertising is not running");
                result.put("success", true);
                result.put("running", false);
                return result;
            }

            // Permissions already checked if it was running, but suppress warning
            stopAdvertisingInternal();

            Log.i(TAG, "Advertising stopped");
            isRunning = false;
            currentEmergencyId = null;
            advertiseCallback = null;

            result.put("success", true);
            result.put("running", false);
        } catch (JSONException e) {
            Log.e(TAG, "Error building JSON", e);
        }
        return result;
    }

    @SuppressLint("MissingPermission")
    private void stopAdvertisingInternal() {
        if (advertiser != null && advertiseCallback != null) {
            advertiser.stopAdvertising(advertiseCallback);
        }
    }
}
