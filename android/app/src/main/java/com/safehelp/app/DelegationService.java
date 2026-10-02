package com.safehelp.app;


import com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler;


public class DelegationService extends
        com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            registerExtraCommandHandler(new LocationDelegationExtraCommandHandler());
        } catch (Throwable t) {
            // Safely ignored if location delegation is unavailable
        }
    }
}

