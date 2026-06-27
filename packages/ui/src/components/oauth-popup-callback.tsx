import {
  GOOGLE_AUTH_POPUP_MESSAGE,
  type GoogleAuthPopupMessage,
} from "@07nghiep/ui/lib/oauth-popup";
import { useEffect } from "react";

function OAuthPopupCallback() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const message: GoogleAuthPopupMessage = {
      type: GOOGLE_AUTH_POPUP_MESSAGE,
      redirectTo: searchParams.get("redirect") ?? "/",
      error: searchParams.get("error") ?? undefined,
    };

    window.opener?.postMessage(message, window.location.origin);
    window.close();
  }, []);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 text-sm text-muted-foreground">
      Đang hoàn tất đăng nhập...
    </div>
  );
}

export { OAuthPopupCallback };
