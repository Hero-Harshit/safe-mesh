/**
 * Internationalization (i18n) Service
 * 
 * Supports seamless multi-language switching across:
 * - English (Default)
 * - Hindi (हिंदी)
 * - Marathi (मराठी)
 * 
 * Reactive across all components via custom event and React hook.
 */

import { useState, useEffect, useCallback } from 'react';

export type AppLanguage = 'en' | 'hi' | 'mr';

const STORAGE_KEY = 'safetymesh_language';

export const LANGUAGES: { id: AppLanguage; label: string; nativeName: string }[] = [
  { id: 'en', label: 'English', nativeName: 'English' },
  { id: 'hi', label: 'Hindi', nativeName: 'हिंदी' },
  { id: 'mr', label: 'Marathi', nativeName: 'मराठी' }
];

export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    // Header
    campus_safety_mesh: 'SafetyMesh Network',
    safe_status: 'Safe',
    high_alert: 'High Alert',
    threat_monitoring: 'Active Threat Guard',
    mesh_active: 'Mesh Active',
    profile_settings: 'Profile & Settings',

    // Safety Shortcuts
    safe_route: 'Safe Route',
    find_safer_way: 'Find a safer way',
    nearby_guardian: 'Nearby Guardian',
    people_around_you: 'People around you',
    safe_timer: 'Safe Timer',
    checkin_countdown: 'Check-in countdown',
    safety_toolkit: 'Safety Toolkit',
    emergency_tools: 'Emergency tools',

    // SOS Button
    hold_for_sos: 'HOLD FOR SOS',
    release_to_cancel: 'RELEASE TO CANCEL',
    sos_activated: 'SOS ACTIVATED',
    emergency_activated: 'EMERGENCY ACTIVATED',

    // Settings
    settings: 'Settings',
    language_select: 'Language / भाषा',
    language_desc: 'Select preferred app language',
    emergency_preferences: 'EMERGENCY PREFERENCES',
    system_permissions: 'SYSTEM PERMISSIONS',
    manage_contacts: 'Manage Emergency Contacts',
    manage_contacts_desc: 'Set your primary distress contacts',
    manage_pins: 'Manage Security PINs',
    manage_pins_desc: 'Set Actual & Duress PINs for Safe Timer',
    haptic_vibration: 'Haptic Vibration',
    haptic_vibration_desc: 'Tactile vibration during SOS hold & alerts',
    tactile_morse: 'Tactile Morse Code',
    tactile_morse_desc: 'Haptic vibration & audio tone feedback for blind navigation',
    inverted_colors: 'Inverted Colors',
    inverted_colors_desc: 'High-contrast visual inversion for weak eyesight & low vision',
    optical_flash: 'Optical Flash Feedback',
    optical_flash_desc: 'Visual screen flash on interaction for deaf & hard-of-hearing',
    auto_sms: 'Automatic SMS Dispatch',
    auto_sms_desc: 'Prepares SMS with GPS coordinates upon SOS',
    stealth_screen: 'Stealth Black Screen',
    stealth_screen_desc: 'Blacks out screen during SOS to disguise active alert from attackers',
    offline_relay: 'Offline Mesh Relay',
    offline_relay_desc: 'Silently bridge distress beacons for nearby students',
    ai_threat_detector: 'AI Threat Detector',
    ai_threat_detector_desc: 'Continuous background analysis of acoustics and voice spikes',
    sms_access: 'SMS Access',
    sms_access_desc: 'Required to notify emergency contacts during SOS',
    granted: 'Granted',
    retry: 'Retry',
    close: 'Close',

    // Ambient Threat Guard
    ambient_guard_title: 'Ambient Threat Sentinel',
    acoustic_monitoring: 'Continuous acoustic anomaly & scream detection',

    // Emergency Mode
    calling_guardian: 'Calling Emergency Guardian in',
    call_now: 'Call Now',
    cancel: 'Cancel',
    you_are_safe: 'You are safe. Distress alerts transmitted.'
  },

  hi: {
    // Header
    campus_safety_mesh: 'सेफ्टी मेश नेटवर्क',
    safe_status: 'सुरक्षित',
    high_alert: 'उच्च चेतावनी',
    threat_monitoring: 'सक्रिय खतरा गार्ड',
    mesh_active: 'मेश सक्रिय',
    profile_settings: 'प्रोफाइल और सेटिंग्स',

    // Safety Shortcuts
    safe_route: 'सुरक्षित मार्ग',
    find_safer_way: 'एक सुरक्षित रास्ता खोजें',
    nearby_guardian: 'आस-पास के संरक्षक',
    people_around_you: 'आपके आस-पास के लोग',
    safe_timer: 'सुरक्षित टाइमर',
    checkin_countdown: 'चेक-इन उलटी गिनती',
    safety_toolkit: 'सुरक्षा टूलकिट',
    emergency_tools: 'आपातकालीन उपकरण',

    // SOS Button
    hold_for_sos: 'SOS के लिए दबाए रखें',
    release_to_cancel: 'रद्द करने के लिए छोड़ें',
    sos_activated: 'SOS सक्रिय हुआ',
    emergency_activated: 'आपातकाल सक्रिय',

    // Settings
    settings: 'सेटिंग्स',
    language_select: 'भाषा (Language)',
    language_desc: 'अपनी पसंदीदा भाषा चुनें',
    emergency_preferences: 'आपातकालीन प्राथमिकताएं',
    system_permissions: 'सिस्टम अनुमतियां',
    manage_contacts: 'आपातकालीन संपर्क प्रबंधित करें',
    manage_contacts_desc: 'अपने प्राथमिक संकट संपर्कों को सेट करें',
    manage_pins: 'सुरक्षा पिन प्रबंधित करें',
    manage_pins_desc: 'सुरक्षित टाइमर के लिए वास्तविक और डुरेस पिन सेट करें',
    haptic_vibration: 'हैप्टिक कंपन',
    haptic_vibration_desc: 'SOS होल्ड और अलर्ट के दौरान स्पर्श कंपन',
    tactile_morse: 'स्पर्श मोर्स कोड',
    tactile_morse_desc: 'नेत्रहीन नेविगेशन के लिए कंपन और ऑडियो टोन फीडबैक',
    inverted_colors: 'उल्टे रंग',
    inverted_colors_desc: 'कमजोर दृष्टि के लिए उच्च-कंट्रास्ट दृश्य मोड',
    optical_flash: 'ऑप्टिकल फ्लैश फीडबैक',
    optical_flash_desc: 'बधिर उपयोगकर्ताओं के लिए स्क्रीन फ्लैश पुष्टिकरण',
    auto_sms: 'स्वचालित एसएमएस प्रेषण',
    auto_sms_desc: 'SOS पर GPS निर्देशांक के साथ एसएमएस तैयार करता है',
    stealth_screen: 'स्टील्थ ब्लैक स्क्रीन',
    stealth_screen_desc: 'हमलावरों से अलर्ट छिपाने के लिए स्क्रीन को काला करता है',
    offline_relay: 'ऑफलाइन मेश रिले',
    offline_relay_desc: 'आस-पास के लोगों के लिए चुपचाप संकट बीकन रिले करें',
    ai_threat_detector: 'एआई खतरा डिटेक्टर',
    ai_threat_detector_desc: 'ध्वनि और चीख स्पाइक्स का निरंतर पृष्ठभूमि विश्लेषण',
    sms_access: 'एसएमएस एक्सेस',
    sms_access_desc: 'SOS के दौरान आपातकालीन संपर्कों को सूचित करने के लिए आवश्यक',
    granted: 'स्वीकृत',
    retry: 'पुनः प्रयास करें',
    close: 'बंद करें',

    // Ambient Threat Guard
    ambient_guard_title: 'परिवेश खतरा संतरी',
    acoustic_monitoring: 'सतत ध्वनिक विसंगति और चीख पहचान',

    // Emergency Mode
    calling_guardian: 'आपातकालीन संरक्षक को कॉल किया जा रहा है:',
    call_now: 'अभी कॉल करें',
    cancel: 'रद्द करें',
    you_are_safe: 'आप सुरक्षित हैं। संकट अलर्ट भेज दिए गए हैं।'
  },

  mr: {
    // Header
    campus_safety_mesh: 'सुरक्षा मेश नेटवर्क',
    safe_status: 'सुरक्षित',
    high_alert: 'हाय अलर्ट',
    threat_monitoring: 'सक्रिय धोका रक्षक',
    mesh_active: 'मेश सक्रिय',
    profile_settings: 'प्रोफाइल आणि सेटिंग्ज',

    // Safety Shortcuts
    safe_route: 'सुरक्षित मार्ग',
    find_safer_way: 'एक सुरक्षित रस्ता शोधा',
    nearby_guardian: 'जवळचे संरक्षक',
    people_around_you: 'तुमच्या सभोवतालचे लोक',
    safe_timer: 'सुरक्षित टाइमर',
    checkin_countdown: 'चेक-इन काउंटडाउन',
    safety_toolkit: 'सुरक्षा टूलकिट',
    emergency_tools: 'आणीबाणी साधने',

    // SOS Button
    hold_for_sos: 'SOS साठी दाबून ठेवा',
    release_to_cancel: 'रद्द करण्यासाठी सोडा',
    sos_activated: 'SOS सक्रिय झाले',
    emergency_activated: 'आणीबाणी सक्रिय',

    // Settings
    settings: 'सेटिंग्ज',
    language_select: 'भाषा (Language)',
    language_desc: 'तुमची पसंतीची भाषा निवडा',
    emergency_preferences: 'आणीबाणी प्राधान्ये',
    system_permissions: 'सिस्टीम परवानग्या',
    manage_contacts: 'आपत्कालीन संपर्क व्यवस्थापित करा',
    manage_contacts_desc: 'तुमचे प्राथमिक संकट संपर्क सेट करा',
    manage_pins: 'सुरक्षा पिन व्यवस्थापित करा',
    manage_pins_desc: 'सुरक्षित टाइमरसाठी प्रत्यक्ष आणि दबावाखालील पिन सेट करा',
    haptic_vibration: 'हॅप्टिक कंपन',
    haptic_vibration_desc: 'SOS होल्ड आणि अलर्ट दरम्यान स्पर्श कंपन',
    tactile_morse: 'स्पर्श मोर्स कोड',
    tactile_morse_desc: 'दृष्टिहीनांसाठी कंपन आणि ऑडिओ टोन अभिप्राय',
    inverted_colors: 'उलटे रंग',
    inverted_colors_desc: 'कमी दृष्टीसाठी उच्च-कॉन्ट्रास्ट व्हिज्युअल मोड',
    optical_flash: 'ऑप्टिकल फ्लॅश अभिप्राय',
    optical_flash_desc: 'कर्णबधिरांसाठी स्क्रीन फ्लॅश खात्री',
    auto_sms: 'स्वयंचलित एसएमएस पाठवणे',
    auto_sms_desc: 'SOS वर GPS निर्देशांकांसह एसएमएस तयार करतो',
    stealth_screen: 'स्टेल्थ ब्लॅक स्क्रीन',
    stealth_screen_desc: 'हल्लेखोरांपासून लपवण्यासाठी स्क्रीन काळी करतो',
    offline_relay: 'ऑफलाइन मेश रिले',
    offline_relay_desc: 'सभोवतालच्या लोकांसाठी संकट बीकन रिले करा',
    ai_threat_detector: 'एआय धोका शोधक',
    ai_threat_detector_desc: 'आवाज आणि किंकाळ्यांचे सतत विश्लेषण',
    sms_access: 'एसएमएस परवानगी',
    sms_access_desc: 'SOS दरम्यान संपर्कांना कळवण्यासाठी आवश्यक',
    granted: 'मंजूर',
    retry: 'पुन्हा प्रयत्न करा',
    close: 'बंद करा',

    // Ambient Threat Guard
    ambient_guard_title: 'परिवेश धोका पहारेकरी',
    acoustic_monitoring: 'सतत ध्वनिक विसंगती आणि किंचाळी ओळख',

    // Emergency Mode
    calling_guardian: 'पालकांना कॉल केला जात आहे:',
    call_now: 'आता कॉल करा',
    cancel: 'रद्द करा',
    you_are_safe: 'तुम्ही सुरक्षित आहात. आणीबाणी अलर्ट पाठवले गेले आहेत.'
  }
};

/**
 * Returns current language from localStorage or default 'en'.
 */
export function getLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
  if (saved === 'en' || saved === 'hi' || saved === 'mr') {
    return saved;
  }
  return 'en';
}

/**
 * Sets current language and notifies listeners.
 */
export function setLanguage(lang: AppLanguage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('language_changed', { detail: lang }));
}

/**
 * Returns translation for a key, falling back to English or fallback string.
 */
export function t(key: string, fallback?: string): string {
  const currentLang = getLanguage();
  const dict = TRANSLATIONS[currentLang];
  if (dict && dict[key]) {
    return dict[key];
  }
  const enDict = TRANSLATIONS.en;
  if (enDict && enDict[key]) {
    return enDict[key];
  }
  return fallback || key;
}

/**
 * React hook to reactively subscribe to language changes.
 */
export function useTranslation() {
  const [currentLang, setCurrentLang] = useState<AppLanguage>(getLanguage);

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(getLanguage());
    };
    window.addEventListener('language_changed', handleLanguageChange);
    return () => {
      window.removeEventListener('language_changed', handleLanguageChange);
    };
  }, []);

  const translate = useCallback(
    (key: string, fallback?: string): string => {
      return t(key, fallback);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLang]
  );

  return {
    lang: currentLang,
    setLanguage,
    t: translate,
    languages: LANGUAGES
  };
}
