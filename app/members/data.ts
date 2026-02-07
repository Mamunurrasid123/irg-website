export type Member = {
  slug: string;
  name: string;
  role: string;
  affiliation: string;
  interests: string[];
  email?: string;
  photo?: string; // path under /public
  bio: string;
  links?: { label: string; url: string }[];
};

export const members: Member[] = [
  {
    slug: "mamunur-rasid",
    name: "Dr. Md. Mamunur Rasid",
    role: "Faculty Lead / Director",
    affiliation: "Asian University for Women (AUW)",
    interests: ["Computational Mathematics", "Scientific Computing", "Numerical PDEs", "Data Science"],
    email: "irg@auw.edu.bd",
    photo: "/members/mamunur.png",
    bio:
      "Leads IRG activities including seminars, student mentoring, and interdisciplinary collaborations. Research interests include numerical methods for PDEs, Lagrange–Galerkin schemes, and computational modeling.",
    links: [
      { label: "Google Scholar", url: "https://scholar.google.com/" },
      { label: "ORCID", url: "https://orcid.org/" },
    ],
  },
  {
    slug: "faculty-member-1",
    name: "Faculty Member (Add Name)",
    role: "Co-Lead (Add Role)",
    affiliation: "Asian University for Women (AUW)",
    interests: ["AI / ML", "Applied Data Science", "Education"],
    photo: "/members/placeholder.png",
    bio: "Add short bio here. You can later expand with projects, grants, and publications.",
    links: [{ label: "Profile Link", url: "https://auw.edu.bd/" }],
  },
  {
    slug: "student-researcher-1",
    name: "Student Researcher (Add Name)",
    role: "Undergraduate Researcher",
    affiliation: "AUW",
    interests: ["Statistics", "Python", "Research Methods"],
    photo: "/members/placeholder.png",
    bio: "Add student bio here (research interests, projects, achievements).",
  },
  ,
  {
    slug: "student-researcher-2",
    name: "Student Researcher (Add Name)",
    role: "Undergraduate Researcher",
    affiliation: "AUW",
    interests: ["Statistics", "Python", "Research Methods"],
    photo: "/members/placeholder.png",
    bio: "Add student bio here (research interests, projects, achievements).",
  },
  ,
  {
    slug: "student-researcher-3",
    name: "Student Researcher (Add Name)",
    role: "Undergraduate Researcher",
    affiliation: "AUW",
    interests: ["Statistics", "Python", "Research Methods"],
    photo: "/members/placeholder.png",
    bio: "Add student bio here (research interests, projects, achievements).",
  },
];
