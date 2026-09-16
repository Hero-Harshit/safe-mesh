package com.safehelp.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.core.content.ContextCompat;

public class SafeHelpLocationHelper {
    private static final String TAG = "SAFEHELP_LOCATION";
    private static final int TIMEOUT_MS = 5000; // 5 seconds

    public interface LocationCallback {
        void onLocationResult(Location location);
    }

    public static void getCurrentLocation(Context context, LocationCallback callback) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission denied");
            callback.onLocationResult(null);
            return;
        }

        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (locationManager == null) {
            callback.onLocationResult(null);
            return;
        }

        // Fast path: get last known location
        Location lastKnown = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
        if (lastKnown == null) {
            lastKnown = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
        }

        // If it's fresh enough (e.g. last 5 mins), just use it immediately.
        if (lastKnown != null && (System.currentTimeMillis() - lastKnown.getTime()) < 5 * 60 * 1000) {
            Log.i(TAG, "Using fresh last known location");
            callback.onLocationResult(lastKnown);
            return;
        }

        // Fallback: Request a single update with a timeout
        boolean isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        boolean isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);

        if (!isGpsEnabled && !isNetworkEnabled) {
            Log.w(TAG, "No location providers available");
            callback.onLocationResult(lastKnown); // return old one or null
            return;
        }

        String provider = isNetworkEnabled ? LocationManager.NETWORK_PROVIDER : LocationManager.GPS_PROVIDER;
        
        Handler handler = new Handler(Looper.getMainLooper());
        final boolean[] returned = {false};

        LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (!returned[0]) {
                    returned[0] = true;
                    locationManager.removeUpdates(this);
                    handler.removeCallbacksAndMessages(null);
                    callback.onLocationResult(location);
                }
            }
            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override
            public void onProviderEnabled(String provider) {}
            @Override
            public void onProviderDisabled(String provider) {}
        };

        try {
            locationManager.requestSingleUpdate(provider, listener, Looper.getMainLooper());
        } catch (SecurityException e) {
            callback.onLocationResult(null);
            return;
        }

        // Setup timeout
        final Location finalLastKnown = lastKnown;
        handler.postDelayed(() -> {
            if (!returned[0]) {
                returned[0] = true;
                locationManager.removeUpdates(listener);
                Log.w(TAG, "Location request timed out. Returning last known.");
                callback.onLocationResult(finalLastKnown);
            }
        }, TIMEOUT_MS);
    }
}
