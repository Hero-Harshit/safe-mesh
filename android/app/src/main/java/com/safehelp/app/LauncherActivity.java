package com.safehelp.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
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
import androidx.annotation.NonNull;

/**
 * High-performance fullscreen native WebView launcher for SafeMesh.
 * Completely replaces external Chrome Custom Tabs with an isolated, native app sandbox.
 * Zero browser URL bars, zero share buttons, native Android permission handling.
 */
public class LauncherActivity extends Activity {
    private static final String TAG = "SAFEMESH_VIEW";
    private static final String DEFAULT_URL = "https://safety-mesh.vercel.app/";
    private static final int REQUEST_CODE_LOCATION = 5001;
    private static final int REQUEST_CODE_FILE_CHOOSER = 5002;

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
}
