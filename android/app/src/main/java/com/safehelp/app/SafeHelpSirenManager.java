package com.safehelp.app;

import android.content.Context;
import android.hardware.camera2.CameraCharacteristics;
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
    private final Handler strobeHandler = new Handler(Looper.getMainLooper());
    private int originalVolume = -1;

    private SafeHelpSirenManager() {}

    public static synchronized SafeHelpSirenManager getInstance() {
        if (instance == null) {
            instance = new SafeHelpSirenManager();
        }
        return instance;
    }

    public synchronized boolean isRunning() {
        return isStrobing || (mediaPlayer != null && mediaPlayer.isPlaying());
    }

    public synchronized void start(Context context) {
        stop(context); // ensure complete reset first

        // 1. Vibrate SOS pulse pattern
        try {
            vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 300, 200, 300, 200, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
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
        } catch (Throwable t) {
            Log.w(TAG, "Failed to start vibrator", t);
        }

        // 2. Audio Siren at maximum volume
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
        } catch (Throwable t) {
            Log.e(TAG, "Failed to start siren audio", t);
        }

        // 3. Strobe Flashlight (safe camera search)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
                if (cameraManager != null) {
                    cameraId = null;
                    for (String id : cameraManager.getCameraIdList()) {
                        try {
                            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(id);
                            Boolean hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                            Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                            if (hasFlash != null && hasFlash) {
                                cameraId = id;
                                if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                                    break; // Prefer back-facing camera flash
                                }
                            }
                        } catch (Throwable ignored) {}
                    }

                    if (cameraId != null) {
                        isStrobing = true;
                        strobeHandler.post(strobeRunnable);
                    }
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "Failed to access camera for strobe", t);
        }
    }

    private final Runnable strobeRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isStrobing) return;
            try {
                isLightOn = !isLightOn;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && cameraManager != null && cameraId != null) {
                    cameraManager.setTorchMode(cameraId, isLightOn);
                }
            } catch (Throwable t) {
                Log.e(TAG, "Error toggling torch", t);
            }
            if (isStrobing) {
                strobeHandler.postDelayed(this, 150); // fast blink
            }
        }
    };

    public synchronized void stop(Context context) {
        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Throwable ignored) {}
            vibrator = null;
        }

        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Throwable ignored) {}
            mediaPlayer = null;

            // Restore volume if possible
            if (originalVolume != -1) {
                try {
                    AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                    if (audioManager != null) {
                        audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalVolume, 0);
                    }
                } catch (Throwable ignored) {}
                originalVolume = -1;
            }
        }

        isStrobing = false;
        strobeHandler.removeCallbacks(strobeRunnable);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && cameraManager != null && cameraId != null) {
            try {
                cameraManager.setTorchMode(cameraId, false);
            } catch (Throwable ignored) {}
        }
    }
}
