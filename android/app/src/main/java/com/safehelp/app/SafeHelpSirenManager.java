package com.safehelp.app;

import android.content.Context;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.os.Build;
import android.util.Log;

public class SafeHelpSirenManager {
    private static final String TAG = "SAFEHELP_SIREN";
    private static SafeHelpSirenManager instance;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private CameraManager cameraManager;
    private String cameraId;
    private boolean isStrobing = false;
    private boolean isLightOn = false;
    private Handler strobeHandler = new Handler(Looper.getMainLooper());
    private int originalVolume = -1;

    private SafeHelpSirenManager() {}

    public static synchronized SafeHelpSirenManager getInstance() {
        if (instance == null) {
            instance = new SafeHelpSirenManager();
        }
        return instance;
    }

    public void start(Context context) {
        stop(context); // ensure reset

        // 1. Vibrate
        vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = {0, 300, 200, 300, 200}; // SOS-like intense pulse
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Ignore battery saver using usage alarm
                VibrationEffect effect = VibrationEffect.createWaveform(pattern, 0);
                android.media.AudioAttributes audioAttr = new android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                vibrator.vibrate(effect, audioAttr);
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }

        // 2. Audio Siren
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(context, alarmUri);
            
            AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    android.media.AudioAttributes attributes = new android.media.AudioAttributes.Builder()
                            .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build();
                    mediaPlayer.setAudioAttributes(attributes);
                } else {
                    mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                }
            }
            
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start siren audio", e);
        }

        // 3. Strobe Flashlight
        try {
            cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
            if (cameraManager != null) {
                cameraId = cameraManager.getCameraIdList()[0];
                isStrobing = true;
                strobeRunnable.run();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to access camera for strobe", e);
        }
    }

    private final Runnable strobeRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isStrobing) return;
            try {
                isLightOn = !isLightOn;
                if (cameraManager != null && cameraId != null) {
                    cameraManager.setTorchMode(cameraId, isLightOn);
                }
                strobeHandler.postDelayed(this, 150); // fast blink
            } catch (Exception e) {
                Log.e(TAG, "Error toggling torch", e);
            }
        }
    };

    public void stop(Context context) {
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }

        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {}
            mediaPlayer = null;
            
            // Restore volume if possible
            if (originalVolume != -1) {
                AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                if (audioManager != null) {
                    audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalVolume, 0);
                }
                originalVolume = -1;
            }
        }

        isStrobing = false;
        strobeHandler.removeCallbacks(strobeRunnable);
        if (cameraManager != null && cameraId != null) {
            try {
                cameraManager.setTorchMode(cameraId, false);
            } catch (Exception e) {}
        }
    }
}
