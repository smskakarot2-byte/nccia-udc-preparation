import { BaseScraper } from "./base";
import { DemoScraper } from "./demo";
import { TestPointScraper } from "./sources/testpoint";
import { GotestScraper } from "./sources/gotest";
import { PakmcqsScraper } from "./sources/pakmcqs";
import { PakmcqsOrgScraper } from "./sources/pakmcqs_org";
import { IlmkidunyaScraper } from "./sources/ilmkidunya";
import { TayyarhoScraper } from "./sources/tayyarho";
import { PakjobmcqsScraper } from "./sources/pakjobmcqs";
import { TestpointspkScraper } from "./sources/testpointspk";
import { TalibScraper } from "./sources/talib";
import { TestpointpkScraper } from "./sources/testpointpk";
import { JobsalertScraper } from "./sources/jobsalert";
import { ParhopakistanScraper } from "./sources/parhopakistan";
import { EducatedScraper } from "./sources/educated";
import { PaperpkScraper } from "./sources/paperpk";
import { StudyinfoScraper } from "./sources/studyinfo";

/** Every adapter the app knows about, keyed by Source.key. Registering an
 * adapter here is what makes it selectable in the extraction engine and
 * visible on /admin/sources â€” it does not by itself mean the adapter does
 * anything real (see each file's STATUS comment). */
export const SCRAPER_REGISTRY: Record<string, BaseScraper> = {
  demo: new DemoScraper(),
  testpoint: new TestPointScraper(),
  gotest: new GotestScraper(),
  pakmcqs: new PakmcqsScraper(),
  pakmcqs_org: new PakmcqsOrgScraper(),
  ilmkidunya: new IlmkidunyaScraper(),
  tayyarho: new TayyarhoScraper(),
  pakjobmcqs: new PakjobmcqsScraper(),
  testpointspk: new TestpointspkScraper(),
  talib: new TalibScraper(),
  testpointpk: new TestpointpkScraper(),
  jobsalert: new JobsalertScraper(),
  parhopakistan: new ParhopakistanScraper(),
  educated: new EducatedScraper(),
  paperpk: new PaperpkScraper(),
  studyinfo: new StudyinfoScraper()
};

export const SOURCE_SEED_LIST = Object.values(SCRAPER_REGISTRY).map((s) => ({
  key: s.key,
  name: s.name,
  baseUrl: s.baseUrl,
  // Only the demo source is meaningfully "ok" out of the box.
  status: s.key === "demo" ? "ok" : "not_configured",
  isEnabled: s.key === "demo"
}));

