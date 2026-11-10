
import {
  NCEngine,
  ConnectionStatusHandler,
  MessageHandler
} from "@nexconn/chat";

type TokenResponse = {
  userId?: string;
  token?: string;
  name?: string;
  error?: string;
};

let initialized = false;
let connectionPromise: Promise<string> | null = null;

function initializeNexconn() {
  if (initialized) return;

  const appKey = import.meta.env.VITE_NEXCONN_APP_KEY;

  if (!appKey) {
    throw new Error("Nexconn App Key is missing.");
  }

  // Singapore is the default Nexconn data centre.
  NCEngine.initialize({ appKey });

  // Track connection status.
  NCEngine.addConnectionStatusHandler(
    "campuswide-connection",
    new ConnectionStatusHandler({
      onConnectionStatusChanged({ status, code }) {
        console.log("[Nexconn] Connection:", status, code);
      }
    })
  );

  // Receive incoming messages.
  NCEngine.addMessageHandler(
    "campuswide-messages",
    new MessageHandler({
      onMessageReceived({ messages }) {
        window.dispatchEvent(
          new CustomEvent("campuswide:nexconn-message", {
            detail: messages
          })
        );
      }
    })
  );

  initialized = true;
}

export async function connectNexconn(
  demoUserId: string
): Promise<string> {
  if (connectionPromise) {
    return connectionPromise;
  }

  initializeNexconn();

  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error("Backend API URL is missing.");
  }

  const connectionTask = (async () => {
    const response = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/api/chat/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ demoUserId })
      }
    );

    const tokenData = await response.json() as TokenResponse;

    if (!response.ok || !tokenData.token) {
      throw new Error(
        tokenData.error || "Could not obtain Nexconn token."
      );
    }

   const result = await NCEngine.connect({
  token: tokenData.token
});

console.log("[Nexconn] Connect response:", {
  code: result.code,
  hasData: Boolean(result.data),
  userId: result.data?.userId
});

if (result.code !== 0) {
  throw new Error(
    `Nexconn connection failed. Code: ${result.code}`
  );
}

const connectedUserId =
  result.data?.userId || tokenData.userId;

if (!connectedUserId) {
  throw new Error(
    "Nexconn connected but did not return a user ID."
  );
}

return connectedUserId;
  })();

  connectionPromise = connectionTask;

  try {
    return await connectionTask;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}
