package com.safehelp.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

public class SafeHelpEmergencyCoordinator implements SafeHelpBleAdvertiser.BleAdvertiseListener {
    private static final String TAG = "SAFEHELP_COORDINATOR";
    
    private static final String PREFS_NAME = "SafeHelpEmergencyPrefs";
    private static final String KEY_SESSION_ID = "session_id";
    private static final String KEY_SESSION_TIME = "session_time";
    private static final String KEY_SESSION_START_TIME_STR = "session_start_time_str";
    private static final String KEY_SMS_SENT = "sms_sent";
    private static final String KEY_INCIDENT_RECORDED = "incident_recorded";
    private static final long SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

    private static SafeHelpEmergencyCoordinator instance;
    private boolean isEmergencyActive = false;
    private String currentEmergencyId = null;
    private String currentStartTime = null;

    // Status trackers
    private String bleStatus = "⟳ Starting...";
    private String smsStatus = "⟳ Sending...";
    private String locationStatus = "⟳ Acquiring...";
    private String incidentStatus = "⟳ Recording...";
    private String routeStatus = "⟳ Calculating...";

    private EmergencyStatusListener statusListener;
    private Context appContext;
    private SharedPreferences prefs;

    public interface EmergencyStatusListener {
        void onStatusUpdated(
            String emergencyId,
            String timestamp,
            String ble,
            String sms,
            String location,
            String incident,
            String safeRoute
        );
    }

    private SafeHelpEmergencyCoordinator() {}

    public static synchronized SafeHelpEmergencyCoordinator getInstance() {
        if (instance == null) {
            instance = new SafeHelpEmergencyCoordinator();
        }
        return instance;
    }

    public void setStatusListener(EmergencyStatusListener listener) {
        this.statusListener = listener;
        notifyListener();
    }

    private void notifyListener() {
        if (statusListener != null) {
            new Handler(Looper.getMainLooper()).post(() -> {
                statusListener.onStatusUpdated(
                        currentEmergencyId,
                        currentStartTime,
                        bleStatus,
                        smsStatus,
                        locationStatus,
                        incidentStatus,
                        routeStatus
                );
            });
        }
    }

    private void saveSessionState() {
        if (prefs != null && currentEmergencyId != null) {
            prefs.edit()
                .putString(KEY_SESSION_ID, currentEmergencyId)
                .putLong(KEY_SESSION_TIME, System.currentTimeMillis())
                .putString(KEY_SESSION_START_TIME_STR, currentStartTime)
                .apply();
        }
    }

    private void saveModuleSuccess(String key) {
        if (prefs != null) {
            prefs.edit().putBoolean(key, true).apply();
        }
    }

    public synchronized void startEmergencySequence(Context context) {
        appContext = context.getApplicationContext();
        prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        if (isEmergencyActive) {
            Log.w(TAG, "Emergency already active in memory, ignoring rapid tap.");
            notifyListener(); 
            return;
        }

        isEmergencyActive = true;

        long lastTime = prefs.getLong(KEY_SESSION_TIME, 0);
        String lastId = prefs.getString(KEY_SESSION_ID, null);

        if (lastId != null && (System.currentTimeMillis() - lastTime) < SESSION_EXPIRY_MS) {
            Log.i(TAG, "Recovered existing emergency session: " + lastId);
            currentEmergencyId = lastId;
            currentStartTime = prefs.getString(KEY_SESSION_START_TIME_STR, new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date()));
            
            // Restore visual statuses for already completed modules
            if (prefs.getBoolean(KEY_SMS_SENT, false)) smsStatus = "✓ SENT";
            else smsStatus = "⟳ Sending...";
            
            if (prefs.getBoolean(KEY_INCIDENT_RECORDED, false)) incidentStatus = "✓ RECORDED";
            else incidentStatus = "⟳ Recording...";
            
        } else {
            // New Session
            currentEmergencyId = "SOS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            currentStartTime = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());
            Log.i(TAG, "Starting NEW Emergency Sequence: " + currentEmergencyId);
            
            prefs.edit()
                .remove(KEY_SMS_SENT)
                .remove(KEY_INCIDENT_RECORDED)
                .apply();
                
            smsStatus = "⟳ Sending...";
            incidentStatus = "⟳ Recording...";
        }

        saveSessionState();

        bleStatus = "⟳ Starting...";
        locationStatus = "⟳ Acquiring...";
        routeStatus = "⟳ Calculating...";
        
        notifyListener();

        startBleBeacon();
        fetchLocationAndProceed();
    }
    
    public synchronized void endEmergency(Context context) {
        Log.i(TAG, "Ending emergency sequence manually");
        isEmergencyActive = false;
        
        SafeHelpBleAdvertiser.getInstance().stopEmergencyBeacon(context);
        
        if (prefs != null) {
            prefs.edit()
                .remove(KEY_SESSION_ID)
                .remove(KEY_SESSION_TIME)
                .remove(KEY_SESSION_START_TIME_STR)
                .remove(KEY_SMS_SENT)
                .remove(KEY_INCIDENT_RECORDED)
                .apply();
        }
        
        currentEmergencyId = null;
        currentStartTime = null;
        bleStatus = "STOPPED";
        smsStatus = "STOPPED";
        locationStatus = "STOPPED";
        incidentStatus = "STOPPED";
        routeStatus = "STOPPED";
        
        notifyListener();
    }

    private void startBleBeacon() {
        SafeHelpBleAdvertiser advertiser = SafeHelpBleAdvertiser.getInstance();
        advertiser.setListener(this);
        
        try {
            JSONObject result = advertiser.startEmergencyBeacon(appContext);
            boolean success = result.optBoolean("success", false);
            if (!success) {
                bleStatus = "✗ FAILED";
                notifyListener();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start BLE", e);
            bleStatus = "✗ FAILED";
            notifyListener();
        }
    }

    private void fetchLocationAndProceed() {
        SafeHelpLocationHelper.getCurrentLocation(appContext, location -> {
            if (location != null) {
                locationStatus = "✓ READY";
                Log.i(TAG, "Location fetched successfully.");
            } else {
                locationStatus = "✗ FAILED";
                Log.w(TAG, "Location unavailable.");
            }
            notifyListener();
            executeNetworkAndSmsActions(location);
        });
    }

    private void executeNetworkAndSmsActions(Location location) {
        if (!prefs.getBoolean(KEY_SMS_SENT, false)) {
            new Thread(() -> {
                try {
                    String locStr = location != null ? 
                        "https://www.google.com/maps?q=" + location.getLatitude() + "," + location.getLongitude() : 
                        "Unavailable";
                    
                    JSONObject smsResult = SafeHelpSmsManager.sendEmergencySms(appContext, null, locStr);
                    String status = smsResult.optString("status", "FAILED");
                    if ("SUCCESS".equals(status) || "PARTIAL_SUCCESS".equals(status)) {
                        smsStatus = "✓ SENT";
                        saveModuleSuccess(KEY_SMS_SENT);
                    } else {
                        smsStatus = "✗ FAILED";
                    }
                } catch (Exception e) {
                    smsStatus = "✗ FAILED";
                }
                notifyListener();
            }).start();
        }

        if (!prefs.getBoolean(KEY_INCIDENT_RECORDED, false)) {
            SafeHelpApiClient.logIncident(currentEmergencyId, location, (success, result) -> {
                if (success) {
                    incidentStatus = "✓ RECORDED";
                    saveModuleSuccess(KEY_INCIDENT_RECORDED);
                } else {
                    incidentStatus = "✗ FAILED";
                }
                notifyListener();
            });
        }

        if (location != null) {
            SafeHelpApiClient.requestSafeRoute(location, (success, result) -> {
                routeStatus = success ? "✓ READY" : "✗ FAILED";
                notifyListener();
            });
        } else {
            routeStatus = "✗ FAILED";
            notifyListener();
        }
    }

    @Override
    public void onStartSuccess(String emergencyId) {
        bleStatus = "✓ ACTIVE";
        notifyListener();
    }

    @Override
    public void onStartFailure(int errorCode) {
        bleStatus = "✗ FAILED";
        notifyListener();
    }
}
