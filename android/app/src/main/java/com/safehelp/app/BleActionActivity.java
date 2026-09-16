package com.safehelp.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import org.json.JSONObject;

import java.net.URLEncoder;

public class BleActionActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            String host = intent.getData().getHost();
            
            JSONObject result = null;
            SafeHelpBleAdvertiser advertiser = SafeHelpBleAdvertiser.getInstance();

            if ("ble_start".equals(host)) {
                result = advertiser.startEmergencyBeacon(this);
            } else if ("ble_stop".equals(host)) {
                result = advertiser.stopEmergencyBeacon(this);
            }

            if (result != null) {
                returnResultToReact(result.toString());
            } else {
                finish();
            }
        } else {
            finish();
        }
    }

    private void returnResultToReact(String jsonPayload) {
        try {
            // URL encode the JSON payload to safely pass it in the hash fragment
            String encodedPayload = URLEncoder.encode(jsonPayload, "UTF-8");
            String hashFragment = "ble_result=" + encodedPayload;
            
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://muj-cnaf.vercel.app/#" + hashFragment));
            // Ensure it routes to the existing TWA task
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
        finish();
    }
}
