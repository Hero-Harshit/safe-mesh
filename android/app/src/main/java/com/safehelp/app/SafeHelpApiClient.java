package com.safehelp.app;

import android.location.Location;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

public class SafeHelpApiClient {
    private static final String TAG = "SAFEHELP_API";
    // Hardcoded for Phase 2 widget sequence per user's production backend
    private static final String BASE_URL = "https://muj-k53c.onrender.com";

    public interface ApiCallback {
        void onResult(boolean success, String responseOrError);
    }

    public static void logIncident(String emergencyId, Location location, ApiCallback callback) {
        new Thread(() -> {
            try {
                URL url = new URL(BASE_URL + "/api/incidents");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("emergencyId", emergencyId);
                
                JSONObject sender = new JSONObject();
                sender.put("safehelpId", "native_widget_user");
                
                if (location != null) {
                    JSONObject loc = new JSONObject();
                    loc.put("latitude", location.getLatitude());
                    loc.put("longitude", location.getLongitude());
                    sender.put("location", loc);
                }
                
                payload.put("sender", sender);
                payload.put("triggerSource", "home_widget");

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    Log.i(TAG, "Incident created successfully");
                    if (callback != null) callback.onResult(true, "SUCCESS");
                } else {
                    Log.e(TAG, "Incident creation failed with code: " + code);
                    if (callback != null) callback.onResult(false, "HTTP_" + code);
                }
            } catch (Exception e) {
                Log.e(TAG, "Exception logging incident", e);
                if (callback != null) callback.onResult(false, e.getMessage());
            }
        }).start();
    }

    public static void requestSafeRoute(Location location, ApiCallback callback) {
        if (location == null) {
            if (callback != null) callback.onResult(false, "NO_LOCATION");
            return;
        }

        new Thread(() -> {
            try {
                URL url = new URL(BASE_URL + "/api/safety/escape-route");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("latitude", location.getLatitude());
                payload.put("longitude", location.getLongitude());
                payload.put("timestamp", System.currentTimeMillis());
                payload.put("triggerSource", "home_widget");

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                if (code >= 200 && code < 300) {
                    Log.i(TAG, "Safe Route requested successfully");
                    if (callback != null) callback.onResult(true, "SUCCESS");
                } else {
                    Log.e(TAG, "Safe Route request failed with code: " + code);
                    if (callback != null) callback.onResult(false, "HTTP_" + code);
                }
            } catch (Exception e) {
                Log.e(TAG, "Exception requesting Safe Route", e);
                if (callback != null) callback.onResult(false, e.getMessage());
            }
        }).start();
    }
}
