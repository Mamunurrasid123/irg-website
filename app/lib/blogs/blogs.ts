import fs from "fs";
import path from "path";

export type BlogPost = {
  slug: string;
  title: string;
  subtitle?: string;
  category?: string;
  author: string;
  student_id?: string;
  email?: string;
  published_date: string;
  content: string;
};

const blogsPath = path.join(process.cwd(), "app", "content", "blog", "blogs.json");
export function getAllBlogs(): BlogPost[] {
  const raw = fs.readFileSync(blogsPath, "utf8");
  const data = JSON.parse(raw) as BlogPost[];

  // Sort by date (newest first)
  data.sort(
    (a, b) =>
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
  );

  return data;
}

export function getBlogBySlug(slug: string): BlogPost | undefined {
  return getAllBlogs().find((p) => p.slug === slug);
}