// This script simulates the app loading process, useful for debugging
// client-side initialization or Telegram WebApp specific behaviors.

function simulateTelegramWebAppLoad() {
  console.log("Simulating Telegram WebApp load...")

  // Mock Telegram WebApp object if not present
  if (typeof window !== "undefined" && !window.Telegram) {
    window.Telegram = {
      WebApp: {
        initData:
          "query_id=AAH_test&user=%7B%22id%22%3A12345%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%7D&auth_date=1678886400&hash=abcdef12345",
        initDataUnsafe: {
          query_id: "AAH_test",
          user: {
            id: 12345,
            first_name: "Test",
            last_name: "User",
            username: "testuser",
            language_code: "en",
            is_premium: true,
          },
          auth_date: 1678886400,
          hash: "abcdef12345",
        },
        ready: () => console.log("Telegram WebApp ready (mocked)."),
        expand: () => console.log("Telegram WebApp expanded (mocked)."),
        onEvent: (eventType, callback) => {
          console.log(`Telegram WebApp event listener added for: ${eventType}`)
          // You can manually trigger callbacks for testing specific events
        },
        offEvent: (eventType, callback) => console.log(`Telegram WebApp event listener removed for: ${eventType}`),
        MainButton: {
          text: "",
          color: "",
          textColor: "",
          isVisible: false,
          isActive: true,
          setText: (text) => {
            console.log(`MainButton setText: ${text}`)
            this.text = text
          },
          show: () => {
            console.log("MainButton show")
            this.isVisible = true
          },
          hide: () => {
            console.log("MainButton hide")
            this.isVisible = false
          },
          onClick: (callback) => {
            console.log("MainButton onClick registered")
          },
          offClick: (callback) => {
            console.log("MainButton offClick unregistered")
          },
        },
        BackButton: {
          isVisible: false,
          show: () => {
            console.log("BackButton show")
            this.isVisible = true
          },
          hide: () => {
            console.log("BackButton hide")
            this.isVisible = false
          },
          onClick: (callback) => {
            console.log("BackButton onClick registered")
          },
          offClick: (callback) => {
            console.log("BackButton offClick unregistered")
          },
        },
        isExpanded: true,
        viewportHeight: window.innerHeight,
        viewportStableHeight: window.innerHeight,
        themeParams: {
          bg_color: "#ffffff",
          text_color: "#000000",
          hint_color: "#aaaaaa",
          link_color: "#0000ff",
          button_color: "#0088cc",
          button_text_color: "#ffffff",
          secondary_bg_color: "#f0f0f0",
        },
        colorScheme: "light",
        version: "6.9",
        platform: "tdesktop",
        isVersionAtLeast: (version) => true, // Always true for mock
        sendData: (data) => console.log("Telegram WebApp sendData:", data),
        close: () => console.log("Telegram WebApp close"),
        HapticFeedback: {
          impactOccurred: (style) => console.log(`HapticFeedback impactOccurred: ${style}`),
          notificationOccurred: (type) => console.log(`HapticFeedback notificationOccurred: ${type}`),
          selectionChanged: () => console.log("HapticFeedback selectionChanged"),
        },
      },
    }
  }

  if (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready()
    window.Telegram.WebApp.expand()
    console.log("Telegram WebApp simulated ready and expanded.")
    console.log("Telegram WebApp initData:", window.Telegram.WebApp.initDataUnsafe)
  } else {
    console.warn("Telegram WebApp object not found or not in browser environment. Simulation skipped.")
  }
}

// Call this function in your browser's console or integrate it into your dev setup
// to test components that rely on Telegram WebApp.
// simulateTelegramWebAppLoad();
