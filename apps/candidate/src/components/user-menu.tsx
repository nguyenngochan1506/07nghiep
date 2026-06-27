import { Button } from "@07nghiep/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@07nghiep/ui/components/dropdown-menu";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";
import { UserRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Link to="/login">
        <Button className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90">
          Đăng nhập
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="sm:w-auto sm:px-3"
            aria-label="Mở menu tài khoản"
          />
        }
      >
        <UserRound />
        <span className="hidden max-w-32 truncate sm:inline">{session.user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigate({ to: "/profile" });
            }}
          >
            Hồ sơ của tôi
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigate({ to: "/profile/edit" });
            }}
          >
            Chỉnh sửa hồ sơ
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigate({ to: "/billing" });
            }}
          >
            Candidate Plus
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
