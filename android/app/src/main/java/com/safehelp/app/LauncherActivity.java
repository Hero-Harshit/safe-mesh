/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.safehelp.app;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable t) {
            // If restoring saved instance state crashed, retry with clean state
            try {
                super.onCreate(null);
            } catch (Throwable t2) {
                // Let uncaught exception handler handle it if both fail
                throw new RuntimeException("LauncherActivity failed to initialize TWA", t);
            }
        }

        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below, as well as several OEM Android versions (MIUI, OneUI, ColorOS).
        try {
            if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
            } else {
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            }
        } catch (Throwable t) {
            // Safely ignored: only impacts splash screen orientation
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        

        return uri;
    }
}
