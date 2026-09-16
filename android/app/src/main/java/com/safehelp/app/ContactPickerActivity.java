package com.safehelp.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.ContactsContract;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.net.URLEncoder;

public class ContactPickerActivity extends Activity {
    
    private static final int REQUEST_CODE_READ_CONTACTS = 1003;
    private static final int REQUEST_CODE_PICK_CONTACT = 1004;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.READ_CONTACTS}, REQUEST_CODE_READ_CONTACTS);
        } else {
            startContactPicker();
        }
    }

    private void startContactPicker() {
        Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
        startActivityForResult(intent, REQUEST_CODE_PICK_CONTACT);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_READ_CONTACTS) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startContactPicker();
            } else {
                returnResultToReact(null);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_PICK_CONTACT) {
            if (resultCode == RESULT_OK && data != null) {
                Uri contactData = data.getData();
                if (contactData != null) {
                    try (Cursor cursor = getContentResolver().query(contactData, null, null, null, null)) {
                        if (cursor != null && cursor.moveToFirst()) {
                            int nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                            int numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                            
                            String name = "";
                            String number = "";
                            
                            if (nameIndex >= 0) {
                                name = cursor.getString(nameIndex);
                            }
                            if (numberIndex >= 0) {
                                number = cursor.getString(numberIndex);
                            }
                            
                            JSONObject json = new JSONObject();
                            json.put("name", name);
                            json.put("phone", number);
                            
                            returnResultToReact(json.toString());
                            return;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
            returnResultToReact(null);
        }
    }

    private void returnResultToReact(String contactJson) {
        String hashFragment = "contact_result=";
        if (contactJson != null) {
            try {
                hashFragment += URLEncoder.encode(contactJson, "UTF-8");
            } catch (Exception e) {
                hashFragment += "error";
            }
        } else {
            hashFragment += "cancelled";
        }
        
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://muj-cnaf.vercel.app/#" + hashFragment));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}
