// The 34 cards on the wheel. Every item comes straight from the portfolio content.
// kind -> picks the cover theme; href -> where the card links to.
const GH = 'https://github.com/Vinarm-Verma/';

export const CARDS = [
  // Projects (link to the repos)
  { kind: 'project', n: '01', title: 'LIFEGRID', sub: 'Emergency intelligence platform', tags: ['React.js', 'FastAPI', 'PostgreSQL'], href: GH + 'LIFEGRID', ext: true },
  { kind: 'project', n: '02', title: 'JARVIS AI', sub: 'Voice-controlled desktop assistant', tags: ['Python', 'OpenCV', 'Generative AI'], href: GH + 'JARVIS', ext: true },
  { kind: 'project', n: '03', title: 'CAMPUSMIND', sub: 'Campus companion with RAG chat', tags: ['React', 'FastAPI', 'ChromaDB'], href: GH + 'CampusMIND', ext: true },
  { kind: 'project', n: '04', title: 'LOCAL BUSINESS APP', sub: 'Local shopping & payments', tags: ['Node.js', 'MongoDB', 'Razorpay'], href: GH + 'local-buisness-app', ext: true },

  // Portrait
  { kind: 'photo', title: 'VINARM VERMA', sub: 'B.Tech IT • HCST • Class of 2028', href: '#about' },

  // Experience
  { kind: 'work', title: 'DECODELABS', sub: 'Summer Intern', meta: 'May 2026 – Present', href: '#journey' },
  { kind: 'work', title: 'CODEC TECHNOLOGIES', sub: 'Engineer Intern', meta: 'Jun 2026 – Jul 2026', href: '#journey' },
  { kind: 'work', title: 'LITSOC', sub: 'Senior Public Relations Head', meta: 'Aug 2026 – Present', href: '#journey' },
  { kind: 'honor', title: 'NATIONAL YOUTH DAY', sub: 'Competition Winner', meta: 'Achievement', href: '#journey' },
  { kind: 'edu', title: 'B.TECH IT', sub: 'Hindustan College of Science and Technology', meta: '2024 – 2028', href: '#journey' },

  // Certifications
  { kind: 'cert', title: 'AWS CERTIFICATIONS', sub: 'Amazon Web Services', meta: 'Sep 2026', href: '#journey' },
  { kind: 'cert', title: 'AI FOUNDATIONS', sub: 'OpenAI', meta: 'Sep 2026', href: '#journey' },
  { kind: 'cert', title: 'GENERATIVE AI', sub: 'TCS iON', meta: 'Jun 2026', href: '#journey' },
  { kind: 'cert', title: 'DATA ANALYTICS JOB SIMULATION', sub: 'Deloitte', meta: 'Jul 2026', href: '#journey' },
  { kind: 'cert', title: 'GEN AI-POWERED DATA ANALYTICS', sub: 'Tata Group', meta: 'Jul 2026', href: '#journey' },
  { kind: 'cert', title: 'POWER BI WORKSHOP', sub: 'Be10x', meta: 'Jan 2026', href: '#journey' },
  { kind: 'cert', title: 'AI FUNDAMENTALS', sub: 'IBM SkillsBuild', meta: 'Sep 2026', href: '#journey' },

  // Skills
  { kind: 'skill', group: '01 / LANGUAGES', title: 'PYTHON', href: '#skills' },
  { kind: 'skill', group: '01 / LANGUAGES', title: 'JAVA', href: '#skills' },
  { kind: 'skill', group: '01 / LANGUAGES', title: 'SQL', href: '#skills' },
  { kind: 'skill', group: '01 / LANGUAGES', title: 'JAVASCRIPT', href: '#skills' },
  { kind: 'skill', group: '02 / FRAMEWORKS', title: 'REACT.JS', href: '#skills' },
  { kind: 'skill', group: '02 / FRAMEWORKS', title: 'FASTAPI', href: '#skills' },
  { kind: 'skill', group: '02 / FRAMEWORKS', title: 'OPENCV', href: '#skills' },
  { kind: 'skill', group: '02 / FRAMEWORKS', title: 'SPRING FRAMEWORK', href: '#skills' },
  { kind: 'skill', group: '02 / FRAMEWORKS', title: 'TAILWIND CSS', href: '#skills' },
  { kind: 'skill', group: '03 / DATABASES', title: 'POSTGRESQL', href: '#skills' },
  { kind: 'skill', group: '03 / DATABASES', title: 'SUPABASE', href: '#skills' },
  { kind: 'skill', group: '03 / DATABASES', title: 'MYSQL', href: '#skills' },
  { kind: 'skill', group: '04 / DATA & TOOLS', title: 'POWER BI', href: '#skills' },
  { kind: 'skill', group: '04 / DATA & TOOLS', title: 'GIT / GITHUB', href: '#skills' },
  { kind: 'skill', group: '04 / DATA & TOOLS', title: 'REST APIS', href: '#skills' },
  { kind: 'skill', group: '04 / DATA & TOOLS', title: 'LEAFLET', href: '#skills' },
  { kind: 'skill', group: '04 / DATA & TOOLS', title: 'DATA ANALYSIS', href: '#skills' },
].map((c, i) => ({
  ...c,
  id: `c${String(i).padStart(2, '0')}`,
  cover: c.kind === 'photo' ? 'assets/vinarm-verma.png' : `assets/hero/covers/c${String(i).padStart(2, '0')}.jpg`,
  video: `assets/hero/video/c${String(i).padStart(2, '0')}.mp4`,
}));
