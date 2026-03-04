"use client";

import { useState, useMemo } from "react";

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

export default function BlogClient({ posts }: { posts: BlogPost[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 🔎 Filter logic
  const filteredPosts = useMemo(() => {
    const query = search.toLowerCase();

    return posts.filter((post) =>
      post.title.toLowerCase().includes(query) ||
      post.subtitle?.toLowerCase().includes(query) ||
      post.category?.toLowerCase().includes(query) ||
      post.author.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query)
    );
  }, [search, posts]);

  return (
    <div
      style={{
        padding: "20px 20px",
        backgroundColor: "#bfc22f",
        borderRadius: 14,
        maxWidth: 1350,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 44, marginBottom: 10 }}>IRG Blog</h1>

      {/* 🔍 SEARCH BAR */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by topic, keyword, author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 14,
          borderRadius: 14,
        }}
      >
        {filteredPosts.length === 0 && (
          <div style={{ padding: 20, backgroundColor: "white", borderRadius: 10 }}>
            No blogs found.
          </div>
        )}

        {filteredPosts.map((post) => {
          const isOpen = openSlug === post.slug;

          return (
            <div
              key={post.slug}
              style={{
                border: "1px solid #aec0e5",
                borderRadius: 14,
                padding: 18,
                backgroundColor: "#f4f4b5",
              }}
            >
              {/* Title Row */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 22 }}>{post.title}</strong>

                  {post.subtitle && (
                    <div style={{ marginTop: 6, fontSize: 15 }}>
                      {post.subtitle}
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    {post.published_date}
                    {post.category ? ` • ${post.category}` : ""}
                  </div>
                </div>

                <button
                  onClick={() => setOpenSlug(isOpen ? null : post.slug)}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {isOpen ? "Hide" : "Details"}
                </button>
              </div>

              {/* Details */}
              {isOpen && (
                <div
                  style={{
                    marginTop: 16,
                    borderTop: "1px solid #4772c7",
                    paddingTop: 14,
                  }}
                >
                  <div>
                    <b>Author:</b> {post.author}
                  </div>

                  {post.student_id && (
                    <div>
                      <b>Student ID:</b> {post.student_id}
                    </div>
                  )}

                  {post.content && (
                    <div
                      style={{
                        marginTop: 14,
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                        maxHeight: 380,
                        overflowY: "auto",
                      }}
                    >
                      {post.content}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}