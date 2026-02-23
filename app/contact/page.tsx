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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Submission failed.");
      }

      setStatus({
        type: "success",
        message: "Thank you! Your message has been submitted successfully. We will reach out to soon",
      });

      form.reset();
    } catch (error: any) {
      setStatus({
        type: "error",
        message:
          error?.message || "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        maxHeight:560,
        margin: "20px auto",
        padding: "20px 20px",
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      }}
    >
      <h1 style={{ marginBottom: 10 }}>Contact & Join IRG</h1>

      <p style={{ marginBottom: 10, color: "#26ef07",fontWeight: 700, }}>
        Interested in collaborating or joining the Interdisciplinary Research Group (IRG)?  
        Please fill out the form below.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
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
            transition: "0.2s ease",
          }}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>

        {status && (
          <div
            style={{
              marginTop: 2,
              padding: 5,
              borderRadius: 5,
              backgroundColor:
                status.type === "success" ? "#e6fffa" : "#ffe6e6",
              color: status.type === "success" ? "#065f46" : "#8b0000",
            }}
          >
            {status.message}
          </div>
        )}
      </form>

      <div
        style={{
          marginTop: 5,
          paddingTop: 5,
          borderTop: "1px solid #e5e7eb",
          fontSize: 14,
          color: "#666",
        }}
      >
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:irg@auw.edu.bd">irg@auw.edu.bd</a>
        </p>
        <p>
          <strong>Location:</strong> Asian University for Women,
          Chattogram, Bangladesh
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
};