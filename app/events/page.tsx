"use client";

import React from "react";

type Event = {
  date: string;
  title: string;
  place: string;
  type: "Seminar" | "Workshop" | "Talk" | "Reading Group" | "Student Presentation";
  speaker: string;
  description: string;
};

const events: Event[] = [
  {
    date: "2026-04-15",
    title: "From Mathematics to Data Science: Why Data and Analytical Thinking Matter for Every AUW Student",
    place: "AUW Mahsha Amini Campus (Sunvally)",
    type: "Workshop",
    speaker: "Dr. Md. Mamunur Rasid",
    description:
      "An interactive session on the role of mathematics as a foundation for statistics, computation, and data science, with examples, applications, and academic pathways.",
  },
  {
    date: "2026-03-15",
    title: "IRG Seminar: Topic (Add)",
    place: "AUW Campus / Online",
    type: "Seminar",
    speaker: "Speaker Name (Add)",
    description:
      "A research seminar organized by IRG focusing on interdisciplinary perspectives and current developments in mathematical, computational, and data-driven research.",
  },
  {
    date: "2026-03-01",
    title: "Python for Research",
    place: "AMDS Lab",
    type: "Workshop",
    speaker: "IRG Team",
    description:
      "A hands-on workshop introducing Python for research, including data handling, exploratory analysis, visualization, and practical research workflows.",
  },
];

const sortedEvents = [...events].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getTypeColor(type: Event["type"]) {
  switch (type) {
    case "Workshop":
      return {
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    case "Seminar":
      return {
        backgroundColor: "#ede9fe",
        color: "#6d28d9",
        border: "1px solid #ddd6fe",
      };
    case "Talk":
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
        border: "1px solid #bbf7d0",
      };
    case "Reading Group":
      return {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fde68a",
      };
    case "Student Presentation":
      return {
        backgroundColor: "#fce7f3",
        color: "#be185d",
        border: "1px solid #fbcfe8",
      };
    default:
      return {
        backgroundColor: "#f3f4f6",
        color: "#374151",
        border: "1px solid #e5e7eb",
      };
  }
}

export default function EventsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = sortedEvents.filter((event) => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  const pastEvents = sortedEvents.filter((event) => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
      {/* ===== HEADER ===== */}
      <section
        style={{
          marginBottom: 36,
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.8fr) minmax(260px, 1fr)",
          }}
        >
          <div
            style={{
              padding: "32px 28px",
              borderRight: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                marginBottom: 16,
              }}
            >
              IRG Events
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "2.2rem",
                lineHeight: 1.2,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Events
            </h1>

            <p
              style={{
                marginTop: 14,
                marginBottom: 0,
                maxWidth: 780,
                lineHeight: 1.8,
                color: "#4b5563",
                fontSize: 15,
              }}
            >
              Seminars, workshops, reading groups, student presentations, and
              special talks organized by the Interdisciplinary Research Group
              (IRG).
            </p>
          </div>

          <div
            style={{
              padding: "28px 24px",
              backgroundColor: "#f9fafb",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Event Categories
              </div>
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
                Workshops, seminars, talks, student presentations, and reading
                groups.
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Focus
              </div>
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
                Research engagement, academic collaboration, and skill
                development.
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Organized by
              </div>
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
                Interdisciplinary Research Group (IRG), AUW
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== UPCOMING EVENTS ===== */}
      <section style={{ marginBottom: 36 }}>
        <h2
          style={{
            marginBottom: 18,
            fontSize: "1.45rem",
            fontWeight: 700,
            color: "#111827",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: 8,
          }}
        >
          Upcoming Events
        </h2>

        {upcomingEvents.length === 0 ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 20,
              backgroundColor: "#ffffff",
              color: "#6b7280",
            }}
          >
            No upcoming events have been added yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {upcomingEvents.map((event) => {
              const badgeStyle = getTypeColor(event.type);

              return (
                <article
                  key={`${event.date}-${event.title}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    backgroundColor: "#ffffff",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        ...badgeStyle,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "6px 12px",
                        borderRadius: 999,
                      }}
                    >
                      {event.type}
                    </span>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#15803d",
                      }}
                    >
                      Upcoming
                    </span>
                  </div>

                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 19,
                        lineHeight: 1.35,
                        color: "#111827",
                      }}
                    >
                      {event.title}
                    </h3>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "#4b5563",
                      fontSize: 14,
                      lineHeight: 1.7,
                    }}
                  >
                    {event.description}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      fontSize: 14,
                      color: "#374151",
                      marginTop: "auto",
                    }}
                  >
                    <div>
                      <strong>Date:</strong> {formatDate(event.date)}
                    </div>
                    <div>
                      <strong>Venue:</strong> {event.place}
                    </div>
                    <div>
                      <strong>Speaker:</strong> {event.speaker}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== PAST / RECENT EVENTS ===== */}
      <section>
        <h2
          style={{
            marginBottom: 18,
            fontSize: "1.45rem",
            fontWeight: 700,
            color: "#111827",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: 8,
          }}
        >
          Recent & Past Events
        </h2>

        {pastEvents.length === 0 ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 20,
              backgroundColor: "#ffffff",
              color: "#6b7280",
            }}
          >
            No past events have been added yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {pastEvents.map((event) => {
              const badgeStyle = getTypeColor(event.type);

              return (
                <article
                  key={`${event.date}-${event.title}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    backgroundColor: "#ffffff",
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "170px minmax(0, 1fr)",
                      gap: 18,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        borderRight: "1px solid #e5e7eb",
                        paddingRight: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111827",
                          marginBottom: 8,
                        }}
                      >
                        {formatDate(event.date)}
                      </div>

                      <span
                        style={{
                          ...badgeStyle,
                          display: "inline-block",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "6px 12px",
                          borderRadius: 999,
                        }}
                      >
                        {event.type}
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 18,
                            lineHeight: 1.35,
                            color: "#111827",
                          }}
                        >
                          {event.title}
                        </h3>

                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#6b7280",
                          }}
                        >
                          Past
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "0 0 12px 0",
                          color: "#4b5563",
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        {event.description}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gap: 6,
                          fontSize: 14,
                          color: "#374151",
                        }}
                      >
                        <div>
                          <strong>Venue:</strong> {event.place}
                        </div>
                        <div>
                          <strong>Speaker:</strong> {event.speaker}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}