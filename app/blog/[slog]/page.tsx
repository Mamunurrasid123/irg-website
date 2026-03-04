import { notFound } from "next/navigation";
import { getBlogBySlug } from "@/app/lib/blogs/blogs";

export default function SingleBlogPage({ params }: { params: { slug: string } }) {
  const post = getBlogBySlug(params.slug);

  if (!post) return notFound();

  return (
    <div style={{ padding: 40 }}>
      <h1>{post.title}</h1>
      <p>{post.subtitle}</p>
      <div>{post.content}</div>
    </div>
  );
}