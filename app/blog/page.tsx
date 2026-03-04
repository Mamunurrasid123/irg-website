import { getAllBlogs } from "@/app/lib/blogs/blogs";
import BlogClient from "./BlogClient";

export default function BlogPage() {
  const posts = getAllBlogs();
  return <BlogClient posts={posts} />;
}