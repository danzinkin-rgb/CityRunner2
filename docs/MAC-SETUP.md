# Running CityRunner on an iPhone — Mac guide

**Follow this on the Mac. You do not need to understand any of it; just do the steps in order.**
Written 02 August 2026. Everything before this point was done on Windows; the remaining steps *only* work on a Mac.

---

## What you are actually doing

The game is a web page. Tomorrow you wrap that web page in a real iPhone app and run it on a simulated (or real) iPhone. Apple only allows that wrapping to happen on a Mac — that is the entire reason you need one.

**Time: about an hour, most of it waiting for Xcode to download.**

**Cost: £0.** You do not need the £79 Apple Developer account to see the game running on the simulator or on your own iPhone. That is only needed later, to put it on the App Store.

---

## Step 0 — Before you start

You need:
- The Mac, with about **25 GB free** (Xcode is enormous)
- The Apple ID you normally use (or your son's — see the note in Step 5)
- Reasonable wifi

---

## Step 1 — Install Xcode (do this first, it takes longest)

1. Open the **App Store** on the Mac.
2. Search for **Xcode**. Install it. It is roughly 10–15 GB and can take 30–60 minutes.
3. **While it downloads, carry on with Step 2** in a separate window.
4. When it finishes, **open Xcode once** and accept the licence agreement it shows. It may install extra components — let it.

> *What Xcode is: Apple's app-building program. Nothing works without it.*

---

## Step 2 — Install Node

Node is what runs the build.

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the left-hand, recommended button).
3. Open the downloaded `.pkg` file and click through the installer.

---

## Step 3 — Open the Terminal

Terminal is the Mac's command line — a window where you type instructions.

- Press **Cmd + Space**, type `Terminal`, press **Enter**.

A window with text appears. You type a line, press Enter, and wait for it to finish before the next one.

> **Tip:** if it ever asks for a password, it is the Mac's login password. Nothing appears on screen as you type — that is normal. Type it and press Enter.

---

## Step 4 — Get the game onto the Mac and build it

Type each line, pressing Enter after each, and wait for it to finish.

```bash
xcode-select --install
```
A popup may appear — click **Install** and wait. If it says "already installed", that is fine, carry on.

```bash
sudo gem install cocoapods
```
Enter the Mac password when asked. This installs the tool that assembles the iPhone project. It takes a few minutes.

```bash
cd ~/Desktop
git clone https://github.com/danzinkin-rgb/CityRunner2.git
cd CityRunner2
npm install
```

```bash
npm run ios:sync
```
This builds the game and copies it into the iPhone project.

```bash
npx cap open ios
```
**Xcode opens.** Leave the Terminal window where it is — you will come back to it.

---

## Step 5 — Set up signing (one-time, in Xcode)

Apple insists every app is "signed" by a person, even to run on a simulator.

1. In the left-hand panel of Xcode, click the blue **App** icon at the very top.
2. In the main area, click the **Signing & Capabilities** tab.
3. Tick **Automatically manage signing** if it is not already ticked.
4. Next to **Team**, choose your Apple ID from the dropdown.
   - If the list is empty: **Xcode menu → Settings → Accounts → "+" → Apple ID**, sign in, then come back to this dropdown.
   - Your son's Apple ID works fine, or add your own.
5. If it shows a red error about the **bundle identifier** already being taken, change it: find **Bundle Identifier** and add something to the end, e.g. `uk.co.zinkin.cityrunner.dan`

---

## Step 6 — Run it

1. At the **top of the Xcode window** there is a dropdown showing a device name. Click it and pick any **iPhone 15** (or similar) under *Simulator*.
2. Press the **▶ play button** (top left).
3. Wait. The first build takes several minutes. A simulated iPhone appears and CityRunner launches.

**That is the app running.** Play it exactly as you would on a phone — click and drag with the mouse to swipe.

---

## Step 7 (optional) — Run it on your actual iPhone

1. Plug the iPhone into the Mac with a cable. Unlock it and tap **Trust** if asked.
2. In that same dropdown at the top of Xcode, choose **your iPhone** instead of a simulator.
3. Press **▶**.
4. The first time, the phone will refuse to open it. On the **iPhone**, go to
   **Settings → General → VPN & Device Management**, tap your Apple ID, and tap **Trust**.
5. Open CityRunner from the home screen.

> With a free Apple ID the app stops working after **7 days** and you re-run Step 7 to refresh it. The £79 account removes that limit.

---

## What to look for while testing

These are the things the automated tests on Windows genuinely **cannot** check. This is the whole point of the exercise:

- [ ] **Haptics** — does the phone buzz on collecting a souvenir, changing lane, crashing? *(Simulator has no haptics. Real device only.)*
- [ ] **Safari's toolbars are gone** — the app should be properly fullscreen
- [ ] **The notch and home indicator** — nothing hidden behind them, nothing clipped
- [ ] **Emoji** — the souvenir icons (❤️ 🥐 ☎️ 🏛️) should look like Apple's, not boxes
- [ ] **Sound** — does music start? iOS blocks audio until you first tap the screen
- [ ] **Interruption** — press the home button mid-run; on returning the game should be **paused**, not dead
- [ ] **Rotation** — turn the phone sideways and back
- [ ] **The 60-second monument puzzle** — can you reach every scattered block by tapping?

Note anything wrong and send it back; none of it needs fixing on the Mac.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| `command not found: npm` | Node did not install. Redo Step 2, then **close and reopen Terminal** |
| `command not found: pod` | Redo the `sudo gem install cocoapods` line |
| Xcode: "Signing for App requires a development team" | Step 5 — you have not picked a Team |
| Xcode: bundle identifier unavailable | Step 5, point 5 — make the identifier unique |
| A white or black screen in the app | In Terminal: `npm run ios:sync`, then press ▶ in Xcode again |
| Build fails mentioning Pods | In Terminal: `cd ios/App && pod install && cd ../..`, then ▶ again |

**If you get properly stuck: open Claude Code on the Mac, `cd ~/Desktop/CityRunner2`, and describe what you see. Everything it needs to know is in this repository — including this guide.**

---

## After it works — what changes

You do not need the Mac for day-to-day work. Development carries on on Windows, and you only return to the Mac to produce a new build. The cycle from then on is:

```bash
cd ~/Desktop/CityRunner2
git pull
npm run ios:sync
npx cap open ios
```
…then press ▶.

**Still outstanding before the App Store** (see `LAUNCH-CHECKLIST.md`): Game Center, the full app-icon set, screenshots, age rating, and the £79 developer account.
