package com.safehelp.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.camera2.CameraManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.telephony.SmsManager;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.annotation.NonNull;
import java.util.ArrayList;

/**
 * High-performance fullscreen native WebView launcher for SafeMesh v2.1.
 * Completely replaces external Chrome Custom Tabs with an isolated, native app sandbox.
 * Zero browser URL bars, zero share buttons, native Android permission handling.
 * Includes complete Native JavaScript Bridge for silent SMS, automatic calling, and hardware integration.
 */
public class LauncherActivity extends Activity {
    private static final String TAG = "SAFEMESH_VIEW";
    private static final String DEFAULT_URL = "https://safety-mesh.vercel.app/";
    private static final int REQUEST_CODE_LOCATION = 5001;
    private static final int REQUEST_CODE_FILE_CHOOSER = 5002;
    private static final int REQUEST_CODE_SMS = 5003;
    private static final int REQUEST_CODE_CALL = 5004;
    private static final int REQUEST_CODE_ALL_PERMS = 5005;

    private WebView mWebView;
    private ProgressBar mProgressBar;

    private GeolocationPermissions.Callback mPendingGeoCallback;
    private String mPendingGeoOrigin;
    private ValueCallback<Uri[]> mFilePathCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure edge-to-edge dark theme status and navigation bar
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Window window = getWindow();
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(0xFF0F172A); // SafeMesh dark slate background
                window.setNavigationBarColor(0xFF0B1120);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Could not set status bar styling", t);
        }

        // Programmatic full-screen layout
        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(0xFF0B1120);

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(0xFF0B1120);
        mWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        rootLayout.addView(mWebView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // Subtle top progress bar during initial load
        mProgressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        mProgressBar.setMax(100);
        mProgressBar.setProgress(0);
        int barHeight = (int) (3 * getResources().getDisplayMetrics().density);
        FrameLayout.LayoutParams barParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                Math.max(barHeight, 4)
        );
        barParams.gravity = Gravity.TOP;
        rootLayout.addView(mProgressBar, barParams);

        setContentView(rootLayout);

        // Configure WebView settings for full modern web app support
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); // Required for localStorage / sessionStorage
        settings.setDatabaseEnabled(true);   // Required for IndexedDB
        settings.setGeolocationEnabled(true); // Required for SafeMesh GPS tracking
        settings.setMediaPlaybackRequiresUserGesture(false); // Immediate siren/audio playback
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(mWebView, true);
        }

        // Inject SafeMesh JavaScript Interface for silent SMS, native emergency calling, and hardware features
        SafeMeshWebAppInterface webAppInterface = new SafeMeshWebAppInterface();
        mWebView.addJavascriptInterface(webAppInterface, "AndroidSafeMesh");
        mWebView.addJavascriptInterface(webAppInterface, "Android");

        // Configure WebChromeClient for permissions, file uploads, and progress
        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (mProgressBar != null) {
                    if (newProgress < 100) {
                        mProgressBar.setVisibility(View.VISIBLE);
                        mProgressBar.setProgress(newProgress);
                    } else {
                        mProgressBar.setVisibility(View.GONE);
                    }
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                        mPendingGeoCallback = callback;
                        mPendingGeoOrigin = origin;
                        requestPermissions(new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                        }, REQUEST_CODE_LOCATION);
                        return;
                    }
                }
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request != null) {
                        try {
                            request.grant(request.getResources());
                        } catch (Throwable t) {
                            Log.w(TAG, "Error granting WebChromeClient permission request", t);
                        }
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, REQUEST_CODE_FILE_CHOOSER);
                    return true;
                } catch (Throwable t) {
                    Log.e(TAG, "Error launching file chooser", t);
                    mFilePathCallback = null;
                    return false;
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("SAFEMESH_CONSOLE", consoleMessage.message() + " [" +
                        consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + "]");
                return true;
            }
        });

        // Configure WebViewClient: lock all SafeMesh URLs inside app; delegate phone/sms to native intents
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                return handleUrlRouting(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                return handleUrlRouting(Uri.parse(url));
            }

            private boolean handleUrlRouting(Uri uri) {
                String scheme = uri.getScheme();
                if (scheme == null) return false;

                // Native phone dialer and SMS dispatch for SOS actions
                if ("tel".equalsIgnoreCase(scheme) || "sms".equalsIgnoreCase(scheme) ||
                    "smsto".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Throwable t) {
                        Log.e(TAG, "Could not launch native handler for " + scheme, t);
                        return true;
                    }
                }

                // WhatsApp, Telegram, or custom system intents
                if ("whatsapp".equalsIgnoreCase(scheme) || "intent".equalsIgnoreCase(scheme)) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Throwable t) {
                        Log.e(TAG, "Could not launch app for " + uri, t);
                        return true;
                    }
                }

                // Retain all SafeMesh web routes inside WebView
                String host = uri.getHost();
                if (host != null && (host.contains("safety-mesh.vercel.app") || host.contains("vercel.app"))) {
                    return false;
                }

                // Open external links in default external browser
                try {
                    Intent externalIntent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(externalIntent);
                    return true;
                } catch (Throwable t) {
                    return false;
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                Log.w(TAG, "WebView received error: " + error);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (mProgressBar != null) {
                    mProgressBar.setVisibility(View.GONE);
                }
            }
        });

        // Determine launch URL and load
        String launchUrl = DEFAULT_URL;
        if (getIntent() != null && getIntent().getData() != null) {
            launchUrl = getIntent().getData().toString();
        }
        mWebView.loadUrl(launchUrl);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.getData() != null && mWebView != null) {
            mWebView.loadUrl(intent.getData().toString());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_LOCATION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (mPendingGeoCallback != null) {
                mPendingGeoCallback.invoke(mPendingGeoOrigin, granted, false);
                mPendingGeoCallback = null;
                mPendingGeoOrigin = null;
            }
        } else if (requestCode == REQUEST_CODE_ALL_PERMS || requestCode == REQUEST_CODE_SMS || requestCode == REQUEST_CODE_CALL) {
            for (int i = 0; i < permissions.length; i++) {
                boolean granted = i < grantResults.length && grantResults[i] == PackageManager.PERMISSION_GRANTED;
                Log.d(TAG, "Permission result for " + permissions[i] + ": " + (granted ? "GRANTED" : "DENIED"));
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_FILE_CHOOSER) {
            if (mFilePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    } else if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                mFilePathCallback.onReceiveValue(results);
                mFilePathCallback = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mWebView != null) {
            mWebView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (mWebView != null) {
            mWebView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (mWebView != null) {
            mWebView.destroy();
        }
        super.onDestroy();
    }

    /**
     * JavaScript Bridge exposed to the SafeMesh Web App as `window.AndroidSafeMesh` and `window.Android`.
     * Enables direct native device integration: silent SMS dispatches, emergency calls,
     * hardware vibration alerts, and permission management without needing external paid services.
     */
    public class SafeMeshWebAppInterface {

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getAppVersion() {
            return "2.1.0";
        }

        @JavascriptInterface
        public boolean hasSmsPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public boolean hasCallPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestEmergencyPermissions() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                runOnUiThread(() -> requestPermissions(new String[]{
                        Manifest.permission.SEND_SMS,
                        Manifest.permission.CALL_PHONE,
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION,
                        Manifest.permission.RECORD_AUDIO
                }, REQUEST_CODE_ALL_PERMS));
            }
        }

        @JavascriptInterface
        public void requestAllPermissions() {
            requestEmergencyPermissions();
        }

        @JavascriptInterface
        public boolean sendSilentSMS(final String phoneNumber, final String message) {
            if (phoneNumber == null || phoneNumber.trim().isEmpty() || message == null || message.trim().isEmpty()) {
                Log.w(TAG, "sendSilentSMS: empty phone number or message");
                return false;
            }

            final String targetNumber = phoneNumber.trim();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "SEND_SMS permission not granted. Prompting user...");
                    runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.SEND_SMS}, REQUEST_CODE_SMS));
                    return false;
                }
            }

            try {
                SmsManager smsManager;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    smsManager = getSystemService(SmsManager.class);
                } else {
                    smsManager = SmsManager.getDefault();
                }
                if (smsManager == null) {
                    smsManager = SmsManager.getDefault();
                }

                ArrayList<String> parts = smsManager.divideMessage(message);
                if (parts.size() > 1) {
                    smsManager.sendMultipartTextMessage(targetNumber, null, parts, null, null);
                } else {
                    smsManager.sendTextMessage(targetNumber, null, message, null, null);
                }
                Log.i(TAG, "sendSilentSMS: Successfully dispatched SMS to " + targetNumber);
                return true;
            } catch (Throwable t) {
                Log.e(TAG, "sendSilentSMS: Failed to dispatch SMS", t);
                return false;
            }
        }

        @JavascriptInterface
        public boolean makeEmergencyCall(final String phoneNumber) {
            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                Log.w(TAG, "makeEmergencyCall: empty phone number");
                return false;
            }

            final String targetNumber = phoneNumber.trim();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "CALL_PHONE permission missing; falling back to ACTION_DIAL and requesting permission");
                    runOnUiThread(() -> {
                        try {
                            Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + targetNumber));
                            startActivity(dialIntent);
                            requestPermissions(new String[]{Manifest.permission.CALL_PHONE}, REQUEST_CODE_CALL);
                        } catch (Throwable t) {
                            Log.e(TAG, "ACTION_DIAL fallback error", t);
                        }
                    });
                    return false;
                }
            }

            runOnUiThread(() -> {
                try {
                    Intent callIntent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + targetNumber));
                    startActivity(callIntent);
                    Log.i(TAG, "makeEmergencyCall: successfully launched ACTION_CALL to " + targetNumber);
                } catch (Throwable t) {
                    Log.e(TAG, "makeEmergencyCall ACTION_CALL failed, attempting ACTION_DIAL fallback", t);
                    try {
                        Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + targetNumber));
                        startActivity(dialIntent);
                    } catch (Throwable t2) {
                        Log.e(TAG, "ACTION_DIAL fallback also failed", t2);
                    }
                }
            });
            return true;
        }

        @JavascriptInterface
        public void vibrate(long milliseconds) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    long duration = milliseconds > 0 ? milliseconds : 500;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(duration);
                    }
                }
            } catch (Throwable t) {
                Log.w(TAG, "vibrate error", t);
            }
        }

        @JavascriptInterface
        public void stopVibrate() {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.cancel();
                }
            } catch (Throwable t) {
                Log.w(TAG, "stopVibrate error", t);
            }
        }

        @JavascriptInterface
        public void setFlashlight(boolean enable) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    CameraManager camManager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
                    if (camManager != null) {
                        String[] idList = camManager.getCameraIdList();
                        if (idList != null && idList.length > 0) {
                            camManager.setTorchMode(idList[0], enable);
                        }
                    }
                } catch (Throwable t) {
                    Log.w(TAG, "setFlashlight error", t);
                }
            }
        }

        @JavascriptInterface
        public void showToast(final String message) {
            if (message == null) return;
            runOnUiThread(() -> Toast.makeText(LauncherActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void shareText(final String title, final String text) {
            runOnUiThread(() -> {
                try {
                    Intent sendIntent = new Intent(Intent.ACTION_SEND);
                    sendIntent.putExtra(Intent.EXTRA_TEXT, text);
                    sendIntent.setType("text/plain");
                    Intent chooser = Intent.createChooser(sendIntent, title != null ? title : "Share Alert");
                    startActivity(chooser);
                } catch (Throwable t) {
                    Log.e(TAG, "shareText error", t);
                }
            });
        }
    }
}
