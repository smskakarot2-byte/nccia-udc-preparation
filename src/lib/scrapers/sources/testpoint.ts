import {
  BaseScraper,
  ScraperRunContext,
  ScraperRunResult,
  RawScrapedMcq,
} from "../base";

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cleanText(value: string): string {
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function cleanUrl(href: string): string {
  const value = decodeEntities(href.trim());

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `https://testpointpk.com${value}`;
  }

  return `https://testpointpk.com/${value}`;
}

function subjectFromUrl(url: string): string {
  const lower = url.toLowerCase();

  if (lower.includes("computer")) return "Computer";
  if (lower.includes("english")) return "English";

  if (
    lower.includes("pak-study") ||
    lower.includes("pakstudy")
  ) {
    return "Pakistan Studies";
  }

  if (lower.includes("general-knowledge")) {
    return "General Knowledge";
  }

  if (lower.includes("current-affairs")) {
    return "Current Affairs";
  }

  if (
    lower.includes("islamic") ||
    lower.includes("islamiat")
  ) {
    return "Islamiyat";
  }

  if (
    lower.includes("everyday-science") ||
    lower.includes("science")
  ) {
    return "Everyday Science";
  }

  if (lower.includes("urdu")) return "Urdu";

  return "General Knowledge";
}

function extractMcqs(
  html: string,
  pageUrl: string,
): RawScrapedMcq[] {
  const results: RawScrapedMcq[] = [];

  const questionPattern =
    /<a[^>]+href=["']([^"']*\/mcqs\/([^/"']+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/gi;

  let match: RegExpExecArray | null;

  while ((match = questionPattern.exec(html)) !== null) {
    const sourceUrl = cleanUrl(match[1]);
    const sourceQuestionId = match[2];
    const question = cleanText(match[3]);
    const optionsHtml = match[4];

    if (!question) continue;

    const optionPattern =
      /<li[^>]*class=["'][^"']*\b(correct|incorrect)\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;

    const options: string[] = [];
    let correctIndex = -1;
    let optionMatch: RegExpExecArray | null;

    while (
      (optionMatch = optionPattern.exec(optionsHtml)) !== null
    ) {
      options.push(cleanText(optionMatch[2]));

      if (
        optionMatch[1].toLowerCase() === "correct"
      ) {
        correctIndex = options.length - 1;
      }
    }

    if (options.length < 4 || correctIndex < 0) {
      continue;
    }

    const four = options.slice(0, 4);

    if (four.some((option) => !option)) {
      continue;
    }

    results.push({
      question,
      optionA: four[0],
      optionB: four[1],
      optionC: four[2],
      optionD: four[3],
      rawAnswerText: String.fromCharCode(
        65 + correctIndex,
      ),
      subjectHint: subjectFromUrl(pageUrl),
      sourceUrl,
      sourceQuestionId,
    });
  }

  return results;
}

function buildUrls(keywords: string[]): string[] {
  const urls = new Set<string>();

  urls.add(
    "https://testpointpk.com/important-mcqs/computer",
  );

  const normalized = keywords.map((keyword) =>
    keyword.toLowerCase(),
  );

  const mappings: Array<[string[], string]> = [
    [
      [
        "computer",
        "ms word",
        "excel",
        "internet",
        "programming",
        "database",
      ],
      "/important-mcqs/computer",
    ],
    [
      ["english", "grammar", "synonym", "antonym"],
      "/important-mcqs/english",
    ],
    [
      ["pakistan", "pak studies", "pakstudy"],
      "/important-mcqs/pak-study",
    ],
    [
      ["general knowledge", "gk"],
      "/important-mcqs/general-knowledge",
    ],
    [
      ["current affairs", "current-affairs"],
      "/important-mcqs/current-affairs",
    ],
    [
      ["islamiyat", "islamic", "islam"],
      "/important-mcqs/islamic-studies",
    ],
    [
      ["science", "everyday science"],
      "/important-mcqs/everyday-science",
    ],
    [
      ["urdu"],
      "/important-mcqs/urdu",
    ],
  ];

  for (const [needles, path] of mappings) {
    if (
      normalized.some((keyword) =>
        needles.some((needle) =>
          keyword.includes(needle),
        ),
      )
    ) {
      urls.add(`https://testpointpk.com${path}`);
    }
  }

  return [...urls];
}

export class TestPointScraper extends BaseScraper {
  readonly key = "testpoint";
  readonly name = "TestPoint";
  readonly baseUrl = "https://testpointpk.com";

  async run(
    ctx: ScraperRunContext,
  ): Promise<ScraperRunResult> {
    try {
      const urls = buildUrls(ctx.syllabusKeywords);

      const mcqs: RawScrapedMcq[] = [];
      const seen = new Set<string>();

      for (const url of urls) {
        if (mcqs.length >= ctx.maxResults) {
          break;
        }

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "NCCIA-UDC-Preparation/1.0",
            Accept:
              "text/html,application/xhtml+xml",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          continue;
        }

        const html = await response.text();

        const parsed = extractMcqs(html, url);

        for (const mcq of parsed) {
          const key =
            mcq.sourceQuestionId ||
            mcq.sourceUrl;

          if (
            ctx.knownSourceQuestionIds.has(key) ||
            seen.has(key)
          ) {
            continue;
          }

          seen.add(key);
          mcqs.push(mcq);

          if (mcqs.length >= ctx.maxResults) {
            break;
          }
        }
      }

      if (mcqs.length === 0) {
        return {
          status: "ok",
          mcqs: [],
          message:
            "TestPoint was reached, but no new parseable MCQs were found.",
        };
      }

      return {
        status: "ok",
        mcqs,
        message:
          `TestPoint extraction completed: ${mcqs.length} MCQs found.`,
      };
    } catch (error) {
      return {
        status: "error",
        mcqs: [],
        message:
          error instanceof Error
            ? error.message
            : "Unknown TestPoint scraper error.",
      };
    }
  }
}