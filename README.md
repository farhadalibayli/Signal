# 📡 Signal — Professional Trading & Networking Platform

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

## ✨ Overview

**Signal** is a high-performance, cross-platform mobile application designed for traders and professionals to discover, share, and manage real-time signals. Built with a focus on speed and seamless user experience, Signal takes you from **onboarding to your first signal in under 90 seconds.**

---

## 🚀 Key Features

### 🔐 Seamless Onboarding
- **Passwordless Authentication**: Rapid login/signup using OTP.
- **90-Second Flow**: Designed for maximum efficiency, minimizing friction for new users.
- **Interactive Tutorials**: Beautiful onboarding screens that guide the user through core value propositions.

### 📊 Intelligence & Action
- **Compose Signals**: Intuitive interface for creating and publishing trading signals with deep customization.
- **Real-time Alerts**: Never miss a beat with instant notifications for new alerts and activity.
- **Activity History**: Detailed tracking of all your interactions and signal performance.

### 🌐 Social & Networking
- **Trading Circles**: Build your own community or join others to share insights.
- **Real-time Chat**: Direct and group messaging powered by high-performance architecture.
- **Discovery**: Find friends and expert traders globally to expand your network.

### 🎨 Premium UI/UX
- **Modern Design System**: Sleek, glassmorphic interfaces with curated dark/light modes.
- **Smooth Animations**: Powered by `react-native-reanimated` for a fluid, high-end feel.
- **Dynamic Localization**: Full support for English, Russian, and Azerbaijani.

---

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev/) & [React Native](https://reactnative.dev/)
- **Backend**: [Supabase](https://supabase.com/) (Real-time DB & Auth)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strictly typed)
- **State & Navigation**: [React Navigation v7](https://reactnavigation.org/)
- **Animation**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Styling**: Vanilla React Native StyleSheet with custom theme tokens
- **Internationalization**: [i18next](https://www.i18next.com/)

---

## 📂 Project Structure

```bash
├── src/
│   ├── components/     # Atomic UI components & signal-specific items
│   ├── screens/        # Main application screens (Home, Signals, Profile, etc.)
│   ├── navigation/     # Root & Tab navigators
│   ├── theme/          # Global design tokens (Colors, Typography)
│   ├── supabase/       # API clients & database services
│   ├── i18n/           # Multi-language translation files (EN, RU, AZ)
│   ├── hooks/          # Reusable React hooks
│   ├── constants/      # App-wide constants & keys
│   └── utils/          # Helper functions & formatters
├── assets/             # Images, fonts, and icons
├── App.tsx             # Main entry point & providers
└── app.json            # Expo configuration
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Expo Go](https://expo.dev/client) app installed on your phone
- JDK 17 (for Android builds)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jtaghiyev18172/Skill-Swap-.git
   cd Signal/Signall
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Launch the app**:
   ```bash
   npm start
   ```

   - Press **`a`** for Android
   - Press **`i`** for iOS
   - Press **`w`** for Web
   - Scan the QR code with **Expo Go** to run on a physical device.

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

