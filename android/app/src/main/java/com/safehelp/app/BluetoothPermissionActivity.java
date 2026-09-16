package com.safehelp.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

public class BluetoothPermissionActivity extends Activity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (!BluetoothPermissionManager.areBluetoothPermissionsGranted(this)) {
            BluetoothPermissionManager.requestBluetoothPermissions(this);
        } else {
            returnResultToReact(true);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == BluetoothPermissionManager.REQUEST_CODE_BLUETOOTH) {
            boolean granted = BluetoothPermissionManager.areBluetoothPermissionsGranted(this);
            returnResultToReact(granted);
        }
    }

    private void returnResultToReact(boolean granted) {
        // We use a URL hash instead of query parameters to prevent the TWA from reloading.
        // Chrome handles the ACTION_VIEW intent by updating the hash in the existing Custom Tab.
        String hashFragment = granted ? "bt_result=granted" : "bt_result=denied";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://muj-cnaf.vercel.app/#" + hashFragment));
        // Ensure it routes to the existing TWA task
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}
