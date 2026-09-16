package com.safehelp.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.telephony.SmsManager;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

public class SafeHelpSmsManager {
    private static final String TAG = "SAFEHELP_SMS_MANAGER";
    
    // Shared Preferences keys
    private static final String PREF_NAME = "SafeHelpNativePrefs";
    private static final String KEY_CONTACTS = "emergency_contacts";

    /**
     * Sends the emergency SMS. If contactsJson is null, attempts to read from SharedPreferences.
     * If SharedPreferences is empty, falls back to a test contact.
     */
    public static JSONObject sendEmergencySms(Context context, String contactsJson, String locationUrl) {
        if (locationUrl == null || locationUrl.isEmpty()) {
            locationUrl = "Unavailable";
        }

        try {
            JSONArray contactsArray = null;

            if (contactsJson != null && !contactsJson.isEmpty()) {
                contactsArray = new JSONArray(contactsJson);
            } else {
                SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
                String savedContacts = prefs.getString(KEY_CONTACTS, null);
                
                if (savedContacts != null && !savedContacts.isEmpty()) {
                    contactsArray = new JSONArray(savedContacts);
                } else {
                    // Fallback to test contact for widget testing
                    contactsArray = new JSONArray();
                    JSONObject testContact = new JSONObject();
                    testContact.put("name", "Test Guardian");
                    testContact.put("phone", "9422039955");
                    contactsArray.put(testContact);
                    Log.i(TAG, "No contacts found. Using fallback test contact: 9422039955");
                }
            }

            if (contactsArray == null || contactsArray.length() == 0) {
                return buildResult("ERROR", "NO_EMERGENCY_CONTACTS", null);
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

            String status = overallSuccess ? "SUCCESS" : (anySuccess ? "PARTIAL_SUCCESS" : "FAILED");
            return buildResult(status, null, resultsArray);

        } catch (Exception e) {
            Log.e(TAG, "Error parsing contacts or sending SMS", e);
            return buildResult("ERROR", "NATIVE_COMMUNICATION_ERROR", null);
        }
    }

    private static JSONObject buildResult(String status, String error, JSONArray results) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", "SMS_SEND_RESULT");
            obj.put("status", status);
            if (error != null) {
                obj.put("error", error);
            }
            if (results != null) {
                obj.put("results", results);
            }
            return obj;
        } catch (Exception e) {
            return new JSONObject();
        }
    }
}
