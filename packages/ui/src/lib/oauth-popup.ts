export const GOOGLE_AUTH_POPUP_MESSAGE = "07nghiep:google-auth-popup-complete";

export type GoogleAuthPopupMessage = {
  type: typeof GOOGLE_AUTH_POPUP_MESSAGE;
  redirectTo: string;
  error?: string;
};

export function createGoogleAuthPopupCallbackURL(redirectTo: string) {
  const url = new URL("/auth/google/callback", window.location.origin);
  url.searchParams.set("redirect", redirectTo);
  return url.toString();
}

export function openCenteredPopup(url: string, title: string, width = 480, height = 640) {
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");

  return window.open(url, title, features);
}

export async function startGoogleAuthPopup({
  redirectTo,
  getAuthorizationURL,
  onSuccess,
  onError,
}: {
  redirectTo: string;
  getAuthorizationURL: (callbackURL: string) => Promise<string | undefined>;
  onSuccess: () => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const popup = openCenteredPopup("about:blank", "google-auth");
  if (!popup) {
    onError("Trình duyệt đã chặn cửa sổ đăng nhập Google");
    return;
  }

  const handleMessage = async (event: MessageEvent<GoogleAuthPopupMessage>) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== GOOGLE_AUTH_POPUP_MESSAGE) return;

    cleanup();
    popup.close();

    if (event.data.error) {
      onError("Đăng nhập Google không thành công");
      return;
    }

    await onSuccess();
  };

  const closeWatcher = window.setInterval(() => {
    if (popup.closed) {
      cleanup();
    }
  }, 500);

  const cleanup = () => {
    window.removeEventListener("message", handleMessage);
    window.clearInterval(closeWatcher);
  };

  window.addEventListener("message", handleMessage);

  const authorizationURL = await getAuthorizationURL(createGoogleAuthPopupCallbackURL(redirectTo));
  if (!authorizationURL) {
    cleanup();
    popup.close();
    return;
  }

  popup.location.href = authorizationURL;
}
