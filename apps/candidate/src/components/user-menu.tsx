import { Button } from "@07nghiep/ui/components/button";

export default function UserMenu() {
  return (
    <a href="/login">
      <Button className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90">
        Đăng nhập
      </Button>
    </a>
  );
}
