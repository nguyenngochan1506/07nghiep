import { Link } from "@tanstack/react-router";
import { Card } from "@07nghiep/ui/components/card";

export function NotFoundComponent() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <span className="text-8xl font-bold text-primary">404</span>
        </div>
        <h1 className="mb-3 text-2xl font-bold">Không tìm thấy trang</h1>
        <p className="mb-6 text-muted-foreground">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <Link to="/">
          <span className="inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            Quay về trang chủ
          </span>
        </Link>
      </Card>
    </div>
  );
}
