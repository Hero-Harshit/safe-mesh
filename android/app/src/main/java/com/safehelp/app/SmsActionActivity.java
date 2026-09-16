package com.safehelp.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.ArrayList;

public class SmsActionActivity extends Activity {

    private static final String TAG = "SAFEHELP_SMS_ACTION";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (intent == null || intent.getData() == null) {
            finish();
            return;
        }

        Uri data = intent.getData();
        String contactsJsonEncoded = data.getQueryParameter("contacts");
        String locationUrlEncoded = data.getQueryParameter("location");

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "SEND_SMS permission denied");
            returnResultToReact(buildErrorResult("SMS_PERMISSION_DENIED"));
            return;
        }

        if (contactsJsonEncoded == null || contactsJsonEncoded.isEmpty()) {
            returnResultToReact(buildErrorResult("NO_EMERGENCY_CONTACTS"));
            return;
        }

        try {
            String contactsJson = URLDecoder.decode(contactsJsonEncoded, "UTF-8");
            String locationUrl = locationUrlEncoded != null ? URLDecoder.decode(locationUrlEncoded, "UTF-8") : "Unavailable";

            JSONArray contactsArray = new JSONArray(contactsJson);
            if (contactsArray.length() == 0) {
                returnResultToReact(buildErrorResult("NO_EMERGENCY_CONTACTS"));
                return;
            }

            StringBuilder messageBuilder = new StringBuilder();
            messageBuilder.append("🚨 SAFEHELP EMERGENCY\n\n");
            messageBuilder.append("I have activated SafeHelp SOS and may need immediate assistance.\n");
            messageBuilder.append("Please contact me as soon as possible.\n\n");
            messageBuilder.append("Location:\n");
            messageBuilder.append(locationUrl);

            String message = messageBuilder.toString();
            SmsManager smsManager = SmsManager.getDefault();

            JSONArray resultsArray = new JSONArray();
            boolean overallSuccess = true;
            boolean anySuccess = false;

            for (int i = 0; i < contactsArray.length(); i++) {
                JSONObject contact = contactsArray.getJSONObject(i);
                String name = contact.optString("name", "Unknown");
                String phone = contact.optString("phone", "");

                JSONObject resultObj = new JSONObject();
                resultObj.put("name", name);
                resultObj.put("phone", phone);

                if (phone.isEmpty()) {
                    resultObj.put("success", false);
                    resultObj.put("error", "INVALID_PHONE_NUMBER");
                    overallSuccess = false;
                } else {
                    try {
                        ArrayList<String> parts = smsManager.divideMessage(message);
                        smsManager.sendMultipartTextMessage(phone, null, parts, null, null);
                        resultObj.put("success", true);
                        anySuccess = true;
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to send SMS to " + phone, e);
                        resultObj.put("success", false);
                        resultObj.put("error", "SMS_SEND_FAILED");
                        overallSuccess = false;
                    }
                }
                resultsArray.put(resultObj);
            }

            JSONObject finalResult = new JSONObject();
            finalResult.put("type", "SMS_SEND_RESULT");
            if (overallSuccess) {
                finalResult.put("status", "SUCCESS");
            } else if (anySuccess) {
                finalResult.put("status", "PARTIAL_SUCCESS");
            } else {
                finalResult.put("status", "FAILED");
            }
            finalResult.put("results", resultsArray);

            returnResultToReact(finalResult.toString());

        } catch (Exception e) {
            Log.e(TAG, "Error parsing contacts or sending SMS", e);
            returnResultToReact(buildErrorResult("NATIVE_COMMUNICATION_ERROR"));
        }
    }

    private String buildErrorResult(String error) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", "SMS_SEND_RESULT");
            obj.put("status", "ERROR");
            obj.put("error", error);
            return obj.toString();
        } catch (JSONException e) {
            return "{\"type\":\"SMS_SEND_RESULT\",\"status\":\"ERROR\",\"error\":\"" + error + "\"}";
        }
    }

    private void returnResultToReact(String jsonPayload) {
        try {
            String encodedPayload = URLEncoder.encode(jsonPayload, "UTF-8");
            String hashFragment = "sms_send_result=" + encodedPayload;
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://muj-cnaf.vercel.app/#" + hashFragment));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to return result to React", e);
        }
        finish();
    }
}
