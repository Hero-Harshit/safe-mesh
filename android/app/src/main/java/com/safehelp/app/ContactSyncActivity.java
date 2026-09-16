package com.safehelp.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

public class ContactSyncActivity extends Activity {
    private static final String TAG = "SAFEHELP_CONTACT_SYNC";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (getIntent() != null && getIntent().getData() != null) {
            Uri data = getIntent().getData();
            String contactsJson = data.getQueryParameter("contacts");
            
            if (contactsJson != null) {
                SharedPreferences prefs = getSharedPreferences("SafeHelpNativePrefs", Context.MODE_PRIVATE);
                prefs.edit().putString("emergency_contacts", contactsJson).apply();
                Log.i(TAG, "Successfully synced contacts to native preferences.");
            } else {
                Log.w(TAG, "contacts payload is null.");
            }
        } else {
            Log.w(TAG, "Intent data is null.");
        }
        
        finish();
    }
}
