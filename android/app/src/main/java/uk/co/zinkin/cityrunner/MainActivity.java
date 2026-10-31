package uk.co.zinkin.cityrunner;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins in this app's own source are not found automatically; only
        // npm packages are. Same as BridgeViewController.swift on iOS.
        registerPlugin(GrowthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
