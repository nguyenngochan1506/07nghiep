import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { GoogleIcon } from "@07nghiep/ui/components/google-icon";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { startGoogleAuthPopup } from "@07nghiep/ui/lib/oauth-popup";
import { useForm } from "@tanstack/react-form";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignInForm({
  redirectTo = "/home",
  onSwitchToSignUp,
}: {
  redirectTo?: "/home" | "/business-application" | "/billing";
  onSwitchToSignUp: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const router = useRouter();
  const { isPending, refetch: refetchSession } = authClient.useSession();

  const signInWithGoogle = async () => {
    await startGoogleAuthPopup({
      redirectTo,
      getAuthorizationURL: async (callbackURL) => {
        const result = await authClient.signIn.social(
          {
            provider: "google",
            callbackURL,
            newUserCallbackURL: callbackURL,
            errorCallbackURL: callbackURL,
            disableRedirect: true,
          },
          {
            onError: (error) => {
              toast.error(error.error.message || error.error.statusText);
            },
          },
        );

        return result.data?.url;
      },
      onSuccess: async () => {
        await refetchSession();
        await router.invalidate();
        navigate({ to: redirectTo });
        toast.success("Đăng nhập thành công");
      },
      onError: (message) => toast.error(message),
    });
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate({
              to: redirectTo,
            });
            toast.success("Đăng nhập thành công");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Email không hợp lệ"),
        password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Chào mừng bạn quay lại</h1>
          <p className="text-sm text-muted-foreground">Đăng nhập để tiếp tục</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-5"
        >
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="email@example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-xs text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  Mật khẩu
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder="••••••••"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-xs text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">hoặc</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle}>
          <GoogleIcon data-icon="inline-start" />
          Đăng nhập với Google
        </Button>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Chưa có tài khoản? </span>
          <Button
            variant="link"
            onClick={onSwitchToSignUp}
            className="h-auto p-0 text-sm font-medium"
          >
            Đăng ký ngay
          </Button>
        </div>
      </Card>
    </div>
  );
}
