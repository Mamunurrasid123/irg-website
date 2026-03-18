# Interdisciplinary Research Group (IRG) Website

Official website of the **Interdisciplinary Research Group (IRG)** at **Asian University for Women (AUW)**, Chattogram, Bangladesh.

The IRG website is designed to present the group’s mission, research activities, academic initiatives, faculty and student engagement, and digital tools developed to support research, learning, and interdisciplinary collaboration.

---

## About IRG

The **Interdisciplinary Research Group (IRG)** is an academic and research-focused initiative at AUW that promotes collaboration across mathematics, data science, artificial intelligence, public health, environmental science, biological science, and related interdisciplinary fields.

The website serves as a central platform to:

- showcase IRG’s mission and vision
- highlight research areas and ongoing initiatives
- share academic tools and resources
- present faculty, student, and collaborative activities
- support outreach, communication, and future growth

---

## Website Features

The IRG website includes the following main sections:

### Core Pages
- **Home Page** – overview of IRG, mission, vision, and highlights
- **About** – background and purpose of the research group
- **Research Areas** – key interdisciplinary research themes
- **Members** – profiles of faculty, researchers, and contributors
- **Projects** – current and planned research and development work
- **Blog / News** – articles, updates, and academic posts
- **Contact** – communication and inquiry section

### Academic & Research Tools
The website also hosts interactive tools intended to support students, researchers, and faculty. Depending on the deployed version, these may include:

- Excel Summary Generator
- Regression Analysis Tool
- P-value Calculator
- Probability Distribution Tools
- Dataset Cleaning Tool
- Data Visualization / Chart Generator
- Statistical and research-support utilities
- Manual data entry and spreadsheet-based input options for selected tools

### Additional Functionalities
- Responsive design for desktop and mobile
- AUW/IRG-branded academic presentation
- Dynamic member profile pages
- Blog search and structured post display
- Scholarship and academic opportunity pages
- Local Dhaka date and time display
- Clean navigation and footer structure

---

## Technology Stack

This project is built using modern web technologies:

- **Next.js**
- **React**
- **TypeScript**
- **CSS / Inline Styling / Custom Design Components**
- **Vercel** for deployment

Optional libraries used in some modules/pages may include:

- `chart.js`
- `react-chartjs-2`
- `papaparse`
- `exceljs`
- `jspdf`
- `html2canvas`

---

## Project Structure

A typical project structure may look like this:

```bash
irg-website/
│
├── app/
│   ├── about/
│   ├── contact/
│   ├── members/
│   ├── projects/
│   ├── research/
│   ├── blog/
│   ├── scholarships/
│   ├── tools/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   └── SharedUIComponents.tsx
│
├── public/
│   ├── images/
│   ├── logos/
│   └── icons/
│
├── data/
│   ├── members.ts
│   ├── projects.ts
│   └── blogs.ts
│
├── styles/
│   └── globals.css
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/irg-website.git
cd irg-website
```

### 2. Install Dependencies

```bash
npm install
```

or

```bash
yarn install
```

### 3. Run the Development Server

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000
```

---

## Production Build

To build the project for production:

```bash
npm run build
npm start
```

---

## Deployment

This project can be deployed easily on **Vercel**.

### Deploy with Vercel
1. Push the repository to GitHub
2. Import the project into Vercel
3. Configure build settings if needed
4. Deploy

---

## Customization

You can customize the website by updating:

- **IRG name, tagline, and mission**
- **AUW branding elements**
- **Member profiles**
- **Research areas**
- **Blog posts**
- **Projects and tools**
- **Logos and institutional images**
- **Color theme and layout design**

---

## Target Users

The IRG website is intended for:

- AUW students
- Faculty members
- Researchers
- Interdisciplinary collaborators
- Academic visitors
- Prospective students and research partners

---

## Purpose of the Website

The broader goals of this website are to:

- promote interdisciplinary academic research
- support student learning through digital tools
- create visibility for IRG initiatives
- provide a professional online presence for AUW-based research activities
- encourage collaboration across disciplines

---

## Future Development

Planned future improvements may include:

- research publication archive
- seminar/event management page
- downloadable academic resources
- student research showcase
- faculty collaboration portal
- submission forms for blog posts or projects
- expanded data analysis and educational tools
- database-backed content management

---

## Maintainer

**Dr. Md. Mamunur Rasid**  
Assistant Professor of Mathematics & Data Science  
Asian University for Women  
Chattogram, Bangladesh

---

## Institutional Affiliation

**Interdisciplinary Research Group (IRG)**  
Asian University for Women (AUW)  
Chattogram, Bangladesh

---

## License

This project is intended for academic, educational, and institutional use.  
You may add a license here, for example:

```md
MIT License
```

or keep it as:

```md
All rights reserved.
```

---

## Acknowledgements

- Asian University for Women (AUW)
- Faculty collaborators and student contributors
- IRG members and academic partners
- Open-source tools and libraries used in development
