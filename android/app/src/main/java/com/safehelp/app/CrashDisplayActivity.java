package com.safehelp.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class CrashDisplayActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String error = getIntent().getStringExtra("error");
        if (error == null) error = "Unknown error occurred.";

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.parseColor("#111827"));
        layout.setPadding(40, 60, 40, 40);

        TextView title = new TextView(this);
        title.setText("⚠️ SafeMesh Diagnostic Report");
        title.setTextSize(20);
        title.setTextColor(Color.parseColor("#EF4444"));
        title.setPadding(0, 0, 0, 20);
        layout.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Please take a screenshot of this error:");
        subtitle.setTextSize(14);
        subtitle.setTextColor(Color.parseColor("#9CA3AF"));
        subtitle.setPadding(0, 0, 0, 20);
        layout.addView(subtitle);

        ScrollView scrollView = new ScrollView(this);
        LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f);
        scrollView.setLayoutParams(scrollParams);

        TextView errorText = new TextView(this);
        errorText.setText(error);
        errorText.setTextSize(12);
        errorText.setTextColor(Color.parseColor("#F3F4F6"));
        errorText.setBackgroundColor(Color.parseColor("#1F2937"));
        errorText.setPadding(20, 20, 20, 20);
        scrollView.addView(errorText);
        layout.addView(scrollView);

        Button restartBtn = new Button(this);
        restartBtn.setText("Restart SafeMesh");
        restartBtn.setBackgroundColor(Color.parseColor("#3B82F6"));
        restartBtn.setTextColor(Color.WHITE);
        restartBtn.setOnClickListener(v -> {
            Intent intent = new Intent(this, LauncherActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });
        layout.addView(restartBtn);

        setContentView(layout);
    }
}
