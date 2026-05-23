import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: () => (
    <div className="p-4">
      <div className="bg-red-100 text-red-600 p-2 mb-4 rounded">
        🚧 Đây là Layout tạm của để test trang User. Khi nào Task #10 xong thì sẽ đè lên sau!
      </div>
      
      {/* Outlet chính là nơi để TanStack Router nhúng cái trang users/index.tsx của Han vào đó */}
      <Outlet /> 
    </div>
  ),
})