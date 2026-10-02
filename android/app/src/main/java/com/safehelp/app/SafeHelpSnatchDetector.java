package com.safehelp.app;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.SystemClock;
import android.util.Log;

public class SafeHelpSnatchDetector implements SensorEventListener {
    private static final String TAG = "SAFEHELP_SNATCH";
    private static SafeHelpSnatchDetector instance;

    private SensorManager sensorManager;
    private Sensor accelerometer;
    private boolean isListening = false;
    private long lastTriggerTime = 0;
    private static final float SNATCH_THRESHOLD = 28.0f; // m/s^2 (G-spike jerk threshold)
    private static final long COOLDOWN_MS = 10000; // 10s debounce

    private SnatchListener listener;

    public interface SnatchListener {
        void onSnatchDetected(float accelerationMagnitude);
    }

    private SafeHelpSnatchDetector() {}

    public static synchronized SafeHelpSnatchDetector getInstance() {
        if (instance == null) {
            instance = new SafeHelpSnatchDetector();
        }
        return instance;
    }

    public void setListener(SnatchListener listener) {
        this.listener = listener;
    }

    public void start(Context context) {
        if (isListening) return;

        sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (accelerometer != null) {
                sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
                isListening = true;
                Log.i(TAG, "Snatch detector sensor listener registered successfully.");
            }
        }
    }

    public void stop() {
        if (sensorManager != null && isListening) {
            sensorManager.unregisterListener(this);
            isListening = false;
            Log.i(TAG, "Snatch detector sensor listener stopped.");
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];

            double magnitude = Math.sqrt(x * x + y * y + z * z);
            long now = SystemClock.elapsedRealtime();

            if (magnitude > SNATCH_THRESHOLD && (now - lastTriggerTime > COOLDOWN_MS)) {
                lastTriggerTime = now;
                Log.w(TAG, "VIOLENT PHONE SNATCH DETECTED! Magnitude: " + magnitude + " m/s^2");

                if (listener != null) {
                    listener.onSnatchDetected((float) magnitude);
                }
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
