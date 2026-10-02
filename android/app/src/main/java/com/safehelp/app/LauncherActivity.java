package com.safehelp.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.trusted.TrustedWebActivityDisplayMode;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;

public class LauncherActivity extends Activity {
    private static final String TAG = "SAFEHELP_LAUNCHER";
    private static final String DEFAULT_URL = "https://safety-mesh.vercel.app/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        launchTwa();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        launchTwa();
    }

    private void launchTwa() {
        try {
            Uri targetUri = Uri.parse(DEFAULT_URL);
            if (getIntent() != null && getIntent().getData() != null) {
                targetUri = getIntent().getData();
            }

            // Configure Trusted Web Activity Intent
            TrustedWebActivityIntentBuilder twaBuilder = new TrustedWebActivityIntentBuilder(targetUri);
            
            CustomTabColorSchemeParams defaultColorScheme = new CustomTabColorSchemeParams.Builder()
                    .setToolbarColor(0xFFEF4444)
                    .setNavigationBarColor(0xFF000000)
                    .build();
            CustomTabColorSchemeParams darkModeColorScheme = new CustomTabColorSchemeParams.Builder()
                    .setToolbarColor(0xFF000000)
                    .setNavigationBarColor(0xFF000000)
                    .build();

            twaBuilder.setDefaultColorSchemeParams(defaultColorScheme);
            twaBuilder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_SYSTEM);
            twaBuilder.setColorSchemeParams(CustomTabsIntent.COLOR_SCHEME_DARK, darkModeColorScheme);
            twaBuilder.setDisplayMode(new TrustedWebActivityDisplayMode.DefaultMode());

            CustomTabsIntent customTabsIntent = twaBuilder.buildCustomTabsIntent();

            // Direct intent to preferred Custom Tabs / TWA provider if installed
            String providerPackage = CustomTabsClient.getPackageName(this, null);
            if (providerPackage != null) {
                customTabsIntent.intent.setPackage(providerPackage);
            }

            customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            customTabsIntent.launchUrl(this, targetUri);
            finish();
        } catch (Throwable t) {
            Log.e(TAG, "TWA launch encountered error, falling back to browser VIEW intent", t);
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(DEFAULT_URL));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(fallback);
                finish();
            } catch (Throwable t2) {
                Log.e(TAG, "Browser VIEW intent fallback failed, launching WebView fallback", t2);
                try {
                    Intent webViewIntent = new Intent(this, com.google.androidbrowserhelper.trusted.WebViewFallbackActivity.class);
                    webViewIntent.putExtra("android.support.customtabs.trusted.DEFAULT_URL", DEFAULT_URL);
                    webViewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(webViewIntent);
                    finish();
                } catch (Throwable t3) {
                    Log.e(TAG, "All fallback strategies failed", t3);
                }
            }
        }
    }
}
