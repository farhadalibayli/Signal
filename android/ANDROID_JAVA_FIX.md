# Android build: Java version

The build failed with **Unsupported class file major version 68** because Gradle 8.10.2 does not support **Java 24**. Use **Java 17 or 21** for the Android build.

## Easiest: one-time setup (then `npx expo run` works)

From the **frontend** folder:

```powershell
npm run android:setup
```

This finds JDK 17 or 21 on your machine and writes it into `android/gradle.properties`. After that, **`npx expo run`** and **`npx expo run:android`** will use that JDK automatically.

If the script says “JDK 17 or 21 not found”, install [Eclipse Temurin 17](https://adoptium.net/temurin/releases/?version=17&os=windows), then run `npm run android:setup` again.

## Alternative: run Android with correct JDK each time

Without running setup, you can still build by using the helper script (which sets `JAVA_HOME` for that run):

```powershell
npm run android
```

## Manual fix

1. **Install JDK 17 or 21** if needed: [Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17&os=windows).

2. **Either** set `JAVA_HOME` in the terminal before each build:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot"   # your actual path
   npx expo run:android
   ```

   **Or** add this to `android/gradle.properties` (double backslashes required):
   ```properties
   org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13.11-hotspot
   ```

3. **Find your JDK path** (PowerShell):
   ```powershell
   Get-ChildItem "C:\Program Files\Java" -ErrorAction SilentlyContinue
   Get-ChildItem "C:\Program Files\Eclipse Adoptium" -ErrorAction SilentlyContinue
   ```
