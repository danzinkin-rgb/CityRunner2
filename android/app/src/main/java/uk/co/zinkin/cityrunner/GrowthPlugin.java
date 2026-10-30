package uk.co.zinkin.cityrunner;

import android.app.Activity;
import android.content.Intent;
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

    @PluginMethod
    public void share(PluginCall call) {
        String text = call.getString("text", "");
        String url = call.getString("url", "");
        String body = url.isEmpty() ? text : (text.isEmpty() ? url : text + " " + url);
        Activity activity = getActivity();
        JSObject ret = new JSObject();
        if (body.isEmpty() || activity == null) {
            ret.put("shared", false);
            call.resolve(ret);
            return;
        }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT, body);
        try {
            activity.startActivity(Intent.createChooser(send, null));
            // Android does not report whether the player went through with
            // it, so "shared" means the sheet opened.
            ret.put("shared", true);
        } catch (Exception e) {
            ret.put("shared", false);
        }
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
