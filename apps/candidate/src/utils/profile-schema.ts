import z from "zod";

const experienceItemSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập chức danh"),
  company: z.string().trim().min(1, "Vui lòng nhập tên công ty"),
  location: z.string().trim().min(1, "Vui lòng nhập địa điểm"),
  startDate: z.string().trim().min(1, "Vui lòng nhập ngày bắt đầu"),
  endDate: z.string().trim().min(1, "Vui lòng nhập ngày kết thúc"),
  description: z.string().trim().min(1, "Vui lòng nhập mô tả kinh nghiệm"),
});

const educationItemSchema = z.object({
  degree: z.string().trim().min(1, "Vui lòng nhập bằng cấp"),
  school: z.string().trim().min(1, "Vui lòng nhập tên trường"),
  location: z.string().trim().min(1, "Vui lòng nhập địa điểm"),
  startDate: z.string().trim().min(1, "Vui lòng nhập ngày bắt đầu"),
  endDate: z.string().trim().min(1, "Vui lòng nhập ngày kết thúc"),
  gpa: z.string().trim().min(1, "Vui lòng nhập GPA"),
});

export const profileSchema = z.object({
  avatarUrl: z.string().trim().optional(),
  resumeUrl: z.string().trim().optional(),
  headline: z.string().trim().min(1, "Vui lòng nhập headline").max(100, "Headline tối đa 100 ký tự"),
  fullName: z.string().trim().min(2, "Họ và tên tối thiểu 2 ký tự"),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  aboutMe: z.string().trim().min(1, "Vui lòng nhập giới thiệu bản thân").max(2000, "Giới thiệu tối đa 2000 ký tự"),
  skills: z.array(z.string().trim()),
  experience: z.array(experienceItemSchema).min(1, "Vui lòng thêm ít nhất 1 kinh nghiệm"),
  education: z.array(educationItemSchema).min(1, "Vui lòng thêm ít nhất 1 học vấn"),
  portfolio: z.object({
    linkedin: z.string().trim().optional(),
    github: z.string().trim().optional(),
    website: z.string().trim().optional(),
  }),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
