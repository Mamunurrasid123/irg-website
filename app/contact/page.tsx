"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");

    const form = e.currentTarget;

    try {
      await emailjs.sendForm(
        "YOUR_SERVICE_ID",
        "YOUR_TEMPLATE_ID",
        form,
        "YOUR_PUBLIC_KEY"
      );

      setSuccess("Message sent successfully!");
      form.reset();
    } catch (error) {
      setSuccess("Failed to send message. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        padding: "40px 20px",
        backgroundColor: "#b1ceea",
        borderRadius: 14,
        maxWidth: 900,
        margin: "40px auto",
      }}
    >
      <h1 style={{ marginBottom: 10 }}>Contact & Join IRG</h1>

      <p style={{ marginBottom: 20 }}>
        Interested in collaborating or joining IRG? Please fill out the form below.
      </p>

      <form
        onSubmit={sendEmail}
        style={{
          background: "white",
          padding: 20,
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 15,
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
            backgroundColor: "#7c3aed",
            color: "white",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Sending..." : "Send Message"}
        </button>

        {success && (
          <p style={{ color: "green", marginTop: 10 }}>{success}</p>
        )}
      </form>

      <div
        style={{
          marginTop: 30,
          background: "#f3f4f6",
          padding: 15,
          borderRadius: 12,
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

const inputStyle = {
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: "14px",
};