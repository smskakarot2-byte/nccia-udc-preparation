/**
 * Default job profile + syllabus for NCCIA — Upper Division Clerk.
 *
 * No official published NCCIA UDC syllabus document was locatable/verifiable
 * in this build (no network access to check). This syllabus is therefore a
 * reasonable, documented reconstruction based on the subjects that Pakistani
 * federal/provincial UDC-level and NTS-style clerical job tests typically
 * cover (English, General Knowledge, Current Affairs, Pakistan Studies,
 * Islamiat, Everyday Science, basic Computer/IT, basic Mathematics, basic
 * Analytical Reasoning) plus clerical/office-knowledge topics relevant to a
 * clerk-grade post, as requested in spec section 1. Treat this as a
 * starting point: edit it from /admin/syllabus once you have the actual
 * NCCIA advertisement/syllabus in hand — nothing else in the app needs to
 * change when you do, since the relevance filter reads this configuration
 * at runtime rather than hard-coding it.
 */

export const DEFAULT_JOB_PROFILE = {
  key: "nccia-udc",
  name: "NCCIA — Upper Division Clerk (UDC)",
  description:
    "Default job profile. Syllabus below is a documented reconstruction, not a confirmed official NCCIA UDC syllabus — verify and adjust from /admin/syllabus. See src/lib/default-syllabus.ts for the assumptions.",
  isDefault: true
};

export interface DefaultSubject {
  name: string;
  slug: string;
  keywords: string[];
  excludeKeywords?: string[];
  minKeywordHits?: number;
}

export const DEFAULT_SYLLABUS: DefaultSubject[] = [
  {
    name: "English",
    slug: "english",
    keywords: [
      "synonym", "antonym", "spelling", "grammar", "tense", "preposition",
      "idiom", "vocabulary", "comprehension", "sentence", "correctly spelled",
      "plural", "singular", "pronoun", "adjective", "adverb"
    ],
    minKeywordHits: 1
  },
  {
    name: "General Knowledge",
    slug: "general-knowledge",
    keywords: [
      "capital of", "largest", "smallest", "tallest", "founder of", "invented",
      "headquarters", "currency of", "national bird", "national flower",
      "united nations", "olympic", "world record"
    ],
    excludeKeywords: ["advanced surgical", "clinical trial phase"],
    minKeywordHits: 1
  },
  {
    name: "Current Affairs",
    slug: "current-affairs",
    keywords: [
      "prime minister", "president of", "chief minister", "election commission",
      "budget 20", "summit", "elected in", "appointed as", "current chairman",
      "sworn in", "cabinet"
    ],
    minKeywordHits: 1
  },
  {
    name: "Pakistan Studies",
    slug: "pakistan-studies",
    keywords: [
      "pakistan", "quaid-e-azam", "jinnah", "allama iqbal", "constitution of pakistan",
      "resolution", "province", "punjab", "sindh", "balochistan", "khyber pakhtunkhwa",
      "gilgit", "kashmir", "independence", "partition", "flag of pakistan",
      "national anthem", "rupee"
    ],
    minKeywordHits: 1
  },
  {
    name: "Islamiat / Ethics",
    slug: "islamiat-ethics",
    keywords: [
      "quran", "surah", "hadith", "prophet muhammad", "pillars of islam",
      "zakat", "hajj", "ramadan", "sunnah", "islamic", "ethics", "morality"
    ],
    minKeywordHits: 1
  },
  {
    name: "Everyday Science",
    slug: "everyday-science",
    keywords: [
      "photosynthesis", "gravity", "human body", "vitamin", "gas", "energy",
      "planet", "solar system", "digestive system", "blood", "atom", "element",
      "boiling point", "freezing point", "organ"
    ],
    excludeKeywords: [
      "clinical diagnosis", "chemotherapy protocol", "surgical procedure",
      "differential equation", "quantum field", "molecular orbital theory"
    ],
    minKeywordHits: 1
  },
  {
    name: "Computer Science / IT",
    slug: "computer-it",
    keywords: [
      "ms word", "ms excel", "powerpoint", "keyboard shortcut", "operating system",
      "internet", "email", "browser", "hardware", "software", "input device",
      "output device", "firewall", "computer", "spreadsheet", "file extension",
      "world wide web", "url", "cpu", "ram", "storage device"
    ],
    excludeKeywords: [
      "kubernetes", "distributed consensus", "compiler optimization",
      "big-o notation", "neural network architecture", "database sharding"
    ],
    minKeywordHits: 1
  },
  {
    name: "Basic Mathematics",
    slug: "basic-mathematics",
    keywords: [
      "percent", "percentage", "average", "ratio", "profit", "loss", "speed",
      "distance", "simple interest", "fraction", "series", "sum of", "product of",
      "km/h", "time and work"
    ],
    excludeKeywords: ["laplace transform", "eigenvalue", "differential equation", "integral of"],
    minKeywordHits: 1
  },
  {
    name: "Basic Analytical Reasoning",
    slug: "reasoning",
    keywords: [
      "odd one out", "complete the series", "next number", "analogy",
      "if all", "syllogism", "logical", "puzzle", "arrange the following", "coding-decoding"
    ],
    minKeywordHits: 1
  },
  {
    name: "Basic Urdu",
    slug: "urdu",
    keywords: ["مترادف", "متضاد", "محاورہ", "ضرب المثل", "اردو گرامر", "جمع", "واحد"],
    minKeywordHits: 1
  },
  {
    name: "Pakistan National Institutions",
    slug: "national-institutions",
    keywords: [
      "state bank", "supreme court of pakistan", "national assembly", "senate of pakistan",
      "election commission of pakistan", "fbr", "nadra", "wapda", "psx", "auditor general"
    ],
    minKeywordHits: 1
  },
  {
    name: "Office/Clerical Knowledge",
    slug: "office-clerical",
    keywords: [
      "dispatch register", "office memorandum", "minute sheet", "correspondence",
      "filing system", "official letter", "circular", "noting and drafting",
      "record keeping", "office procedure", "inward register", "outward register"
    ],
    minKeywordHits: 1
  }
];
