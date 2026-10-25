# Publishing to Google Play

**Status, 11 October 2026: under way.** Taken off hold now that there are
testers for the closed test. The Android project builds and the code work is
done (§2). The next step is Dan's: the Play developer account (§4, step 1).

Forms and listing text: `GOOGLE-PLAY-LISTING.md`.

## 1. Google's rules, as of 11 October 2026

Checked against Google's own pages on that date. They change every year;
re-check before submitting.

- **Target API level 36** (Android 16) for new apps and updates from
  31 August 2026; an extension to 1 November 2026 could be requested. The
  project targets 36. Capacitor 7's template says 35, so `test/android.mjs`
  fails if it drops back.
  [developer.android.com/google/play/requirements/target-sdk](https://developer.android.com/google/play/requirements/target-sdk)
- **Play Billing Library 8 or later** from 31 August 2026.
  `cordova-plugin-purchase` 13.18.0 bundles Billing Library 9.0.0.
- **Closed test before production** for personal accounts created after
  13 November 2023: at least 12 testers opted in for at least 14 days in a
  row. A tester who opts out and back in restarts the count. Production
  stays locked until then; then apply for production access from the
  Dashboard. No change since 2023.
  [support.google.com/googleplay/android-developer/answer/14151465](https://support.google.com/googleplay/android-developer/answer/14151465)
- **Families policy** applies when the target audience includes under-13s.
  The app meets it (no ads, no identifiers, no location, no extra SDKs); the
  item-by-item check is in `GOOGLE-PLAY-LISTING.md` §2.
- **Data safety:** "no data collected" holds. Data taken by Google Play's
  billing system does not need declaring when the app never sees it.
  Reasoning in `GOOGLE-PLAY-LISTING.md` §2 and COMPLIANCE §1.2.
- **Edge to edge:** apps targeting API 35+ draw behind the system bars, and
  from API 36 they cannot opt out. `capacitor.config.json` sets
  `adjustMarginsForEdgeToEdge: "auto"`, so Capacitor keeps the game clear of
  the status and navigation bars, which show the game's night colour.

## 2. What is done (Claude, 11 October 2026)

- `android/` project (Capacitor 7.6.8), app id `uk.co.zinkin.cityrunner`,
  version name 1.1.1, version code 1. Target and compile SDK 36; Android
  Gradle plugin 8.10.1 (the first that supports 36); Gradle 8.11.1, which
  needs **JDK 21** (`android/gradle/gradle-daemon-jvm.properties`).
- Scripts: `npm run android:sync`, `android:sync:tester`, `android:open`.
- Launcher icons from `assets/icon-1024.png` (`npm run assets:android`),
  adaptive icon on the night colour, dark splash and system bars. The
  Capacitor template's logo and Firebase hook are removed.
- **Purchases** (`src/core/iap.js`): the same two products, registered with
  Google Play on Android and with the App Store on iOS. Messages name the
  right store ("Checking with Google Play…", "this Google Account"). Play
  restores purchases by itself at every launch; the Restore button asks it
  again. iOS behaviour is unchanged; `test/android.mjs` checks both.
- **Store calls have a 10-second limit** (`STORE_WAIT_MS` in `iap.js`).
  On the emulator, with no Play Store, the plugin never finished starting,
  and the paywall and Restore waited for ever. Now they say the store is not
  reachable. This also applies on iOS, where it changes nothing unless the
  App Store fails to answer.
- **Game Center** is not registered on Android, so every leaderboard and
  achievement call returns early (`src/core/native.js`).
- **Back button / back gesture** (`handleBack()` in `src/main.js`): closes
  How to play, Settings, Best runs, Shop and the paywall; pauses a run or
  puzzle; resumes from pause; ends the continue offer; goes to the menu from
  the results screens; dismisses the missing-pieces card. At the menu the app
  goes to the background. The facts page ignores it, so back never throws a
  street away.
- **Release guard:** Gradle refuses to build a release APK or bundle from a
  tester build, or with no web build copied in. Tested both ways.
- **Tests:** `test/android.mjs` joins `npm test`; `test/release-build.mjs`
  checks both `ios:sync` and `android:sync` use the plain release build.
- **Store graphics:** `npm run shots:play` makes phone, 7-inch and 10-inch
  tablet screenshots and the 1024×500 feature graphic.
- `privacy.html` gains a Purchases section naming Apple and Google Play.

**Checked on an emulator** (Pixel 6 size, Android 16, API 36, no Play
Store): the debug build installs and boots to How to play; back closes it;
the menu, a run, pause by back and resume by back all work; the store plugin
starts on Google Play and reports billing unavailable, as it must on an image
without the Play Store; after the fix above, the paywall says the store is
not reachable and Restore says no purchase was found.

**Not checked, because it needs a real phone with Play:** buying, restoring
after reinstall, performance on a mid-range phone, audio, haptics, notch
phones, and how the game looks after many trips to the background (once,
just after reinstalling over a running copy, the emulator showed a blank
screen on return; it did not happen again). These are the testers' jobs:
§5.

### Google Play Games Services

Not added. It is Android's Game Center, but it is a Google SDK that signs
players in and sends play data to Google, so the Data safety answer would
become "data collected" and COMPLIANCE §1.2 would need revising. Android
keeps the local Best runs list. Dan deferred the decision on 11 October 2026;
nothing in the code assumes either way.

## 3. This Windows machine

Installed on 11 October 2026 with Dan's go-ahead:

- Android Studio (winget, `Google.AndroidStudio`).
- Android SDK at `C:\Users\dzink\Android\Sdk`: platform 36, build tools
  36.0.0, platform tools, emulator, and an API 36 system image.
- JDK 21 (Microsoft build) at `C:\Users\dzink\Android\jdk-21`.
- An emulator called `cr36` (Pixel 6, Android 16), in `C:\Users\dzink\Android\avd`.

The SDK is not in Android Studio's default place (`%LOCALAPPDATA%\Android\Sdk`)
because the Claude app's sandbox redirects writes there. When Android Studio
first opens, either point it at `C:\Users\dzink\Android\Sdk`
(Settings › Languages & Frameworks › Android SDK) or let it install its own.

**Gradle JDK:** current Android Studio ships JDK 25, which Gradle 8.11
cannot run on ("Unsupported class file major version 69"). In Android Studio:
Settings › Build, Execution, Deployment › Build Tools › Gradle › Gradle JDK
→ choose `C:\Users\dzink\Android\jdk-21` (or "Download JDK…" version 21).

Command-line build, if wanted (Git Bash):

```bash
export JAVA_HOME="C:\\Users\\dzink\\Android\\jdk-21" && cd android && ./gradlew.bat assembleDebug
```

## 4. Dan's steps, in order

Steps 1 and 6 are the long ones: start step 1 today.

1. **Create the Play developer account.**
   [play.google.com/console/signup](https://play.google.com/console/signup).
   Personal account (unless there is a company), USD 25 once, government ID
   and a phone that can receive a code. Identity verification can take
   several days. Use the Google account you want to own the app for good.

   New personal accounts must also **verify access to a real Android
   phone** before any app can go live: install the Play Console app on a
   physical, non-rooted phone running Android 10 or later, sign in as the
   account owner, tap Verify. Emulators do not count, and an iPhone or iOS
   simulator cannot run the app. Google's page does not say the phone must be
   yours: the number on it need not match the account's, and one phone can
   verify several accounts. Options: borrow a tester's phone for five minutes
   (then remove your Google account from it), or buy a cheap refurbished
   Android 10+ phone, which also gives you a device to test purchases on and
   covers re-verification if Google asks again later. An organisation account
   skips this and the 14-day test, but needs a registered business and a
   D-U-N-S number.
   [support.google.com/googleplay/android-developer/answer/14316361](https://support.google.com/googleplay/android-developer/answer/14316361)
2. **Set up a payments profile** in Play Console (Settings › Payments
   profile), so the two products can be created and paid out. Add bank and
   tax details.
3. **Create the app** in Play Console: name `CityRunner: Landmark Run`,
   default language English (UK), Game, Free (the download is free; the
   unlock is an in-app product). Accept the declarations.
4. **Build the first signed bundle** in Android Studio:
   1. `npm run android:sync`, then `npm run android:open`.
   2. Set the Gradle JDK to 21 (§3) and let Gradle sync.
   3. Build › Generate Signed App Bundle or APK › Android App Bundle ›
      Create new… keystore. This is the **upload key**: Play App Signing
      (on by default for new apps) keeps the real release key, you keep
      this one.
   4. **Back up the upload key file and both passwords** in your password
      manager and one copy off this PC. Never put it in the repo
      (`android/.gitignore` blocks `*.jks` and `*.keystore`). Losing it
      means asking Google support to reset it, which takes days.
   5. Choose the `release` variant. The bundle lands in
      `android/app/release/app-release.aab`.
5. **Fill in App content** (Policy › App content) from
   `GOOGLE-PLAY-LISTING.md` §2: privacy policy, ads, app access, content
   rating, target audience, Data safety, and the rest.
6. **Closed test, 14 days.**
   1. Testing › Closed testing › create a track; upload the `.aab`.
   2. Add testers by email list or a Google Group. Each tester needs a
      Google account on an Android phone, accepts the opt-in link, then
      installs from Play. **Count 12 opted in**; recruit 15 or so to allow
      for drop-outs.
   3. Add the testers' Gmail addresses under Settings › License testing too,
      so they can test the purchase without being charged.
   4. Once the build is live on the track, create the two products
      (`GOOGLE-PLAY-LISTING.md` §3): Play only allows it after an upload
      that contains the billing permission.
   5. Keep the 12 opted in for 14 days in a row. Each new build: bump
      `versionCode` in `android/app/build.gradle` by one, `npm run
      android:sync`, generate the signed bundle, upload to the same track.
      New builds do not restart the 14 days.
   6. Read the **pre-launch report** Play produces for each upload: it runs
      the app on a range of real phones and shows crashes and screenshots.
      That is the device testing there is no phone here for.
7. **Store listing** (Grow › Store presence › Main store listing): text
   from `GOOGLE-PLAY-LISTING.md` §1, icon, feature graphic and screenshots
   from `npm run shots:play`.
8. **Apply for production access** from the Dashboard after day 14. Google
   asks how testing went (who tested, what feedback, what changed).
   Approval usually takes up to a week.
9. **Release to production**: promote the tested build, choose countries,
   send for review.

## 5. What the testers should check

Ask them to report anything wrong with:

- Buying the unlock (license testers are not charged): Rome and San
  Francisco open, the padlocks go.
- Uninstall, reinstall: the unlock comes back by itself, or with Settings ›
  Restore.
- Cancelling the purchase sheet: no error, nothing changes.
- Smoothness on an ordinary phone, not just a flagship. The GPU memory work
  (`releaseStreetCaches`) matters more on Android.
- Sound and vibration.
- The back button or gesture in every screen; leaving the app and coming
  back mid-run (the run should be paused, the screen not blank).
- Anything hidden under a notch, camera hole or the navigation bar.
- Turning the phone sideways.
