package com.safehelp.app;

import android.app.Activity;
import android.os.Bundle;

public class SirenActionActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (getIntent() != null && getIntent().getData() != null) {
            String host = getIntent().getData().getHost();
            if ("siren_start".equals(host)) {
                SafeHelpSirenManager.getInstance().start(getApplicationContext());
            } else if ("siren_stop".equals(host)) {
                SafeHelpSirenManager.getInstance().stop(getApplicationContext());
            }
        }
        
        finish(); // Transparent activity, close immediately
    }
}
