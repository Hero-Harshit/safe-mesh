package com.safehelp.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

public class SafeHelpEmergencyActivity extends Activity implements SafeHelpBleAdvertiser.BleAdvertiseListener {
    private static final String TAG = "SAFEHELP_ASSISTANT";

    private TextView tvTitle;
    private TextView tvStatus;
    private TextView tvId;
    private TextView tvTimestamp;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        
        Log.i(TAG, "Emergency Activity created");
        Log.i(TAG, "Emergency App Action received");
        Log.i(TAG, "Emergency App Action validated");
        
        setContentView(R.layout.activity_emergency);
        
        tvTitle = findViewById(R.id.tv_emergency_title);
        tvStatus = findViewById(R.id.tv_emergency_status);
        tvId = findViewById(R.id.tv_emergency_id);
        tvTimestamp = findViewById(R.id.tv_emergency_timestamp);
        
        Button btnBack = findViewById(R.id.btn_back_to_app);
        btnBack.setOnClickListener(v -> {
            Intent intent = new Intent(this, LauncherActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });

        Button btnEnd = findViewById(R.id.btn_end_emergency);
        if (btnEnd != null) {
            btnEnd.setOnClickListener(v -> {
                SafeHelpEmergencyCoordinator.getInstance().endEmergency(this);
                tvTitle.setText("EMERGENCY ENDED");
                tvTitle.setTextColor(Color.parseColor("#555555"));
                tvStatus.setText("All emergency services stopped.");
                tvId.setText("");
                tvTimestamp.setText("");
            });
        }

        // Safety check - verify this really came from an App Action (actions.intent.OPEN_APP_FEATURE 
        // translates to a VIEW intent for the specified class) OR from our native home-screen widget.
        if (getIntent() != null && Intent.ACTION_VIEW.equals(getIntent().getAction())) {
            Log.i(TAG, "Starting emergency beacon setup from Assistant");
            
            if (BluetoothPermissionManager.areBluetoothPermissionsGranted(this)) {
                triggerBeacon();
            } else {
                Log.w(TAG, "Missing Bluetooth permissions. Requesting...");
                BluetoothPermissionManager.requestBluetoothPermissions(this);
            }
        } else if (getIntent() != null && SafeHelpSosWidget.ACTION_WIDGET_SOS.equals(getIntent().getAction())) {
            Log.i(TAG, "SAFEHELP: Emergency Activity launched from Home Widget");
            
            tvTitle.setText("🚨 SAFEHELP EMERGENCY");
            tvTitle.setTextColor(Color.parseColor("#c0392b"));
            
            tvStatus.setText("Emergency Active\n\nInitializing Services...");
            tvStatus.setTextColor(Color.parseColor("#555555"));
            
            tvId.setText("");

            SafeHelpEmergencyCoordinator coordinator = SafeHelpEmergencyCoordinator.getInstance();
            coordinator.setStatusListener((emergencyId, timestamp, ble, sms, loc, incident, route) -> {
                runOnUiThread(() -> {
                    if (emergencyId == null) return;
                    
                    StringBuilder sb = new StringBuilder();
                    sb.append(String.format("BLE Beacon\n%s\n\n", ble));
                    sb.append(String.format("Emergency SMS\n%s\n\n", sms));
                    sb.append(String.format("Location\n%s\n\n", loc));
                    sb.append(String.format("Incident Log\n%s\n\n", incident));
                    sb.append(String.format("Safe Route\n%s", route));
                    
                    tvStatus.setText(sb.toString().trim());
                    tvId.setText("Emergency ID:\n" + emergencyId);
                    if (timestamp != null) {
                        tvTimestamp.setText("Started:\n" + timestamp);
                    } else {
                        tvTimestamp.setText("");
                    }
                });
            });
            coordinator.startEmergencySequence(this);
            
        } else {
            Log.w(TAG, "Received unrelated intent, aborting BLE beacon start.");
            handleFailure("Invalid trigger intent.");
        }
    }

    private void triggerBeacon() {
        Log.i(TAG, "Starting emergency beacon");
        SafeHelpBleAdvertiser advertiser = SafeHelpBleAdvertiser.getInstance();
        advertiser.setListener(this);
        
        try {
            JSONObject result = advertiser.startEmergencyBeacon(this);
            boolean success = result.optBoolean("success", false);
            String error = result.optString("error", "");
            
            if (!success) {
                if ("BLUETOOTH_DISABLED".equals(error)) {
                    handleFailure("Bluetooth is turned off.\nPlease enable Bluetooth to activate SafeHelp emergency broadcasting.");
                } else if ("BLUETOOTH_PERMISSION_DENIED".equals(error)) {
                    handleFailure("Bluetooth permission denied.\nPlease grant Bluetooth access.");
                } else {
                    handleFailure("Failed to start: " + error);
                }
            } else {
                // Synchronous start succeeded, but we MUST wait for the actual callback to report UI success
                Log.i(TAG, "Synchronous check passed, waiting for actual BLE advertising callback.");
                
                // If it was already running, the callback fires immediately via the modified advertiser,
                // so we don't need to do anything extra here.
            }
        } catch (Exception e) {
            Log.e(TAG, "Exception starting beacon", e);
            handleFailure("System error starting beacon.");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == BluetoothPermissionManager.REQUEST_CODE_BLUETOOTH) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Log.i(TAG, "Permissions granted from Assistant flow, triggering beacon.");
                triggerBeacon();
            } else {
                Log.e(TAG, "Permissions denied from Assistant flow.");
                handleFailure("Bluetooth access must be granted first to broadcast emergencies.");
            }
        }
    }

    @Override
    public void onStartSuccess(String emergencyId) {
        runOnUiThread(() -> {
            Log.i("SAFEHELP_BLE", "Voice-triggered emergency broadcast requested");
            Log.i("SAFEHELP_BLE", "Advertising started successfully");
            
            tvTitle.setText("🚨 EMERGENCY ACTIVE");
            tvTitle.setTextColor(Color.parseColor("#c0392b")); // Dark red
            
            tvStatus.setText("Emergency Beacon: ACTIVE");
            tvStatus.setTextColor(Color.parseColor("#c0392b"));
            
            tvId.setText("Emergency ID:\n" + emergencyId);
            
            Toast.makeText(this, "SafeHelp Beacon Activated", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    public void onStartFailure(int errorCode) {
        runOnUiThread(() -> {
            Log.e("SAFEHELP_BLE", "Advertising failed: code " + errorCode);
            handleFailure("BLE Advertising Failed (Code: " + errorCode + ")");
        });
    }

    private void handleFailure(String message) {
        tvTitle.setText("❌ ACTIVATION FAILED");
        tvTitle.setTextColor(Color.parseColor("#c0392b"));
        
        tvStatus.setText(message);
        tvStatus.setTextColor(Color.parseColor("#555555"));
        
        tvId.setText("");
    }
}
