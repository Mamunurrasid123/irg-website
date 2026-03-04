"use client";

import { useState } from "react";
import Link from "next/link";

type BlogPost = {
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

export default function BlogItem({ post }: { post: BlogPost }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 p-6 shadow-sm backdrop-blur-md">
      {/* Header row: Title + button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-black">{post.title}</h2>

          {/* Small meta line always visible */}
          <div className="mt-2 text-sm text-black/70">
            {post.published_date}
            {post.category ? ` • ${post.category}` : ""}
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="shrink-0 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition"
        >
          {open ? "Hide" : "Details"}
        </button>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="mt-5 rounded-xl border border-black/10 bg-white p-5">
          {/* Subtitle smaller than title */}
          {post.subtitle && (
            <p className="text-base text-gray-800 mb-3">{post.subtitle}</p>
          )}

          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Author:</b> {post.author}
            </div>
            {post.student_id && (
              <div>
                <b>Student ID:</b> {post.student_id}
              </div>
            )}
            {/* Usually better to hide email publicly; keep if you want */}
            {post.email && (
              <div>
                <b>Email:</b> {post.email}
              </div>
            )}
          </div>

          {/* Content preview */}
          <div className="mt-4 text-gray-800 whitespace-pre-wrap text-sm leading-6">
            {post.content}
          </div>

          {/* Read full page */}
          <div className="mt-5">
            <Link
              href={`/blog/${post.slug}`}
              className="inline-block rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition"
            >
              Open Full Blog
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}