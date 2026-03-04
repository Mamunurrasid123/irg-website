export type Member = {
  slug: string;
  name: string;

  role?: string;
  program?: string;     // For students (UG 1-1, MS etc.)
  major?: string;

  affiliation?: string;
  interests?: string[];

  email?: string;
  photo?: string;
  bio?: string;

  links?: { label: string; url: string }[];
};

export const members: Member[] = [

  // ⭐⭐⭐ FACULTY ⭐⭐⭐

  {
    slug: "mamunur-rasid",
    name: "Dr. Md. Mamunur Rasid",
    role: "Lead",
    affiliation: "Asian University for Women (AUW)",
    interests: [
      "Computational Mathematics",
      "AI, ML & Data Science"
    ],
    email: "irg@auw.edu.bd",
    photo: "/members/mamunur.jpg",
    bio:
      "Dr. Md. Mamunur Rasid leads the Interdisciplinary Research Group (IRG), fostering collaborative research, mentoring students, and advancing computational mathematics and data-driven scientific discovery.",
    links: [
      { label: "ResearchGate", url: "https://www.researchgate.net/profile/Md-Rasid" },
      { label: "ORCID", url: "https://orcid.org/" }
    ],
  },
  {
    slug: "faculty-co-lead-1",
    name: "Dr. Md Anowar Hossain",
    role: "Lead",
    affiliation: "Asian University for Women (AUW)",
    interests: [
      "Traffic Flow Modeling, CA Model, Agent Based Simulation,& Epidemiology and Game Theory"  
    ],
    photo: "/members/anowar.jpeg",
    bio:
      "Researcher contributing to interdisciplinary initiatives across AI, education, and applied analytics.",
    links: [
      { label: "AUW Profile", url: "https://scholar.google.com/citations?user=FFKTQrYAAAAJ&hl=en" }
    ],
  },
{
    slug: "faculty-co-lead-2",
    name: "Dr. Md Aamir Farooq",
    role: "Lead",
    affiliation: "Asian University for Women (AUW)",
    interests: [
      "Trafice Flow Prediction",
      "Game Theory",
    ],
    photo: "/members/placeholder.png",
    bio:
      "Researcher contributing to interdisciplinary initiatives across AI, education, and applied analytics.",
    links: [
      { label: "AUW Profile", url: "https://auw.edu.bd/" }
    ],
  },
  {
    slug: "faculty-co-lead-3",
    name: "Dr Md Junayed Nayeem",
    role: "Lead",
    affiliation: "Asian University for Women (AUW)",
    interests: [
      "Epidemiological factors leading to Cardiovascular diseases, Pulmonary hypertension, and Tyrosine kinase receptors in prostate cancer and breast cancer"
    ],
    photo: "/members/junayed.jpeg",
    bio:
      "Researcher contributing to interdisciplinary initiatives across AI, education, and applied analytics.",
    links: [
      { label: "AUW Profile", url: "https://auw.edu.bd/" }
    ],
  },
  // ⭐⭐⭐ STUDENTS ⭐⭐⭐
  // Keep them SHORT — this is how top labs display students.

  {
    slug: "s1",
    name: "Student",
    role: "Student Researcher",
    program: "UG 1.3",
    major: "Applied Mathematics & Data Science",
    photo: "/members/placeholder.png",
  },

  {
    slug: "s2",
    name: "Student",
    role: "Student Researcher",
    program: "UG 2-1",
    major: "Computer Science",
    photo: "/members/placeholder.png",
  },

  {
    slug: "s3",
    name: "Student",
    role: "Student Researcher",
    program: "UG 3-2",
    major: "Economics",
    photo: "/members/placeholder.png",
  },

  {
    slug: "s4",
    name: "Student",
    role: "Student Researcher",
    program: "UG 2-2",
    major: "Environmental Science",
    photo: "/members/placeholder.png",
  }
,

  {
    slug: "s5",
    name: "Student",
    role: "Student Researcher",
    program: "UG 2-2",
    major: "Biological Science",
    photo: "/members/placeholder.png",
  },

  {
    slug: "s6",
    name: "Student",
    role: "Student Researcher",
    program: "UG 2-2",
    major: "Public Health",
    photo: "/members/placeholder.png",
  },

  {
    slug: "s7",
    name: "Student",
    role: "Student Researcher",
    program: "UG 2-2",
    major: "Education",
    photo: "/members/placeholder.png",
  },

  {
    slug: "s8",
    name: "Student",
    role: "Student Researcher",
    program: "UG 2-2",
    major: "PPE",
    photo: "/members/placeholder.png",
  }
];
