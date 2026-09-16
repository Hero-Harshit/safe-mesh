package com.safehelp.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class SafeHelpSosWidget extends AppWidgetProvider {

    public static final String ACTION_WIDGET_SOS = "com.safehelp.app.ACTION_WIDGET_SOS";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_sos);

        // Create an Intent to launch SafeHelpEmergencyActivity
        Intent intent = new Intent(context, SafeHelpEmergencyActivity.class);
        intent.setAction(ACTION_WIDGET_SOS);
        
        // Use FLAG_UPDATE_CURRENT and FLAG_IMMUTABLE as required by modern Android (API 31+)
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Attach the click listener to the entire widget container
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
