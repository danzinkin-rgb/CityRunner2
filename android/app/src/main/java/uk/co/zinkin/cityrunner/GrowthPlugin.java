package uk.co.zinkin.cityrunner;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

/**
 * Android's share sheet and Google Play's rating prompt: the same two calls
 * as ios/App/App/GrowthPlugin.swift, under the same name, so src/core/native.js
 * needs no platform branch to use them. Registered by hand in MainActivity.
 *
 * Nothing here collects or sends anything. The share sheet hands the text to
 * whichever app the player picks; the rating card is Google Play's own, and
 * Play decides whether to show it (it limits how often, and does not say
 * whether it did). Google's guidance: never from a button, never with a
 * question before it, and carry on the same whatever happens.
 */
@CapacitorPlugin(name = "Growth")
public class GrowthPlugin extends Plugin {

    private static final String CHOSEN = "uk.co.zinkin.cityrunner.SHARE_CHOSEN";

    /** The share() call waiting to hear whether the player picked an app. */
    private PluginCall pendingShare;
    private boolean chosen;
    private BroadcastReceiver receiver;

    @PluginMethod
    public void share(PluginCall call) {
        String text = call.getString("text", "");
        String url = call.getString("url", "");
        String body = url.isEmpty() ? text : (text.isEmpty() ? url : text + " " + url);
        Activity activity = getActivity();
        if (body.isEmpty() || activity == null || pendingShare != null) {
            resolveShare(call, false);
            return;
        }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT, body);

        // iOS reports whether the share went through. Android only reports
        // which app the player picked, and nothing if they backed out, so
        // "shared" here means an app was picked. The chooser tells us through
        // this broadcast, which only this app can send or receive.
        chosen = false;
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                chosen = true;
            }
        };
        ContextCompat.registerReceiver(activity, receiver, new IntentFilter(CHOSEN),
            ContextCompat.RECEIVER_NOT_EXPORTED);
        Intent callback = new Intent(CHOSEN).setPackage(activity.getPackageName());
        PendingIntent onChosen = PendingIntent.getBroadcast(activity, 0, callback,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        try {
            pendingShare = call;
            activity.startActivity(Intent.createChooser(send, null, onChosen.getIntentSender()));
        } catch (Exception e) {
            finishShare(false);
        }
    }

    /** Back in the game after the sheet: answer the waiting share() call. */
    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (pendingShare != null) finishShare(chosen);
    }

    private void finishShare(boolean shared) {
        Activity activity = getActivity();
        if (receiver != null && activity != null) {
            try { activity.unregisterReceiver(receiver); } catch (Exception ignored) { }
        }
        receiver = null;
        PluginCall call = pendingShare;
        pendingShare = null;
        if (call != null) resolveShare(call, shared);
    }

    private static void resolveShare(PluginCall call, boolean shared) {
        JSObject ret = new JSObject();
        ret.put("shared", shared);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestReview(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        ReviewManager manager = ReviewManagerFactory.create(activity);
        manager.requestReviewFlow().addOnCompleteListener(request -> {
            if (request.isSuccessful()) {
                ReviewInfo info = request.getResult();
                manager.launchReviewFlow(activity, info).addOnCompleteListener(done -> call.resolve());
            } else {
                // Not installed from Play, no Play Store, offline: say nothing.
                call.resolve();
            }
        });
    }
}
