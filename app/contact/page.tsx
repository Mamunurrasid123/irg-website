"use client";

import { useState } from "react";

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      role: String(formData.get("role") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {}

      if (!res.ok || !data.ok) {
        throw new Error(
          data?.message || data?.error || "Submission failed."
        );
      }

      setStatus({
        type: "success",
        message:
          "Thank you! Your message has been submitted successfully. We will reach out soon.",
      });

      form.reset();
    } catch (error: any) {
      setStatus({
        type: "error",
        message:
          error?.message ||
          "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: "30px",
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      }}
    >
      <h1 style={{ marginBottom: 10 }}>Contact & Join IRG</h1>

      <p
        style={{
          marginBottom: 20,
          color: "#ef6c07",
          fontWeight: 700,
        }}
      >
        Interested in collaborating or joining the Interdisciplinary Research Group (IRG)?
        Please fill out the form below.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          required
          style={inputStyle}
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          required
          style={inputStyle}
        />

        <select name="role" required style={inputStyle}>
          <option value="">Select Category</option>
          <option value="Student">AUW Student</option>
          <option value="Faculty">AUW Faculty</option>
          <option value="Visitor">Visitor / External Researcher</option>
        </select>

        <textarea
          name="message"
          placeholder="Your Message"
          rows={5}
          required
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#8b0000",
            color: "white",
            padding: "14px",
            borderRadius: 10,
            border: "none",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>

        {status && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              backgroundColor:
                status.type === "success" ? "#e6fffa" : "#ffe6e6",
              color: status.type === "success" ? "#065f46" : "#8b0000",
            }}
          >
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
};